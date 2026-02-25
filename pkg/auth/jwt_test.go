package auth

import (
	"crypto/rand"
	"crypto/rsa"
	"crypto/x509"
	"encoding/base64"
	"testing"
	"time"

	"github.com/golang-jwt/jwt/v5"
)

// Generates a test RSA key pair and returns the base64-encoded public key
// and the private key for signing test tokens.
func generateTestKeys(t *testing.T) (string, *rsa.PrivateKey) {
	t.Helper()

	privateKey, err := rsa.GenerateKey(rand.Reader, 2048)
	if err != nil {
		t.Fatalf("failed to generate RSA key: %v", err)
	}

	pubBytes, err := x509.MarshalPKIXPublicKey(&privateKey.PublicKey)
	if err != nil {
		t.Fatalf("failed to marshal public key: %v", err)
	}

	base64Key := base64.StdEncoding.EncodeToString(pubBytes)
	return base64Key, privateKey
}

func signToken(t *testing.T, claims jwt.Claims, key *rsa.PrivateKey) string {
	t.Helper()
	token := jwt.NewWithClaims(jwt.SigningMethodRS256, claims)
	signed, err := token.SignedString(key)
	if err != nil {
		t.Fatalf("failed to sign token: %v", err)
	}
	return signed
}

func TestNewJwtAuthenticator_ValidKey(t *testing.T) {
	base64Key, _ := generateTestKeys(t)

	auth, err := NewJwtAuthenticator(base64Key)
	if err != nil {
		t.Fatalf("expected no error, got: %v", err)
	}
	if auth == nil {
		t.Fatal("expected non-nil authenticator")
	}
}

func TestNewJwtAuthenticator_InvalidBase64(t *testing.T) {
	_, err := NewJwtAuthenticator("not-valid-base64!!!")
	if err == nil {
		t.Fatal("expected error for invalid base64, got nil")
	}
}

func TestNewJwtAuthenticator_InvalidKey(t *testing.T) {
	// Valid base64, but not a valid RSA key
	invalidKey := base64.StdEncoding.EncodeToString([]byte("this is not an RSA key"))
	_, err := NewJwtAuthenticator(invalidKey)
	if err == nil {
		t.Fatal("expected error for invalid key data, got nil")
	}
}

func TestValidateToken_ValidToken(t *testing.T) {
	base64Key, privateKey := generateTestKeys(t)
	auth, err := NewJwtAuthenticator(base64Key)
	if err != nil {
		t.Fatalf("failed to create authenticator: %v", err)
	}

	claims := &UserClaims{
		Email: "user@example.com",
		RegisteredClaims: jwt.RegisteredClaims{
			Subject:   "user-123",
			ExpiresAt: jwt.NewNumericDate(time.Now().Add(1 * time.Hour)),
			IssuedAt:  jwt.NewNumericDate(time.Now()),
		},
	}

	tokenString := signToken(t, claims, privateKey)

	result, err := auth.ValidateToken(tokenString)
	if err != nil {
		t.Fatalf("expected no error, got: %v", err)
	}

	if result.Email != "user@example.com" {
		t.Errorf("expected email %q, got %q", "user@example.com", result.Email)
	}
	if result.Subject != "user-123" {
		t.Errorf("expected subject %q, got %q", "user-123", result.Subject)
	}
}

func TestValidateToken_ExpiredToken(t *testing.T) {
	base64Key, privateKey := generateTestKeys(t)
	auth, err := NewJwtAuthenticator(base64Key)
	if err != nil {
		t.Fatalf("failed to create authenticator: %v", err)
	}

	claims := &UserClaims{
		Email: "user@example.com",
		RegisteredClaims: jwt.RegisteredClaims{
			Subject:   "user-123",
			ExpiresAt: jwt.NewNumericDate(time.Now().Add(-1 * time.Hour)), // expired
			IssuedAt:  jwt.NewNumericDate(time.Now().Add(-2 * time.Hour)),
		},
	}

	tokenString := signToken(t, claims, privateKey)

	_, err = auth.ValidateToken(tokenString)
	if err == nil {
		t.Fatal("expected error for expired token, got nil")
	}
}

func TestValidateToken_WrongSigningKey(t *testing.T) {
	base64Key, _ := generateTestKeys(t)
	auth, err := NewJwtAuthenticator(base64Key)
	if err != nil {
		t.Fatalf("failed to create authenticator: %v", err)
	}

	// Sign with a DIFFERENT key
	_, differentKey := generateTestKeys(t)
	claims := &UserClaims{
		Email: "attacker@example.com",
		RegisteredClaims: jwt.RegisteredClaims{
			Subject:   "user-456",
			ExpiresAt: jwt.NewNumericDate(time.Now().Add(1 * time.Hour)),
			IssuedAt:  jwt.NewNumericDate(time.Now()),
		},
	}

	tokenString := signToken(t, claims, differentKey)

	_, err = auth.ValidateToken(tokenString)
	if err == nil {
		t.Fatal("expected error for token signed with wrong key, got nil")
	}
}

func TestValidateToken_TamperedToken(t *testing.T) {
	base64Key, privateKey := generateTestKeys(t)
	auth, err := NewJwtAuthenticator(base64Key)
	if err != nil {
		t.Fatalf("failed to create authenticator: %v", err)
	}

	claims := &UserClaims{
		Email: "user@example.com",
		RegisteredClaims: jwt.RegisteredClaims{
			Subject:   "user-123",
			ExpiresAt: jwt.NewNumericDate(time.Now().Add(1 * time.Hour)),
			IssuedAt:  jwt.NewNumericDate(time.Now()),
		},
	}

	tokenString := signToken(t, claims, privateKey)

	// Tamper with the token by modifying a character
	tampered := tokenString[:len(tokenString)-5] + "XXXXX"

	_, err = auth.ValidateToken(tampered)
	if err == nil {
		t.Fatal("expected error for tampered token, got nil")
	}
}

func TestValidateToken_GarbageInput(t *testing.T) {
	base64Key, _ := generateTestKeys(t)
	auth, err := NewJwtAuthenticator(base64Key)
	if err != nil {
		t.Fatalf("failed to create authenticator: %v", err)
	}

	_, err = auth.ValidateToken("not.a.jwt")
	if err == nil {
		t.Fatal("expected error for garbage input, got nil")
	}
}
