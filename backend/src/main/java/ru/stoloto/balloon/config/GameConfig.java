package ru.stoloto.balloon.config;

import java.util.List;
import java.util.Map;

/**
 * Full game configuration, mirrored one to one by config/game-config.json.
 * Every value here can be changed without touching the source code.
 */
public record GameConfig(
        Basic basic,
        MathModel math,
        Points points,
        Boosters boosters,
        Upsell upsell,
        Map<String, Theme> themes,
        Dev dev
) {

    public record Basic(String gameId, String gameName, String gameType, Boolean isActive) {
    }

    /**
     * Parameters of the crash distribution and of the multiplier growth curve.
     *
     * @param alpha                   Pareto shape: lower alpha means longer flights
     * @param minCrashMultiplier      lowest possible crash point
     * @param maxMultiplier           hard cap of the multiplier
     * @param multiplierGrowthRate    per tick growth: multiplier = (1 + rate) ^ tick
     * @param fps                     server ticks per second
     * @param delta                   rounding step used when the multiplier is published
     * @param instantCrashProbability probability of a crash right at the start (house edge)
     */
    public record MathModel(
            double alpha,
            double minCrashMultiplier,
            double maxMultiplier,
            double multiplierGrowthRate,
            int fps,
            double delta,
            double instantCrashProbability
    ) {
    }

    public record Points(
            int pointsPerLine,
            int pointsCashoutBonus,
            int pointsX2Bonus,
            int pointsX3Bonus,
            int pointsX4Bonus
    ) {
        public int bonusForTier(int tier) {
            return switch (tier) {
                case 2 -> pointsX2Bonus;
                case 3 -> pointsX3Bonus;
                case 4 -> pointsX4Bonus;
                default -> 0;
            };
        }
    }

    public record Boosters(
            double multiplierTier1Value,
            double multiplierTier2Value,
            double multiplierTier3Value,
            double multiplierTier4Value
    ) {
        public double valueOfTier(int tier) {
            return switch (tier) {
                case 2 -> multiplierTier2Value;
                case 3 -> multiplierTier3Value;
                case 4 -> multiplierTier4Value;
                default -> multiplierTier1Value;
            };
        }
    }

    public record Upsell(long minWinAmount, int popupTimeoutSeconds, long ticketPrice, int maxTickets) {
    }

    public record Theme(
            String title,
            int levels,
            List<Double> levelMultipliers,
            List<Double> lootProbabilities,
            List<BetOption> betOptions
    ) {
    }

    public record BetOption(String id, long cost, int boosterTier) {
    }

    /**
     * @param fixedSeed when set, every round uses this seed, which makes runs reproducible
     */
    public record Dev(String fixedSeed) {
    }

    public Theme theme(String name) {
        Theme theme = themes == null ? null : themes.get(name);
        if (theme == null) {
            throw new IllegalArgumentException("Unknown theme: " + name);
        }
        return theme;
    }
}
