package gateway

import (
	"bufio"
	"crypto/tls"
	"errors"
	"fmt"
	"log"
	"net"
	"strconv"
	"strings"
	"sync/atomic"
	"time"

	"ndsom/nds_wrapper/fix"
	"ndsom/nds_wrapper/infrastructure"
	"ndsom/nds_wrapper/static"
	"ndsom/nds_wrapper/utils"
)

func (c *NDSOmClient) getNextSeq() int64 {
	c.clientSeqMu.Lock()
	defer c.clientSeqMu.Unlock()
	c.ClientSeq++
	return c.ClientSeq
}

// GetClientSeq retrieves the current client sequence number in a thread-safe manner.
func (c *NDSOmClient) GetClientSeq() int64 {
	c.clientSeqMu.Lock()
	defer c.clientSeqMu.Unlock()
	return c.ClientSeq
}

func (c *NDSOmClient) generateClOrdID() string {
	seq := atomic.AddInt64(&c.orderSeq, 1)
	seqVal := seq & 0xFFFFFFFF
	userVal := (c.userNum & 0xFFFFFF) << 32
	freqVal := (c.loginFreq & 0x7F) << 56
	clOrdIDVal := freqVal | userVal | seqVal
	return strconv.FormatInt(clOrdIDVal, 10)
}

func parseLoginFreq(text string) int64 {
	var sb strings.Builder
	for _, r := range text {
		if r >= '0' && r <= '9' {
			sb.WriteRune(r)
		}
	}
	digits := sb.String()
	if digits == "" {
		return 1
	}
	val, err := strconv.ParseInt(digits, 10, 64)
	if err != nil || val <= 0 {
		return 1
	}
	return val
}

// encodeMessage applies SenderSubID (Tag 50) and serializes the message with client sequences.
func (c *NDSOmClient) encodeMessage(msg *fix.FIXMessage) []byte {
	if c.SenderSubID != "" {
		msg.Set(50, c.SenderSubID)
	}
	return msg.Encode(c.getNextSeq(), c.SenderCompID, c.TargetCompID)
}

// ConnectAndSendLogon establishes the connection and sends Logon message (35=A) and blocks until the session logon response is received.
func (c *NDSOmClient) ConnectAndSendLogon(connCfg infrastructure.ConnConfig) error {
	var serverAddr = net.JoinHostPort(connCfg.Host, fmt.Sprintf("%d", connCfg.Port))
	c.ClientSeq = 0
	var err error

	if c.conn != nil {
		return nil // Already connected
	}

	if c.UseTLS {
		log.Printf("[TCP CLIENT - %s] Connecting to secure NDS-OM server over TLS at %s...", connCfg.ConnectionID, serverAddr)
		tlsConfig := &tls.Config{
			InsecureSkipVerify: true, // For POC/Mock environments // TODO: remove and add ServerName field (proper certificate verification)
		}
		c.conn, err = tls.Dial("tcp", serverAddr, tlsConfig)
	} else {
		log.Printf("[TCP CLIENT - %s] Connecting to simulated NDS-OM server at %s...", connCfg.ConnectionID, serverAddr)
		c.conn, err = net.Dial("tcp", serverAddr)
	}

	if err != nil {
		return fmt.Errorf("dial server: %w", err)
	}

	go c.readConnLoop(c.conn)

	// Send Logon request (35=A)
	log.Printf("[TCP CLIENT - %s] Sending Logon request (35=A)...", c.ConnectionID)
	logonMsg := fix.NewFIXMessage(static.MsgTypeLogon)
	logonMsg.Set(98, "0")
	logonMsg.Set(108, strconv.Itoa(c.HeartbeatIntervalSeconds))
	logonMsg.Set(141, "Y") // reset sequences
	logonMsg.Set(1137, "9")

	encoded := c.encodeMessage(logonMsg)

	if _, err = c.conn.Write(encoded); err != nil {
		c.cleanup()
		return fmt.Errorf("write logon: %w", err)
	}

	// Wait for Logon Response (35=A) to complete and populate key/IV
	select {
	case <-c.LogonCh:
		if c.logonErr != nil {
			return fmt.Errorf("FIX session logon failed: did not receive successful Logon Response (35=A): %w", c.logonErr)
		}
		log.Printf("[TCP CLIENT - %s] Session Logon Response (35=A) received, AES Key generated.", c.ConnectionID)
	case <-time.After(static.ConnectionTimeoutSeconds * time.Second):
		c.cleanup()
		return fmt.Errorf("timeout waiting for Session Logon Response (35=A)")
	}

	return nil
}

