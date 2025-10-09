package types

import (
	"time"

	"github.com/google/uuid"
	"gopkg.in/guregu/null.v4"
)

type CreateMonthlyBudgetAllocation struct {
	Manager  null.String `json:"manager" db:"manager" binding:"required"`
	Category string      `json:"category" db:"category" binding:"required"`
	Amount   string      `json:"amount" db:"amount" binding:"required"`
}

type MonthlyBudgetAllocation struct {
	ID        uuid.UUID   `json:"id" db:"id"`
	Manager   null.String `json:"manager" db:"manager"`
	Category  string      `json:"category" db:"category"`
	Amount    string      `json:"amount" db:"amount"`
	CreatedAt time.Time   `json:"createdAt" db:"created_at"`
	UpdatedAt time.Time   `json:"updatedAt" db:"updated_at"`
}

func (mba MonthlyBudgetAllocation) ToCreate() CreateMonthlyBudgetAllocation {
	return CreateMonthlyBudgetAllocation{
		Manager:  mba.Manager,
		Category: mba.Category,
		Amount:   mba.Amount,
	}
}
