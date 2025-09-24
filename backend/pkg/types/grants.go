package types

import (
	"fmt"
	"time"

	"github.com/google/uuid"
	"gopkg.in/guregu/null.v4"
)

type GrantStatus string

const (
	GrantStatusActive   GrantStatus = "active"
	GrantStatusPrevious GrantStatus = "previous"
)

type MilestoneStatus string

const (
	MilestoneStatusPending   MilestoneStatus = "pending"
	MilestoneStatusCompleted MilestoneStatus = "completed"
	MilestoneStatusSignedOff MilestoneStatus = "signed_off"
)

type Milestone struct {
	ID          uuid.UUID       `json:"id" db:"id"`
	GrantID     uuid.UUID       `json:"grantId" db:"grant_id"`
	Name        string          `json:"name" db:"name"`
	Description string          `json:"description" db:"description"`
	GrantAmount string          `json:"grantAmount" db:"grant_amount"` // High precision decimal as string
	Status      MilestoneStatus `json:"status" db:"status"`
	Completed   bool            `json:"completed" db:"completed"`
	OrderIndex  int             `json:"orderIndex" db:"order_index"`
	SignedOff   bool            `json:"signedOff" db:"signed_off"`
	CreatedAt   time.Time       `json:"createdAt" db:"created_at"`
	UpdatedAt   time.Time       `json:"updatedAt" db:"updated_at"`
}

type CreateDisbursement struct {
	GrantID        uuid.UUID `json:"grantId" db:"grant_id"`
	Amount         string    `json:"amount" db:"amount"` // High precision decimal as string
	TxHash         string    `json:"txHash" db:"tx_hash"`
	BlockNumber    int64     `json:"blockNumber" db:"block_number"`
	BlockTimestamp int64     `json:"blockTimestamp" db:"block_timestamp"`
}

type Disbursement struct {
	ID uuid.UUID `json:"id" db:"id"`
	CreateDisbursement
	CreatedAt time.Time `json:"createdAt" db:"created_at"`
}

type CreateFundsUsage struct {
	GrantID  uuid.UUID   `json:"grantId" db:"grant_id"`
	Item     string      `json:"item" db:"item"`
	Quantity int         `json:"quantity" db:"quantity"`
	Price    string      `json:"price" db:"price"` // FIAT_T as string for precision
	Purpose  string      `json:"purpose" db:"purpose"`
	Category string      `json:"category" db:"category"`
	Date     time.Time   `json:"date" db:"date"`
	TxHash   null.String `json:"txHash" db:"tx_hash"`
}

type UpdateFundsUsage CreateFundsUsage

type FundsUsage struct {
	ID        uuid.UUID `json:"id" db:"id"`
	CreatedAt time.Time `json:"createdAt" db:"created_at"`
	CreateFundsUsage
}

type CreateGrant struct {
	Name                   string      `json:"name" db:"name"`
	RecipientName          string      `json:"recipientName" db:"recipient_name"`
	RecipientAddress       string      `json:"recipientAddress" db:"recipient_address"`
	Description            string      `json:"description" db:"description"`
	TeamURL                null.String `json:"teamUrl" db:"team_url"`
	ProjectURL             null.String `json:"projectUrl" db:"project_url"`
	TotalGrantAmount       string      `json:"totalGrantAmount" db:"total_grant_amount"`
	InitialGrantAmount     string      `json:"initialGrantAmount" db:"initial_grant_amount"`
	StartDate              time.Time   `json:"startDate" db:"start_date"`
	ExpectedCompletionDate time.Time   `json:"expectedCompletionDate" db:"expected_completion_date"`
	AmountGivenSoFar       string      `json:"amountGivenSoFar" db:"amount_given_so_far"`
	Status                 GrantStatus `json:"status" db:"status"`
}

type Grant struct {
	ID uuid.UUID `json:"id" db:"id"`
	CreateGrant

	// Related data (populated by joins)
	Milestones    []Milestone    `json:"milestones,omitempty"`
	Disbursements []Disbursement `json:"disbursements,omitempty"`
	FundsUsage    []FundsUsage   `json:"fundsUsage,omitempty"`
}

type CreateGrantRequest struct {
	Name                   string    `json:"name" binding:"required"`
	RecipientName          string    `json:"recipientName" binding:"required"`
	RecipientAddress       string    `json:"recipientAddress" binding:"required"`
	Description            string    `json:"description" binding:"required"`
	TeamURL                string    `json:"teamUrl"`
	ProjectURL             string    `json:"projectUrl"`
	TotalGrantAmount       string    `json:"totalGrantAmount" binding:"required"`
	InitialGrantAmount     string    `json:"initialGrantAmount" binding:"required"`
	StartDate              time.Time `json:"startDate" binding:"required"`
	ExpectedCompletionDate time.Time `json:"expectedCompletionDate" binding:"required"`
	Status                 string    `json:"status" binding:"required"`
}

