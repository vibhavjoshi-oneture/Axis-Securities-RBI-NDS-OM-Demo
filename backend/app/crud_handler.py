import base64
import decimal
import datetime
import json
import os
import re
from pathlib import Path
from dotenv import load_dotenv
import psycopg2
from psycopg2 import sql
from psycopg2.extras import RealDictCursor, Json

# Load environment variables from the parent directory's .env file
BACKEND_DIR = Path(__file__).resolve().parent.parent
load_dotenv(dotenv_path=BACKEND_DIR / ".env")


ACTION_RE = re.compile(r"^(get|filter|create|update|delete)(.+)$", re.IGNORECASE)
COLUMN_TYPE_CACHE = {}

def get_db_connection():
    return psycopg2.connect(
        host=os.environ["DB_HOST"],
        port=os.environ["DB_PORT"],
        dbname=os.environ["DB_NAME"],
        user=os.environ["DB_USER"],
        password=os.environ["DB_PASSWORD"]
    )

def serialize(record):
    if not record:
        return record
    for k, v in record.items():
        if isinstance(v, (datetime.datetime, datetime.date)):
            record[k] = v.isoformat()
        elif isinstance(v, decimal.Decimal):
            record[k] = float(v)
        elif isinstance(v, (dict, list)):
            record[k] = json.dumps(v, default=str)
    return record

def _parse_table_name(raw_table: str):
    # Map 'public_' prefix to the 'ndsom' schema
    if raw_table.startswith("public_"):
        raw_table = raw_table.replace("public_", "", 1)
    return "ndsom", raw_table.lower()

def _get_column_types(cur, schema: str, table: str) -> dict:
    cache_key = f"{schema}.{table}"
    if cache_key in COLUMN_TYPE_CACHE:
        return COLUMN_TYPE_CACHE[cache_key]
    cur.execute(
        """
        SELECT column_name, data_type
        FROM information_schema.columns
        WHERE table_schema = %s AND table_name = %s
        """,
        (schema, table)
    )
    result = {row["column_name"].lower(): row["data_type"] for row in cur.fetchall()}
    COLUMN_TYPE_CACHE[cache_key] = result
    return result

def _adapt_json_values(args, col_types):
    adapted_vals = []
    for col_name, value in args.items():
        col_type = col_types.get(col_name)
        if col_type in ("json", "jsonb") and isinstance(value, (dict, list)):
            adapted_vals.append(Json(value))
        else:
            adapted_vals.append(value)
    return adapted_vals

def lambda_handler(event, context=None):
    field = event["info"]["fieldName"]
    args = event.get("arguments", {})
    
    match = ACTION_RE.match(field)
    if not match:
        raise ValueError(f"Invalid fieldName: {field}")
        
    action, raw_table = match.group(1).lower(), match.group(2).lower()
    schema, table = _parse_table_name(raw_table)
    
    with get_db_connection() as conn:
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            if action == "get" or action == "filter":
                return _handle_get(cur, schema, table, args)
            elif action == "create":
                return _handle_create(cur, schema, table, args)
            elif action == "update":
                return _handle_update(cur, schema, table, args)
            elif action == "delete":
                return _handle_delete(cur, schema, table, args)

def _handle_get(cur, schema: str, table: str, args: dict):
    limit = int(args.pop("limit", -1))
    next_token = args.pop("next_token", None)
    filter_data = args.pop("filter", None)
    
    offset = 0
    if next_token:
        offset = int(base64.urlsafe_b64decode(next_token.encode()).decode())
        
    col_types = _get_column_types(cur, schema, table)
    where_clause = ""
    values = []
    
    if filter_data:
        conditions = []
        for k, v in filter_data.items():
            col = k.lower().strip()
            if col in col_types:
                if isinstance(v, (list, tuple)):
                    placeholders = ",".join(["%s"] * len(v))
                    conditions.append(f'"{col}" IN ({placeholders})')
                    values.extend(v)
                elif col_types[col] in ("character varying", "text"):
                    conditions.append(f'"{col}" ILIKE %s')
                    values.append(f"%{v}%")
                else:
                    conditions.append(f'"{col}" = %s')
                    values.append(v)
        if conditions:
            where_clause = "WHERE " + " AND ".join(conditions)
            
    # Find the primary key column for ordering
    pk_query = """
        SELECT column_name FROM information_schema.key_column_usage
        WHERE table_schema = %s AND table_name = %s AND constraint_name IN (
            SELECT constraint_name FROM information_schema.table_constraints WHERE constraint_type='PRIMARY KEY'
        )
    """
    cur.execute(pk_query, (schema, table))
    pk_res = cur.fetchone()
    order_col = pk_res["column_name"] if pk_res else "1"
    
    sql_query = f'SELECT * FROM "{schema}"."{table}" {where_clause} ORDER BY "{order_col}" DESC'
    if limit > 0:
        sql_query += " LIMIT %s OFFSET %s"
        values.extend([limit + 1, offset])
        
    cur.execute(sql_query, values)
    records = cur.fetchall()
    results = [serialize(r) for r in records]
    
    new_next_token = None
    if limit > 0:
        has_more = len(records) > limit
        results = results[:limit]
        if has_more:
            new_next_token = base64.urlsafe_b64encode(str(offset + limit).encode()).decode()
            
    return {"results": results, "next_token": new_next_token}

