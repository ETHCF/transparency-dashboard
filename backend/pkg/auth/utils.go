package auth

import (
	"fmt"
	"strings"

	"github.com/ethereum/go-ethereum/accounts"
	"github.com/ethereum/go-ethereum/common"
	"github.com/ethereum/go-ethereum/common/hexutil"
	"github.com/ethereum/go-ethereum/crypto"
	"github.com/sirupsen/logrus"
)

func PersonalSignHash(msg []byte) common.Hash {

	msgStr := fmt.Sprintf("\x19Ethereum Signed Message:\n%d%s", len(msg), string(msg))
	return crypto.Keccak256Hash([]byte(msgStr))
}

func VerifySignature(log logrus.Ext1FieldLogger, msg, sig, addr string) (bool, error) {
	decodedSig, err := hexutil.Decode(sig)
	if err != nil {
		log.WithError(err).WithFields(logrus.Fields{
			"signature": sig,
			"addr":      addr,
		}).Error("error decoding signature")
		return false, err
	}

	msgStr := accounts.TextHash([]byte(msg))
	if decodedSig[crypto.RecoveryIDOffset] == 27 || decodedSig[crypto.RecoveryIDOffset] == 28 {
		decodedSig[crypto.RecoveryIDOffset] -= 27 // Transform yellow paper V from 27/28 to 0/1
	}
	recovered, err := crypto.SigToPub(msgStr, decodedSig)
	if err != nil {
		log.WithError(err).WithFields(logrus.Fields{
			"signature": sig,
			"addr":      addr,
		}).Error("error recovering public key")
		return false, err
	}

	recoveredAddr := crypto.PubkeyToAddress(*recovered).Hex()
	if !strings.EqualFold(recoveredAddr, addr) {
		log.WithFields(logrus.Fields{
			"recovered": recoveredAddr,
			"expected":  addr,
			"hash":      msgStr,
		}).Error("recovered address does not match expected address")
		return false, nil
	}
	return true, nil
}
