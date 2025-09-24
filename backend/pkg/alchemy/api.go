package alchemy

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"io"
	"math/big"
	"net/http"
	"strconv"
	"strings"
	"time"

	"github.com/numbergroup/errors"

	"github.com/ETHCF/transparency-dashboard/backend/pkg/config"
)

type api struct {
	apiKey string
	client *http.Client
}

type API interface {
	TokenBalances(ctx context.Context, address string) ([]TokenBalance, error)
	GetAssetTransfers(ctx context.Context, options GetTransfersOptions) ([]TokenTransfer, error)
	GetTokenPrices(ctx context.Context, tokens []string) (map[string]float64, error)
}

func NewAPI(conf *config.Config) API {
	return &api{
		client: &http.Client{Timeout: conf.AlchemyAPITimeout},
		apiKey: conf.AlchemyAPIKey,
	}
}

func (a *api) newRequest(ctx context.Context, method string, params any) (*http.Request, error) {
	reqBody := map[string]any{
		"jsonrpc": "2.0",
		"method":  method,
		"params":  params,
		"id":      time.Now().Unix(),
	}
	data, err := json.Marshal(reqBody)
	if err != nil {
		return nil, errors.Wrap(err, "failed to marshal request body")
	}

	url := "https://eth-mainnet.g.alchemy.com/v2/" + a.apiKey
	return http.NewRequestWithContext(ctx, http.MethodPost, url, bytes.NewReader(data))

}

func (a *api) doRequest(req *http.Request) ([]byte, error) {
	req.Header.Set("Content-Type", "application/json")

	resp, err := a.client.Do(req)
	if err != nil {
		return nil, errors.Wrap(err, "failed to perform request")
	}
	defer resp.Body.Close()

	respData, err := io.ReadAll(resp.Body)
	if err != nil {
		return nil, errors.Wrap(err, "failed to read response body")
	}

	if resp.StatusCode != http.StatusOK {
		return nil, errors.Errorf("unexpected status code: %d\n: %s", resp.StatusCode, string(respData))
	}
	return respData, nil
}

func (a *api) TokenBalances(ctx context.Context, address string) ([]TokenBalance, error) {
	req, err := a.newRequest(ctx, "alchemy_getTokenBalances", []any{address, "erc20"})
	if err != nil {
		return nil, errors.Wrap(err, "failed to create request")
	}
	respData, err := a.doRequest(req)
	if err != nil {
		return nil, err
	}

	var result JSONRPCResponse[TokenBalanceResult]
	err = json.Unmarshal(respData, &result)
	if err != nil {
		return nil, errors.Wrap(err, "failed to unmarshal response")
	}

	balances := []TokenBalance{}
	for _, tb := range result.Result.TokenBalances {
		bal, ok := new(big.Int).SetString(tb.TokenBalance[2:], 16)
		if !ok {
			return nil, errors.Errorf("failed to parse token balance: %s", tb.TokenBalance)
		}
		balances = append(balances, TokenBalance{
			Address: strings.ToLower(tb.ContractAddress),
			Balance: bal,
		})
	}
	return balances, nil
}

const maxCount int64 = 1000

func (a *api) GetAssetTransfers(ctx context.Context, options GetTransfersOptions) ([]TokenTransfer, error) {
	var out []TokenTransfer
	var pageKey *string = nil
	for {
		req, err := a.newRequest(ctx, "alchemy_getAssetTransfers", options.ToParams(maxCount, pageKey))
		if err != nil {
			return nil, errors.Wrap(err, "failed to create request")
		}
		respData, err := a.doRequest(req)
		if err != nil {
			return nil, err
		}

		var result JSONRPCResponse[TokenTransferResult]
		err = json.Unmarshal(respData, &result)
		if err != nil {
			return nil, errors.Wrap(err, "failed to unmarshal response")
		}
		transfers, err := result.Result.ToTokenTransfers()
		if err != nil {
			return nil, errors.Wrap(err, "failed to convert transfers")
		}
		out = append(out, transfers...)
		if result.Result.PageKey == "" {
			break
		}
		pageKey = &result.Result.PageKey
	}
	return out, nil
}

func (a *api) GetTokenPrices(ctx context.Context, tokens []string) (map[string]float64, error) {

	addrs := []map[string]string{}
	for _, addr := range tokens {
		addrs = append(addrs, map[string]string{
			"network": "eth-mainnet",
			"address": addr,
		})
	}

	body := map[string]any{
		"addresses": addrs,
	}

	data, err := json.Marshal(body)
	if err != nil {
		return nil, errors.Wrap(err, "failed to marshal request body")
	}

	req, err := http.NewRequestWithContext(ctx, http.MethodPost, fmt.Sprintf("https://api.g.alchemy.com/prices/v1/%s/tokens/by-address", a.apiKey), bytes.NewReader(data))
	if err != nil {
		return nil, errors.Wrap(err, "failed to create request")
	}
	req.Header.Set("Content-Type", "application/json")

	resp, err := a.client.Do(req)
	if err != nil {
		return nil, errors.Wrap(err, "failed to perform request")
	}
	defer resp.Body.Close()

	respData, err := io.ReadAll(resp.Body)
	if err != nil {
		return nil, errors.Wrap(err, "failed to read response body")
	}

	if resp.StatusCode != http.StatusOK {
		return nil, errors.Errorf("unexpected status code: %d\n: %s", resp.StatusCode, string(respData))
	}

	var result PriceResponse
	err = json.Unmarshal(respData, &result)
	if err != nil {
		return nil, errors.Wrap(err, "failed to unmarshal response")
	}
	out := make(map[string]float64)
	for _, priceInfo := range result.Data {
		for _, price := range priceInfo.Prices {
			if price.Currency == "usd" {
				val, err := strconv.ParseFloat(price.Value, 64)
				if err != nil {
					return nil, errors.Wrap(err, "failed to parse price value")
				}
				out[strings.ToLower(priceInfo.Address)] = val
			}
		}
	}
	return out, nil
}
