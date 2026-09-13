package ru.stoloto.balloon.api;

import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import ru.stoloto.balloon.game.PlayerService;
import ru.stoloto.balloon.game.RewardService;
import ru.stoloto.balloon.game.RoundEngine;
import ru.stoloto.balloon.persistence.PlayerEntity;

import java.util.List;

@RestController
@RequestMapping("/api")
public class PlayerController {

    public record SessionResponse(
            long playerId,
            String name,
            long balance,
            long gamePoints,
            int tickets,
            List<Integer> collectedPieces,
            int totalPieces,
            String activeRoundId
    ) {
    }

    private final PlayerService playerService;
    private final RoundEngine engine;

    public PlayerController(PlayerService playerService, RoundEngine engine) {
        this.playerService = playerService;
        this.engine = engine;
    }

    /** Opens a demo session: no registration is needed in the prototype. */
    @PostMapping("/session")
    public SessionResponse session() {
        return toResponse(playerService.demoPlayer());
    }

    @GetMapping("/players/{playerId}")
    public SessionResponse player(@PathVariable long playerId) {
        return toResponse(playerService.require(playerId));
    }

    private SessionResponse toResponse(PlayerEntity player) {
        String activeRoundId = engine.activeFor(player.getId())
                .map(round -> round.id())
                .orElse(null);
        return new SessionResponse(
                player.getId(),
                player.getName(),
                player.getBalance(),
                player.getGamePoints(),
                player.getTickets(),
                List.copyOf(playerService.collectedPieces(player)),
                RewardService.totalPieces(),
                activeRoundId);
    }
}
