package eth

import (
	"bytes"
	"context"
	"encoding/json"
	"io"
	"math/big"
	"net/http"
	"strconv"
	"time"

	"github.com/numbergroup/errors"

	"github.com/ETHCF/transparency-dashboard/backend/pkg/config"
)

// Client is an ultra-light version of go-ethereum's rpc client and types,
// to avoid adding a large dependency for just a few calls
type Client interface {
	GetTransactionByHash(ctx context.Context, hash string) (*Transaction, error)
	GetTransactionReceipt(ctx context.Context, hash string) (*TransactionReceipt, error)
	GetBalance(ctx context.Context, address string, blockTag string) (*big.Int, error)
	BlockNumber(ctx context.Context) (uint64, error)
}

type client struct {
	rpcURL string
	client *http.Client
}

func NewClient(conf *config.Config) Client {
	return &client{
		client: &http.Client{Timeout: conf.RPCAPITimeout},
		rpcURL: conf.RPCURL,
	}
}

func (c *client) newRequest(ctx context.Context, method string, params any) (*http.Request, error) {
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

	return http.NewRequestWithContext(ctx, http.MethodPost, c.rpcURL, bytes.NewReader(data))
}

func (c *client) doRequest(req *http.Request) ([]byte, error) {
	req.Header.Set("Content-Type", "application/json")

	resp, err := c.client.Do(req)
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

func (c *client) GetTransactionByHash(ctx context.Context, hash string) (*Transaction, error) {
	req, err := c.newRequest(ctx, "eth_getTransactionByHash", []any{hash})
	if err != nil {
		return nil, errors.Wrap(err, "failed to create request")
	}
	respData, err := c.doRequest(req)
	if err != nil {
		return nil, errors.Wrap(err, "request failed")
	}

	var resp JSONRPCResponse[Transaction]
	err = json.Unmarshal(respData, &resp)
	if err != nil {
		return nil, errors.Wrap(err, "failed to unmarshal response")
	}
	return &resp.Result, nil
}

func (c *client) GetTransactionReceipt(ctx context.Context, hash string) (*TransactionReceipt, error) {
	req, err := c.newRequest(ctx, "eth_getTransactionReceipt", []any{hash})
	if err != nil {
		return nil, errors.Wrap(err, "failed to create request")
	}
	respData, err := c.doRequest(req)
	if err != nil {
		return nil, errors.Wrap(err, "request failed")
	}

	var resp JSONRPCResponse[TransactionReceipt]
	err = json.Unmarshal(respData, &resp)
	if err != nil {
		return nil, errors.Wrap(err, "failed to unmarshal response")
	}
	return &resp.Result, nil
}

func (c *client) GetBalance(ctx context.Context, address string, blockTag string) (*big.Int, error) {
	req, err := c.newRequest(ctx, "eth_getBalance", []any{address, blockTag})
	if err != nil {
		return nil, errors.Wrap(err, "failed to create request")
	}
	respData, err := c.doRequest(req)
	if err != nil {
		return nil, errors.Wrap(err, "request failed")
	}

	var resp JSONRPCResponse[string]
	err = json.Unmarshal(respData, &resp)
	if err != nil {
		return nil, errors.Wrap(err, "failed to unmarshal response")
	}

	balance := new(big.Int)
	balance.SetString(resp.Result[2:], 16)
	return balance, nil
}

func (c *client) BlockNumber(ctx context.Context) (uint64, error) {
	req, err := c.newRequest(ctx, "eth_blockNumber", []any{})
	if err != nil {
		return 0, errors.Wrap(err, "failed to create request")
	}

	respData, err := c.doRequest(req)
	if err != nil {
		return 0, errors.Wrap(err, "request failed")
	}

	var resp JSONRPCResponse[string]
	err = json.Unmarshal(respData, &resp)
	if err != nil {
		return 0, errors.Wrap(err, "failed to unmarshal response")
	}

	return strconv.ParseUint(resp.Result[2:], 16, 64)
}
