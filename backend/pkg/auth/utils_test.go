package auth

import (
	"testing"

	"github.com/sirupsen/logrus"
	"github.com/stretchr/testify/require"
)

func Test_PersonalSignHash(t *testing.T) {
	msg := `usecorn.com wants you to sign in with your Ethereum account:
0x19E62F1565AcF400F28B4785a7B9C8A623f55151

I agree to the terms of service at https://usecorn.com/tos

URI: usecorn.com
Version: 1
Chain ID: 1
Nonce: 710d4350-d855-4acd-b73c-583d9fc2e472
Issued At: 2024-08-07T15:28:12Z
Expiration Time: 2024-08-07T15:43:12Z
Not Before: 2024-08-07T15:28:12Z`

	res := PersonalSignHash([]byte(msg))
	require.Equal(t, res.Hex(), "0x564fc0e08eff04e504be1d9748df70708c40a7d8796bca850dee6dd0f6ab87c9")
}

func Test_VerifySignature(t *testing.T) {
	log := logrus.New()
	msgStr := "cornbase.com wants you to sign in with your Ethereum account:\n0x31Cb7f492F860e34BB627A1152eFD58FCc9da4A9\n\nI agree to the terms of service at https://cornbase.com/tos\n\nURI: cornbase.com\nVersion: 1\nChain ID: 1\nNonce: 4f2bfc96-65e9-4d55-b83e-0b1920bf7b9f\nIssued At: 2024-05-20T23:18:20Z\nExpiration Time: 2024-05-20T23:33:20Z\nNot Before: 2024-05-20T23:18:20Z"

	sig := "0x216e2994d7009e7e1620ad52a9e046c68d196bae2478f8f06e4e4f148a82ba335cd10f799607532c0f2ed71bc1dff6f72b32c445d9f1f1a50f0e524735f595511b"
	ok, err := VerifySignature(log, msgStr, sig, "0x31Cb7f492F860e34BB627A1152eFD58FCc9da4A9")

	require.NoError(t, err)
	require.True(t, ok)
}
