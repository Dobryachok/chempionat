package ru.stoloto.balloon.api;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import ru.stoloto.balloon.config.ConfigService;
import ru.stoloto.balloon.game.PlayerService;
import ru.stoloto.balloon.game.RoundArchive;
import ru.stoloto.balloon.game.UpsellService;
import ru.stoloto.balloon.persistence.PlayerEntity;
import ru.stoloto.balloon.persistence.RoundEntity;

/**
 * "Закрепи успех": buying lottery tickets with bonus points is simulated inside the prototype.
 * The offer is recomputed on the server, so the client cannot ask for a cheaper deal.
 */
@RestController
@RequestMapping("/api/upsell")
public class UpsellController {

    public record AcceptRequest(@NotNull Long playerId, @NotBlank String roundId) {
    }

    public record AcceptResponse(int tickets, long price, long balance, int totalTickets) {
    }

    private final ConfigService configService;
    private final RoundArchive archive;
    private final PlayerService playerService;
    private final UpsellService upsellService;

    public UpsellController(ConfigService configService,
                           RoundArchive archive,
                           PlayerService playerService,
                           UpsellService upsellService) {
        this.configService = configService;
        this.archive = archive;
        this.playerService = playerService;
        this.upsellService = upsellService;
    }

    @PostMapping("/accept")
    public AcceptResponse accept(@Valid @RequestBody AcceptRequest request) {
        RoundEntity round = archive.find(request.roundId())
                .orElseThrow(() -> new IllegalArgumentException("Раунд не найден: " + request.roundId()));
        if (!round.getPlayerId().equals(request.playerId())) {
            throw new IllegalArgumentException("Раунд принадлежит другому игроку");
        }
        if (round.isUpsellAccepted()) {
            throw new IllegalStateException("Предложение по этому раунду уже использовано");
        }

        PlayerEntity player = playerService.require(request.playerId());
        UpsellService.Offer offer = upsellService.offerFor(
                configService.current(),
                round.getStatus() == RoundEntity.Status.CASHED_OUT,
                round.getWin(),
                round.getBet(),
                player.getBalance());
        if (!offer.eligible()) {
            throw new IllegalStateException("Предложение недоступно для этого раунда");
        }

        PlayerEntity updated = playerService.buyTickets(request.playerId(), offer.tickets(), offer.price());
        round.setUpsellAccepted(true);
        archive.save(round);

        return new AcceptResponse(offer.tickets(), offer.price(), updated.getBalance(), updated.getTickets());
    }
}
