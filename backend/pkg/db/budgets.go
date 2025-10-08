package db

import (
	"context"
	"fmt"
	"strings"

	"github.com/google/uuid"
	"github.com/innodv/psql"
	"github.com/jmoiron/sqlx"
	"github.com/numbergroup/errors"
	"github.com/sirupsen/logrus"

	"github.com/ETHCF/transparency-dashboard/backend/pkg/config"
	"github.com/ETHCF/transparency-dashboard/backend/pkg/types"
)

type BudgetDB interface {
	GetMonthlyBudgetAllocations(ctx context.Context) ([]types.MonthlyBudgetAllocation, error)

	UpdateMonthlyBudgetAllocation(ctx context.Context, id uuid.UUID, allocation types.MonthlyBudgetAllocation) error

	CreateMonthlyBudgetAllocation(ctx context.Context, allocation types.CreateMonthlyBudgetAllocation) (uuid.UUID, error)

	DeleteMonthlyBudgetAllocation(ctx context.Context, id uuid.UUID) error
}

type budget struct {
	log                           logrus.Ext1FieldLogger
	dbConn                        *sqlx.DB
	getMonthlyBudgetAllocations   *sqlx.Stmt
	updateMonthlyBudgetAllocation *sqlx.NamedStmt
	createMonthlyBudgetAllocation *sqlx.NamedStmt
	deleteMonthlyBudgetAllocation *sqlx.Stmt
}

func NewBudgetDB(ctx context.Context, conf *config.Config, dbConn *sqlx.DB) (BudgetDB, error) {
	monthlyBudgetAllocationCols := psql.GetSQLColumnsQuoted[types.MonthlyBudgetAllocation]()

	getMonthlyBudgetAllocations, err := dbConn.PreparexContext(ctx, fmt.Sprintf(`
		SELECT %s FROM monthly_budget_allocations
		ORDER BY category ASC`, strings.Join(monthlyBudgetAllocationCols, ", ")))
	if err != nil {
		return nil, errors.Wrap(err, "failed to prepare GetMonthlyBudgetAllocations statement")
	}

	updateMonthlyBudgetAllocation, err := dbConn.PrepareNamedContext(ctx, `
		UPDATE monthly_budget_allocations
		SET manager = :manager, category = :category, amount = :amount, updated_at = NOW()
		WHERE id = :id`)
	if err != nil {
		return nil, errors.Wrap(err, "failed to prepare UpdateMonthlyBudgetAllocation statement")
	}

	createMonthlyBudgetAllocation, err := dbConn.PrepareNamedContext(ctx, fmt.Sprintf(`
		INSERT INTO monthly_budget_allocations (%s) VALUES (%s) RETURNING id`,
		strings.Join(psql.GetSQLColumnsQuoted[types.CreateMonthlyBudgetAllocation](), ", "),
		":"+strings.Join(psql.GetSQLColumns[types.CreateMonthlyBudgetAllocation](), ", :")))
	if err != nil {
		return nil, errors.Wrap(err, "failed to prepare CreateMonthlyBudgetAllocation statement")
	}

	deleteMonthlyBudgetAllocation, err := dbConn.PreparexContext(ctx, `DELETE FROM monthly_budget_allocations WHERE id = $1`)
	if err != nil {
		return nil, errors.Wrap(err, "failed to prepare DeleteMonthlyBudgetAllocation statement")
	}

	return &budget{
		log:                           conf.GetLogger(),
		dbConn:                        dbConn,
		getMonthlyBudgetAllocations:   getMonthlyBudgetAllocations,
		updateMonthlyBudgetAllocation: updateMonthlyBudgetAllocation,
		createMonthlyBudgetAllocation: createMonthlyBudgetAllocation,
		deleteMonthlyBudgetAllocation: deleteMonthlyBudgetAllocation,
	}, nil
}

func (b *budget) GetMonthlyBudgetAllocations(ctx context.Context) ([]types.MonthlyBudgetAllocation, error) {
	var allocations []types.MonthlyBudgetAllocation
	err := b.getMonthlyBudgetAllocations.SelectContext(ctx, &allocations)
	if err != nil {
		return nil, errors.Wrap(err, "failed to get monthly budget allocations")
	}
	if len(allocations) == 0 {
		return []types.MonthlyBudgetAllocation{}, nil
	}
	return allocations, nil
}

func (b *budget) UpdateMonthlyBudgetAllocation(ctx context.Context, id uuid.UUID, allocation types.MonthlyBudgetAllocation) error {
	allocation.ID = id
	result, err := b.updateMonthlyBudgetAllocation.ExecContext(ctx, allocation)
	if err != nil {
		return errors.Wrap(err, "failed to update monthly budget allocation")
	}

	rowsAffected, err := result.RowsAffected()
	if err != nil {
		return errors.Wrap(err, "failed to get rows affected")
	}

	if rowsAffected == 0 {
		return errors.New("monthly budget allocation not found")
	}

	return nil
}

func (b *budget) CreateMonthlyBudgetAllocation(ctx context.Context, allocation types.CreateMonthlyBudgetAllocation) (uuid.UUID, error) {
	var id uuid.UUID
	err := b.createMonthlyBudgetAllocation.QueryRowxContext(ctx, allocation).Scan(&id)
	if err != nil {
		return uuid.Nil, errors.Wrap(err, "failed to create monthly budget allocation")
	}
	return id, nil
}

func (b *budget) DeleteMonthlyBudgetAllocation(ctx context.Context, id uuid.UUID) error {
	result, err := b.deleteMonthlyBudgetAllocation.ExecContext(ctx, id)
	if err != nil {
		return errors.Wrapf(err, "failed to delete monthly budget allocation (%s)", id)
	}

	rowsAffected, err := result.RowsAffected()
	if err != nil {
		return errors.Wrap(err, "failed to get rows affected")
	}

	if rowsAffected == 0 {
		return errors.Errorf("monthly budget allocation %s not found", id)
	}

	return nil
}
