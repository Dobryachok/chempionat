package ru.stoloto.balloon.config;

import org.springframework.boot.context.properties.ConfigurationProperties;

/**
 * Application level settings (not the game economy itself).
 */
@ConfigurationProperties(prefix = "game")
public class GameProperties {

    private String configPath = "./config/game-config.json";
    private String allowedOrigins = "http://localhost:5173";

    public String getConfigPath() {
        return configPath;
    }

    public void setConfigPath(String configPath) {
        this.configPath = configPath;
    }

    public String getAllowedOrigins() {
        return allowedOrigins;
    }

    public void setAllowedOrigins(String allowedOrigins) {
        this.allowedOrigins = allowedOrigins;
    }
}
