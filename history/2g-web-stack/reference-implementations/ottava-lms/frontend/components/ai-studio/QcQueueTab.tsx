'use client';

import { useCallback, useEffect, useState } from 'react';
import { assetsAPI } from '@/lib/api';

interface PendingAsset {
  id: string;
  asset_type: string;
  training_module_id?: string | null;
  training_module_title?: string | null;
  title?: string | null;
  description?: string | null;
  public_url: string;
  style?: string | null;
  duration_seconds?: number | null;
  created_at?: string | null;
}

interface QcQueueTabProps {
  onShowToast: (type: 'success' | 'error' | 'warning', message: string) => void;
  onModuleRefresh: (moduleId?: string | null) => void;
  refreshToken?: number;
  hiddenAssetIds?: Set<string>;
}

export default function QcQueueTab({
  onShowToast,
  onModuleRefresh,
  refreshToken = 0,
  hiddenAssetIds,
}: QcQueueTabProps) {
  const [assets, setAssets] = useState<PendingAsset[]>([]);
  const [loading, setLoading] = useState(false);
  const [actingOn, setActingOn] = useState<string | null>(null);

  const loadPendingAssets = useCallback(async () => {
    setLoading(true);
    try {
      const response = await assetsAPI.listPending();
      setAssets(response?.assets || []);
    } catch (error: any) {
      console.error('Failed to load QC queue', error);
      onShowToast('error', error?.response?.data?.error || 'Unable to load QC queue.');
    } finally {
      setLoading(false);
    }
  }, [onShowToast]);

  useEffect(() => {
    loadPendingAssets();
  }, [loadPendingAssets, refreshToken]);

  const handleDecision = async (assetId: string, decision: 'approve' | 'reject', moduleId?: string | null) => {
    setActingOn(assetId);
    try {
      if (decision === 'approve') {
        await assetsAPI.approve(assetId);
        onShowToast('success', 'Asset approved and linked to the module.');
        if (moduleId) {
          onModuleRefresh(moduleId);
        }
      } else {
        await assetsAPI.reject(assetId);
        onShowToast('success', 'Asset rejected.');
      }
      setAssets((prev) => prev.filter((asset) => asset.id !== assetId));
    } catch (error: any) {
      console.error('QC action failed', error);
      onShowToast('error', error?.response?.data?.error || 'Unable to complete QC action.');
    } finally {
      setActingOn(null);
    }
  };

  return (
    <div className="px-4 py-8 max-w-5xl">
      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-3xl font-bold text-gray-900">QC Queue</h2>
          <p className="text-gray-600">Approve freshly generated songs before they become part of a training module.</p>
        </div>
        <button
          type="button"
          onClick={loadPendingAssets}
          className="inline-flex items-center justify-center rounded-xl border border-gray-200 bg-white px-4 py-2 text-sm font-semibold text-gray-700 hover:border-gray-300"
          disabled={loading}
        >
          {loading ? 'Refreshing…' : 'Refresh queue'}
        </button>
      </div>

      {loading ? (
        <div className="text-sm text-gray-500">Loading pending assets…</div>
      ) : assets.length === 0 ? (
        <div className="bg-white border border-gray-200 rounded-2xl p-8 text-center text-gray-500">
          No assets are waiting for review. Generate a song or upload an asset to populate this queue.
        </div>
      ) : (
        <div className="space-y-4">
          {assets
            .filter((asset) => !(hiddenAssetIds && hiddenAssetIds.has(asset.id)))
            .map((asset) => (
            <div key={asset.id} className="bg-white border border-gray-200 rounded-2xl p-5 shadow-sm">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold text-gray-900">{asset.title || 'New training mix'}</p>
                  <p className="text-xs text-gray-500">
                    {asset.training_module_title || 'Unassigned module'} · {asset.style || 'Custom style'}
                  </p>
                </div>
                <div className="text-xs text-gray-500 flex items-center gap-2">
                  {asset.duration_seconds ? <span>{asset.duration_seconds}s</span> : <span>Duration N/A</span>}
                  {asset.created_at && <span>• {new Date(asset.created_at).toLocaleString()}</span>}
                </div>
              </div>
              <div className="mt-3">
                <audio controls className="w-full rounded-xl border border-gray-200" src={asset.public_url} preload="metadata">
                  Your browser does not support the audio element.
                </audio>
              </div>
              <div className="mt-4 flex flex-wrap gap-3">
                <button
                  type="button"
                  onClick={() => handleDecision(asset.id, 'approve', asset.training_module_id)}
                  disabled={actingOn === asset.id}
                  className="inline-flex items-center justify-center rounded-xl bg-green-600 px-4 py-2 text-sm font-semibold text-white shadow hover:bg-green-700 disabled:opacity-60"
                >
                  Approve
                </button>
                <button
                  type="button"
                  onClick={() => handleDecision(asset.id, 'reject')}
                  disabled={actingOn === asset.id}
                  className="inline-flex items-center justify-center rounded-xl bg-red-600 px-4 py-2 text-sm font-semibold text-white shadow hover:bg-red-700 disabled:opacity-60"
                >
                  Reject
                </button>
                {asset.training_module_title && (
                  <span className="inline-flex items-center rounded-full bg-primary-50 px-3 py-1 text-xs font-semibold text-primary-700">
                    {asset.training_module_title}
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
