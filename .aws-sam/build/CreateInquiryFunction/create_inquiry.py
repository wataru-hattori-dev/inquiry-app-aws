"""POST /inquiries — create a new inquiry."""

from __future__ import annotations

import json
import logging
import re
import uuid
from datetime import datetime, timedelta, timezone

from botocore.exceptions import ClientError

from common import error_response, get_dynamodb_resource, get_table_name, json_response

logger = logging.getLogger(__name__)
logger.setLevel(logging.INFO)

JST = timezone(timedelta(hours=9))

NAME_MAX_LEN = 100
EMAIL_MAX_LEN = 254
MESSAGE_MAX_LEN = 2000

EMAIL_PATTERN = re.compile(r"^[^\s@]+@[^\s@]+\.[^\s@]+$")

def _get_table():
    return get_dynamodb_resource().Table(get_table_name())


def _parse_body(event: dict) -> tuple[dict | None, dict | None]:
    raw = event.get("body")
    if raw is None or raw == "":
        return None, error_response(400, "ValidationError", "Request body is required")
    try:
        data = json.loads(raw)
    except json.JSONDecodeError:
        return None, error_response(400, "ValidationError", "Invalid JSON body")
    if not isinstance(data, dict):
        return None, error_response(400, "ValidationError", "Request body must be a JSON object")
    return data, None


def _validate_fields(data: dict) -> tuple[str, str, str] | dict:
    for field in ("name", "email", "message"):
        if field not in data:
            return error_response(400, "ValidationError", f"{field} is required")

    name = data["name"]
    email = data["email"]
    message = data["message"]

    for field, value in (("name", name), ("email", email), ("message", message)):
        if not isinstance(value, str):
            return error_response(400, "ValidationError", f"{field} must be a string")

    if not name.strip():
        return error_response(400, "ValidationError", "name is required")
    if len(name) > NAME_MAX_LEN:
        return error_response(400, "ValidationError", "name exceeds maximum length")

    if not email.strip():
        return error_response(400, "ValidationError", "email is required")
    if len(email) > EMAIL_MAX_LEN:
        return error_response(400, "ValidationError", "email exceeds maximum length")
    if not EMAIL_PATTERN.match(email):
        return error_response(400, "ValidationError", "email format is invalid")

    if not message.strip():
        return error_response(400, "ValidationError", "message is required")
    if len(message) > MESSAGE_MAX_LEN:
        return error_response(400, "ValidationError", "message exceeds maximum length")

    return name, email, message


def _now_iso_jst() -> str:
    return datetime.now(JST).isoformat(timespec="seconds")


def lambda_handler(event: dict, context: object) -> dict:
    try:
        data, err = _parse_body(event)
        if err is not None:
            return err

        validated = _validate_fields(data)
        if isinstance(validated, dict):
            return validated
        name, email, message = validated

        item = {
            "id": str(uuid.uuid4()),
            "created_at": _now_iso_jst(),
            "name": name,
            "email": email,
            "message": message,
        }

        table_name = get_table_name()
        logger.info("PutItem to table=%s", table_name)
        _get_table().put_item(Item=item)

        return json_response(201, item)
    except ClientError as exc:
        logger.exception(
            "DynamoDB ClientError: %s",
            exc.response.get("Error", {}).get("Code", "Unknown"),
        )
        return error_response(500, "InternalServerError", "Unexpected error occurred")
    except Exception:
        logger.exception("Unhandled error in create_inquiry")
        return error_response(500, "InternalServerError", "Unexpected error occurred")
