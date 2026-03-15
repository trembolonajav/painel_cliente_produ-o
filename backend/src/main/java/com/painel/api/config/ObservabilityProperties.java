package com.painel.api.config;

import org.springframework.boot.context.properties.ConfigurationProperties;

@ConfigurationProperties(prefix = "app.observability")
public class ObservabilityProperties {

    private final Requests requests = new Requests();
    private final Database database = new Database();

    public Requests getRequests() {
        return requests;
    }

    public Database getDatabase() {
        return database;
    }

    public static class Requests {
        private boolean enabled = true;
        private long warnThresholdMs = 750;
        private boolean includeHealth = false;

        public boolean isEnabled() {
            return enabled;
        }

        public void setEnabled(boolean enabled) {
            this.enabled = enabled;
        }

        public long getWarnThresholdMs() {
            return warnThresholdMs;
        }

        public void setWarnThresholdMs(long warnThresholdMs) {
            this.warnThresholdMs = warnThresholdMs;
        }

        public boolean isIncludeHealth() {
            return includeHealth;
        }

        public void setIncludeHealth(boolean includeHealth) {
            this.includeHealth = includeHealth;
        }
    }

    public static class Database {
        private long slowQueryThresholdMs = 300;

        public long getSlowQueryThresholdMs() {
            return slowQueryThresholdMs;
        }

        public void setSlowQueryThresholdMs(long slowQueryThresholdMs) {
            this.slowQueryThresholdMs = slowQueryThresholdMs;
        }
    }
}
