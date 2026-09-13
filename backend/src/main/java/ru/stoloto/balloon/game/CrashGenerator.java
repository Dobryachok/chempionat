package ru.stoloto.balloon.game;

import org.springframework.stereotype.Component;
import ru.stoloto.balloon.config.GameConfig;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.security.SecureRandom;
import java.util.HexFormat;
import java.util.List;
import java.util.Random;

/**
 * Server side source of all randomness in the game. The client never takes part in it:
 * the crash point and the booster position are drawn before the flight starts and the client
 * only receives a SHA-256 commitment, which is verifiable once the seed is revealed after the crash.
 */
@Component
public class CrashGenerator {

    private final SecureRandom secureRandom = new SecureRandom();

    /**
     * @param serverSeed      secret of the round, revealed after the crash
     * @param crashMultiplier base multiplier at which the balloon bursts
     * @param lootLine        level holding the booster, 0 when the round has no booster
     * @param commitHash      SHA-256 of "seed:crash:lootLine", published before the flight
     */
    public record RoundSecret(String serverSeed, double crashMultiplier, int lootLine, String commitHash) {
    }

    public RoundSecret generate(GameConfig config, GameConfig.Theme theme, int boosterTier) {
        String seed = resolveSeed(config);
        Random random = deterministicRandom(seed);

        double crashMultiplier = drawCrashMultiplier(config.math(), random);
        int lootLine = boosterTier >= 2 ? drawLootLine(theme, random) : 0;
        String commitHash = sha256(seed + ":" + String.format(java.util.Locale.ROOT, "%.4f", crashMultiplier) + ":" + lootLine);

        return new RoundSecret(seed, crashMultiplier, lootLine, commitHash);
    }

    /**
     * Pareto distributed crash point:
     * <pre>crash = clamp(minCrash * (1 - u) ^ (-1 / alpha), minCrash, maxMultiplier)</pre>
     * with an extra {@code instantCrashProbability} mass on the lowest possible multiplier,
     * which is what gives the game its house edge.
     */
    private double drawCrashMultiplier(GameConfig.MathModel math, Random random) {
        double u = random.nextDouble();
        if (u < math.instantCrashProbability()) {
            return math.minCrashMultiplier();
        }
        double normalized = (u - math.instantCrashProbability()) / (1.0 - math.instantCrashProbability());
        double tail = Math.max(1e-12, 1.0 - normalized);
        double crash = math.minCrashMultiplier() * Math.pow(tail, -1.0 / math.alpha());
        return Math.min(math.maxMultiplier(), Math.max(math.minCrashMultiplier(), crash));
    }

    /**
     * Weighted draw of the level that holds the booster, using line_N_loot_prob of the theme.
     */
    private int drawLootLine(GameConfig.Theme theme, Random random) {
        List<Double> weights = theme.lootProbabilities();
        double total = weights.stream().mapToDouble(Double::doubleValue).sum();
        double point = random.nextDouble() * total;
        double accumulated = 0;
        for (int i = 0; i < weights.size(); i++) {
            accumulated += weights.get(i);
            if (point <= accumulated) {
                return i + 1;
            }
        }
        return weights.size();
    }

    private String resolveSeed(GameConfig config) {
        String fixed = config.dev() == null ? null : config.dev().fixedSeed();
        if (fixed != null && !fixed.isBlank()) {
            return fixed;
        }
        byte[] bytes = new byte[32];
        secureRandom.nextBytes(bytes);
        return HexFormat.of().formatHex(bytes);
    }

    /**
     * Same seed always yields the same round, which is what makes the dev mode reproducible.
     */
    private Random deterministicRandom(String seed) {
        byte[] digest = sha256Bytes(seed);
        long value = 0;
        for (int i = 0; i < 8; i++) {
            value = (value << 8) | (digest[i] & 0xFFL);
        }
        return new Random(value);
    }

    public String sha256(String input) {
        return HexFormat.of().formatHex(sha256Bytes(input));
    }

    private byte[] sha256Bytes(String input) {
        try {
            return MessageDigest.getInstance("SHA-256").digest(input.getBytes(StandardCharsets.UTF_8));
        } catch (NoSuchAlgorithmException e) {
            throw new IllegalStateException("SHA-256 недоступен", e);
        }
    }
}
