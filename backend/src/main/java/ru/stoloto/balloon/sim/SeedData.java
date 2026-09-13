package ru.stoloto.balloon.sim;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.ApplicationRunner;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import ru.stoloto.balloon.persistence.PlayerEntity;
import ru.stoloto.balloon.persistence.PlayerRepository;
import ru.stoloto.balloon.persistence.TournamentEntity;
import ru.stoloto.balloon.persistence.TournamentRepository;

import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.List;
import java.util.Map;

/**
 * Demo data so that experts can walk through every scenario without any setup:
 * a demo player with a non-zero bonus balance plus simulated tournament rivals.
 */
@Configuration
public class SeedData {

    private static final Logger log = LoggerFactory.getLogger(SeedData.class);

    private static final String DEMO_PLAYER = "Вы";
    private static final long DEMO_BALANCE = 12_450;
    private static final long DEMO_POINTS = 7_820;

    private static final Map<String, Long> BOTS = Map.of(
            "LuckyMan", 12_450L,
            "Dilma", 10_930L,
            "Kira", 9_870L,
            "Sanya", 8_640L,
            "Zicv", 8_450L,
            "Nastya", 6_990L,
            "Tema", 6_340L,
            "Egorka", 5_120L,
            "Mira", 4_480L,
            "Vitalik", 3_260L
    );

    @Bean
    ApplicationRunner seedRunner(PlayerRepository players, TournamentRepository tournaments) {
        return args -> {
            if (players.count() == 0) {
                PlayerEntity demo = new PlayerEntity();
                demo.setName(DEMO_PLAYER);
                demo.setBalance(DEMO_BALANCE);
                demo.setGamePoints(DEMO_POINTS);
                demo.setBot(false);
                players.save(demo);

                List<PlayerEntity> bots = BOTS.entrySet().stream().map(entry -> {
                    PlayerEntity bot = new PlayerEntity();
                    bot.setName(entry.getKey());
                    bot.setBalance(10_000);
                    bot.setGamePoints(entry.getValue());
                    bot.setBot(true);
                    return bot;
                }).toList();
                players.saveAll(bots);
                log.info("Созданы демо-игрок «{}» с балансом {} и {} соперников", DEMO_PLAYER, DEMO_BALANCE, bots.size());
            }

            if (tournaments.count() == 0) {
                TournamentEntity tournament = new TournamentEntity();
                tournament.setName("Турнир «Воздушный шар»");
                tournament.setDescription("Набирайте игровые очки за пройденные уровни и бустеры. "
                        + "Победители определяются по количеству очков на момент окончания турнира.");
                tournament.setStartsAt(Instant.now());
                tournament.setEndsAt(Instant.now().plus(20, ChronoUnit.DAYS));
                tournament.setActive(true);
                tournaments.save(tournament);
                log.info("Создан активный турнир длительностью 20 дней");
            }
        };
    }
}
