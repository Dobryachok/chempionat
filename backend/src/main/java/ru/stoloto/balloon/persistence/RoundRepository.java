package ru.stoloto.balloon.persistence;

import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface RoundRepository extends JpaRepository<RoundEntity, String> {

    List<RoundEntity> findByStatusNotOrderByFinishedAtDesc(RoundEntity.Status status, Pageable pageable);

    List<RoundEntity> findByPlayerIdAndStatus(Long playerId, RoundEntity.Status status);
}
