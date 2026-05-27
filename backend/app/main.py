from __future__ import annotations
from pathlib import Path
from typing import Any, Union
from ariadne import load_schema_from_path, make_executable_schema
from ariadne.asgi import GraphQL
from ariadne.asgi.handlers import GraphQLTransportWSHandler
from fastapi import FastAPI, Request, WebSocket
from fastapi.middleware.cors import CORSMiddleware

from .resolvers import BusinessValidationError, resolvers
from .subscriptions import subscription
from .auth import verify_session_token
from .store import store

BASE_DIR = Path(__file__).resolve().parent
schema_type_defs = load_schema_from_path(BASE_DIR / "schema.graphql")
schema = make_executable_schema(schema_type_defs, *resolvers, subscription)

def error_formatter(error, debug=False):
    formatted = error.formatted
    original_error = getattr(error, "original_error", None)
    if isinstance(original_error, BusinessValidationError):
        formatted["message"] = str(original_error)
        formatted["extensions"] = {"code": "BUSINESS_VALIDATION_ERROR"}
    elif original_error and str(original_error) == "Not Authorized":
        formatted["message"] = "Not Authorized"
        formatted["extensions"] = {"code": "UNAUTHORIZED"}
    return formatted

# Custom WebSocket authentication interceptor
async def ws_on_connect(websocket: WebSocket, payload: Any = None):
    """
    Called on WS connection_init phase.
    Extracts Bearer token from connectionParams payload and stores validated identity in scope.
    """
    if not isinstance(payload, dict):
        raise ValueError("Not Authorized")
        
    auth_header = payload.get("Authorization") or payload.get("authorization")
    if not auth_header:
        raise ValueError("Not Authorized")
        
    if auth_header.startswith("Bearer "):
        token = auth_header.split(" ")[1]
    else:
        token = auth_header
        
    try:
        identity = verify_session_token(token)
        websocket.scope["identity"] = identity
    except ValueError:
        raise ValueError("Not Authorized")

# Retrieve context and inject authenticated identity context
async def get_context(request: Union[Request, WebSocket], action: str = None) -> dict:
    context = {"request": request}
    if isinstance(request, Request):
        # Extract Bearer token from headers
        auth_header = request.headers.get("Authorization") or request.headers.get("authorization")
        if auth_header and auth_header.startswith("Bearer "):
            token = auth_header.split(" ")[1]
            try:
                identity = verify_session_token(token)
                context["identity"] = identity
            except ValueError:
                context["identity"] = None
        else:
            context["identity"] = None
    else:
        # Retrieve identity stored in WebSocket scope during connection_init
        context["identity"] = request.scope.get("identity")
    return context

_graphql_app = GraphQL(
    schema,
    debug=True,
    error_formatter=error_formatter,
    websocket_handler=GraphQLTransportWSHandler(on_connect=ws_on_connect),
    context_value=get_context
)

app = FastAPI(title="G-Sec Trading POC - Ariadne GraphQL")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.on_event("startup")
async def startup_event():
    """Sync live CCIL public listed bonds to the securities table on platform startup."""
    print("Platform booting up... Syncing live CCIL public listed bonds to securities master...")
    try:
        store.sync_ccil_securities_to_db()
        print("Live CCIL securities master synced successfully.")
    except Exception as e:
        print(f"Warning: Failed to sync CCIL securities on boot: {e}. Falling back to default seeds.")

@app.get("/health")
def health():
    return {"status": "ok"}

@app.api_route("/graphql", methods=["GET", "POST"])
async def graphql_http(request: Request):
    return await _graphql_app.handle_request(request)

@app.websocket("/graphql")
async def graphql_ws(websocket: WebSocket):
    # Context value for WebSockets is passed inside handler (retrieves from ws.scope)
    await _graphql_app.handle_websocket(websocket)
