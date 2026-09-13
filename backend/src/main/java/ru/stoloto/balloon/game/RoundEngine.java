package ru.stoloto.balloon.game;

import jakarta.annotation.PreDestroy;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import ru.stoloto.balloon.config.ConfigService;
import ru.stoloto.balloon.config.GameConfig;
import ru.stoloto.balloon.persistence.PlayerEntity;

import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.Executors;
import java.util.concurrent.ScheduledExecutorService;
import java.util.concurrent.ScheduledFuture;
import java.util.concurrent.TimeUnit;
import java.util.function.Consumer;

/**
 * The authoritative game loop. Everything that decides the outcome of a round happens here:
 * the multiplier growth, level crossings, booster activation, cashout and the crash itself.
 * The client only renders what this engine publishes.
 */
@Service
public class RoundEngine {

    private static final Logger log = LoggerFactory.getLogger(RoundEngine.class);
    private static final double EPSILON = 1e-9;
    /** If the client never opens a socket, the flight starts anyway after this delay. */
    private static final long AUTOSTART_DELAY_MS = 4000;

    public record StartedRound(
            String roundId,
            String commitHash,
            String theme,
            long bet,
            int boosterTier,
            double boosterValue,
            int boosterLevel,
            int levels,
            List<Double> levelMultipliers,
            long balance,
            int fps,
            double growthRate
    ) {
    }

    public record CashoutResult(double multiplier, long win, int points, long balance, String message) {
    }

    private final ConfigService configService;
    private final CrashGenerator crashGenerator;
    private final PlayerService playerService;
    private final RoundArchive archive;
    private final RewardService rewardService;
    private final UpsellService upsellService;

    private final Map<String, ActiveRound> rounds = new ConcurrentHashMap<>();
    private final ScheduledExecutorService scheduler = Executors.newScheduledThreadPool(4, runnable -> {
        Thread thread = new Thread(runnable, "round-engine");
        thread.setDaemon(true);
        return thread;
    });

    public RoundEngine(ConfigService configService,
                       CrashGenerator crashGenerator,
                       PlayerService playerService,
                       RoundArchive archive,
                       RewardService rewardService,
                       UpsellService upsellService) {
        this.configService = configService;
        this.crashGenerator = crashGenerator;
        this.playerService = playerService;
        this.archive = archive;
        this.rewardService = rewardService;
        this.upsellService = upsellService;
    }

    @PreDestroy
    void shutdown() {
        scheduler.shutdownNow();
    }

    public StartedRound start(long playerId, String themeName, String betOptionId) {
        GameConfig config = configService.current();
        if (config.basic().isActive() != null && !config.basic().isActive()) {
            throw new IllegalStateException("Игра временно отключена администратором");
        }
        GameConfig.Theme theme = config.theme(themeName);
        GameConfig.BetOption option = theme.betOptions().stream()
                .filter(candidate -> candidate.id().equals(betOptionId))
                .findFirst()
                .orElseThrow(() -> new IllegalArgumentException("Неизвестный фрагмент ставки: " + betOptionId));

        activeFor(playerId).ifPresent(existing -> {
            throw new IllegalStateException("Предыдущий раунд ещё не завершён");
        });

        PlayerEntity player = playerService.require(playerId);
        long balance = playerService.charge(playerId, option.cost());

        double boosterValue = config.boosters().valueOfTier(option.boosterTier());
        CrashGenerator.RoundSecret secret = crashGenerator.generate(config, theme, option.boosterTier());

        ActiveRound round = new ActiveRound(
                UUID.randomUUID().toString(),
                playerId,
                player.getName(),
                themeName,
                config,
                theme,
                option.cost(),
                option.boosterTier(),
                boosterValue,
                secret);
        rounds.put(round.id(), round);
        archive.create(round);

        scheduler.schedule(() -> startTicking(round.id()), AUTOSTART_DELAY_MS, TimeUnit.MILLISECONDS);

        log.debug("Раунд {} создан: ставка {}, бустер x{} на уровне {}, crash {}",
                round.id(), option.cost(), boosterValue, secret.lootLine(), secret.crashMultiplier());

        return new StartedRound(
                round.id(),
                secret.commitHash(),
                themeName,
                option.cost(),
                option.boosterTier(),
                boosterValue,
                secret.lootLine(),
                theme.levels(),
                theme.levelMultipliers(),
                balance,
                config.math().fps(),
                config.math().multiplierGrowthRate());
    }

    /** Connects a websocket sink to a round and starts the flight. */
    public void attach(String roundId, Consumer<Map<String, Object>> sink) {
        ActiveRound round = require(roundId);
        round.setSink(sink);
        round.emit(stateEvent(round));
        startTicking(roundId);
    }

    public void detach(String roundId) {
        ActiveRound round = rounds.get(roundId);
        if (round != null) {
            round.setSink(null);
        }
    }

