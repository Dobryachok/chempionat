package ru.stoloto.balloon.game;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import ru.stoloto.balloon.persistence.PlayerEntity;
import ru.stoloto.balloon.persistence.PlayerRepository;

import java.util.Arrays;
import java.util.LinkedHashSet;
import java.util.Set;
import java.util.stream.Collectors;

@Service
public class PlayerService {

    /** Thrown when the balance is not enough for the selected bet. */
    public static class InsufficientFundsException extends RuntimeException {
        public InsufficientFundsException(String message) {
            super(message);
        }
    }

    private final PlayerRepository players;

    public PlayerService(PlayerRepository players) {
        this.players = players;
    }

    @Transactional(readOnly = true)
    public PlayerEntity require(long playerId) {
        return players.findById(playerId)
                .orElseThrow(() -> new IllegalArgumentException("Игрок не найден: " + playerId));
    }

    @Transactional(readOnly = true)
    public PlayerEntity demoPlayer() {
        return players.findFirstByBotFalseOrderByIdAsc()
                .orElseThrow(() -> new IllegalStateException("Демонстрационный игрок не создан"));
    }

    @Transactional
    public long charge(long playerId, long amount) {
        PlayerEntity player = require(playerId);
        if (player.getBalance() < amount) {
            throw new InsufficientFundsException("Не хватает бонусов");
        }
        player.setBalance(player.getBalance() - amount);
        return players.save(player).getBalance();
    }

    @Transactional
    public long credit(long playerId, long amount) {
        PlayerEntity player = require(playerId);
        player.setBalance(player.getBalance() + amount);
        return players.save(player).getBalance();
    }

    @Transactional
    public long addPoints(long playerId, int points) {
        PlayerEntity player = require(playerId);
        player.setGamePoints(player.getGamePoints() + points);
        return players.save(player).getGamePoints();
    }

    @Transactional
    public PlayerEntity addPuzzlePiece(long playerId, int pieceIndex) {
        PlayerEntity player = require(playerId);
        Set<String> pieces = parsePieces(player.getCollectedPieces());
        pieces.add(String.valueOf(pieceIndex));
        player.setCollectedPieces(String.join(",", pieces));
        return players.save(player);
    }

    @Transactional
    public PlayerEntity buyTickets(long playerId, int tickets, long price) {
        PlayerEntity player = require(playerId);
        if (player.getBalance() < price) {
            throw new InsufficientFundsException("Не хватает бонусов");
        }
        player.setBalance(player.getBalance() - price);
        player.setTickets(player.getTickets() + tickets);
        return players.save(player);
    }

    public Set<Integer> collectedPieces(PlayerEntity player) {
        return parsePieces(player.getCollectedPieces()).stream()
                .map(Integer::valueOf)
                .collect(Collectors.toCollection(LinkedHashSet::new));
    }

    private Set<String> parsePieces(String raw) {
        if (raw == null || raw.isBlank()) {
            return new LinkedHashSet<>();
        }
        return Arrays.stream(raw.split(","))
                .map(String::trim)
                .filter(value -> !value.isEmpty())
                .collect(Collectors.toCollection(LinkedHashSet::new));
    }
}
