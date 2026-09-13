package ru.stoloto.balloon.api;

import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import ru.stoloto.balloon.config.ConfigService;
import ru.stoloto.balloon.config.GameConfig;

import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

/**
 * Read-only view of the configuration that the client is allowed to know.
 * Loot probabilities and crash distribution parameters stay on the server.
 */
@RestController
@RequestMapping("/api/config")
public class ConfigController {

    public record PublicBetOption(String id, long cost, int boosterTier, double boosterValue) {
    }

    public record PublicTheme(String title, int levels, List<Double> levelMultipliers, List<PublicBetOption> betOptions) {
    }

    public record PublicMath(int fps, double growthRate, double maxMultiplier, double delta) {
    }

    public record PublicConfig(
            String gameId,
            String gameName,
            boolean active,
            long version,
            PublicMath math,
            GameConfig.Points points,
            GameConfig.Boosters boosters,
            GameConfig.Upsell upsell,
            Map<String, PublicTheme> themes
    ) {
    }

    private final ConfigService configService;

    public ConfigController(ConfigService configService) {
        this.configService = configService;
    }

    @GetMapping("/public")
    public PublicConfig publicConfig() {
        GameConfig config = configService.current();
        Map<String, PublicTheme> themes = new LinkedHashMap<>();
        config.themes().forEach((name, theme) -> themes.put(name, new PublicTheme(
                theme.title(),
                theme.levels(),
                theme.levelMultipliers(),
                theme.betOptions().stream()
                        .map(option -> new PublicBetOption(
                                option.id(),
                                option.cost(),
                                option.boosterTier(),
                                config.boosters().valueOfTier(option.boosterTier())))
                        .toList())));

        return new PublicConfig(
                config.basic().gameId(),
                config.basic().gameName(),
                config.basic().isActive() == null || config.basic().isActive(),
                configService.version(),
                new PublicMath(
                        config.math().fps(),
                        config.math().multiplierGrowthRate(),
                        config.math().maxMultiplier(),
                        config.math().delta()),
                config.points(),
                config.boosters(),
                config.upsell(),
                themes);
    }
}
