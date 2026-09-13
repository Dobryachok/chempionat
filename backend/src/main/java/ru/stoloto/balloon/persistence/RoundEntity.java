package ru.stoloto.balloon.persistence;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

import java.time.Instant;

@Entity
@Table(name = "rounds")
public class RoundEntity {

    public enum Status {
        IN_PROGRESS,
        CASHED_OUT,
        CRASHED
    }

    @Id
    private String id;

    @Column(nullable = false)
    private Long playerId;

    @Column(nullable = false)
    private String playerName;

    @Column(nullable = false)
    private String theme;

    @Column(nullable = false)
    private long bet;

    @Column(nullable = false)
    private int boosterTier;

    @Column(nullable = false)
    private double boosterValue;

    /** Level that holds the booster, 0 when the round has no booster. */
    @Column(nullable = false)
    private int boosterLevel;

    @Column(nullable = false)
    private boolean boosterApplied;

    @Column(nullable = false)
    private double crashMultiplier;

    private Double cashoutMultiplier;

    @Column(nullable = false)
    private long win;

    @Column(nullable = false)
    private int points;

    @Column(nullable = false)
    private int levelsReached;

    private String rewardTitle;

    private String rewardRarity;

    @Column(nullable = false)
    private String commitHash;

    @Column(nullable = false)
    private String serverSeed;

    /** Set once the "Закрепи успех" offer of this round has been used. */
    @Column(nullable = false)
    private boolean upsellAccepted;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 16)
    private Status status = Status.IN_PROGRESS;

    @Column(nullable = false)
    private Instant createdAt = Instant.now();

    private Instant finishedAt;

    public String getId() {
        return id;
    }

    public void setId(String id) {
        this.id = id;
    }

    public Long getPlayerId() {
        return playerId;
    }

    public void setPlayerId(Long playerId) {
        this.playerId = playerId;
    }

    public String getPlayerName() {
        return playerName;
    }

    public void setPlayerName(String playerName) {
        this.playerName = playerName;
    }

    public String getTheme() {
        return theme;
    }

    public void setTheme(String theme) {
        this.theme = theme;
    }

    public long getBet() {
        return bet;
    }

    public void setBet(long bet) {
        this.bet = bet;
    }

    public int getBoosterTier() {
        return boosterTier;
    }

    public void setBoosterTier(int boosterTier) {
        this.boosterTier = boosterTier;
    }

    public double getBoosterValue() {
        return boosterValue;
    }

    public void setBoosterValue(double boosterValue) {
        this.boosterValue = boosterValue;
    }

    public int getBoosterLevel() {
        return boosterLevel;
    }

    public void setBoosterLevel(int boosterLevel) {
        this.boosterLevel = boosterLevel;
    }

    public boolean isBoosterApplied() {
        return boosterApplied;
    }

    public void setBoosterApplied(boolean boosterApplied) {
        this.boosterApplied = boosterApplied;
    }

    public double getCrashMultiplier() {
        return crashMultiplier;
    }

    public void setCrashMultiplier(double crashMultiplier) {
        this.crashMultiplier = crashMultiplier;
    }

    public Double getCashoutMultiplier() {
        return cashoutMultiplier;
    }

    public void setCashoutMultiplier(Double cashoutMultiplier) {
        this.cashoutMultiplier = cashoutMultiplier;
    }

    public long getWin() {
        return win;
    }

    public void setWin(long win) {
        this.win = win;
    }

    public int getPoints() {
        return points;
    }

    public void setPoints(int points) {
        this.points = points;
    }

    public int getLevelsReached() {
        return levelsReached;
    }

    public void setLevelsReached(int levelsReached) {
        this.levelsReached = levelsReached;
    }

    public String getRewardTitle() {
        return rewardTitle;
    }

    public void setRewardTitle(String rewardTitle) {
        this.rewardTitle = rewardTitle;
    }

    public String getRewardRarity() {
        return rewardRarity;
    }

    public void setRewardRarity(String rewardRarity) {
        this.rewardRarity = rewardRarity;
    }

    public String getCommitHash() {
        return commitHash;
    }

    public void setCommitHash(String commitHash) {
        this.commitHash = commitHash;
    }

    public String getServerSeed() {
        return serverSeed;
    }

    public void setServerSeed(String serverSeed) {
        this.serverSeed = serverSeed;
    }

    public boolean isUpsellAccepted() {
        return upsellAccepted;
    }

    public void setUpsellAccepted(boolean upsellAccepted) {
        this.upsellAccepted = upsellAccepted;
    }

    public Status getStatus() {
        return status;
    }

    public void setStatus(Status status) {
        this.status = status;
    }

    public Instant getCreatedAt() {
        return createdAt;
    }

    public void setCreatedAt(Instant createdAt) {
        this.createdAt = createdAt;
    }

    public Instant getFinishedAt() {
        return finishedAt;
    }

    public void setFinishedAt(Instant finishedAt) {
        this.finishedAt = finishedAt;
    }
}
