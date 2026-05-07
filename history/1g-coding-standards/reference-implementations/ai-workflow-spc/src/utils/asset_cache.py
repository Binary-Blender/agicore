"""
Lightweight in-memory cache for frequently accessed assets.

The workflow engine constantly fetches assets when wiring module inputs.
Without caching each module fetch issues a database round-trip which
quickly becomes the dominant cost for deep workflows.  This module adds
an LRU cache with TTL semantics so hot assets (recent outputs, assets that
are re-used across branches, etc.) can be served from memory.
"""

from __future__ import annotations

from collections import OrderedDict
from dataclasses import dataclass
from datetime import datetime
from copy import deepcopy
from threading import RLock
from typing import Any, Dict, Iterable, List, Optional, Union

from src.database.models import Asset


@dataclass(frozen=True)
class AssetSnapshot:
    """
    Lightweight, session-independent representation of an Asset row.

    SQLAlchemy model instances are tied to a DB session which makes it
    unsafe to stash them in a cache.  The snapshot stores only primitive
    values so it can be freely shared across coroutine boundaries.
    """

    id: str
    type: str
    url: str
    prompt: Optional[str]
    asset_metadata: Dict[str, Any]
    state: str
    archived: bool
    text_content: Optional[str]
    payload: Optional[Dict[str, Any]]
    workflow_id: Optional[str]
    execution_id: Optional[str]
    module_id: Optional[str]
    source_asset_ids: List[str]
    provider: Optional[str]
    provider_metadata: Optional[Dict[str, Any]]
    quality_metrics: Optional[Dict[str, Any]]
    tags: List[str]
    collection_id: Optional[str]
    created_at: Optional[datetime]
    updated_at: Optional[datetime]


@dataclass
class _CacheEntry:
    snapshot: AssetSnapshot
    expires_at: float


class AssetCache:
    """Simple LRU + TTL cache for asset snapshots."""

    def __init__(self, max_entries: int = 2048, ttl_seconds: int = 300):
        self._max_entries = max_entries
        self._ttl_seconds = ttl_seconds
        self._store: "OrderedDict[str, _CacheEntry]" = OrderedDict()
        self._lock = RLock()

    def get(self, asset_id: str) -> Optional[AssetSnapshot]:
        """Return cached snapshot if present and not expired."""
        with self._lock:
            entry = self._store.get(asset_id)
            if not entry:
                return None

            import time

            now = time.time()
            if entry.expires_at <= now or entry.snapshot.archived:
                self._store.pop(asset_id, None)
                return None

            self._store.move_to_end(asset_id)
            return entry.snapshot

    def set(self, snapshot: AssetSnapshot) -> None:
        """Insert or refresh a snapshot in the cache."""
        if not snapshot:
            return

        with self._lock:
            import time

            expires_at = time.time() + self._ttl_seconds
            self._store[snapshot.id] = _CacheEntry(snapshot=snapshot, expires_at=expires_at)
            self._store.move_to_end(snapshot.id)

            if len(self._store) > self._max_entries:
                self._store.popitem(last=False)

    def invalidate(self, asset_id: str) -> None:
        """Remove a cached snapshot if present."""
        if not asset_id:
            return
        with self._lock:
            self._store.pop(asset_id, None)

    def invalidate_many(self, asset_ids: Iterable[str]) -> None:
        """Bulk invalidate helper."""
        if not asset_ids:
            return
        for asset_id in asset_ids:
            self.invalidate(asset_id)

    def clear(self) -> None:
        """Drop all cache contents (mainly useful for tests)."""
        with self._lock:
            self._store.clear()


def snapshot_from_record(record: Union[Asset, AssetSnapshot]) -> AssetSnapshot:
    """
    Convert either a SQLAlchemy Asset row or an existing snapshot into
    an AssetSnapshot instance.
    """
    if isinstance(record, AssetSnapshot):
        return record

    return AssetSnapshot(
        id=record.id,
        type=record.type,
        url=record.url,
        prompt=record.prompt,
        asset_metadata=deepcopy(record.asset_metadata or {}),
        state=record.state,
        archived=bool(record.archived),
        text_content=record.text_content,
        payload=deepcopy(record.payload) if record.payload is not None else None,
        workflow_id=record.workflow_id,
        execution_id=record.execution_id,
        module_id=record.module_id,
        source_asset_ids=list(record.source_asset_ids or []),
        provider=record.provider,
        provider_metadata=deepcopy(record.provider_metadata) if record.provider_metadata else None,
        quality_metrics=deepcopy(record.quality_metrics) if record.quality_metrics else None,
        tags=list(record.tags or []),
        collection_id=record.collection_id,
        created_at=record.created_at,
        updated_at=record.updated_at,
    )


# Shared cache instance for the application
asset_cache = AssetCache()


__all__ = [
    "AssetSnapshot",
    "AssetCache",
    "asset_cache",
    "snapshot_from_record",
]