// SendUserLogon sends the User Logon request (35=BE) with password encrypted using the generated key/IV and waits for the User Logon Response (35=BF).
func (c *NDSOmClient) SendUserLogon() error {

	if c.conn == nil {
		return errors.New("not connected to server")
	}

	if c.aesKey == "" || c.aesIV == "" {
		return errors.New("AES key/IV not generated. Session logon must complete first")
	}

	// Encrypt Password
	encryptedPassword, err := utils.EncryptAESCBC(c.Password, c.aesKey, c.aesIV)
	if err != nil {
		return fmt.Errorf("encrypt password: %w", err)
	}

	// Send User Logon request (35=BE)
	log.Printf("[TCP CLIENT - %s] Sending User Logon request (35=BE)...", c.ConnectionID)

	// Format UserRequestID (Tag 923) as a 64-bit integer: Freq=1, Seq=1
	logonUserReqIDVal := (int64(1) << 56) | ((c.userNum & 0xFFFFFF) << 32) | int64(1)
	userReqID := strconv.FormatInt(logonUserReqIDVal, 10)

	userMsg := fix.NewFIXMessage(static.MsgTypeUserLogon)
	userMsg.Set(923, userReqID)
	userMsg.Set(924, "1") // Logon User
	userMsg.Set(553, c.Username)
	userMsg.Set(554, encryptedPassword)

	encoded := c.encodeMessage(userMsg)
	if _, err := c.conn.Write(encoded); err != nil {
		return fmt.Errorf("write user logon: %w", err)
	}

	// Wait for User Logon Response (35=BF)
	select {
	case <-c.LogonCh:
		if c.logonErr != nil {
			return fmt.Errorf("FIX session logon failed: did not receive successful Logon Response (35=BF): %w", c.logonErr)
		}
		log.Printf("[TCP CLIENT - %s] User Logon (35=BF) succeeded, session established!", c.ConnectionID)
	case <-time.After(static.ConnectionTimeoutSeconds * time.Second):
		return fmt.Errorf("timeout waiting for User Logon Response (35=BF)")
	}

	return nil
}

func (c *NDSOmClient) RequestListener() {
	log.Printf("[TCP CLIENT - %s] Request listener queue started.", c.ConnectionID)
	for req := range c.InternalChan {
		switch req.Action {
		case static.ActionCreate:
			c.CreateOrder(req)
		case static.ActionModify:
			c.ModifyOrder(req)
		case static.ActionCancel:
			c.CancelOrder(req)
		default:
			log.Printf("[TCP CLIENT - %s] Unknown request action: %q", c.ConnectionID, req.Action)
		}
	}
}

