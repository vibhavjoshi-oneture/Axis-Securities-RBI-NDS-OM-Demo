package static

// Actions representing order operations.
const (
	ActionCreate = "CREATE"
	ActionModify = "MODIFY"
	ActionCancel = "CANCEL"
)

// FIX message types used by the system.
const (
	MsgTypeLogon       = "A"
	MsgTypeUserLogon   = "BE"
	MsgTypeUserResp    = "BF"
	MsgTypeNewOrder    = "D"
	MsgTypeOrderMod    = "G"
	MsgTypeOrderCancel = "F"
	MsgTypeExecReport  = "8"
	MsgTypeReject      = "3"
)

const (
	ConnectionTimeoutSeconds = 30
)
