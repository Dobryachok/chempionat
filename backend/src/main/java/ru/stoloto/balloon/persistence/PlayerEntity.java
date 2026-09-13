package ru.stoloto.balloon.persistence;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import jakarta.persistence.Version;

import java.time.Instant;

@Entity
@Table(name = "players")
public class PlayerEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private String name;

    @Column(nullable = false)
    private long balance;

    @Column(nullable = false)
    private long gamePoints;

    @Column(nullable = false)
    private int tickets;

    /** Simulated opponents used by the live rating and the tournament table. */
    @Column(nullable = false)
    private boolean bot;

    /** Comma separated ids of the collected puzzle fragments (the extra in-game reward). */
    @Column(length = 512)
    private String collectedPieces = "";

    @Column(nullable = false)
    private Instant createdAt = Instant.now();

    @Version
    private long lockVersion;

    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
    }

    public String getName() {
        return name;
    }

    public void setName(String name) {
        this.name = name;
    }

    public long getBalance() {
        return balance;
    }

    public void setBalance(long balance) {
        this.balance = balance;
    }

    public long getGamePoints() {
        return gamePoints;
    }

    public void setGamePoints(long gamePoints) {
        this.gamePoints = gamePoints;
    }

    public int getTickets() {
        return tickets;
    }

    public void setTickets(int tickets) {
        this.tickets = tickets;
    }

    public boolean isBot() {
        return bot;
    }

    public void setBot(boolean bot) {
        this.bot = bot;
    }

    public String getCollectedPieces() {
        return collectedPieces == null ? "" : collectedPieces;
    }

    public void setCollectedPieces(String collectedPieces) {
        this.collectedPieces = collectedPieces;
    }

    public Instant getCreatedAt() {
        return createdAt;
    }

    public void setCreatedAt(Instant createdAt) {
        this.createdAt = createdAt;
    }
}
