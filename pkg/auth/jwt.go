package auth

import (
	"crypto/rsa"
	"crypto/x509"
	"encoding/base64"
	"fmt"

	"github.com/golang-jwt/jwt/v5"
)

// UserClaims represents the JWT claims for authenticated users
type UserClaims struct {
	Email string `json:"email"`
	// Contains standard fields (exp, sub, iss, aud, etc.)
	jwt.RegisteredClaims
}

// JwtAuthenticator handles JWT token validation
type JwtAuthenticator struct {
	publicKey *rsa.PublicKey
}

// NewJwtAuthenticator decodes your Base64 key and parses it to an RSA key once.
func NewJwtAuthenticator(base64Key string) (*JwtAuthenticator, error) {
	// 1. Decode Base64 to get the PEM string (or raw bytes)
	keyBytes, err := base64.StdEncoding.DecodeString(base64Key)
	if err != nil {
		return nil, fmt.Errorf("base64 decode failed: %w", err)
	}

	// 2. Parse the PKIX (X.509) DER bytes directly
	pub, err := x509.ParsePKIXPublicKey(keyBytes)
	if err != nil {
		return nil, fmt.Errorf("failed to parse RSA key: %w", err)
	}

	// 3. Assert that the key is actually an RSA key
	// ParsePKIXPublicKey returns interface{}, so we must cast it.
	rsaPub, ok := pub.(*rsa.PublicKey)
	if !ok {
		return nil, fmt.Errorf("not an RSA public key")
	}

	return &JwtAuthenticator{publicKey: rsaPub}, nil
}

// ValidateToken checks the signature and expiration
func (a *JwtAuthenticator) ValidateToken(tokenString string) (*UserClaims, error) {
	// Parse the token, providing the key verification callback
	token, err := jwt.ParseWithClaims(tokenString, &UserClaims{}, func(token *jwt.Token) (interface{}, error) {
		// Ensure the signing method is actually RSA (security best practice)
		if _, ok := token.Method.(*jwt.SigningMethodRSA); !ok {
			return nil, fmt.Errorf("unexpected signing method: %v", token.Header["alg"])
		}
		return a.publicKey, nil
	})

	if err != nil {
		return nil, err
	}

	// Extract and return custom claims if valid
	if claims, ok := token.Claims.(*UserClaims); ok && token.Valid {
		return claims, nil
	}

	return nil, fmt.Errorf("invalid token")
}