    public Optional<ActiveRound> find(String roundId) {
        return Optional.ofNullable(rounds.get(roundId));
    }

    public Optional<ActiveRound> activeFor(long playerId) {
        return rounds.values().stream()
                .filter(round -> round.playerId() == playerId && !round.finished())
                .findFirst();
    }

    public ActiveRound require(String roundId) {
        ActiveRound round = rounds.get(roundId);
        if (round == null) {
            throw new IllegalArgumentException("Раунд не найден или уже завершён: " + roundId);
        }
        return round;
    }

    public synchronized CashoutResult cashout(String roundId) {
        ActiveRound round = require(roundId);
        if (round.finished()) {
            throw new IllegalStateException("Раунд уже завершён");
        }
        if (round.cashedOut()) {
            throw new IllegalStateException("Выигрыш уже забран");
        }
        if (round.levelsCrossed() < 1) {
            throw new IllegalStateException("Забрать выигрыш можно только после первого уровня");
        }

        double multiplier = display(round, round.effectiveMultiplier());
        long win = Math.round(round.bet() * multiplier);
        round.markCashedOut(multiplier, win);

        int cashoutBonus = round.config().points().pointsCashoutBonus();
        round.addPoints(cashoutBonus);

        long balance = playerService.credit(round.playerId(), win);
        playerService.addPoints(round.playerId(), cashoutBonus);
        archive.markCashout(round.id(), multiplier, win, round.points());

        CashoutResult result = new CashoutResult(multiplier, win, round.points(), balance, "Могли бы забрать больше");
        Map<String, Object> event = event("cashout");
        event.put("multiplier", multiplier);
        event.put("win", win);
        event.put("points", round.points());
        event.put("cashoutBonus", cashoutBonus);
        event.put("balance", balance);
        event.put("message", result.message());
        round.emit(event);
        return result;
    }

    private synchronized void startTicking(String roundId) {
        ActiveRound round = rounds.get(roundId);
        if (round == null || round.finished() || round.task() != null) {
            return;
        }
        long periodMs = Math.max(10, 1000 / round.config().math().fps());
        ScheduledFuture<?> task = scheduler.scheduleAtFixedRate(
                () -> safeTick(round), periodMs, periodMs, TimeUnit.MILLISECONDS);
        round.setTask(task);
    }

    private void safeTick(ActiveRound round) {
        try {
            tick(round);
        } catch (Exception e) {
            log.error("Ошибка в тике раунда {}", round.id(), e);
            finishRound(round);
        }
    }

    private void tick(ActiveRound round) {
        if (round.finished()) {
            return;
        }
        GameConfig.MathModel math = round.config().math();
        int tick = round.tick() + 1;
        round.setTick(tick);

        double base = Math.pow(1 + math.multiplierGrowthRate(), tick);
        boolean crashed = base >= round.crashMultiplier() - EPSILON;
        double reachable = Math.min(base, round.crashMultiplier());
        round.setBaseMultiplier(crashed ? round.crashMultiplier() : base);

        crossLevels(round, reachable);

        if (crashed || round.effectiveMultiplier() >= math.maxMultiplier() - EPSILON) {
            finishRound(round);
            return;
        }

        Map<String, Object> event = event("tick");
        event.put("multiplier", display(round, round.effectiveMultiplier()));
        event.put("baseMultiplier", display(round, round.baseMultiplier()));
        event.put("level", round.levelsCrossed());
        event.put("tick", tick);
        round.emit(event);
    }

    private void crossLevels(ActiveRound round, double reachable) {
        List<Double> thresholds = round.levelMultipliers();
        while (round.levelsCrossed() < thresholds.size()
                && reachable + EPSILON >= thresholds.get(round.levelsCrossed())) {
            int level = round.levelsCrossed() + 1;
            round.setLevelsCrossed(level);

            // After a cashout the flight is only a spectacle: no more points and no booster.
            if (round.cashedOut()) {
                Map<String, Object> passed = event("level");
                passed.put("level", level);
                passed.put("points", 0);
                passed.put("totalPoints", round.points());
                passed.put("multiplier", display(round, round.effectiveMultiplier()));
                round.emit(passed);
                continue;
            }

            int linePoints = round.config().points().pointsPerLine();
            round.addPoints(linePoints);
            playerService.addPoints(round.playerId(), linePoints);

            Map<String, Object> event = event("level");
            event.put("level", level);
            event.put("points", linePoints);
            event.put("totalPoints", round.points());
            event.put("multiplier", display(round, round.effectiveMultiplier()));
            round.emit(event);

            if (!round.boosterApplied() && round.boosterTier() >= 2 && round.lootLine() == level) {
                round.applyBooster();
                int bonus = round.config().points().bonusForTier(round.boosterTier());
                round.addPoints(bonus);
                playerService.addPoints(round.playerId(), bonus);

                Map<String, Object> boost = event("boost");
                boost.put("level", level);
                boost.put("boosterTier", round.boosterTier());
                boost.put("boosterValue", round.boosterValue());
                boost.put("multiplier", display(round, round.effectiveMultiplier()));
                boost.put("points", bonus);
                boost.put("totalPoints", round.points());
                round.emit(boost);
            }
        }
    }

