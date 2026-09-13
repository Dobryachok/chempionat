package ru.stoloto.balloon.game;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import ru.stoloto.balloon.persistence.PlayerEntity;
import ru.stoloto.balloon.persistence.PlayerRepository;
import ru.stoloto.balloon.persistence.TournamentEntity;
import ru.stoloto.balloon.persistence.TournamentRepository;

import java.time.Instant;
import java.util.ArrayList;
import java.util.List;

/**
 * Live rating and tournament table. Points come from the rounds played, so the rating
 * updates while the balloon is still in the air.
 */
@Service
public class TournamentService {

    public record Participant(long id, String name, long points, int rank, boolean current) {
    }

    public record TournamentView(
            boolean active,
            String name,
            String description,
            Instant endsAt,
            long secondsLeft,
            List<Participant> participants,
            int currentRank,
            long currentPoints
    ) {
    }

    private final PlayerRepository players;
    private final TournamentRepository tournaments;

    public TournamentService(PlayerRepository players, TournamentRepository tournaments) {
        this.players = players;
        this.tournaments = tournaments;
    }

    @Transactional(readOnly = true)
    public TournamentView view(long currentPlayerId, boolean maskNames) {
        TournamentEntity tournament = tournaments.findFirstByActiveTrueOrderByIdAsc().orElse(null);
        boolean active = tournament != null
                && tournament.isActive()
                && tournament.getEndsAt().isAfter(Instant.now());

        List<PlayerEntity> ranked = players.findAllByOrderByGamePointsDescIdAsc();
        List<Participant> participants = new ArrayList<>(ranked.size());
        int currentRank = 0;
        long currentPoints = 0;
        for (int i = 0; i < ranked.size(); i++) {
            PlayerEntity player = ranked.get(i);
            boolean isCurrent = player.getId() == currentPlayerId;
            if (isCurrent) {
                currentRank = i + 1;
                currentPoints = player.getGamePoints();
            }
            String name = isCurrent || !maskNames ? player.getName() : mask(player.getName());
            participants.add(new Participant(player.getId(), name, player.getGamePoints(), i + 1, isCurrent));
        }

        long secondsLeft = active
                ? Math.max(0, tournament.getEndsAt().getEpochSecond() - Instant.now().getEpochSecond())
                : 0;

        return new TournamentView(
                active,
                tournament == null ? null : tournament.getName(),
                tournament == null ? null : tournament.getDescription(),
                tournament == null ? null : tournament.getEndsAt(),
                secondsLeft,
                participants,
                currentRank,
                currentPoints);
    }

    /** Depersonalisation required for release: the first three characters are hidden. */
    private String mask(String name) {
        if (name == null || name.isBlank()) {
            return "***";
        }
        if (name.length() <= 3) {
            return "***";
        }
        return "***" + name.substring(3);
    }
}
