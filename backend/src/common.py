"""Shared helpers for inquiry Lambda handlers."""

from __future__ import annotations

import json
import logging
import os
from typing import Any

import boto3
from boto3.resources.base import ServiceResource

logger = logging.getLogger(__name__)
logger.setLevel(logging.INFO)

CORS_HEADERS = {
    "Access-Control-Allow-Origin": "*",
    "Content-Type": "application/json",
}


def get_table_name() -> str:
    name = os.environ.get("TABLE_NAME")
    if not name:
        raise RuntimeError("TABLE_NAME environment variable is not set")
    return name


def get_dynamodb_resource() -> ServiceResource:
    """Return a DynamoDB resource, optionally targeting DynamoDB Local."""
    endpoint_url = os.environ.get("DYNAMODB_ENDPOINT_URL") or None
    if endpoint_url == "":
        endpoint_url = None
    region = os.environ.get("AWS_REGION") or os.environ.get("AWS_DEFAULT_REGION") or "ap-northeast-1"

    if endpoint_url:
        logger.info("Using DynamoDB endpoint: %s (region=%s)", endpoint_url, region)
        return boto3.resource(
            "dynamodb",
            endpoint_url=endpoint_url,
            region_name=region,
            aws_access_key_id=os.environ.get("AWS_ACCESS_KEY_ID", "local"),
            aws_secret_access_key=os.environ.get("AWS_SECRET_ACCESS_KEY", "local"),
        )

    logger.info("Using default AWS DynamoDB endpoint (region=%s)", region)
    return boto3.resource("dynamodb", region_name=region)


def json_response(status_code: int, body: Any) -> dict[str, Any]:
    return {
        "statusCode": status_code,
        "headers": dict(CORS_HEADERS),
        "body": json.dumps(body, ensure_ascii=False),
    }


def error_response(status_code: int, error: str, message: str) -> dict[str, Any]:
    return json_response(status_code, {"error": error, "message": message})
