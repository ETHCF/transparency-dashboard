package alchemy

import (
	"math/big"
	"strconv"
	"strings"
	"time"

	"github.com/ETHCF/transparency-dashboard/backend/pkg/constants"
	"github.com/cockroachdb/errors"
	"gopkg.in/guregu/null.v4"
)

type TokenBalance struct {
	Address string
	Balance *big.Int
}

type TokenTransfer struct {
	TxHash       string
	Block        int64
	AssetName    string
	AssetAddress string
	Amount       *big.Int
	FromAddress  string
	ToAddress    string
	Timestamp    time.Time
	LogIndex     int
}

type GetTransfersOptions struct {
	FromBlock   uint64
	ToBlock     uint64
	FromAddress *string
	ToAddress   *string
}

func (o *GetTransfersOptions) ToParams(maxCount int64, pageKey *string) GetAssetTransfersParams {
	out := GetAssetTransfersParams{
		FromBlock:        "0x" + strconv.FormatUint(o.FromBlock, 16),
		FromAddress:      o.FromAddress,
		ToAddress:        o.ToAddress,
		Category:         []string{"erc20"},
		ExcludeZeroValue: true,
		WithMetadata:     true,
		Order:            "desc",
		MaxCount:         "0x" + strconv.FormatInt(maxCount, 16),
		PageKey:          pageKey,
	}

	if o.ToBlock != 0 {
		out.ToBlock = "0x" + strconv.FormatUint(o.ToBlock, 16)
	} else {
		out.ToBlock = "latest"
	}

	return out
}

type GetAssetTransfersParams struct {
	FromBlock        string   `json:"fromBlock,omitempty"`
	ToBlock          string   `json:"toBlock,omitempty"`
	FromAddress      *string  `json:"fromAddress,omitempty"`
	ToAddress        *string  `json:"toAddress,omitempty"`
	ExcludeZeroValue bool     `json:"excludeZeroValue,omitempty"`
	Category         []string `json:"category,omitempty"`
	Order            string   `json:"order,omitempty"`
	WithMetadata     bool     `json:"withMetadata"`
	MaxCount         string   `json:"maxCount,omitempty"`
	PageKey          *string  `json:"pageKey,omitempty"`
}

type JSONRPCResponse[T any] struct {
	JSONRPC string `json:"jsonrpc"`
	ID      int    `json:"id"`
	Result  T      `json:"result"`
}

type TokenBalanceResult struct {
	Address       string `json:"address"`
	TokenBalances []struct {
		ContractAddress string `json:"contractAddress"`
		TokenBalance    string `json:"tokenBalance"`
	} `json:"tokenBalances"`
}

type TokenTransferResult struct {
	Transfers []struct {
		BlockNum        string  `json:"blockNum"`
		UniqueID        string  `json:"uniqueId"`
		Hash            string  `json:"hash"`
		From            string  `json:"from"`
		To              string  `json:"to"`
		Value           float64 `json:"value"`
		Erc721TokenID   any     `json:"erc721TokenId"`
		Erc1155Metadata any     `json:"erc1155Metadata"`
		TokenID         any     `json:"tokenId"`
		Asset           string  `json:"asset"`
		Category        string  `json:"category"`
		RawContract     struct {
			Value   string      `json:"value"`
			Address null.String `json:"address"`
			Decimal string      `json:"decimal"`
		} `json:"rawContract"`
		Metadata struct {
			BlockTimestamp time.Time `json:"blockTimestamp"`
		} `json:"metadata"`
	} `json:"transfers"`
	PageKey string `json:"pageKey"`
}

func (ttr TokenTransferResult) ToTokenTransfers() ([]TokenTransfer, error) {
	out := []TokenTransfer{}
	for _, tr := range ttr.Transfers {
		// UniqueID is in the format: "<txHash>:log:<logIndex>"
		idParts := strings.Split(tr.UniqueID, ":")
		if len(idParts) != 3 {
			return nil, errors.Errorf("invalid unique ID format: %s", tr.UniqueID)
		}
		logIndex, err := strconv.Atoi(idParts[2])
		if err != nil {
			return nil, errors.Wrapf(err, "invalid log index in unique ID: %s", tr.UniqueID)
		}
		transfer := TokenTransfer{
			TxHash:      tr.Hash,
			AssetName:   strings.ToLower(tr.Asset),
			FromAddress: strings.ToLower(tr.From),
			ToAddress:   strings.ToLower(tr.To),
			Timestamp:   tr.Metadata.BlockTimestamp,
			LogIndex:    logIndex,
		}
		if tr.RawContract.Address.Valid {
			transfer.AssetAddress = strings.ToLower(tr.RawContract.Address.String)
		} else {
			transfer.AssetAddress = constants.EtherAddress
		}
		blockNum, err := strconv.ParseInt(tr.BlockNum[2:], 16, 64)
		if err != nil {
			return nil, err
		}
		amount, ok := big.NewInt(0).SetString(tr.RawContract.Value[2:], 16)
		if !ok {
			return nil, errors.Errorf("failed to parse token transfer amount: %s", tr.RawContract.Value)
		}
		transfer.Block = blockNum
		transfer.Amount = amount

		out = append(out, transfer)
	}

	return out, nil
}

type PriceResponse struct {
	Data []struct {
		Network string `json:"network"`
		Address string `json:"address"`
		Prices  []struct {
			Currency      string    `json:"currency"`
			Value         string    `json:"value"`
			LastUpdatedAt time.Time `json:"lastUpdatedAt"`
		} `json:"prices"`
	} `json:"data"`
}
