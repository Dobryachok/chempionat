package ru.stoloto.balloon.game;

import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import ru.stoloto.balloon.persistence.RoundEntity;
import ru.stoloto.balloon.persistence.RoundRepository;

import java.time.Instant;
import java.util.List;
import java.util.Optional;

/**
 * Persistence of rounds: the game history shown on the bet screen is built from this table.
 */
@Service
public class RoundArchive {

    private final RoundRepository rounds;

    public RoundArchive(RoundRepository rounds) {
        this.rounds = rounds;
    }

    @Transactional
    public void create(ActiveRound round) {
        RoundEntity entity = new RoundEntity();
        entity.setId(round.id());
        entity.setPlayerId(round.playerId());
        entity.setPlayerName(round.playerName());
        entity.setTheme(round.themeName());
        entity.setBet(round.bet());
        entity.setBoosterTier(round.boosterTier());
        entity.setBoosterValue(round.boosterValue());
        entity.setBoosterLevel(round.lootLine());
        entity.setCrashMultiplier(round.crashMultiplier());
        entity.setCommitHash(round.commitHash());
        entity.setServerSeed(round.serverSeed());
        entity.setStatus(RoundEntity.Status.IN_PROGRESS);
        rounds.save(entity);
    }

    @Transactional
    public void markCashout(String roundId, double multiplier, long win, int points) {
        rounds.findById(roundId).ifPresent(entity -> {
            entity.setCashoutMultiplier(multiplier);
            entity.setWin(win);
            entity.setPoints(points);
            entity.setStatus(RoundEntity.Status.CASHED_OUT);
            rounds.save(entity);
        });
    }

    @Transactional
    public void finish(ActiveRound round, RewardService.Reward reward) {
        rounds.findById(round.id()).ifPresent(entity -> {
            entity.setCashoutMultiplier(round.cashoutMultiplier());
            entity.setWin(round.win());
            entity.setPoints(round.points());
            entity.setLevelsReached(round.levelsCrossed());
            entity.setBoosterApplied(round.boosterApplied());
            entity.setRewardTitle(reward.title());
            entity.setRewardRarity(reward.rarity());
            entity.setStatus(round.cashedOut() ? RoundEntity.Status.CASHED_OUT : RoundEntity.Status.CRASHED);
            entity.setFinishedAt(Instant.now());
            rounds.save(entity);
        });
    }

    @Transactional(readOnly = true)
    public List<RoundEntity> history(int limit) {
        return rounds.findByStatusNotOrderByFinishedAtDesc(
                RoundEntity.Status.IN_PROGRESS, PageRequest.of(0, limit));
    }

    @Transactional(readOnly = true)
    public Optional<RoundEntity> find(String roundId) {
        return rounds.findById(roundId);
    }

    @Transactional
    public void save(RoundEntity entity) {
        rounds.save(entity);
    }
}
