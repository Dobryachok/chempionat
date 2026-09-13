package ru.stoloto.balloon.api;

import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import ru.stoloto.balloon.game.RoundArchive;
import ru.stoloto.balloon.persistence.RoundEntity;

import java.time.Instant;
import java.util.List;

/**
 * Shared history of finished rounds of every player of the prototype.
 */
@RestController
public class HistoryController {

    public record HistoryItem(
            String id,
            String playerName,
            String theme,
            long bet,
            int boosterTier,
            boolean boosterApplied,
            Double cashoutMultiplier,
            double crashMultiplier,
            long win,
            int points,
            int levelsReached,
            String rewardTitle,
            String status,
            Instant finishedAt
    ) {
    }

    private final RoundArchive archive;

    public HistoryController(RoundArchive archive) {
        this.archive = archive;
    }

    @GetMapping("/api/history")
    public List<HistoryItem> history(@RequestParam(defaultValue = "25") int limit) {
        int safeLimit = Math.min(100, Math.max(1, limit));
        return archive.history(safeLimit).stream().map(this::toItem).toList();
    }

    private HistoryItem toItem(RoundEntity entity) {
        return new HistoryItem(
                entity.getId(),
                entity.getPlayerName(),
                entity.getTheme(),
                entity.getBet(),
                entity.getBoosterTier(),
                entity.isBoosterApplied(),
                entity.getCashoutMultiplier(),
                entity.getCrashMultiplier(),
                entity.getWin(),
                entity.getPoints(),
                entity.getLevelsReached(),
                entity.getRewardTitle(),
                entity.getStatus().name(),
                entity.getFinishedAt());
    }
}
