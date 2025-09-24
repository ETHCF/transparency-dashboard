package auth

import (
	"strings"
	"testing"
	"time"

	"github.com/google/uuid"
	"github.com/stretchr/testify/require"

	"github.com/ETHCF/transparency-dashboard/backend/pkg/config"
)

func Test_NewMessageToSign(t *testing.T) {
	conf := &config.Config{
		Auth: config.Auth{
			Domain:          "example.com",
			ChallengeExpire: 1 * time.Minute,
			NonceExpire:     5 * time.Minute,
		},
	}
	user := "0x0d2a8b91b97e26dd08eede6a755c4bbf36b8f311"
	nonce := uuid.New()
	msg, err := NewMessageToSign(conf, user, nonce)
	require.NoError(t, err)

	msgStr := msg.String()
	_, err = ParseMessage(msgStr)
	require.NoError(t, err)

}

func Test_ParseMessage(t *testing.T) {
	msgStr := `example.com wants you to sign in with your Ethereum account:
0x84ee3d844e6019d48309270531485375dbfe6edf

I agree to the terms of service

URI: example.com
Version: 1
Chain ID: 1
Nonce: 9257e7c9-a180-45d0-bd84-29af9f77c9bc
Issued At: 2024-04-27T18:11:09Z
Expiration Time: 2024-04-27T18:10:09Z
Not Before: 2024-04-27T18:11:09Z`

	msg, err := ParseMessage(msgStr)
	require.NoError(t, err)

	require.EqualValues(t, "0x84ee3d844e6019d48309270531485375dbfe6edf", strings.ToLower(msg.GetAddress().Hex()))
	require.EqualValues(t, "example.com", msg.GetDomain())
	require.EqualValues(t, "9257e7c9-a180-45d0-bd84-29af9f77c9bc", msg.GetNonce())
	require.EqualValues(t, "2024-04-27T18:10:09Z", *msg.GetExpirationTime())
	require.EqualValues(t, "2024-04-27T18:11:09Z", msg.GetIssuedAt())
	require.EqualValues(t, "I agree to the terms of service", *msg.GetStatement())

	msgStr = "example.com wants you to sign in with your Ethereum account:\n0x31Cb7f492F860e34BB627A1152eFD58FCc9da4A9\n\nI agree to the terms of service\n\nURI: example.com\nVersion: 1\nChain ID: 1\nNonce: a5bd6d44-efff-4624-bfd3-6d6121f3397a\nIssued At: 2024-05-20T22:28:23Z\nExpiration Time: 2024-05-20T22:43:23Z\nNot Before: 2024-05-20T22:28:23Z"

	msg, err = ParseMessage(msgStr)
	require.NoError(t, err)

	require.EqualValues(t, "0x31Cb7f492F860e34BB627A1152eFD58FCc9da4A9", msg.GetAddress().Hex())
	require.EqualValues(t, "example.com", msg.GetDomain())
	require.EqualValues(t, "a5bd6d44-efff-4624-bfd3-6d6121f3397a", msg.GetNonce())
	require.EqualValues(t, "2024-05-20T22:43:23Z", *msg.GetExpirationTime())
	require.EqualValues(t, "2024-05-20T22:28:23Z", msg.GetIssuedAt())
	require.EqualValues(t, "I agree to the terms of service", *msg.GetStatement())

}