// CreateOrder processes order creation (MsgType D) asynchronously.
func (c *NDSOmClient) CreateOrder(req static.OrderRequest) {
	log.Printf("[TCP CLIENT - %s] Processing CreateOrder: ClOrdID=%s SecurityID=%s Qty=%d Price=%.4f", c.ConnectionID, req.ClientOrderID, req.ContractID, req.Quantity, req.Price)

	if c.conn == nil || !c.isLogon {
		log.Printf("[TCP CLIENT - %s] CreateOrder error: FIX session not active", c.ConnectionID)
		return
	}

	clOrdID := c.generateClOrdID()
	log.Printf("[TCP CLIENT - %s] Generated ClOrdID %s for ClientOrderID %s", c.ConnectionID, clOrdID, req.ClientOrderID)

	sideFix := "1"
	if strings.ToUpper(req.Side) == "SELL" {
		sideFix = "2"
	}

	msg := fix.NewFIXMessage(static.MsgTypeNewOrder)
	msg.Set(11, clOrdID)
	msg.Set(38, strconv.FormatInt(req.Quantity, 10))
	msg.Set(40, "2") // 2 = Limit
	msg.Set(44, fmt.Sprintf("%.4f", req.Price))
	msg.Set(48, req.ContractID)
	msg.Set(54, sideFix)
	msg.Set(59, "0")
	msg.Set(440, "CM001")
	msg.Set(528, "4")
	msg.Set(10001, "0")
	msg.Set(10002, "1")
	msg.Set(10005, "00000")

	encoded := c.encodeMessage(msg)
	if _, err := c.conn.Write(encoded); err != nil {
		log.Printf("[TCP CLIENT - %s] CreateOrder write error: %v", c.ConnectionID, err)
		c.cleanup()
		return
	}

	log.Printf("[TCP CLIENT - %s] CreateOrder (35=D) sent successfully for ClOrdID=%s (Generated ID: %s)", c.ConnectionID, req.ClientOrderID, clOrdID)
}

// ModifyOrder processes order modification (MsgType G) asynchronously.
func (c *NDSOmClient) ModifyOrder(req static.OrderRequest) {
	log.Printf("[TCP CLIENT - %s] Processing ModifyOrder: ClOrdID=%s OrigClOrdID=%s NDSOrderID=%s Qty=%d Price=%.4f", c.ConnectionID, req.ClientOrderID, req.OrigClientOrderID, req.NDSOrderID, req.Quantity, req.Price)

	conn := c.conn
	isLogon := c.isLogon

	if conn == nil || !isLogon {
		log.Printf("[TCP CLIENT - %s] ModifyOrder error: FIX session not active", c.ConnectionID)
		return
	}

	origClOrdID := req.OrigClientOrderID
	clOrdID := c.generateClOrdID()
	log.Printf("[TCP CLIENT - %s] Generated ClOrdID %s for ClientOrderID %s (OrigClOrdID: %s)", c.ConnectionID, clOrdID, req.ClientOrderID, origClOrdID)

	sideFix := "1"
	if strings.ToUpper(req.Side) == "SELL" {
		sideFix = "2"
	}

	msg := fix.NewFIXMessage(static.MsgTypeOrderMod)
	msg.Set(11, clOrdID)
	msg.Set(37, req.NDSOrderID)
	msg.Set(38, strconv.FormatInt(req.Quantity, 10))
	msg.Set(40, "2")
	msg.Set(41, origClOrdID)
	msg.Set(44, fmt.Sprintf("%.4f", req.Price))
	msg.Set(48, req.ContractID)
	msg.Set(54, sideFix)
	msg.Set(59, "0")
	msg.Set(440, "CM001")
	msg.Set(528, "4")
	msg.Set(10001, "0")
	msg.Set(10002, "1")
	msg.Set(10004, strconv.FormatInt(req.LastActivityTimestamp, 10))
	msg.Set(10005, "00000")
	msg.Set(10009, "M")
	msg.Set(10011, strconv.FormatInt(req.PrevQuantity, 10))
	msg.Set(10012, fmt.Sprintf("%.4f", req.PrevPrice))

	encoded := c.encodeMessage(msg)
	if _, err := conn.Write(encoded); err != nil {
		log.Printf("[TCP CLIENT - %s] ModifyOrder write error: %v", c.ConnectionID, err)
		c.cleanup()
		return
	}

	log.Printf("[TCP CLIENT - %s] ModifyOrder (35=G) sent successfully for ClOrdID=%s (Generated ID: %s)", c.ConnectionID, req.ClientOrderID, clOrdID)
}

