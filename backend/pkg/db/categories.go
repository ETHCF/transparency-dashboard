package db

import (
	"context"
	"fmt"
	"strings"

	"github.com/innodv/psql"
	"github.com/jmoiron/sqlx"
	"github.com/numbergroup/errors"
	"github.com/sirupsen/logrus"

	"github.com/ETHCF/transparency-dashboard/backend/pkg/config"
	"github.com/ETHCF/transparency-dashboard/backend/pkg/types"
)

type CategoryDB interface {
	// Category management methods
	GetCategories(ctx context.Context) ([]types.Category, error)
	GetCategoryByName(ctx context.Context, name string) (*types.Category, error)
	CreateCategory(ctx context.Context, category types.Category) error
	UpdateCategory(ctx context.Context, name string, category types.Category) error
	DeleteCategory(ctx context.Context, name string) error
}

type category struct {
	log               logrus.Ext1FieldLogger
	dbConn            *sqlx.DB
	getCategories     *sqlx.Stmt
	getCategoryByName *sqlx.Stmt
	createCategory    *sqlx.NamedStmt
	deleteCategory    *sqlx.Stmt
}

func NewCategoryDB(ctx context.Context, conf *config.Config, dbConn *sqlx.DB) (CategoryDB, error) {
	categoryCols := psql.GetSQLColumnsQuoted[types.Category]()
	categoryColsNoQuote := psql.GetSQLColumns[types.Category]()

	getCategories, err := dbConn.PreparexContext(ctx, fmt.Sprintf(`
		SELECT %s FROM categories ORDER BY name`, strings.Join(categoryCols, ", ")))
	if err != nil {
		return nil, errors.Wrap(err, "failed to prepare GetCategories statement")
	}

	getCategoryByName, err := dbConn.PreparexContext(ctx, fmt.Sprintf(`
		SELECT %s FROM categories WHERE name = $1`, strings.Join(categoryCols, ", ")))
	if err != nil {
		return nil, errors.Wrap(err, "failed to prepare GetCategoryByName statement")
	}

	createCategory, err := dbConn.PrepareNamedContext(ctx, fmt.Sprintf(`
		INSERT INTO categories (%s) VALUES (%s)`,
		strings.Join(categoryCols, ", "), ":"+strings.Join(categoryColsNoQuote, ", :")))
	if err != nil {
		return nil, errors.Wrap(err, "failed to prepare CreateCategory statement")
	}

	deleteCategory, err := dbConn.PreparexContext(ctx, `DELETE FROM categories WHERE name = $1`)
	if err != nil {
		return nil, errors.Wrap(err, "failed to prepare DeleteCategory statement")
	}

	return &category{
		log:               conf.GetLogger(),
		dbConn:            dbConn,
		getCategories:     getCategories,
		getCategoryByName: getCategoryByName,
		createCategory:    createCategory,
		deleteCategory:    deleteCategory,
	}, nil
}

func (c *category) GetCategories(ctx context.Context) ([]types.Category, error) {
	var categories []types.Category
	err := c.getCategories.SelectContext(ctx, &categories)
	if err != nil {
		return nil, errors.Wrap(err, "failed to get categories")
	}
	if len(categories) == 0 {
		return []types.Category{}, nil
	}
	return categories, nil
}

func (c *category) GetCategoryByName(ctx context.Context, name string) (*types.Category, error) {
	var category types.Category
	err := c.getCategoryByName.GetContext(ctx, &category, name)
	if err != nil {
		return nil, errors.Wrap(err, "failed to get category by name")
	}
	return &category, nil
}

func (c *category) CreateCategory(ctx context.Context, category types.Category) error {
	_, err := c.createCategory.ExecContext(ctx, category)
	if err != nil {
		return errors.Wrap(err, "failed to create category")
	}
	return nil
}

func (c *category) UpdateCategory(ctx context.Context, name string, category types.Category) error {
	query := `UPDATE categories SET description = $1 WHERE name = $2`
	result, err := c.dbConn.ExecContext(ctx, query, category.Description, name)
	if err != nil {
		return errors.Wrap(err, "failed to update category")
	}

	rowsAffected, err := result.RowsAffected()
	if err != nil {
		return errors.Wrap(err, "failed to get rows affected")
	}

	if rowsAffected == 0 {
		return errors.New("category not found")
	}

	return nil
}

func (c *category) DeleteCategory(ctx context.Context, name string) error {
	result, err := c.deleteCategory.ExecContext(ctx, name)
	if err != nil {
		return errors.Wrapf(err, "failed to delete category (%s)", name)
	}

	rowsAffected, err := result.RowsAffected()
	if err != nil {
		return errors.Wrap(err, "failed to get rows affected")
	}

	if rowsAffected == 0 {
		return errors.Errorf("category %s not found", name)
	}

	return nil
}
