"""Module for loading existing assets from the repository"""

from typing import Dict, Any, List, Optional

from .base import BaseModule, ModuleDefinition


class AssetLoaderModule(BaseModule):
    """Exposes existing repository assets to downstream modules."""

    async def execute(self, inputs: Dict[str, Any], execution_context: Dict[str, Any]) -> Dict[str, Any]:
        """
        Legacy execution shim so BaseModule's abstract execute() is satisfied.

        The loader only does useful work through execute_with_asset_ids(), but
        returning an empty structure keeps older call sites from exploding if
        they accidentally invoke the legacy pathway.
        """
        return {"default": []}

    def get_definition(self) -> ModuleDefinition:
        return ModuleDefinition(
            type="asset_loader",
            name="Asset Loader",
            description="Load existing assets from the repository by ID or simple query",
            category="action",
            inputs=[],
            outputs=["default", "images", "videos", "audio", "text"],
            config_schema={
                "type": "object",
                "properties": {
                    "mode": {
                        "type": "string",
                        "enum": ["direct", "query"],
                        "default": "direct",
                        "description": "Direct: specify asset IDs. Query: fetch by filters."
                    },
                    "asset_ids": {
                        "type": "string",
                        "description": "Comma-separated list of asset IDs (direct mode only)"
                    },
                    "collection_id": {
                        "type": "string",
                        "description": "Collection/folder ID to pull from (query mode)"
                    },
                    "state": {
                        "type": "string",
                        "description": "Asset state filter (query mode)",
                        "enum": ["approved", "unchecked", "rejected", "N/A"]
                    },
                    "state_list": {
                        "type": "string",
                        "description": "Additional states (comma separated) for multi-state filtering"
                    },
                    "asset_type": {
                        "type": "string",
                        "description": "Asset type filter (query mode)",
                        "enum": ["image", "video", "audio", "text", "data"]
                    },
                    "limit": {
                        "type": "integer",
                        "description": "Maximum number of assets to load (query mode)",
                        "default": 5,
                        "minimum": 1,
                        "maximum": 50
                    },
                    "tags": {
                        "type": "string",
                        "description": "Comma-separated tags to filter by (query mode)"
                    },
                    "tag_mode": {
                        "type": "string",
                        "description": "Require ANY matching tag or ALL of them",
                        "enum": ["any", "all"],
                        "default": "any"
                    },
                    "sort_by": {
                        "type": "string",
                        "description": "Ordering field for query mode",
                        "enum": ["created_at", "updated_at", "state", "provider"],
                        "default": "created_at"
                    },
                    "sort_direction": {
                        "type": "string",
                        "description": "Ordering direction",
                        "enum": ["asc", "desc"],
                        "default": "desc"
                    }
                }
            },
            icon="🗂️"
        )

    async def execute_with_asset_ids(
        self,
        input_asset_ids: Dict[str, List[str]],
        execution_context: Dict[str, Any]
    ) -> Dict[str, List[str]]:
        if not self._asset_repo:
            raise RuntimeError("Asset repository not set. Workflow engine must call _set_asset_repo()")

        mode = self.config.get("mode", "direct").lower()
        assets: List[Any] = []
        query_kwargs = self._build_query_kwargs(include_limit=(mode == "query"))

        if mode == "query":
            assets = await self._asset_repo.query_assets(**query_kwargs)
        else:
            asset_ids = self._parse_csv(self.config.get("asset_ids"))
            if asset_ids:
                assets = await self._asset_repo.query_assets(asset_ids=asset_ids, **query_kwargs)

        output = {
            "default": [],
            "images": [],
            "videos": [],
            "audio": [],
            "text": []
        }

        for asset in assets:
            output["default"].append(asset.id)
            if asset.type == "image":
                output["images"].append(asset.id)
            elif asset.type == "video":
                output["videos"].append(asset.id)
            elif asset.type == "audio":
                output["audio"].append(asset.id)
            elif asset.type == "text":
                output["text"].append(asset.id)

        return output

    def _parse_csv(self, value: Optional[Any]) -> List[str]:
        if not value:
            return []
        if isinstance(value, list):
            items = value
        else:
            items = str(value).split(",")
        return [item.strip() for item in items if item and item.strip()]

    def _normalize_states(self) -> List[str]:
        states: List[str] = []
        primary = self.config.get("state")
        if primary:
            states.append(primary)
        states.extend(self._parse_csv(self.config.get("state_list")))

        normalized: List[str] = []
        for state in states:
            if not state:
                continue
            if state not in normalized:
                normalized.append(state)
            if state.lower() == "approved" and "N/A" not in normalized:
                normalized.append("N/A")
        return normalized

    def _build_query_kwargs(self, include_limit: bool = True) -> Dict[str, Any]:
        limit_value = self.config.get("limit", 5)
        try:
            limit = int(limit_value)
        except (TypeError, ValueError):
            limit = 5

        if not include_limit:
            limit = None
        else:
            limit = max(1, min(limit, 50))

        tags = self._parse_csv(self.config.get("tags"))
        tag_mode = (self.config.get("tag_mode") or "any").lower()
        if tag_mode not in ("any", "all"):
            tag_mode = "any"

        sort_by = (self.config.get("sort_by") or "created_at").lower()
        allowed_sort = {"created_at", "updated_at", "state", "provider"}
        if sort_by not in allowed_sort:
            sort_by = "created_at"

        sort_direction = (self.config.get("sort_direction") or "desc").lower()
        if sort_direction not in ("asc", "desc"):
            sort_direction = "desc"

        states = self._normalize_states()

        return {
            "collection_id": self.config.get("collection_id") or None,
            "asset_type": self.config.get("asset_type") or None,
            "limit": limit,
            "states": states or None,
            "tags": tags or None,
            "tag_mode": tag_mode,
            "sort_by": sort_by,
            "sort_direction": sort_direction
        }