// CancelOrder processes order cancellation (MsgType F) asynchronously.
func (c *NDSOmClient) CancelOrder(req static.OrderRequest) {
	log.Printf("[TCP CLIENT - %s] Processing CancelOrder: ClOrdID=%s OrigClOrdID=%s NDSOrderID=%s", c.ConnectionID, req.ClientOrderID, req.OrigClientOrderID, req.NDSOrderID)

	conn := c.conn
	isLogon := c.isLogon

	if conn == nil || !isLogon {
		log.Printf("[TCP CLIENT - %s] CancelOrder error: FIX session not active", c.ConnectionID)
		return
	}

	origClOrdID := req.OrigClientOrderID
	clOrdID := c.generateClOrdID()
	log.Printf("[TCP CLIENT - %s] Generated ClOrdID %s for ClientOrderID %s (OrigClOrdID: %s)", c.ConnectionID, clOrdID, req.ClientOrderID, origClOrdID)

	sideFix := "1"
	if strings.ToUpper(req.Side) == "SELL" {
		sideFix = "2"
	}

	msg := fix.NewFIXMessage(static.MsgTypeOrderCancel)
	msg.Set(11, clOrdID)
	msg.Set(37, req.NDSOrderID)
	msg.Set(38, strconv.FormatInt(req.Quantity, 10))
	msg.Set(40, "2")
	msg.Set(41, origClOrdID)
	msg.Set(48, req.ContractID)
	msg.Set(54, sideFix)
	msg.Set(440, "CM001")
	msg.Set(528, "4")
	msg.Set(10004, strconv.FormatInt(req.LastActivityTimestamp, 10))
	msg.Set(10005, "00000")
	msg.Set(10010, "C")

	encoded := c.encodeMessage(msg)
	if _, err := conn.Write(encoded); err != nil {
		log.Printf("[TCP CLIENT - %s] CancelOrder write error: %v", c.ConnectionID, err)
		c.cleanup()
		return
	}

	log.Printf("[TCP CLIENT - %s] CancelOrder (35=F) sent successfully for ClOrdID=%s (Generated ID: %s)", c.ConnectionID, req.ClientOrderID, clOrdID)
}

func (c *NDSOmClient) cleanup() {
	if c.conn != nil {
		c.conn.Close()
		c.conn = nil
	}

	c.isLogon = false
}

// Disconnect terminates the FIX session gracefully by sending Logout (35=5).
func (c *NDSOmClient) Disconnect() {
	// c.connMu.Lock()
	// defer c.connMu.Unlock()

	if c.conn == nil {
		return
	}

	log.Printf("[TCP CLIENT - %s] Terminating FIX session. Sending Logout (35=5)...", c.ConnectionID)
	logoutMsg := fix.NewFIXMessage("5")
	logoutMsg.Set(58, "User logout request")

	encoded := c.encodeMessage(logoutMsg)
	_, _ = c.conn.Write(encoded)

	c.cleanup()
}

