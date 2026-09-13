package ru.stoloto.balloon.config;

import com.fasterxml.jackson.databind.ObjectMapper;
import jakarta.annotation.PostConstruct;
import jakarta.annotation.PreDestroy;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.core.io.ClassPathResource;
import org.springframework.stereotype.Service;

import java.io.IOException;
import java.io.InputStream;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.nio.file.StandardCopyOption;
import java.nio.file.StandardWatchEventKinds;
import java.nio.file.WatchEvent;
import java.nio.file.WatchKey;
import java.nio.file.WatchService;
import java.time.Instant;
import java.util.List;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.atomic.AtomicLong;

/**
 * Owns the external game configuration file: loads it, validates it, exposes the current
 * snapshot and reloads it automatically when the file changes on disk (hot reload).
 */
@Service
public class ConfigService {

    private static final Logger log = LoggerFactory.getLogger(ConfigService.class);
    private static final String DEFAULT_RESOURCE = "default-game-config.json";

    private final GameProperties properties;
    private final ConfigValidator validator;
    private final ObjectMapper objectMapper;

    private final AtomicLong version = new AtomicLong();
    private volatile GameConfig current;
    private volatile Instant updatedAt = Instant.now();
    private volatile Thread watcherThread;
    private volatile boolean running;

    public ConfigService(GameProperties properties, ConfigValidator validator, ObjectMapper objectMapper) {
        this.properties = properties;
        this.validator = validator;
        this.objectMapper = objectMapper;
    }

    @PostConstruct
    void start() throws IOException {
        Path path = configPath();
        if (!Files.exists(path)) {
            Files.createDirectories(path.toAbsolutePath().getParent());
            try (InputStream in = new ClassPathResource(DEFAULT_RESOURCE).getInputStream()) {
                Files.copy(in, path, StandardCopyOption.REPLACE_EXISTING);
            }
            log.info("Создан конфигурационный файл по умолчанию: {}", path.toAbsolutePath());
        }
        GameConfig loaded = readFile(path);
        List<String> errors = validator.validate(loaded);
        if (!errors.isEmpty()) {
            throw new IllegalStateException("Некорректный game-config.json: " + String.join("; ", errors));
        }
        apply(loaded);
        log.info("Конфигурация загружена из {} (версия {})", path.toAbsolutePath(), version.get());
        startWatcher(path);
    }

    @PreDestroy
    void stop() {
        running = false;
        Thread thread = watcherThread;
        if (thread != null) {
            thread.interrupt();
        }
    }

    public GameConfig current() {
        return current;
    }

    public long version() {
        return version.get();
    }

    public Instant updatedAt() {
        return updatedAt;
    }

    public Path configPath() {
        return Paths.get(properties.getConfigPath()).toAbsolutePath().normalize();
    }

    /**
     * Validates and persists a new configuration. Returns the list of validation errors;
     * an empty list means the configuration was applied.
     */
    public synchronized List<String> update(GameConfig candidate) {
        List<String> errors = validator.validate(candidate);
        if (!errors.isEmpty()) {
            return errors;
        }
        try {
            Path path = configPath();
            Files.createDirectories(path.getParent());
            objectMapper.writerWithDefaultPrettyPrinter().writeValue(path.toFile(), candidate);
        } catch (IOException e) {
            return List.of("Не удалось записать файл конфигурации: " + e.getMessage());
        }
        apply(candidate);
        log.info("Конфигурация обновлена через админ-API (версия {})", version.get());
        return List.of();
    }

    private void apply(GameConfig config) {
        this.current = config;
        this.updatedAt = Instant.now();
        this.version.incrementAndGet();
    }

    private GameConfig readFile(Path path) throws IOException {
        return objectMapper.readValue(path.toFile(), GameConfig.class);
    }

    private void startWatcher(Path path) {
        running = true;
        Path directory = path.getParent();
        Thread thread = new Thread(() -> watchLoop(directory, path), "game-config-watcher");
        thread.setDaemon(true);
        thread.start();
        watcherThread = thread;
    }

    private void watchLoop(Path directory, Path file) {
        try (WatchService watchService = directory.getFileSystem().newWatchService()) {
            directory.register(watchService,
                    StandardWatchEventKinds.ENTRY_MODIFY,
                    StandardWatchEventKinds.ENTRY_CREATE);
            while (running) {
                WatchKey key = watchService.poll(1, TimeUnit.SECONDS);
                if (key == null) {
                    continue;
                }
                boolean touched = false;
                for (WatchEvent<?> event : key.pollEvents()) {
                    Object context = event.context();
                    if (context instanceof Path changed && changed.getFileName().equals(file.getFileName())) {
                        touched = true;
                    }
                }
                key.reset();
                if (touched) {
                    // Editors often write in several steps, so let the file settle first.
                    Thread.sleep(250);
                    reloadFromDisk(file);
                }
            }
        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
        } catch (IOException e) {
            log.warn("Наблюдение за конфигурацией остановлено: {}", e.getMessage());
        }
    }

    private void reloadFromDisk(Path file) {
        try {
            GameConfig candidate = readFile(file);
            List<String> errors = validator.validate(candidate);
            if (!errors.isEmpty()) {
                log.warn("Изменения в {} отклонены: {}", file.getFileName(), String.join("; ", errors));
                return;
            }
            if (candidate.equals(current)) {
                return;
            }
            apply(candidate);
            log.info("Конфигурация перечитана с диска (версия {})", version.get());
        } catch (IOException e) {
            log.warn("Не удалось перечитать конфигурацию: {}", e.getMessage());
        }
    }
}
