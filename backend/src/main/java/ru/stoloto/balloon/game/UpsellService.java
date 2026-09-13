package ru.stoloto.balloon.game;

import org.springframework.stereotype.Service;
import ru.stoloto.balloon.config.GameConfig;

/**
 * Personalised "Закрепи успех" offer: lottery tickets bought with bonus points after a win.
 */
@Service
public class UpsellService {

    /**
     * @param eligible       whether the popup may be shown at all
     * @param tickets        how many tickets are offered
     * @param price          total price in bonus points
     * @param timeoutSeconds auto close timeout from the configuration
     */
    public record Offer(boolean eligible, int tickets, long price, long ticketPrice, int timeoutSeconds, long minWinAmount) {
    }

    /**
     * The offer grows with the win but never exceeds the balance:
     * <pre>tickets = clamp(1 + win / (2 * ticketPrice), 1, maxTickets)</pre>
     */
    public Offer offerFor(GameConfig config, boolean cashedOut, long win, long bet, long balance) {
        GameConfig.Upsell upsell = config.upsell();
        if (!cashedOut || win < upsell.minWinAmount() || balance < upsell.ticketPrice()) {
            return new Offer(false, 0, 0, upsell.ticketPrice(), upsell.popupTimeoutSeconds(), upsell.minWinAmount());
        }
        long scaled = 1 + win / Math.max(1, upsell.ticketPrice() * 2);
        int tickets = (int) Math.min(upsell.maxTickets(), Math.max(1, scaled));
        // A larger bet means a more confident player, so round the offer up by one ticket.
        if (bet >= 500 && tickets < upsell.maxTickets()) {
            tickets++;
        }
        long price = tickets * upsell.ticketPrice();
        while (price > balance && tickets > 1) {
            tickets--;
            price = tickets * upsell.ticketPrice();
        }
        return new Offer(true, tickets, price, upsell.ticketPrice(), upsell.popupTimeoutSeconds(), upsell.minWinAmount());
    }
}
