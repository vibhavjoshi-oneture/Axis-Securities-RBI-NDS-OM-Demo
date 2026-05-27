package static

// OrderRequest represents an asynchronous order request payload.
type OrderRequest struct {
	Action                string  `json:"action"` // internal
	ConnectionID          string  `json:"connection_id"` // if multiple conection exist
	ClientOrderID         string  `json:"client_order_id"`
	OrigClientOrderID     string  `json:"orig_client_order_id"`
	NDSOrderID            string  `json:"nds_order_id"`
	ContractID            string  `json:"contract_id"`
	Side                  string  `json:"side"` // "BUY" or "SELL"
	Quantity              int64   `json:"quantity"`
	Price                 float64 `json:"price"`
	PrevQuantity          int64   `json:"prev_quantity"`
	PrevPrice             float64 `json:"prev_price"`
	LastActivityTimestamp int64   `json:"last_activity_timestamp"`
}

// ResponseMessage represents an asynchronous response payload received from NDS-OM.
type ResponseMessage struct {
	ConnectionID string            `json:"connection_id"`
	MsgType      string            `json:"msg_type"`
	Tags         map[string]string `json:"tags"`
}
