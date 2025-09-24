package eth

type JSONRPCResponse[T any] struct {
	JSONRPC string `json:"jsonrpc"`
	ID      int    `json:"id"`
	Result  T      `json:"result"`
}

type Transaction struct {
	BlockHash            string `json:"blockHash"`
	BlockNumber          string `json:"blockNumber"`
	Hash                 string `json:"hash"`
	TransactionIndex     string `json:"transactionIndex"`
	Type                 string `json:"type"`
	Nonce                string `json:"nonce"`
	Input                string `json:"input"`
	R                    string `json:"r"`
	S                    string `json:"s"`
	ChainID              string `json:"chainId"`
	V                    string `json:"v"`
	Gas                  string `json:"gas"`
	MaxPriorityFeePerGas string `json:"maxPriorityFeePerGas"`
	From                 string `json:"from"`
	To                   string `json:"to"`
	MaxFeePerGas         string `json:"maxFeePerGas"`
	Value                string `json:"value"`
	GasPrice             string `json:"gasPrice"`
}

type TransactionReceipt struct {
	BlockHash         string `json:"blockHash"`
	BlockNumber       string `json:"blockNumber"`
	CumulativeGasUsed string `json:"cumulativeGasUsed"`
	EffectiveGasPrice string `json:"effectiveGasPrice"`
	From              string `json:"from"`
	GasUsed           string `json:"gasUsed"`
	Logs              []struct {
		Address          string   `json:"address"`
		Topics           []string `json:"topics"`
		Data             string   `json:"data"`
		BlockNumber      string   `json:"blockNumber"`
		TransactionHash  string   `json:"transactionHash"`
		TransactionIndex string   `json:"transactionIndex"`
		BlockHash        string   `json:"blockHash"`
		LogIndex         string   `json:"logIndex"`
		Removed          bool     `json:"removed"`
	} `json:"logs"`
	LogsBloom        string `json:"logsBloom"`
	Status           string `json:"status"`
	To               string `json:"to"`
	TransactionHash  string `json:"transactionHash"`
	TransactionIndex string `json:"transactionIndex"`
	Type             string `json:"type"`
}
