package types

type OrganizationSettings struct {
	Name             string  `json:"name" db:"name"`
	TotalFundsRaised float64 `json:"totalFundsRaised"`
}

type UpdateOrganizationNameRequest struct {
	Name string `json:"name" binding:"required,min=1,max=100"`
}

type UpdateTotalFundsRaisedRequest struct {
	Amount float64 `json:"amount" binding:"required,min=0"`
}