def _handle_create(cur, schema: str, table: str, args: dict):
    input_data = {k.lower(): v for k, v in args["input"].items()}
    col_types = _get_column_types(cur, schema, table)
    
    # Filter columns that don't exist in the DB table
    input_data = {k: v for k, v in input_data.items() if k in col_types}
    
    vals = _adapt_json_values(input_data, col_types)
    cols = [sql.Identifier(c) for c in input_data]
    placeholders = sql.SQL(",").join(sql.Placeholder() * len(vals))
    
    q = sql.SQL("INSERT INTO {schema}.{table}({fields}) VALUES({placeholders}) RETURNING *").format(
        schema=sql.Identifier(schema),
        table=sql.Identifier(table),
        fields=sql.SQL(",").join(cols),
        placeholders=placeholders,
    )
    cur.execute(q, vals)
    return serialize(cur.fetchone())

def _handle_update(cur, schema: str, table: str, args: dict):
    input_data = {k.lower(): v for k, v in args["input"].items()}
    col_types = _get_column_types(cur, schema, table)
    
    cur.execute(
        """
        SELECT column_name FROM information_schema.key_column_usage
        WHERE table_schema = %s AND table_name = %s AND constraint_name IN (
            SELECT constraint_name FROM information_schema.table_constraints WHERE constraint_type='PRIMARY KEY'
        )
        """,
        (schema, table)
    )
    pk_res = cur.fetchone()
    if not pk_res:
        raise ValueError(f"Primary key not found for {schema}.{table}")
    pk = pk_res["column_name"]
    
    if pk not in input_data:
        raise ValueError(f"Missing primary key: {pk}")
    pk_val = input_data.pop(pk)
    
    # Filter columns that don't exist in the DB table
    input_data = {k: v for k, v in input_data.items() if k in col_types}
    
    if not input_data:
        cur.execute(sql.SQL("SELECT * FROM {schema}.{table} WHERE {pk_col} = %s").format(
            schema=sql.Identifier(schema), table=sql.Identifier(table), pk_col=sql.Identifier(pk)
        ), (pk_val,))
        return serialize(cur.fetchone())
        
    adapted_vals = _adapt_json_values(input_data, col_types)
    assignments = [sql.SQL("{} = {}").format(sql.Identifier(col), sql.Placeholder()) for col in input_data]
    
    q = sql.SQL("UPDATE {schema}.{table} SET {assignments} WHERE {pk_col} = {pk_placeholder} RETURNING *").format(
        schema=sql.Identifier(schema),
        table=sql.Identifier(table),
        assignments=sql.SQL(", ").join(assignments),
        pk_col=sql.Identifier(pk),
        pk_placeholder=sql.Placeholder(),
    )
    cur.execute(q, adapted_vals + [pk_val])
    return serialize(cur.fetchone())

def _handle_delete(cur, schema: str, table: str, args: dict):
    input_data = {k.lower(): v for k, v in args["input"].items()}
    cur.execute(
        """
        SELECT column_name FROM information_schema.key_column_usage
        WHERE table_schema = %s AND table_name = %s AND constraint_name IN (
            SELECT constraint_name FROM information_schema.table_constraints WHERE constraint_type='PRIMARY KEY'
        )
        """,
        (schema, table)
    )
    pk_res = cur.fetchone()
    pk = pk_res["column_name"]
    pk_val = input_data[pk]
    
    q = sql.SQL("DELETE FROM {schema}.{table} WHERE {pk_col} = %s").format(
        schema=sql.Identifier(schema), table=sql.Identifier(table), pk_col=sql.Identifier(pk)
    )
    cur.execute(q, (pk_val,))
    return pk_val
