package ru.stoloto.balloon.persistence;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface PlayerRepository extends JpaRepository<PlayerEntity, Long> {

    Optional<PlayerEntity> findFirstByBotFalseOrderByIdAsc();

    List<PlayerEntity> findAllByOrderByGamePointsDescIdAsc();

    List<PlayerEntity> findAllByBotTrue();
}