type UpdateGrantRequest struct {
	Name                   null.String `json:"name"`
	RecipientName          null.String `json:"recipientName"`
	RecipientAddress       null.String `json:"recipientAddress"`
	Description            null.String `json:"description"`
	TeamURL                null.String `json:"teamUrl"`
	ProjectURL             null.String `json:"projectUrl"`
	TotalGrantAmount       null.String `json:"totalGrantAmount"`
	InitialGrantAmount     null.String `json:"initialGrantAmount"`
	StartDate              null.Time   `json:"startDate"`
	ExpectedCompletionDate null.Time   `json:"expectedCompletionDate"`
	Status                 null.String `json:"status"`
}

func (updates UpdateGrantRequest) GetSQLUpdates(argIndex int) ([]string, []any) {
	setParts := []string{}
	args := []any{}

	if updates.Name.Valid {
		setParts = append(setParts, fmt.Sprintf("name = $%d", argIndex))
		args = append(args, updates.Name.String)
		argIndex++
	}

	if updates.RecipientName.Valid {
		setParts = append(setParts, fmt.Sprintf("recipient_name = $%d", argIndex))
		args = append(args, updates.RecipientName.String)
		argIndex++
	}

	if updates.RecipientAddress.Valid {
		setParts = append(setParts, fmt.Sprintf("recipient_address = $%d", argIndex))
		args = append(args, updates.RecipientAddress.String)
		argIndex++
	}

	if updates.Description.Valid {
		setParts = append(setParts, fmt.Sprintf("description = $%d", argIndex))
		args = append(args, updates.Description.String)
		argIndex++
	}

	if updates.TeamURL.Valid {
		setParts = append(setParts, fmt.Sprintf("team_url = $%d", argIndex))
		args = append(args, updates.TeamURL.String)
		argIndex++
	}

	if updates.ProjectURL.Valid {
		setParts = append(setParts, fmt.Sprintf("project_url = $%d", argIndex))
		args = append(args, updates.ProjectURL.String)
		argIndex++
	}

	if updates.TotalGrantAmount.Valid {
		setParts = append(setParts, fmt.Sprintf("total_grant_amount = $%d", argIndex))
		args = append(args, updates.TotalGrantAmount.String)
		argIndex++
	}

	if updates.InitialGrantAmount.Valid {
		setParts = append(setParts, fmt.Sprintf("initial_grant_amount = $%d", argIndex))
		args = append(args, updates.InitialGrantAmount.String)
		argIndex++
	}

	if updates.StartDate.Valid {
		setParts = append(setParts, fmt.Sprintf("start_date = $%d", argIndex))
		args = append(args, updates.StartDate.Time)
		argIndex++
	}

	if updates.ExpectedCompletionDate.Valid {
		setParts = append(setParts, fmt.Sprintf("expected_completion_date = $%d", argIndex))
		args = append(args, updates.ExpectedCompletionDate.Time)
		argIndex++
	}

	if updates.Status.Valid {
		setParts = append(setParts, fmt.Sprintf("status = $%d", argIndex))
		args = append(args, updates.Status.String)
		argIndex++
	}

	return setParts, args
}

type UpdateMilestonesRequest struct {
	Milestones []struct {
		ID          string `json:"id,omitempty"`
		Title       string `json:"title" binding:"required"`
		Description string `json:"description" binding:"required"`
		Amount      string `json:"amount" binding:"required"`
		Status      string `json:"status"`
		Completed   bool   `json:"completed"`
		SignedOff   bool   `json:"signedOff"`
	} `json:"milestones" binding:"required"`
}

type CreateDisbursementRequest struct {
	Amount         string `json:"amount" binding:"required"`
	TxHash         string `json:"txHash" binding:"required"`
	BlockNumber    int64  `json:"blockNumber" binding:"required"`
	BlockTimestamp int64  `json:"blockTimestamp" binding:"required"`
}

type UpdateDisbursementRequest struct {
	Amount         string `json:"amount" binding:"required"`
	TxHash         string `json:"txHash" binding:"required"`
	BlockNumber    int64  `json:"blockNumber" binding:"required"`
	BlockTimestamp int64  `json:"blockTimestamp" binding:"required"`
}
