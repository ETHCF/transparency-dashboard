package db

import (
	"context"
	"regexp"
	"strings"

	"github.com/ETHCF/transparency-dashboard/backend/pkg/config"
	"github.com/jmoiron/sqlx"
)

func TrimZeros(s string) string {
	if !strings.Contains(s, ".") {
		return s
	}
	re := regexp.MustCompile(`\.?0+$`)
	return re.ReplaceAllString(s, "")
}

type DatabasePacket struct {
	AdminActionDB AdminActionDB
	AdminDB       AdminDB
	AuthDB        AuthDB
	BudgetDB      BudgetDB
	CategoryDB    CategoryDB
	ExpenseDB     ExpenseDB
	GrantDB       GrantDB
	SettingsDB    SettingsDB
	TreasuryDB    TreasuryDB
}

func NewDatabasePacket(ctx context.Context, conf *config.Config, dbConn *sqlx.DB) (DatabasePacket, error) {
	adminActionDB, err := NewAdminActionDB(ctx, conf, dbConn)
	if err != nil {
		return DatabasePacket{}, err
	}
	adminDB, err := NewAdminDB(ctx, conf, dbConn)
	if err != nil {
		return DatabasePacket{}, err
	}
	authDB, err := NewAuthDB(ctx, conf, dbConn)
	if err != nil {
		return DatabasePacket{}, err
	}
	expenseDB, err := NewExpenseDB(ctx, conf, dbConn)
	if err != nil {
		return DatabasePacket{}, err
	}
	grantDB, err := NewGrantDB(ctx, conf, dbConn)
	if err != nil {
		return DatabasePacket{}, err
	}
	settingsDB, err := NewSettingsDB(conf, dbConn)
	if err != nil {
		return DatabasePacket{}, err
	}
	treasuryDB, err := NewTreasuryDB(ctx, conf, dbConn, settingsDB)
	if err != nil {
		return DatabasePacket{}, err
	}
	budgetDB, err := NewBudgetDB(ctx, conf, dbConn)
	if err != nil {
		return DatabasePacket{}, err
	}
	categoryDB, err := NewCategoryDB(ctx, conf, dbConn)
	if err != nil {
		return DatabasePacket{}, err
	}
	return DatabasePacket{
		AdminActionDB: adminActionDB,
		AdminDB:       adminDB,
		AuthDB:        authDB,
		BudgetDB:      budgetDB,
		CategoryDB:    categoryDB,
		ExpenseDB:     expenseDB,
		GrantDB:       grantDB,
		SettingsDB:    settingsDB,
		TreasuryDB:    treasuryDB,
	}, nil
}
