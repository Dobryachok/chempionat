package ru.stoloto.balloon.config;

import org.springframework.stereotype.Component;

import java.util.ArrayList;
import java.util.List;

/**
 * Checks that a configuration candidate keeps the game playable before it is applied.
 */
@Component
public class ConfigValidator {

    private static final List<String> REQUIRED_THEMES = List.of("green", "red");

    public List<String> validate(GameConfig config) {
        List<String> errors = new ArrayList<>();
        if (config == null) {
            return List.of("Конфигурация пуста");
        }
        validateBasic(config.basic(), errors);
        validateMath(config.math(), errors);
        validatePoints(config.points(), errors);
        validateBoosters(config.boosters(), errors);
        validateUpsell(config.upsell(), errors);
        validateThemes(config, errors);
        return errors;
    }

    private void validateBasic(GameConfig.Basic basic, List<String> errors) {
        if (basic == null) {
            errors.add("basic: блок отсутствует");
            return;
        }
        if (isBlank(basic.gameId())) {
            errors.add("basic.gameId: обязательное значение");
        }
        if (isBlank(basic.gameName())) {
            errors.add("basic.gameName: обязательное значение");
        }
        if (isBlank(basic.gameType())) {
            errors.add("basic.gameType: обязательное значение");
        }
        if (basic.isActive() == null) {
            errors.add("basic.isActive: обязательное значение (true/false)");
        }
    }

    private void validateMath(GameConfig.MathModel math, List<String> errors) {
        if (math == null) {
            errors.add("math: блок отсутствует");
            return;
        }
        range(errors, "math.alpha", math.alpha(), 0.2, 10.0);
        range(errors, "math.minCrashMultiplier", math.minCrashMultiplier(), 1.0, 10.0);
        range(errors, "math.maxMultiplier", math.maxMultiplier(), 1.5, 1000.0);
        range(errors, "math.multiplierGrowthRate", math.multiplierGrowthRate(), 0.0005, 0.5);
        range(errors, "math.fps", math.fps(), 5, 60);
        range(errors, "math.delta", math.delta(), 0.001, 1.0);
        range(errors, "math.instantCrashProbability", math.instantCrashProbability(), 0.0, 0.5);
        if (math.minCrashMultiplier() >= math.maxMultiplier()) {
            errors.add("math.minCrashMultiplier должен быть меньше math.maxMultiplier");
        }
    }

    private void validatePoints(GameConfig.Points points, List<String> errors) {
        if (points == null) {
            errors.add("points: блок отсутствует");
            return;
        }
        range(errors, "points.pointsPerLine", points.pointsPerLine(), 0, 10000);
        range(errors, "points.pointsCashoutBonus", points.pointsCashoutBonus(), 0, 10000);
        range(errors, "points.pointsX2Bonus", points.pointsX2Bonus(), 0, 10000);
        range(errors, "points.pointsX3Bonus", points.pointsX3Bonus(), 0, 10000);
        range(errors, "points.pointsX4Bonus", points.pointsX4Bonus(), 0, 10000);
    }

    private void validateBoosters(GameConfig.Boosters boosters, List<String> errors) {
        if (boosters == null) {
            errors.add("boosters: блок отсутствует");
            return;
        }
        range(errors, "boosters.multiplierTier1Value", boosters.multiplierTier1Value(), 1.0, 1.0);
        range(errors, "boosters.multiplierTier2Value", boosters.multiplierTier2Value(), 1.0, 100.0);
        range(errors, "boosters.multiplierTier3Value", boosters.multiplierTier3Value(), 1.0, 100.0);
        range(errors, "boosters.multiplierTier4Value", boosters.multiplierTier4Value(), 1.0, 100.0);
    }

    private void validateUpsell(GameConfig.Upsell upsell, List<String> errors) {
        if (upsell == null) {
            errors.add("upsell: блок отсутствует");
            return;
        }
        range(errors, "upsell.minWinAmount", upsell.minWinAmount(), 0, 1_000_000);
        range(errors, "upsell.popupTimeoutSeconds", upsell.popupTimeoutSeconds(), 1, 120);
        range(errors, "upsell.ticketPrice", upsell.ticketPrice(), 1, 1_000_000);
        range(errors, "upsell.maxTickets", upsell.maxTickets(), 1, 50);
    }

    private void validateThemes(GameConfig config, List<String> errors) {
        if (config.themes() == null || config.themes().isEmpty()) {
            errors.add("themes: блок отсутствует");
            return;
        }
        for (String required : REQUIRED_THEMES) {
            if (!config.themes().containsKey(required)) {
                errors.add("themes." + required + ": тема обязательна");
            }
        }
        config.themes().forEach((name, theme) -> validateTheme(name, theme, errors));
    }

    private void validateTheme(String name, GameConfig.Theme theme, List<String> errors) {
        String prefix = "themes." + name;
        if (theme == null) {
            errors.add(prefix + ": блок отсутствует");
            return;
        }
        if (isBlank(theme.title())) {
            errors.add(prefix + ".title: обязательное значение");
        }
        range(errors, prefix + ".levels", theme.levels(), 1, 30);

        List<Double> levels = theme.levelMultipliers();
        if (levels == null || levels.size() != theme.levels()) {
            errors.add(prefix + ".levelMultipliers: количество значений должно быть равно levels (" + theme.levels() + ")");
        } else {
            double previous = 1.0;
            for (int i = 0; i < levels.size(); i++) {
                Double value = levels.get(i);
                if (value == null || value <= previous) {
                    errors.add(prefix + ".levelMultipliers[" + i + "]: значения должны строго возрастать и быть больше 1.0");
                    break;
                }
                previous = value;
            }
        }

        List<Double> loot = theme.lootProbabilities();
        if (loot == null || loot.size() != theme.levels()) {
            errors.add(prefix + ".lootProbabilities: количество значений должно быть равно levels (" + theme.levels() + ")");
        } else {
            double sum = 0;
            for (int i = 0; i < loot.size(); i++) {
                Double value = loot.get(i);
                if (value == null || value < 0) {
                    errors.add(prefix + ".lootProbabilities[" + i + "]: значение не может быть отрицательным");
                    return;
                }
                sum += value;
            }
            if (sum <= 0) {
                errors.add(prefix + ".lootProbabilities: сумма вероятностей должна быть больше нуля");
            }
        }

        List<GameConfig.BetOption> options = theme.betOptions();
        if (options == null || options.size() != 4) {
            errors.add(prefix + ".betOptions: требуется ровно 4 фрагмента ставки");
            return;
        }
        for (int i = 0; i < options.size(); i++) {
            GameConfig.BetOption option = options.get(i);
            String optionPrefix = prefix + ".betOptions[" + i + "]";
            if (option == null || isBlank(option.id())) {
                errors.add(optionPrefix + ".id: обязательное значение");
                continue;
            }
            range(errors, optionPrefix + ".cost", option.cost(), 1, 1_000_000);
            range(errors, optionPrefix + ".boosterTier", option.boosterTier(), 1, 4);
        }
    }

    private void range(List<String> errors, String field, double value, double min, double max) {
        if (Double.isNaN(value) || value < min || value > max) {
            errors.add(field + ": допустимый диапазон " + trim(min) + "..." + trim(max) + ", получено " + trim(value));
        }
    }

    private String trim(double value) {
        return value == Math.rint(value) ? String.valueOf((long) value) : String.valueOf(value);
    }

    private boolean isBlank(String value) {
        return value == null || value.isBlank();
    }
}
