package routes

import (
	"database/sql"
	"errors"
	"net/http"
	"strings"
	"time"

	"github.com/gin-gonic/gin"

	"github.com/ETHCF/transparency-dashboard/backend/pkg/auth"
	"github.com/ETHCF/transparency-dashboard/backend/pkg/types"
)

// Category management routes

// GET /api/v1/categories - Get all categories
func (rh *RouteHandler) GetCategories(c *gin.Context) {
	categories, err := rh.categoryDB.GetCategories(c)
	if err != nil {
		rh.log.WithError(err).Error("failed to get categories")
		c.AbortWithStatusJSON(http.StatusInternalServerError, gin.H{"error": "Failed to retrieve categories"})
		return
	}

	c.JSON(http.StatusOK, categories)
}

// GET /api/v1/categories/{name} - Get category by name
func (rh *RouteHandler) GetCategoryByName(c *gin.Context) {
	name := c.Param("name")
	if name == "" {
		c.AbortWithStatusJSON(http.StatusBadRequest, gin.H{"error": "Category name is required"})
		return
	}

	category, err := rh.categoryDB.GetCategoryByName(c, name)
	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			c.AbortWithStatusJSON(http.StatusNotFound, gin.H{"error": "Category not found"})
			return
		}
		rh.log.WithError(err).Error("failed to get category by name")
		c.AbortWithStatusJSON(http.StatusInternalServerError, gin.H{"error": "Failed to retrieve category"})
		return
	}

	c.JSON(http.StatusOK, category)
}

// POST /api/v1/categories - Create a new category
func (rh *RouteHandler) CreateCategory(c *gin.Context) {
	var req types.Category
	err := c.ShouldBindJSON(&req)
	if err != nil {
		rh.log.WithError(err).Warn("failed to bind create category request")
		c.AbortWithStatusJSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// Create category object
	category := types.Category{
		Name:        strings.TrimSpace(req.Name),
		Description: strings.TrimSpace(req.Description),
	}

	if err := rh.categoryDB.CreateCategory(c, category); err != nil {
		rh.log.WithError(err).Error("failed to create category")
		c.AbortWithStatusJSON(http.StatusInternalServerError, gin.H{"error": "Failed to create category"})
		return
	}

	// Get current admin for logging
	currentAdminAddr := auth.MustUserID(c)

	// Log admin action
	adminAction := types.AdminAction{
		AdminAddress: currentAdminAddr,
		Action:       "create_category",
		ResourceType: "category",
		ResourceID:   category.Name,
		Details: types.AdminActionDetails{
			"category_name":        category.Name,
			"category_description": category.Description,
		},
		CreatedAt: time.Now(),
	}

	err = rh.adminActionDB.RecordAdminAction(c, adminAction)
	if err != nil {
		rh.log.WithError(err).Error("failed to record admin action")
		// Don't fail the request for logging errors
	}

	c.JSON(http.StatusCreated, category)
}

// PUT /api/v1/categories/{name} - Update category details
func (rh *RouteHandler) UpdateCategory(c *gin.Context) {
	name := c.Param("name")
	if name == "" {
		c.AbortWithStatusJSON(http.StatusBadRequest, gin.H{"error": "Category name is required"})
		return
	}

	var req types.Category
	if err := c.ShouldBindJSON(&req); err != nil {
		rh.log.WithError(err).Warn("failed to bind update category request")
		c.AbortWithStatusJSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	if err := rh.categoryDB.UpdateCategory(c, name, req); err != nil {
		rh.log.WithError(err).Error("failed to update category")
		c.AbortWithStatusJSON(http.StatusInternalServerError, gin.H{"error": "Failed to update category"})
		return
	}

	// Get current admin for logging
	currentAdminAddr := auth.MustUserID(c)

	// Log admin action
	adminAction := types.AdminAction{
		AdminAddress: currentAdminAddr,
		Action:       "update_category",
		ResourceType: "category",
		ResourceID:   name,
		Details: types.AdminActionDetails{
			"category_name": name,
		},
		CreatedAt: time.Now(),
	}

	err := rh.adminActionDB.RecordAdminAction(c, adminAction)
	if err != nil {
		rh.log.WithError(err).Error("failed to record admin action")
		// Don't fail the request for logging errors
	}

	c.JSON(http.StatusOK, gin.H{"message": "Category updated successfully"})
}

// DELETE /api/v1/categories/{name} - Delete category
func (rh *RouteHandler) DeleteCategory(c *gin.Context) {
	// Get current admin for logging
	currentAdminAddr := auth.MustUserID(c)

	name := c.Param("name")
	if name == "" {
		c.AbortWithStatusJSON(http.StatusBadRequest, gin.H{"error": "Category name is required"})
		return
	}

	if err := rh.categoryDB.DeleteCategory(c, name); err != nil {
		rh.log.WithError(err).Error("failed to delete category")
		c.AbortWithStatusJSON(http.StatusInternalServerError, gin.H{"error": "Failed to delete category"})
		return
	}

	// Log admin action
	adminAction := types.AdminAction{
		AdminAddress: currentAdminAddr,
		Action:       "delete_category",
		ResourceType: "category",
		ResourceID:   name,
		Details: types.AdminActionDetails{
			"category_name": name,
		},
		CreatedAt: time.Now(),
	}

	err := rh.adminActionDB.RecordAdminAction(c, adminAction)
	if err != nil {
		rh.log.WithError(err).Error("failed to record admin action")
		// Don't fail the request for logging errors
	}

	c.JSON(http.StatusOK, gin.H{"message": "Category deleted successfully"})
}
