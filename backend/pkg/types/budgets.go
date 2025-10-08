package types

import (
	"time"

	"github.com/google/uuid"
	"gopkg.in/guregu/null.v4"
)

type CreateMonthlyBudget struct {
	Month    time.Time `json:"month" db:"month" binding:"required"`
	Amount   string    `json:"amount" db:"amount" binding:"required"`
	Category string    `json:"category" db:"category" binding:"required"`
}

type CreateMonthlyBudgetAllocation struct {
	Manager  null.String `json:"manager" db:"manager" binding:"required"`
	Category string      `json:"category" db:"category" binding:"required"`
	Amount   string      `json:"amount" db:"amount" binding:"required"`
}

type MonthlyBudget struct {
	ID        uuid.UUID `json:"id" db:"id"`
	Month     time.Time `json:"month" db:"month"`
	Amount    string    `json:"amount" db:"amount"`
	Category  string    `json:"category" db:"category"`
	CreatedAt time.Time `json:"createdAt" db:"created_at"`
	UpdatedAt time.Time `json:"updatedAt" db:"updated_at"`
}

func (mb MonthlyBudget) ToCreate() CreateMonthlyBudget {
	return CreateMonthlyBudget{
		Month:    mb.Month,
		Amount:   mb.Amount,
		Category: mb.Category,
	}
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
