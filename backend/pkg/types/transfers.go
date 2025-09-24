package types

import (
	"time"

	"github.com/google/uuid"
)

type TransferType string

const (
	TransferTypeIncoming TransferType = "incoming"
	TransferTypeOutgoing TransferType = "outgoing"
)

type TransferParty struct {
	Address   string    `json:"address" db:"address"`
	Name      string    `json:"name" db:"name"`
	CreatedAt time.Time `json:"createdAt" db:"created_at"`
	UpdatedAt time.Time `json:"updatedAt" db:"updated_at"`
}

type CreateTransfer struct {
	TxHash         string       `json:"txHash" db:"tx_hash"`
	BlockNumber    int64        `json:"blockNumber" db:"block_number"`
	BlockTimestamp int64        `json:"blockTimestamp" db:"block_timestamp"`
	FromAddress    string       `json:"payerAddress" db:"payer_address"`
	ToAddress      string       `json:"payeeAddress" db:"payee_address"`
	Asset          string       `json:"asset" db:"asset"`
	Amount         string       `json:"amount" db:"amount"` // High precision decimal as string
	Direction      TransferType `json:"direction" db:"direction"`
	LogIndex       int          `json:"logIndex" db:"log_index"`
}

type Transfer struct {
	CreateTransfer
	ID          uuid.UUID `json:"id" db:"id"`
	PayerName   string    `json:"payerName" db:"payer_name"`
	PayeeName   string    `json:"payeeName" db:"payee_name"`
	AssetName   string    `json:"assetName" db:"asset_name"`
	AssetSymbol string    `json:"assetSymbol" db:"asset_symbol"`
}

type UpdateTransferPartyNameRequest struct {
	Name string `json:"name" binding:"required"`
}
