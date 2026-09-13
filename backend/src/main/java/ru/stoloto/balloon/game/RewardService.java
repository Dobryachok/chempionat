package ru.stoloto.balloon.game;

import org.springframework.stereotype.Component;

import java.util.List;
import java.util.concurrent.ThreadLocalRandom;

/**
 * Extra in-game reward of a round: a collectible puzzle fragment.
 * A full set of nine fragments completes the "Воздушный шар" collection.
 */
@Component
public class RewardService {

    public record Reward(int index, String title, String rarity, int weight) {
    }

    private static final List<Reward> PIECES = List.of(
            new Reward(1, "Рассвет", "common", 22),
            new Reward(2, "Облако", "common", 20),
            new Reward(3, "Стая птиц", "common", 18),
            new Reward(4, "Тёплый ветер", "common", 15),
            new Reward(5, "Горелка", "rare", 9),
            new Reward(6, "Корзина", "rare", 7),
            new Reward(7, "Радуга", "rare", 5),
            new Reward(8, "Ночное небо", "epic", 3),
            new Reward(9, "Золотой шар", "epic", 1)
    );

    public static int totalPieces() {
        return PIECES.size();
    }

    public Reward draw() {
        int total = PIECES.stream().mapToInt(Reward::weight).sum();
        int point = ThreadLocalRandom.current().nextInt(total);
        int accumulated = 0;
        for (Reward piece : PIECES) {
            accumulated += piece.weight();
            if (point < accumulated) {
                return piece;
            }
        }
        return PIECES.getFirst();
    }
}
