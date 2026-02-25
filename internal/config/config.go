package config

import (
	"fmt"
	"log"
	"os"
	"strconv"

	"github.com/joho/godotenv"
)

// Config holds all application configuration
type Config struct {
	DBConnectionUrl    string
	DBMaxOpenConns     int
	DBMaxIdleConns     int
	DBConnMaxLifetime  string // e.g. "5m", "1h"
	CorsAllowedOrigins string
	AuthCookieName     string
	JwtPublicKeyBase64 string
	DevAuthEnabled     bool
	Port               string
}

// Load reads configuration from environment variables
func Load() *Config {
	// Load .env file if present
	if err := godotenv.Load(); err != nil {
		log.Println("No .env file found")
	}

	return &Config{
		DBConnectionUrl: 	os.Getenv("DB_URL"),
		// Sane defaults for a small application.
		// Increase these if we see connection exhaustion under higher load or have more concurrent users.
		DBMaxOpenConns:     getEnvAsIntOrDefault("DB_MAX_OPEN_CONNS", 25),
		DBMaxIdleConns:     getEnvAsIntOrDefault("DB_MAX_IDLE_CONNS", 25),
		DBConnMaxLifetime:  getEnvOrDefault("DB_CONN_MAX_LIFETIME", "5m"),
		CorsAllowedOrigins: os.Getenv("CORS_ALLOWED_ORIGINS"),
		AuthCookieName:     getEnvOrDefault("AUTH_COOKIE_NAME", "jscom_auth_token"),
		JwtPublicKeyBase64: os.Getenv("JWT_PUBLIC_KEY_BASE64"),
		DevAuthEnabled:     os.Getenv("DEV_AUTH_ENABLED") == "true",
		Port:               getEnvOrDefault("PORT", "8080"),
	}
}

// Validate ensures all required configuration values are present
func (c *Config) Validate() error {
	if c.DBConnectionUrl == "" {
		return fmt.Errorf("DB_URL is required")
	}
	if c.JwtPublicKeyBase64 == "" {
		return fmt.Errorf("JWT_PUBLIC_KEY_BASE64 is required")
	}
	return nil
}

// getEnvOrDefault returns environment variable value or default if not set
func getEnvOrDefault(key, defaultValue string) string {
	if value := os.Getenv(key); value != "" {
		return value
	}
	return defaultValue
}

// getEnvAsIntOrDefault returns environment variable value as int or default if not set/invalid
func getEnvAsIntOrDefault(key string, defaultValue int) int {
	if valueStr := os.Getenv(key); valueStr != "" {
		if value, err := strconv.Atoi(valueStr); err == nil {
			return value
		}
	}
	return defaultValue
}
