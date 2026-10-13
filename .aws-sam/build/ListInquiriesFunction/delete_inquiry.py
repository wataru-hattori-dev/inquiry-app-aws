"""DELETE /inquiries/{id} — delete an inquiry."""

from __future__ import annotations

import logging

from botocore.exceptions import ClientError

from common import error_response, get_dynamodb_resource, get_table_name, no_content_response

logger = logging.getLogger(__name__)
logger.setLevel(logging.INFO)


def _get_table():
    return get_dynamodb_resource().Table(get_table_name())


def _extract_id(event: dict) -> str | None:
    path_params = event.get("pathParameters") or {}
    inquiry_id = path_params.get("id")
    if inquiry_id is None:
        return None
    if not isinstance(inquiry_id, str):
        return None
    return inquiry_id


def lambda_handler(event: dict, context: object) -> dict:
    try:
        inquiry_id = _extract_id(event)
        if inquiry_id is None or inquiry_id.strip() == "":
            return error_response(400, "ValidationError", "id is required")

        table_name = get_table_name()
        logger.info("DeleteItem table=%s", table_name)
        response = _get_table().delete_item(
            Key={"id": inquiry_id},
            ReturnValues="ALL_OLD",
        )
        if "Attributes" not in response:
            return error_response(404, "NotFound", "Inquiry not found")

        return no_content_response()
    except ClientError as exc:
        logger.exception(
            "DynamoDB ClientError: %s",
            exc.response.get("Error", {}).get("Code", "Unknown"),
        )
        return error_response(500, "InternalServerError", "Unexpected error occurred")
    except Exception:
        logger.exception("Unhandled error in delete_inquiry")
        return error_response(500, "InternalServerError", "Unexpected error occurred")
