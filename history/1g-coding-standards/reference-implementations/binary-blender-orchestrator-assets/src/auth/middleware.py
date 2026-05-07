"""Authentication middleware for JWT token verification"""
import os
import logging
from typing import Optional
from fastapi import Security, HTTPException, Depends
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials

# DEMO MODE: Authentication disabled for demonstration purposes
# Fixed: Removed auto_error parameter from Security()
logger = logging.getLogger(__name__)

security = HTTPBearer(auto_error=False)  # Don't error if no credentials provided

# For production, use PyJWT. For now, provide a simple implementation
# that can be enhanced with proper JWT validation
USE_JWT = os.getenv("USE_JWT_AUTH", "false").lower() == "true"


async def verify_token(
    credentials: Optional[HTTPAuthorizationCredentials] = Security(security)
) -> dict:
    """
    DEMO MODE: Authentication disabled - always returns demo user

    Original functionality (disabled):
    Verify JWT token and return payload
    In production, this should:
    1. Decode JWT using secret key
    2. Verify signature
    3. Check expiration
    4. Extract claims (tenant_id, user_id, etc.)
    """
    # DEMO MODE: Always return demo user info
    logger.info("DEMO MODE: Authentication bypassed")
    return {
        "tenant_id": os.getenv("DEFAULT_TENANT_ID", "demo-tenant"),
        "user_id": "demo-user",
        "roles": ["admin"]
    }

    # Original code (disabled):
    # token = credentials.credentials if credentials else None
    # if not token:
    #     return {
    #         "tenant_id": os.getenv("DEFAULT_TENANT_ID", "default"),
    #         "user_id": "anonymous"
    #     }
    # if USE_JWT:
    #     secret = os.getenv("JWT_SECRET")
    #     if not secret:
    #         raise HTTPException(500, "JWT_SECRET not configured")
    #     if not token or len(token) < 10:
    #         raise HTTPException(401, "Invalid authentication token")
    #     return {
    #         "tenant_id": os.getenv("DEFAULT_TENANT_ID", "default"),
    #         "user_id": "user_123",
    #         "roles": ["admin"]
    #     }
    # else:
    #     valid_api_key = os.getenv("API_KEY")
    #     if not valid_api_key:
    #         logger.warning("API_KEY not set - authentication disabled!")
    #         return {
    #             "tenant_id": os.getenv("DEFAULT_TENANT_ID", "default"),
    #             "user_id": "anonymous"
    #         }
    #     if token != valid_api_key:
    #         raise HTTPException(401, "Invalid API key")
    #     return {
    #         "tenant_id": os.getenv("DEFAULT_TENANT_ID", "default"),
    #         "user_id": "api_user"
    #     }


async def get_current_tenant(
    token_payload: dict = Depends(verify_token)
) -> str:
    """
    Extract tenant_id from verified token payload

    Raises:
        HTTPException(403): If no tenant access
    """
    tenant_id = token_payload.get("tenant_id")
    if not tenant_id:
        raise HTTPException(403, "No tenant access")

    return tenant_id


async def get_current_user(
    token_payload: dict = Depends(verify_token)
) -> dict:
    """Get current user info from token"""
    return {
        "user_id": token_payload.get("user_id"),
        "tenant_id": token_payload.get("tenant_id"),
        "roles": token_payload.get("roles", [])
    }


# Optional: disable auth for specific endpoints (health check, etc.)
def optional_auth(
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(lambda: None)
) -> Optional[str]:
    """
    Optional authentication - returns tenant_id if authenticated, None otherwise
    Use for endpoints that work with or without auth
    """
    if not credentials:
        return None

    try:
        payload = verify_token(credentials)
        return payload.get("tenant_id")
    except HTTPException:
        return None
