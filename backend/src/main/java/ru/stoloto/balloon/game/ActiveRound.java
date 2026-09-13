package ru.stoloto.balloon.game;

import ru.stoloto.balloon.config.GameConfig;

import java.util.List;
import java.util.Map;
import java.util.concurrent.ScheduledFuture;
import java.util.function.Consumer;

/**
 * Mutable state of a flight that is currently in the air. Lives only on the server.
 * The configuration is captured at round start, so edits made while the balloon flies
 * are applied to the next round instead of changing the rules mid-flight.
 */
public class ActiveRound {

    private final String id;
    private final long playerId;
    private final String playerName;
    private final String themeName;
    private final GameConfig config;
    private final GameConfig.Theme theme;
    private final long bet;
    private final int boosterTier;
    private final double boosterValue;
    private final int lootLine;
    private final double crashMultiplier;
    private final String serverSeed;
    private final String commitHash;

    private volatile int tick;
    private volatile double baseMultiplier = 1.0;
    private volatile double boosterFactor = 1.0;
    private volatile int levelsCrossed;
    private volatile boolean boosterApplied;
    private volatile boolean cashedOut;
    private volatile Double cashoutMultiplier;
    private volatile long win;
    private volatile int points;
    private volatile boolean finished;
    private volatile ScheduledFuture<?> task;
    private volatile Consumer<Map<String, Object>> sink;

    public ActiveRound(String id,
                       long playerId,
                       String playerName,
                       String themeName,
                       GameConfig config,
                       GameConfig.Theme theme,
                       long bet,
                       int boosterTier,
                       double boosterValue,
                       CrashGenerator.RoundSecret secret) {
        this.id = id;
        this.playerId = playerId;
        this.playerName = playerName;
        this.themeName = themeName;
        this.config = config;
        this.theme = theme;
        this.bet = bet;
        this.boosterTier = boosterTier;
        this.boosterValue = boosterValue;
        this.lootLine = secret.lootLine();
        this.crashMultiplier = secret.crashMultiplier();
        this.serverSeed = secret.serverSeed();
        this.commitHash = secret.commitHash();
    }

    public String id() {
        return id;
    }

    public long playerId() {
        return playerId;
    }

    public String playerName() {
        return playerName;
    }

    public String themeName() {
        return themeName;
    }

    public GameConfig config() {
        return config;
    }

    public GameConfig.Theme theme() {
        return theme;
    }

    public List<Double> levelMultipliers() {
        return theme.levelMultipliers();
    }

    public long bet() {
        return bet;
    }

    public int boosterTier() {
        return boosterTier;
    }

    public double boosterValue() {
        return boosterValue;
    }

    public int lootLine() {
        return lootLine;
    }

    public double crashMultiplier() {
        return crashMultiplier;
    }

    public String serverSeed() {
        return serverSeed;
    }

    public String commitHash() {
        return commitHash;
    }

    public int tick() {
        return tick;
    }

    public void setTick(int tick) {
        this.tick = tick;
    }

    public double baseMultiplier() {
        return baseMultiplier;
    }

    public void setBaseMultiplier(double baseMultiplier) {
        this.baseMultiplier = baseMultiplier;
    }

    /** Multiplier shown to the player: base growth times the booster, once it is applied. */
    public double effectiveMultiplier() {
        return baseMultiplier * boosterFactor;
    }

    public double boosterFactor() {
        return boosterFactor;
    }

    public void applyBooster() {
        this.boosterFactor = boosterValue;
        this.boosterApplied = true;
    }

    public boolean boosterApplied() {
        return boosterApplied;
    }

    public int levelsCrossed() {
        return levelsCrossed;
    }

    public void setLevelsCrossed(int levelsCrossed) {
        this.levelsCrossed = levelsCrossed;
    }

    public boolean cashedOut() {
        return cashedOut;
    }

    public Double cashoutMultiplier() {
        return cashoutMultiplier;
    }

    public void markCashedOut(double multiplier, long win) {
        this.cashedOut = true;
        this.cashoutMultiplier = multiplier;
        this.win = win;
    }

    public long win() {
        return win;
    }

    public int points() {
        return points;
    }

    public void addPoints(int amount) {
        this.points += amount;
    }

    public boolean finished() {
        return finished;
    }

    public void markFinished() {
        this.finished = true;
    }

    public ScheduledFuture<?> task() {
        return task;
    }

    public void setTask(ScheduledFuture<?> task) {
        this.task = task;
    }

    public void setSink(Consumer<Map<String, Object>> sink) {
        this.sink = sink;
    }

    public void emit(Map<String, Object> event) {
        Consumer<Map<String, Object>> current = sink;
        if (current != null) {
            current.accept(event);
        }
    }
}
