package api

import (
	"encoding/json"
	"fmt"
	"net/http"

	"ndsom/nds_wrapper/static"

	"github.com/google/uuid"
)

// NDSWrapperApp aggregates components required to run HTTP API endpoints.
type NDSWrapperApp struct{}

// NewNDSWrapperApp constructs a new NDSWrapperApp instance.
func NewNDSWrapperApp() *NDSWrapperApp {
	return &NDSWrapperApp{}
}

// RegisterRoutes binds endpoint handlers to the HTTP serve multiplexer.
func (app *NDSWrapperApp) RegisterRoutes(mux *http.ServeMux) {
	mux.HandleFunc("/api/order/create", app.handleOrderCreate)
	mux.HandleFunc("/api/order/modify", app.handleOrderModify)
	mux.HandleFunc("/api/order/cancel", app.handleOrderCancel)
}

func (app *NDSWrapperApp) handleOrderCreate(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "method not allowed", http.StatusMethodNotAllowed)
		return
	}

	var req struct {
		ClientOrderID string  `json:"client_order_id"` // unique id
		ContractID    string  `json:"contract_id"`
		Side          string  `json:"side"` // "BUY" or "SELL"
		Quantity      int64   `json:"quantity"`
		Price         float64 `json:"price"`
	}

	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": "invalid json"})
		return
	}

	if req.ContractID == "" || req.Quantity <= 0 || req.Price <= 0 {
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": "missing required parameters"})
		return
	}

	orderReq := static.OrderRequest{
		Action:        static.ActionCreate,
		ClientOrderID: req.ClientOrderID,
		ContractID:    req.ContractID,
		Side:          req.Side,
		Quantity:      req.Quantity,
		Price:         req.Price,
	}

	_ = orderReq
	// Push request to global queue asynchronously
	// static.RequestChan <- orderReq

	writeJSON(w, http.StatusAccepted, map[string]any{
		"client_order_id":         req.ClientOrderID,
		"nds_order_id":            uuid.New(),
		"ci_ord_id":               uuid.New(),
		"last_activity_timestamp": uuid.New().String()[:10],
		"status":                  "queued",
		"message":                 "Request queued for processing",
	})
}

func (app *NDSWrapperApp) handleOrderModify(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "method not allowed", http.StatusMethodNotAllowed)
		return
	}

	var req struct {
		// ConnectionID          string  `json:"connection_id"`
		ClientOrderID         string  `json:"client_order_id"`
		OrigClientOrderID     string  `json:"orig_client_order_id"`
		NDSOrderID            string  `json:"nds_order_id"`
		ContractID            string  `json:"contract_id"`
		Side                  string  `json:"side"`
		Quantity              int64   `json:"quantity"`
		Price                 float64 `json:"price"`
		PrevQuantity          int64   `json:"prev_quantity"`
		PrevPrice             float64 `json:"prev_price"`
		LastActivityTimestamp int64   `json:"last_activity_timestamp"`
	}

	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": "invalid json"})
		return
	}

	//  req.OrigClientOrderID == "" ||
	if req.ClientOrderID == "" || req.NDSOrderID == "" || req.Quantity <= 0 || req.Price <= 0 {
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": "missing required parameters"})
		return
	}

	orderReq := static.OrderRequest{
		Action: static.ActionModify,
		// ConnectionID:          req.ConnectionID,
		ClientOrderID:         req.ClientOrderID,
		OrigClientOrderID:     req.OrigClientOrderID,
		NDSOrderID:            req.NDSOrderID,
		ContractID:            req.ContractID,
		Side:                  req.Side,
		Quantity:              req.Quantity,
		Price:                 req.Price,
		PrevQuantity:          req.PrevQuantity,
		PrevPrice:             req.PrevPrice,
		LastActivityTimestamp: req.LastActivityTimestamp,
	}
	_ = orderReq
	// Push request to global queue asynchronously
	// static.RequestChan <- orderReq

	writeJSON(w, http.StatusAccepted, map[string]any{
		"client_order_id":         req.ClientOrderID,
		"last_activity_timestamp": uuid.New().String()[:10],
		"status":                  "queued",
		"message":                 "Request queued for processing",
	})
}

func (app *NDSWrapperApp) handleOrderCancel(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "method not allowed", http.StatusMethodNotAllowed)
		return
	}

	var req struct {
		// ConnectionID          string  `json:"connection_id"`
		ClientOrderID         string `json:"client_order_id"`
		OrigClientOrderID     string `json:"orig_client_order_id"`
		NDSOrderID            string `json:"nds_order_id"`
		ContractID            string `json:"contract_id"`
		Side                  string `json:"side"`
		Quantity              int64  `json:"quantity"`
		LastActivityTimestamp int64  `json:"last_activity_timestamp"`
	}

	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": "invalid json"})
		return
	}

	if req.ClientOrderID == "" || req.OrigClientOrderID == "" || req.NDSOrderID == "" {
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": "missing required parameters"})
		return
	}

	orderReq := static.OrderRequest{
		Action: static.ActionCancel,
		// ConnectionID:          req.ConnectionID,
		ClientOrderID:         req.ClientOrderID,
		OrigClientOrderID:     req.OrigClientOrderID,
		NDSOrderID:            req.NDSOrderID,
		ContractID:            req.ContractID,
		Side:                  req.Side,
		Quantity:              req.Quantity,
		LastActivityTimestamp: req.LastActivityTimestamp,
	}

	// Push request to global queue asynchronously
	static.RequestChan <- orderReq

	writeJSON(w, http.StatusAccepted, map[string]any{
		"client_order_id": req.ClientOrderID,
		"status":          "queued",
		"message":         "Request queued for processing",
	})
}

func writeJSON(w http.ResponseWriter, status int, payload any) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	_ = json.NewEncoder(w).Encode(payload)
}

// WithCORS wraps an http.Handler to apply Cross-Origin Resource Sharing (CORS) headers.
func WithCORS(next http.Handler, allowedOrigins []string) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		origin := r.Header.Get("Origin")
		allow := false
		for _, o := range allowedOrigins {
			if o == "*" {
				allow = true
				break
			}
			if o == origin {
				allow = true
				break
			}
		}
		if allow {
			if origin != "" {
				w.Header().Set("Access-Control-Allow-Origin", origin)
			} else {
				w.Header().Set("Access-Control-Allow-Origin", "*")
			}
		}
		w.Header().Set("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
		w.Header().Set("Access-Control-Allow-Headers", "Content-Type")
		if r.Method == http.MethodOptions {
			w.WriteHeader(http.StatusNoContent)
			return
		}
		next.ServeHTTP(w, r)
	})
}
