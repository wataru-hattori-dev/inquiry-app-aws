"""GET /inquiries — list all inquiries."""

from __future__ import annotations

import logging

from botocore.exceptions import ClientError

from common import error_response, get_dynamodb_resource, get_table_name, json_response

logger = logging.getLogger(__name__)
logger.setLevel(logging.INFO)


def _get_table():
    return get_dynamodb_resource().Table(get_table_name())


def _scan_all() -> list[dict]:
    table = _get_table()
    items: list[dict] = []
    exclusive_start_key = None
    while True:
        kwargs: dict = {}
        if exclusive_start_key is not None:
            kwargs["ExclusiveStartKey"] = exclusive_start_key
        response = table.scan(**kwargs)
        items.extend(response.get("Items", []))
        exclusive_start_key = response.get("LastEvaluatedKey")
        if not exclusive_start_key:
            break
    return items


def lambda_handler(event: dict, context: object) -> dict:
    try:
        table_name = get_table_name()
        logger.info("Scan table=%s", table_name)
        items = _scan_all()
        items.sort(key=lambda item: item.get("created_at", ""), reverse=True)
        return json_response(200, {"items": items})
    except ClientError as exc:
        logger.exception(
            "DynamoDB ClientError: %s",
            exc.response.get("Error", {}).get("Code", "Unknown"),
        )
        return error_response(500, "InternalServerError", "Unexpected error occurred")
    except Exception:
        logger.exception("Unhandled error in list_inquiries")
        return error_response(500, "InternalServerError", "Unexpected error occurred")
