package types

import (
	"time"
)

type Asset struct {
	ChainID  int64  `json:"chainId" db:"chain_id"`
	Address  string `json:"address" db:"address"`
	Name     string `json:"name" db:"name"`
	Symbol   string `json:"symbol" db:"symbol"`
	Decimals int    `json:"decimals" db:"decimals"`
}

type WalletBalance struct {
	ChainID     int64     `json:"chainId" db:"chain_id"`
	Address     string    `json:"address" db:"address"`
	Wallet      string    `json:"wallet" db:"wallet"`
	Amount      string    `json:"amount" db:"amount"`
	UsdWorth    float64   `json:"usdWorth" db:"usd_worth"`
	EthWorth    string    `json:"ethWorth" db:"eth_worth"`
	LastUpdated time.Time `json:"lastUpdated" db:"last_updated"`
}

type Wallet struct {
	Address string `json:"address" db:"address"`
}

type TreasuryResponse struct {
	OrganizationName     string          `json:"organizationName"`
	Assets               []Asset         `json:"assets"`
	WalletBalances       []WalletBalance `json:"walletBalances"`
	Wallets              []Wallet        `json:"wallets"`
	TotalValueUsd        float64         `json:"totalValueUsd"`
	TotalValueEth        string          `json:"totalValueEth"` // High precision decimal as string
	TotalFundsRaised     float64         `json:"totalFundsRaised"`
	TotalFundsRaisedUnit string          `json:"totalFundsRaisedUnit"`
	LastUpdated          time.Time       `json:"lastUpdated"`
}
