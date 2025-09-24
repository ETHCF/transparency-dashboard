package types

type OrganizationSettings struct {
	Name string `json:"name" db:"name"`
}

type UpdateOrganizationNameRequest struct {
	Name string `json:"name" binding:"required,min=1,max=100"`
}
