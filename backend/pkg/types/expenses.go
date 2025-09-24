package types

import (
	"fmt"
	"time"

	"github.com/google/uuid"
	"gopkg.in/guregu/null.v4"
)

type Receipt struct {
	ID          uuid.UUID   `json:"id" db:"id"`
	ExpenseID   uuid.UUID   `json:"expenseId" db:"expense_id"`
	Name        string      `json:"name" db:"name"`
	FileName    null.String `json:"fileName" db:"file_name"`
	FileSize    int64       `json:"fileSize" db:"file_size"`
	MimeType    null.String `json:"mimeType" db:"mime_type"`
	StorageID   string      `json:"-" db:"storage_id"`  // Internal storage path, not exposed in JSON
	DownloadURL string      `json:"downloadUrl" db:"-"` // Generated URL, not stored in DB
	CreatedAt   time.Time   `json:"createdAt" db:"created_at"`
}

type Expense struct {
	ID        uuid.UUID   `json:"id" db:"id"`
	Item      string      `json:"item" db:"item"`
	Quantity  int         `json:"quantity" db:"quantity"`
	Price     string      `json:"price" db:"price"` // High precision decimal as string
	Purpose   null.String `json:"purpose" db:"purpose"`
	Category  string      `json:"category" db:"category"`
	Date      time.Time   `json:"date" db:"date"`
	TxHash    null.String `json:"txHash" db:"tx_hash"`
	CreatedAt time.Time   `json:"createdAt" db:"created_at"`
	UpdatedAt time.Time   `json:"updatedAt" db:"updated_at"`

	// Related data (populated by joins)
	Receipts []Receipt `json:"receipts,omitempty"`
}

type CreateExpenseRequest struct {
	Item     string      `json:"item" binding:"required"`
	Quantity int         `json:"quantity" binding:"required,min=1"`
	Price    string      `json:"price" binding:"required"`
	Purpose  null.String `json:"purpose"`
	Category null.String `json:"category"`
	Date     time.Time   `json:"date" binding:"required"`
	TxHash   null.String `json:"txHash"`
}

type UpdateExpenseRequest struct {
	Item     null.String `json:"item"`
	Quantity null.Int    `json:"quantity"`
	Price    null.String `json:"price"`
	Purpose  null.String `json:"purpose"`
	Category null.String `json:"category"`
	Date     null.Time   `json:"date"`
	TxHash   null.String `json:"txHash"`
}

func (updates UpdateExpenseRequest) GetSQLUpdates(argIndex int) ([]string, []any) {
	setParts := []string{}
	args := []any{}

	if updates.Item.Valid {
		setParts = append(setParts, fmt.Sprintf("item = $%d", argIndex))
		args = append(args, updates.Item.String)
		argIndex++
	}

	if updates.Quantity.Valid {
		setParts = append(setParts, fmt.Sprintf("quantity = $%d", argIndex))
		args = append(args, updates.Quantity.Int64)
		argIndex++
	}

	if updates.Price.Valid {
		setParts = append(setParts, fmt.Sprintf("price = $%d", argIndex))
		args = append(args, updates.Price.String)
		argIndex++
	}

	if updates.Purpose.Valid {
		setParts = append(setParts, fmt.Sprintf("purpose = $%d", argIndex))
		args = append(args, updates.Purpose.String)
		argIndex++
	}

	if updates.Category.Valid {
		setParts = append(setParts, fmt.Sprintf("category = $%d", argIndex))
		args = append(args, updates.Category.String)
		argIndex++
	}

	if updates.Date.Valid {
		setParts = append(setParts, fmt.Sprintf("date = $%d", argIndex))
		args = append(args, updates.Date.Time)
		argIndex++
	}

	if updates.TxHash.Valid {
		setParts = append(setParts, fmt.Sprintf("tx_hash = $%d", argIndex))
		args = append(args, updates.TxHash.String)
		argIndex++
	}
	return setParts, args
}

type UploadReceiptRequest struct {
	Name string `form:"name" binding:"required"`
	// File is handled separately by gin's multipart form handling
}
