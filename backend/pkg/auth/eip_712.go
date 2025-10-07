package auth

import (
	"fmt"
	"strings"
	"time"

	"github.com/ethereum/go-ethereum/common/math"
	"github.com/ethereum/go-ethereum/crypto"
	"github.com/ethereum/go-ethereum/signer/core/apitypes"

	"github.com/ETHCF/transparency-dashboard/backend/pkg/config"
)

type EIP712Challenge struct {
	Hash string         `json:"hash"`
	Data map[string]any `json:"data"`

	underlying apitypes.TypedData
}

func GenEIP712DelegateChallenge(conf *config.Config, signerAddr, delegateTo string) (EIP712Challenge, error) {

	signerData := apitypes.TypedData{
		Types: apitypes.Types{
			"Challenge": []apitypes.Type{
				{Name: "delegateTo", Type: "address"},
				{Name: "address", Type: "address"},
				{Name: "timestamp", Type: "int256"},
				{Name: "message", Type: "string"},
			},
			"EIP712Domain": []apitypes.Type{
				{Name: "name", Type: "string"},
				{Name: "chainId", Type: "uint256"},
				{Name: "version", Type: "string"},
				{Name: "salt", Type: "string"},
			},
		},
		PrimaryType: "Challenge",
		Domain: apitypes.TypedDataDomain{
			Name:    conf.Domain,
			Version: "1",
			ChainId: math.NewHexOrDecimal256(1),
			Salt:    "ETH will rise!",
		},
		Message: apitypes.TypedDataMessage{
			"timestamp":  math.NewHexOrDecimal256(time.Now().Unix()),
			"delegateTo": strings.ToLower(delegateTo),
			"address":    strings.ToLower(signerAddr),
			"message":    "I agree to the terms of service",
		},
	}

	typedDataHash, err := signerData.HashStruct(signerData.PrimaryType, signerData.Message)
	if err != nil {
		return EIP712Challenge{}, err
	}
	domainSeparator, err := signerData.HashStruct("EIP712Domain", signerData.Domain.Map())
	if err != nil {
		return EIP712Challenge{}, err
	}

	dataToHash := []byte(fmt.Sprintf("\x19\x01%s%s", string(domainSeparator), string(typedDataHash)))
	challengeHash := crypto.Keccak256Hash(dataToHash)

	out := EIP712Challenge{
		Data:       signerData.Map(),
		Hash:       challengeHash.Hex(),
		underlying: signerData,
	}

	return out, nil
}