func (c *NDSOmClient) readConnLoop(conn net.Conn) {
	reader := bufio.NewReader(conn)
	for {
		rawMsg, err := fix.ReadFIXFromStream(reader)
		if err != nil {
			log.Printf("[TCP CLIENT - %s] Reader disconnected: %v", c.ConnectionID, err)
			if c.conn == conn {
				c.cleanup()
			}
			return
		}

		msg, err := fix.DecodeFIX(rawMsg)
		if err != nil {
			log.Printf("[TCP CLIENT - %s] Decode error on stream: %v", c.ConnectionID, err)
			continue
		}

		msgType := msg.Get(35)
		log.Printf("[TCP CLIENT - %s] Received MsgType=%s Seq=%s", c.ConnectionID, msgType, msg.Get(34))

		// Check for administrative messages handled by client itself
		if msgType == "0" { // Heartbeat
			log.Printf("[TCP CLIENT - %s] Received Heartbeat from server.", c.ConnectionID)
			continue
		}

		if msgType == "A" {
			// Extract encryption parameters from Session Logon Response
			sendingTime := msg.Get(52)
			targetCompID := msg.Get(56)
			targetSubID := msg.Get(57)
			checksum := msg.Get(10)

			// Parse msTime (milliseconds from SendingTime)
			parts := strings.Split(sendingTime, ".")
			msTime := "000"
			if len(parts) > 1 {
				msTime = parts[1]
				if len(msTime) > 3 {
					msTime = msTime[:3]
				}
			}

			// Generate Key and IV
			keySrc := targetCompID + msTime + targetSubID + checksum + targetCompID + msTime + targetSubID + checksum
			ivSrc := targetCompID + msTime + targetSubID + checksum + targetCompID

			if len(keySrc) > 32 {
				c.aesKey = keySrc[:32]
			} else {
				c.aesKey = keySrc
			}

			if len(ivSrc) > 16 {
				c.aesIV = ivSrc[:16]
			} else {
				c.aesIV = ivSrc
			}

			log.Printf("[TCP CLIENT - %s] Generated Session AES Key & IV: Key=%s, IV=%s", c.ConnectionID, c.aesKey, c.aesIV)

			// Signal session logon success
			select {
			case c.LogonCh <- struct{}{}:
			default:
			}
			continue
		}

		if msgType == "BF" {
			userStatus := msg.Get(926)
			userStatusText := msg.Get(927)
			log.Printf("[TCP CLIENT - %s] User Logon Response (35=BF): Status=%s, Text=%s", c.ConnectionID, userStatus, userStatusText)

			if userStatus == "1" { // User Logged in
				c.isLogon = true
				c.logonErr = nil
				c.loginFreq = parseLoginFreq(userStatusText)
				log.Printf("[TCP CLIENT - %s] Parsed login frequency: %d", c.ConnectionID, c.loginFreq)
			} else {
				c.isLogon = false
				c.logonErr = fmt.Errorf("user logon rejected: status=%s (%s)", userStatus, userStatusText)
			}

			if userStatus == "1" {
				go c.heartbeatLoop()
			}

			// Signal user logon response received
			select {
			case c.LogonCh <- struct{}{}:
			default:
			}
		}

		// Convert FIX tags to ResponseMessage map
		respTags := make(map[string]string)
		for tag, val := range msg.Tags {
			tagStr := strconv.Itoa(tag)
			respTags[tagStr] = val
		}

		resp := static.ResponseMessage{
			ConnectionID: c.ConnectionID,
			MsgType:      msgType,
			Tags:         respTags,
		}

		// Push to connection-specific receive channel asynchronously
		select {
		case c.ReceiveChan <- resp:
		default:
			log.Printf("[WARNING] Connection %s ReceiveChan is full. Dropping response MsgType=%s", c.ConnectionID, msgType)
		}
	}
}

func (c *NDSOmClient) heartbeatLoop() {
	hbInterval := time.Duration(c.HeartbeatIntervalSeconds) * time.Second
	ticker := time.NewTicker(hbInterval)
	defer ticker.Stop()

	for {
		select {
		case <-c.quit:
			return
		case <-ticker.C:
			conn := c.conn
			isLogon := c.isLogon

			if conn == nil || !isLogon {
				return // Client disconnected, stop this ticker loop
			}

			log.Printf("[TCP CLIENT - %s] Sending Heartbeat (35=0)...", c.ConnectionID)
			hb := fix.NewFIXMessage("0")
			encoded := c.encodeMessage(hb)
			if _, err := conn.Write(encoded); err != nil {
				log.Printf("[TCP CLIENT - %s] Heartbeat send failed: %v", c.ConnectionID, err)
				// c.connMu.Lock()
				c.cleanup()
				// c.connMu.Unlock()
				return
			}
		}
	}
}