    private synchronized void finishRound(ActiveRound round) {
        if (round.finished()) {
            return;
        }
        round.markFinished();
        ScheduledFuture<?> task = round.task();
        if (task != null) {
            task.cancel(false);
        }

        RewardService.Reward reward = rewardService.draw();
        PlayerEntity player = playerService.addPuzzlePiece(round.playerId(), reward.index());
        archive.finish(round, reward);

        double crashDisplay = display(round, round.crashMultiplier() * round.boosterFactor());
        UpsellService.Offer offer = upsellService.offerFor(
                round.config(), round.cashedOut(), round.win(), round.bet(), player.getBalance());

        Map<String, Object> event = event("crash");
        event.put("crashMultiplier", crashDisplay);
        event.put("baseCrashMultiplier", round(round.crashMultiplier(), 4));
        event.put("cashedOut", round.cashedOut());
        event.put("cashoutMultiplier", round.cashoutMultiplier());
        event.put("win", round.win());
        event.put("bet", round.bet());
        event.put("points", round.points());
        event.put("levelsReached", round.levelsCrossed());
        event.put("levels", round.theme().levels());
        event.put("boosterApplied", round.boosterApplied());
        event.put("boosterValue", round.boosterValue());
        event.put("boosterLevel", round.lootLine());
        event.put("balance", player.getBalance());
        event.put("gamePoints", player.getGamePoints());
        event.put("theme", round.themeName());
        event.put("reward", rewardPayload(reward, player));
        event.put("fairness", fairnessPayload(round));
        event.put("upsell", upsellPayload(offer));
        round.emit(event);

        rounds.remove(round.id());
        log.debug("Раунд {} завершён: crash {}, выигрыш {}", round.id(), crashDisplay, round.win());
    }

    public Map<String, Object> stateEvent(ActiveRound round) {
        Map<String, Object> event = event("state");
        event.put("roundId", round.id());
        event.put("theme", round.themeName());
        event.put("bet", round.bet());
        event.put("boosterTier", round.boosterTier());
        event.put("boosterValue", round.boosterValue());
        event.put("boosterLevel", round.lootLine());
        event.put("boosterApplied", round.boosterApplied());
        event.put("levels", round.theme().levels());
        event.put("levelMultipliers", new ArrayList<>(round.levelMultipliers()));
        event.put("multiplier", display(round, round.effectiveMultiplier()));
        event.put("level", round.levelsCrossed());
        event.put("tick", round.tick());
        event.put("fps", round.config().math().fps());
        event.put("growthRate", round.config().math().multiplierGrowthRate());
        event.put("cashedOut", round.cashedOut());
        event.put("cashoutMultiplier", round.cashoutMultiplier());
        event.put("points", round.points());
        event.put("commitHash", round.commitHash());
        return event;
    }

    public Map<String, Object> rewardPayload(RewardService.Reward reward, PlayerEntity player) {
        Map<String, Object> payload = new LinkedHashMap<>();
        payload.put("index", reward.index());
        payload.put("title", reward.title());
        payload.put("rarity", reward.rarity());
        payload.put("collected", playerService.collectedPieces(player).size());
        payload.put("total", RewardService.totalPieces());
        return payload;
    }

    private Map<String, Object> fairnessPayload(ActiveRound round) {
        Map<String, Object> payload = new LinkedHashMap<>();
        payload.put("commitHash", round.commitHash());
        payload.put("serverSeed", round.serverSeed());
        payload.put("lootLine", round.lootLine());
        payload.put("formula", "sha256(serverSeed:crashMultiplier:lootLine)");
        return payload;
    }

    private Map<String, Object> upsellPayload(UpsellService.Offer offer) {
        Map<String, Object> payload = new LinkedHashMap<>();
        payload.put("eligible", offer.eligible());
        payload.put("tickets", offer.tickets());
        payload.put("price", offer.price());
        payload.put("ticketPrice", offer.ticketPrice());
        payload.put("timeoutSeconds", offer.timeoutSeconds());
        payload.put("minWinAmount", offer.minWinAmount());
        return payload;
    }

    private Map<String, Object> event(String type) {
        Map<String, Object> event = new LinkedHashMap<>();
        event.put("type", type);
        return event;
    }

    /** Publishes the multiplier rounded down to the configured step. */
    private double display(ActiveRound round, double value) {
        double delta = round.config().math().delta();
        double stepped = Math.floor(value / delta) * delta;
        return round(stepped, 4);
    }

    private double round(double value, int digits) {
        double factor = Math.pow(10, digits);
        return Math.round(value * factor) / factor;
    }
}
