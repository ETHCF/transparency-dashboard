package auth

import (
	"fmt"
	"strings"
	"time"

	"github.com/google/uuid"
	"github.com/numbergroup/siwe-go"

	"github.com/ETHCF/transparency-dashboard/backend/pkg/config"
)

func NewMessageToSign(conf *config.Config, user string, nonce uuid.UUID) (*siwe.Message, error) {

	return siwe.InitMessage(conf.Domain, user, conf.Domain, nonce.String(), map[string]any{
		"notBefore":      time.Now().UTC().Format(time.RFC3339),
		"expirationTime": time.Now().Add(conf.Auth.ChallengeExpire).UTC().Format(time.RFC3339),
		"statement":      "I agree to the terms of service",
	})
}

// The library is broken so we need to do manually parsing
func ParseMessage(msg string) (*siwe.Message, error) {
	lines := strings.Split(msg, "\n")
	if len(lines) != 12 {
		return nil, fmt.Errorf("invalid message")
	}

	var (
		statement                                       = strings.TrimSpace(lines[3])
		addr                                            = strings.TrimSpace(lines[1])
		uri, nonce, issuedAt, expirationTime, notBefore string
	)

	for i := 5; i < 12; i++ {
		pieces := strings.SplitN(lines[i], ":", 2)
		if len(pieces) != 2 {
			continue
		}

		switch strings.TrimSpace(pieces[0]) {
		case "URI":
			uri = strings.TrimSpace(pieces[1])
		case "Nonce":
			nonce = strings.TrimSpace(pieces[1])
		case "Issued At":
			issuedAt = strings.TrimSpace(pieces[1])
		case "Expiration Time":
			expirationTime = strings.TrimSpace(pieces[1])
		case "Not Before":
			notBefore = strings.TrimSpace(pieces[1])
		}
	}

	return siwe.InitMessage(uri, addr, "https://"+uri, nonce, map[string]any{
		"notBefore":      notBefore,
		"expirationTime": expirationTime,
		"statement":      statement,
		"issuedAt":       issuedAt,
	})

}
