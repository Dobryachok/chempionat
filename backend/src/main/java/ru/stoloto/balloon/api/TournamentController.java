package ru.stoloto.balloon.api;

import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import ru.stoloto.balloon.game.TournamentService;

@RestController
public class TournamentController {

    private final TournamentService tournamentService;

    public TournamentController(TournamentService tournamentService) {
        this.tournamentService = tournamentService;
    }

    /** Polled about once per second by the live rating and the tournament table. */
    @GetMapping("/api/tournament")
    public TournamentService.TournamentView tournament(
            @RequestParam long playerId,
            @RequestParam(defaultValue = "true") boolean mask) {
        return tournamentService.view(playerId, mask);
    }
}
