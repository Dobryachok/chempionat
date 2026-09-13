package ru.stoloto.balloon.api;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import ru.stoloto.balloon.game.RoundArchive;
import ru.stoloto.balloon.game.RoundEngine;
import ru.stoloto.balloon.persistence.RoundEntity;

import java.util.LinkedHashMap;
import java.util.Map;

@RestController
@RequestMapping("/api/rounds")
public class RoundController {

    public record StartRequest(
            @NotNull Long playerId,
            @NotBlank String theme,
            @NotBlank String betOptionId
    ) {
    }

    private final RoundEngine engine;
    private final RoundArchive archive;

    public RoundController(RoundEngine engine, RoundArchive archive) {
        this.engine = engine;
        this.archive = archive;
    }

    /**
     * Charges the bet and prepares the flight. The crash point is already decided at this moment
     * and only its hash leaves the server.
     */
    @PostMapping
    public RoundEngine.StartedRound start(@Valid @RequestBody StartRequest request) {
        return engine.start(request.playerId(), request.theme(), request.betOptionId());
    }

    /** Cashout over HTTP; the websocket command does exactly the same thing. */
    @PostMapping("/{roundId}/cashout")
    public RoundEngine.CashoutResult cashout(@PathVariable String roundId) {
        return engine.cashout(roundId);
    }

    /** Used to restore the screen after a reload while the balloon is still in the air. */
    @GetMapping("/{roundId}")
    public Map<String, Object> state(@PathVariable String roundId) {
        return engine.find(roundId)
                .map(engine::stateEvent)
                .orElseGet(() -> finishedState(roundId));
    }

    private Map<String, Object> finishedState(String roundId) {
        RoundEntity entity = archive.find(roundId)
                .orElseThrow(() -> new IllegalArgumentException("Раунд не найден: " + roundId));
        Map<String, Object> payload = new LinkedHashMap<>();
        payload.put("type", "finished");
        payload.put("roundId", entity.getId());
        payload.put("theme", entity.getTheme());
        payload.put("bet", entity.getBet());
        payload.put("crashMultiplier", entity.getCrashMultiplier());
        payload.put("cashoutMultiplier", entity.getCashoutMultiplier());
        payload.put("win", entity.getWin());
        payload.put("points", entity.getPoints());
        payload.put("levelsReached", entity.getLevelsReached());
        payload.put("status", entity.getStatus().name());
        return payload;
    }
}
