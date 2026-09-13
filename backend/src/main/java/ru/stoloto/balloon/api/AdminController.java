package ru.stoloto.balloon.api;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import ru.stoloto.balloon.config.ConfigService;
import ru.stoloto.balloon.config.GameConfig;

import java.time.Instant;
import java.util.List;
import java.util.Map;

/**
 * Administrative access to the game parameters. Everything the experts need for scenario 5
 * can be changed here without touching the source code; the same file can also be edited by hand.
 */
@RestController
@RequestMapping("/api/admin")
public class AdminController {

    public record ConfigResponse(GameConfig config, long version, Instant updatedAt, String path) {
    }

    public record UpdateResponse(boolean applied, long version, Instant updatedAt, List<String> errors) {
    }

    private final ConfigService configService;

    public AdminController(ConfigService configService) {
        this.configService = configService;
    }

    @GetMapping("/config")
    public ConfigResponse config() {
        return new ConfigResponse(
                configService.current(),
                configService.version(),
                configService.updatedAt(),
                configService.configPath().toString());
    }

    @PutMapping("/config")
    public ResponseEntity<UpdateResponse> update(@RequestBody GameConfig candidate) {
        List<String> errors = configService.update(candidate);
        if (!errors.isEmpty()) {
            return ResponseEntity.unprocessableEntity()
                    .body(new UpdateResponse(false, configService.version(), configService.updatedAt(), errors));
        }
        return ResponseEntity.status(HttpStatus.OK)
                .body(new UpdateResponse(true, configService.version(), configService.updatedAt(), List.of()));
    }

    @GetMapping("/status")
    public Map<String, Object> status() {
        return Map.of(
                "configPath", configService.configPath().toString(),
                "version", configService.version(),
                "updatedAt", configService.updatedAt(),
                "hotReload", true);
    }
}
