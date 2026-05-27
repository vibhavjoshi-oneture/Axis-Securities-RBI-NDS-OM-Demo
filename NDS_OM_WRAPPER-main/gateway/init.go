package gateway

import (
	"net"
	"strconv"
	"sync"

	"ndsom/nds_wrapper/infrastructure"
	"ndsom/nds_wrapper/static"
)

// NDSOmClient is a TCP/TLS client maintaining a persistent FIX connection to NDS-OM.
type NDSOmClient struct {
	ConnectionID string
	// serverAddr               string
	conn net.Conn
	// connMu                   sync.Mutex
	ClientSeq   int64
	clientSeqMu sync.Mutex
	quit        chan struct{}
	isLogon     bool
	// logonMu                  sync.RWMutex
	InternalChan             chan static.OrderRequest
	ReceiveChan              chan static.ResponseMessage
	SenderCompID             string
	SenderSubID              string
	TargetCompID             string
	Username                 string
	Password                 string
	UseTLS                   bool
	HeartbeatIntervalSeconds int
	aesKey                   string
	aesIV                    string
	userNum                  int64
	loginFreq                int64
	orderSeq                 int64
	LogonCh                  chan struct{}
	// userLogonCh    chan struct{}
	logonErr error
}

// NewNDSOmClient initializes a new NDSOmClient instance based on ConnConfig.
func NewNDSOmClient(cfg infrastructure.ConnConfig) *NDSOmClient {
	hbInterval := cfg.HeartbeatIntervalSeconds
	if hbInterval <= 0 {
		hbInterval = 30
	}

	userNum, err := strconv.ParseInt(cfg.SenderCompID, 10, 64)
	if err != nil {
		userNum = 1
	}

	return &NDSOmClient{
		ConnectionID:             cfg.ConnectionID,
		quit:                     make(chan struct{}),
		InternalChan:             make(chan static.OrderRequest, 100),
		ReceiveChan:              make(chan static.ResponseMessage, 100),
		SenderCompID:             cfg.SenderCompID,
		SenderSubID:              cfg.SenderSubID,
		TargetCompID:             cfg.TargetCompID,
		Username:                 cfg.Username,
		Password:                 cfg.Password,
		UseTLS:                   cfg.UseTLS,
		HeartbeatIntervalSeconds: hbInterval,
		LogonCh:                  make(chan struct{}),
		userNum:                  userNum,
		loginFreq:                1,
	}
}
