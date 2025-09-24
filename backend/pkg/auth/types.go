package auth

import (
	"strings"

	"github.com/numbergroup/errors"
	"github.com/ethereum/go-ethereum/accounts"
	"github.com/numbergroup/siwe-go"
)

const (
	SIWEAuthn = "siwe"
)

type GenerateChallengeRequest struct {
	Address string `json:"address"`
	Website string `json:"website"`
}

type LoginRequest struct {
	SIWEMessage string `json:"siweMessage"`
	Signature   string `json:"signature"`
}

func (lr LoginRequest) GetMessage() (*siwe.Message, error) {
	return ParseMessage(lr.SIWEMessage)
}

func NewAuthenticationRequest(lr LoginRequest, ipAddr string) (Authentication, error) {
	msg, err := lr.GetMessage()
	if err != nil {
		return Authentication{}, err
	}
	return Authentication{
		LoginRequest: lr,
		IPAddr:       ipAddr,
		Msg:          msg,
		UserAddress:  strings.ToLower(msg.GetAddress().Hex()),
		Website:      msg.GetDomain(),
	}, nil
}

type Authentication struct {
	LoginRequest
	IPAddr      string
	UserAddress string
	Website     string
	Msg         *siwe.Message
}

func (authn Authentication) Hash() []byte {
	return accounts.TextHash([]byte(authn.SIWEMessage))
}

type Claims struct {
	User string         `json:"userID"`
	Meta map[string]any `json:"meta,omitempty"`
}

func (c *Claims) Valid() error {
	if len(c.User) == 0 {
		return errors.New("missing userID")
	}
	return nil
}
