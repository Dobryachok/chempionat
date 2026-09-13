package ru.stoloto.balloon.ws;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Component;
import org.springframework.web.socket.CloseStatus;
import org.springframework.web.socket.TextMessage;
import org.springframework.web.socket.WebSocketSession;
import org.springframework.web.socket.handler.TextWebSocketHandler;
import ru.stoloto.balloon.game.RoundEngine;

import java.io.IOException;
import java.util.LinkedHashMap;
import java.util.Map;

/**
 * Real-time channel of a single flight: the server pushes ticks, level crossings, the booster
 * flash and the crash; the client may only send a cashout command.
 */
@Component
public class GameWebSocketHandler extends TextWebSocketHandler {

    private static final Logger log = LoggerFactory.getLogger(GameWebSocketHandler.class);
    private static final String ROUND_ID = "roundId";

    private final RoundEngine engine;
    private final ObjectMapper objectMapper;

    public GameWebSocketHandler(RoundEngine engine, ObjectMapper objectMapper) {
        this.engine = engine;
        this.objectMapper = objectMapper;
    }

    @Override
    public void afterConnectionEstablished(WebSocketSession session) throws Exception {
        String roundId = roundIdOf(session);
        if (roundId == null) {
            session.close(CloseStatus.BAD_DATA.withReason("roundId is required"));
            return;
        }
        session.getAttributes().put(ROUND_ID, roundId);
        try {
            engine.attach(roundId, event -> send(session, event));
        } catch (IllegalArgumentException e) {
            sendError(session, e.getMessage());
            session.close(CloseStatus.NOT_ACCEPTABLE.withReason("round not found"));
        }
    }

    @Override
    protected void handleTextMessage(WebSocketSession session, TextMessage message) {
        String roundId = (String) session.getAttributes().get(ROUND_ID);
        if (roundId == null) {
            return;
        }
        try {
            Map<String, Object> payload = objectMapper.readValue(
                    message.getPayload(), new TypeReference<Map<String, Object>>() {
                    });
            String type = String.valueOf(payload.get("type"));
            switch (type) {
                case "cashout" -> engine.cashout(roundId);
                case "ping" -> send(session, Map.of("type", "pong"));
                default -> sendError(session, "Неизвестная команда: " + type);
            }
        } catch (IllegalArgumentException | IllegalStateException e) {
            sendError(session, e.getMessage());
        } catch (IOException e) {
            sendError(session, "Некорректный формат сообщения");
        }
    }

    @Override
    public void afterConnectionClosed(WebSocketSession session, CloseStatus status) {
        String roundId = (String) session.getAttributes().get(ROUND_ID);
        if (roundId != null) {
            engine.detach(roundId);
        }
    }

    private void send(WebSocketSession session, Map<String, Object> event) {
        if (!session.isOpen()) {
            return;
        }
        try {
            String json = objectMapper.writeValueAsString(event);
            synchronized (session) {
                session.sendMessage(new TextMessage(json));
            }
        } catch (IOException e) {
            log.debug("Не удалось отправить событие в сокет: {}", e.getMessage());
        }
    }

    private void sendError(WebSocketSession session, String message) {
        Map<String, Object> error = new LinkedHashMap<>();
        error.put("type", "error");
        error.put("message", message);
        send(session, error);
    }

    private String roundIdOf(WebSocketSession session) {
        String query = session.getUri() == null ? null : session.getUri().getQuery();
        if (query == null) {
            return null;
        }
        for (String pair : query.split("&")) {
            int separator = pair.indexOf('=');
            if (separator > 0 && ROUND_ID.equals(pair.substring(0, separator))) {
                return pair.substring(separator + 1);
            }
        }
        return null;
    }
}
