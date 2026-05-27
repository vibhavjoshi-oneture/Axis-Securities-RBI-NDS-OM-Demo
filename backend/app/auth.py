import base64
import hashlib
import hmac
import json
import time

SECRET_KEY = b"demo-sovereign-trading-gsec-poc-2026-secure-key-phrase"

def generate_session_token(customercode: str, name: str) -> str:
    """
    Generates a secure, cryptographically signed token representing a user session.
    Token is valid for 2 hours (7200 seconds).
    """
    payload = {
        "customercode": customercode,
        "name": name,
        "exp": int(time.time()) + 7200
    }
    # Base64 encode the payload JSON string
    payload_json = json.dumps(payload, separators=(',', ':'))
    payload_b64 = base64.urlsafe_b64encode(payload_json.encode()).decode()
    
    # Compute signature over base64 string
    signature = hmac.new(SECRET_KEY, payload_b64.encode(), hashlib.sha256).hexdigest()
    
    return f"{payload_b64}.{signature}"

def verify_session_token(token: str) -> dict:
    """
    Validates the cryptographic signature of the token and checks for expiration.
    Returns the decoded session payload if valid.
    Raises ValueError on tampering, signature mismatch, or expiration.
    """
    if not token or "." not in token:
        raise ValueError("Not Authorized")
    
    try:
        parts = token.split(".")
        if len(parts) != 2:
            raise ValueError("Not Authorized")
        
        payload_b64, signature = parts[0], parts[1]
        
        # Verify cryptosignature
        expected_sig = hmac.new(SECRET_KEY, payload_b64.encode(), hashlib.sha256).hexdigest()
        if not hmac.compare_digest(signature, expected_sig):
            raise ValueError("Not Authorized")
        
        # Decode payload and check expiration
        payload_bytes = base64.urlsafe_b64decode(payload_b64.encode())
        payload = json.loads(payload_bytes.decode())
        
        if time.time() > payload.get("exp", 0):
            raise ValueError("Not Authorized") # Expired
            
        return payload
    except Exception:
        raise ValueError("Not Authorized")
