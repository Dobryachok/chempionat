package ru.stoloto.balloon.sim;

import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;
import ru.stoloto.balloon.persistence.PlayerEntity;
import ru.stoloto.balloon.persistence.PlayerRepository;
import ru.stoloto.balloon.persistence.RoundEntity;
import ru.stoloto.balloon.persistence.RoundRepository;

import java.time.Instant;
import java.util.List;
import java.util.UUID;
import java.util.concurrent.ThreadLocalRandom;

/**
 * Imitates other players of the prototype: their points keep moving, which makes the live
 * rating and the tournament table change in real time, and their finished rounds fill the
 * shared game history.
 */
@Component
public class BotSimulator {

    private static final List<Long> BETS = List.of(100L, 250L, 500L, 1000L);

    private final PlayerRepository players;
    private final RoundRepository rounds;

    public BotSimulator(PlayerRepository players, RoundRepository rounds) {
        this.players = players;
        this.rounds = rounds;
    }

    @Scheduled(fixedDelay = 1000)
    @Transactional
    public void tickPoints() {
        List<PlayerEntity> bots = players.findAllByBotTrue();
        ThreadLocalRandom random = ThreadLocalRandom.current();
        for (PlayerEntity bot : bots) {
            // Roughly one point per second per bot: enough movement for the live rating,
            // slow enough that a real player can still climb the table.
            if (random.nextDouble() < 0.2) {
                bot.setGamePoints(bot.getGamePoints() + random.nextInt(1, 9));
            }
        }
        players.saveAll(bots);
    }

    @Scheduled(fixedDelay = 5000, initialDelay = 3000)
    @Transactional
    public void simulateFinishedRound() {
        List<PlayerEntity> bots = players.findAllByBotTrue();
        if (bots.isEmpty()) {
            return;
        }
        ThreadLocalRandom random = ThreadLocalRandom.current();
        PlayerEntity bot = bots.get(random.nextInt(bots.size()));

        boolean red = random.nextBoolean();
        long bet = BETS.get(random.nextInt(BETS.size()));
        int boosterTier = random.nextInt(1, 5);
        double crash = Math.round((1.0 + Math.pow(random.nextDouble(), 2.2) * 12.0) * 100) / 100.0;
        boolean cashedOut = random.nextDouble() < 0.45 && crash > 1.3;
        Double cashoutMultiplier = cashedOut
                ? Math.round((1.2 + random.nextDouble() * (crash - 1.2)) * 100) / 100.0
                : null;

        // Levels and points have to match the crash coefficient, otherwise the shared
        // history looks inconsistent next to the real rounds.
        int maxLevels = red ? 12 : 9;
        int levelsReached = (int) Math.min(maxLevels, Math.max(0, Math.floor(Math.log(crash) / Math.log(1.21))));
        int boosterLevel = boosterTier >= 2 ? random.nextInt(1, maxLevels + 1) : 0;
        boolean boosterApplied = boosterTier >= 2 && boosterLevel <= levelsReached;
        int points = levelsReached * 10
                + (cashedOut ? 25 : 0)
                + (boosterApplied ? boosterTier * 15 : 0);

        RoundEntity entity = new RoundEntity();
        entity.setId(UUID.randomUUID().toString());
        entity.setPlayerId(bot.getId());
        entity.setPlayerName(bot.getName());
        entity.setTheme(red ? "red" : "green");
        entity.setBet(bet);
        entity.setBoosterTier(boosterTier);
        entity.setBoosterValue(boosterTier);
        entity.setBoosterLevel(boosterLevel);
        entity.setBoosterApplied(boosterApplied);
        entity.setCrashMultiplier(crash);
        entity.setCashoutMultiplier(cashoutMultiplier);
        entity.setWin(cashoutMultiplier == null ? 0 : Math.round(bet * cashoutMultiplier));
        entity.setPoints(points);
        entity.setLevelsReached(levelsReached);
        entity.setCommitHash("simulated");
        entity.setServerSeed("simulated");
        entity.setStatus(cashedOut ? RoundEntity.Status.CASHED_OUT : RoundEntity.Status.CRASHED);
        entity.setCreatedAt(Instant.now().minusSeconds(20));
        entity.setFinishedAt(Instant.now());
        rounds.save(entity);
    }
}
