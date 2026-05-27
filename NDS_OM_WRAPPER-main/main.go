package main

import (
	"fmt"
	"log"
	"net/http"

	"ndsom/nds_wrapper/api"
	"ndsom/nds_wrapper/gateway"
	"ndsom/nds_wrapper/infrastructure"
	"ndsom/nds_wrapper/static"
)

func main() {
	log.Println("Starting NDS Wrapper Service...")

	// Load configuration
	cfg, err := infrastructure.LoadConfig("config.json")
	if err != nil {
		log.Fatalf("Failed to load configuration: %v", err)
	}
	log.Println("Configuration loaded successfully.")

	// Initialize global RequestChan
	static.RequestChan = make(chan static.OrderRequest, 1000)

	// Initialize shared response channel
	sharedResponseChan := make(chan static.ResponseMessage, 1000)

	// Initialize Gateway Clients Pool
	clients := make(map[string]*gateway.NDSOmClient)
	var connIDs []string

	for _, connCfg := range cfg.Connections {
		client := gateway.NewNDSOmClient(connCfg)
		clients[connCfg.ConnectionID] = client
		connIDs = append(connIDs, connCfg.ConnectionID)

		go func(c *gateway.NDSOmClient) { // TODO: implement connection retry mechanism
			// if err := c.ConnectAndSendLogon(connCfg); err != nil {
			// 	log.Printf("[WARNING] Startup Logon (35=A) failed for connection %s: %v", c.ConnectionID, err)
			// 	return
			// }
			// if err := c.SendUserLogon(); err != nil {
			// 	log.Printf("[WARNING] Startup User Logon (35=BE) failed for connection %s: %v", c.ConnectionID, err)
			// }
		}(client)

		go client.RequestListener()

		// Fan-in: Forward responses from this connection's ReceiveChan to the shared channel
		go func(c *gateway.NDSOmClient) {
			for resp := range c.ReceiveChan {
				sharedResponseChan <- resp
			}
		}(client)
	}

	if len(clients) == 0 {
		log.Fatalf("No connections configured in config.json")
	}

	// Start global request router/dispatcher
	go func() {
		rrIndex := 0
		for req := range static.RequestChan {
			targetConnID := req.ConnectionID
			if targetConnID == "" {
				if len(connIDs) > 0 {
					targetConnID = connIDs[rrIndex]
					rrIndex = (rrIndex + 1) % len(connIDs)
					log.Printf("[Dispatcher] Round-robin dispatching request ClOrdID=%s to connection=%s", req.ClientOrderID, targetConnID)
				} else {
					log.Printf("[ERROR] Dispatcher: no active connections available for round-robin")
					continue
				}
			}

			if client, ok := clients[targetConnID]; ok {
				client.InternalChan <- req
			} else {
				log.Printf("[ERROR] Dispatcher: unknown connection ID %q for ClOrdID=%s", targetConnID, req.ClientOrderID)
			}
		}
	}()

	// Start exactly 3 background worker goroutines to listen to all incoming responses from the shared response channel
	for i := 1; i <= 3; i++ {
		go func(workerID int) {
			log.Printf("[Response Worker %d] Started listening.", workerID)
			for resp := range sharedResponseChan {
				log.Printf("[Response Worker %d] Processed message from connection %s: MsgType=%s Tags=%v", workerID, resp.ConnectionID, resp.MsgType, resp.Tags)
			}
		}(i)
	}

	// Construct HTTP API Layer (fully decoupled from gateway client pool)
	app := api.NewNDSWrapperApp()

	// Register HTTP Endpoints
	mux := http.NewServeMux()
	app.RegisterRoutes(mux)

	httpAddr := fmt.Sprintf("%s:%d", cfg.HTTPHost, cfg.HTTPPort)
	handler := api.WithCORS(mux, cfg.AllowedOrigins)
	log.Printf("[HTTP API] NDS Wrapper listening on %s", httpAddr)
	if err := http.ListenAndServe(httpAddr, handler); err != nil {
		log.Fatalf("HTTP server shutdown: %v", err)
	}
}
