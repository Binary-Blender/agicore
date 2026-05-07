'use client';

import { FormEvent, useCallback, useEffect, useMemo, useState } from 'react';
import { assetsAPI } from '@/lib/api';

interface AssetSummary {
  id: string;
  asset_type: string;
  training_module_id?: string | null;
  training_module_title?: string | null;
  title?: string | null;
  description?: string | null;
  status: string;
  public_url: string;
  style?: string | null;
  duration_seconds?: number | null;
  created_at?: string | null;
}

interface OptionModule {
  id: string;
  title: string;
}

interface AssetRepositoryTabProps {
  modules: OptionModule[];
  onShowToast: (type: 'success' | 'error' | 'warning', message: string) => void;
  onModuleRefresh: (moduleId?: string | null) => void;
}

export default function AssetRepositoryTab({ modules, onShowToast, onModuleRefresh }: AssetRepositoryTabProps) {
  const [assets, setAssets] = useState<AssetSummary[]>([]);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [selectedModule, setSelectedModule] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [title, setTitle] = useState('');
  const [style, setStyle] = useState('');
  const [duration, setDuration] = useState('');
  const [editingAsset, setEditingAsset] = useState<AssetSummary | null>(null);
  const [editForm, setEditForm] = useState({
    moduleId: '',
    title: '',
    description: '',
    style: '',
    duration: '',
  });
  const [savingAssetId, setSavingAssetId] = useState('');
  const [deletingAssetId, setDeletingAssetId] = useState('');

  const moduleOptions = useMemo(() => modules.map((module) => ({ id: module.id, label: module.title })), [modules]);
  const apiBase = process.env.NEXT_PUBLIC_API_URL || '';
  const resolveAssetUrl = useCallback(
    (input?: string | null) => {
      if (!input) return '';
      if (/^https?:\/\//i.test(input)) return input;
      return `${apiBase}${input}`;
    },
    [apiBase]
  );

  const loadAssets = useCallback(async () => {
    setLoading(true);
    try {
      const response = await assetsAPI.list();
      setAssets(response?.assets || []);
    } catch (error: any) {
      console.error('Failed to load assets', error);
      onShowToast('error', error?.response?.data?.error || 'Unable to load assets.');
    } finally {
      setLoading(false);
    }
  }, [onShowToast]);

  useEffect(() => {
    loadAssets();
  }, [loadAssets]);

  const beginEdit = (asset: AssetSummary) => {
    setEditingAsset(asset);
    setEditForm({
      moduleId: asset.training_module_id || '',
      title: asset.title || '',
      description: asset.description || '',
      style: asset.style || '',
      duration: asset.duration_seconds ? String(asset.duration_seconds) : '',
    });
  };

  const cancelEdit = () => {
    setEditingAsset(null);
    setEditForm({
      moduleId: '',
      title: '',
      description: '',
      style: '',
      duration: '',
    });
    setSavingAssetId('');
  };

  const handleEditChange = (field: keyof typeof editForm, value: string) => {
    setEditForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleSaveEdit = async () => {
    if (!editingAsset) return;
    const payload: Record<string, any> = {
      training_module_id: editForm.moduleId || null,
      title: editForm.title.trim() || null,
      description: editForm.description.trim() || null,
      style: editForm.style.trim() || null,
      duration_seconds: editForm.duration.trim() ? Number(editForm.duration) : null,
    };

    setSavingAssetId(editingAsset.id);
    try {
      const response = await assetsAPI.update(editingAsset.id, payload);
      onShowToast('success', 'Asset updated.');
      cancelEdit();
      await loadAssets();
      const refreshedAsset = response?.asset;
      if (
        editingAsset.training_module_id &&
        editingAsset.training_module_id !== refreshedAsset?.training_module_id
      ) {
        onModuleRefresh(editingAsset.training_module_id);
      }
      if (refreshedAsset?.training_module_id) {
        onModuleRefresh(refreshedAsset.training_module_id);
      }
    } catch (error: any) {
      console.error('Asset update failed', error);
      onShowToast('error', error?.response?.data?.error || 'Unable to update asset.');
    } finally {
      setSavingAssetId('');
    }
  };

  const handleDeleteAsset = async (asset: AssetSummary) => {
    if (!confirm('Remove this asset permanently? This cannot be undone.')) {
      return;
    }
    setDeletingAssetId(asset.id);
    try {
      await assetsAPI.remove(asset.id);
      onShowToast('success', 'Asset removed.');
      await loadAssets();
      if (asset.training_module_id) {
        onModuleRefresh(asset.training_module_id);
      }
      if (editingAsset?.id === asset.id) {
        cancelEdit();
      }
    } catch (error: any) {
      console.error('Asset delete failed', error);
      onShowToast('error', error?.response?.data?.error || 'Unable to remove asset.');
    } finally {
      setDeletingAssetId('');
    }
  };

  const handleUpload = async (event: FormEvent) => {
    event.preventDefault();
    if (!file) {
      onShowToast('error', 'Choose an audio file to upload.');
      return;
    }

    const formData = new FormData();
    formData.append('asset', file);
    if (selectedModule) formData.append('training_module_id', selectedModule);
    if (title.trim()) formData.append('title', title.trim());
    if (style.trim()) formData.append('style', style.trim());
    if (duration.trim()) formData.append('duration_seconds', duration.trim());

    setUploading(true);
    try {
      await assetsAPI.upload(formData);
      onShowToast('success', 'Asset uploaded successfully.');
      setFile(null);
      setTitle('');
      setStyle('');
      setDuration('');
      loadAssets();
      if (selectedModule) {
        onModuleRefresh(selectedModule);
      }
    } catch (error: any) {
      console.error('Asset upload failed', error);
      onShowToast('error', error?.response?.data?.error || 'Unable to upload asset.');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="px-4 py-8 max-w-5xl">
      <div className="mb-6 flex flex-col gap-3">
        <h2 className="text-3xl font-bold text-gray-900">Asset Library</h2>
        <p className="text-gray-600">Review approved audio assets, download them for playback, or upload new mixes from outside MelodyLMS.</p>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={loadAssets}
            className="inline-flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm font-semibold text-gray-700 hover:border-gray-300"
            disabled={loading}
          >
            {loading ? 'Refreshing…' : 'Refresh library'}
          </button>
          <span className="text-xs text-gray-500 self-center">Showing {assets.length} asset{assets.length === 1 ? '' : 's'}.</span>
        </div>
      </div>

      <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm mb-8">
        <h3 className="text-xl font-semibold text-gray-900 mb-4">Upload an asset</h3>
        <form onSubmit={handleUpload} className="grid gap-4 md:grid-cols-2">
          <div className="md:col-span-2">
            <label className="block text-sm font-semibold text-gray-700 mb-2">Audio File</label>
            <input
              type="file"
              accept="audio/mpeg,audio/mp3,application/octet-stream"
              onChange={(event) => setFile(event.target.files?.[0] || null)}
              className="w-full rounded-xl border border-gray-200 px-4 py-2 text-sm"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">Attach to module (optional)</label>
            <select
              value={selectedModule}
              onChange={(event) => setSelectedModule(event.target.value)}
              className="w-full rounded-xl border border-gray-200 px-4 py-2 text-sm text-gray-900"
            >
              <option value="">Upload without module</option>
              {moduleOptions.map((module) => (
                <option key={module.id} value={module.id}>
                  {module.label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">Title (optional)</label>
            <input
              type="text"
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              className="w-full rounded-xl border border-gray-200 px-4 py-2 text-sm text-gray-900"
              placeholder="Custom display title"
            />
          </div>
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">Style notes</label>
            <input
              type="text"
              value={style}
              onChange={(event) => setStyle(event.target.value)}
              className="w-full rounded-xl border border-gray-200 px-4 py-2 text-sm text-gray-900"
              placeholder="Ex: Acoustic folk"
            />
          </div>
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">Duration (seconds)</label>
            <input
              type="number"
              min="10"
              max="600"
              value={duration}
              onChange={(event) => setDuration(event.target.value)}
              className="w-full rounded-xl border border-gray-200 px-4 py-2 text-sm text-gray-900"
              placeholder="180"
            />
          </div>
          <div className="md:col-span-2">
            <button
              type="submit"
              disabled={uploading}
              className="inline-flex items-center justify-center rounded-xl bg-gradient-to-r from-primary-600 to-primary-700 px-6 py-3 text-sm font-semibold text-white shadow hover:from-primary-700 hover:to-primary-800 disabled:opacity-60"
            >
              {uploading ? 'Uploading…' : 'Upload asset'}
            </button>
          </div>
        </form>
      </div>

      <div className="space-y-4">
        <h3 className="text-xl font-semibold text-gray-900">Approved assets</h3>
        {loading ? (
          <div className="text-sm text-gray-500">Loading assets…</div>
        ) : assets.length === 0 ? (
          <div className="text-sm text-gray-500">No approved assets yet. Generate a song or upload one to get started.</div>
        ) : (
          <div className="space-y-4">
            {assets.map((asset) => {
              const isEditing = editingAsset?.id === asset.id;
              return (
                <div key={asset.id} className="border border-gray-200 rounded-2xl p-4 bg-white shadow-sm">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold text-gray-900">{asset.title || 'Song mix'}</p>
                      <p className="text-xs text-gray-500">
                        {asset.training_module_title || 'Unassigned'} · {asset.style || 'Custom style'}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 text-xs text-gray-500">
                      <span>{asset.duration_seconds ? `${asset.duration_seconds}s` : 'Duration N/A'}</span>
                      {asset.created_at && <span>• {new Date(asset.created_at).toLocaleString()}</span>}
                    </div>
                  </div>
                  <div className="mt-3">
                    <audio
                      controls
                      className="w-full rounded-xl border border-gray-200"
                      src={resolveAssetUrl(asset.public_url)}
                      preload="metadata"
                    >
                      Your browser does not support the audio element.
                    </audio>
                  </div>
                  <div className="mt-3 flex flex-wrap gap-3 text-sm">
                    <a
                      href={resolveAssetUrl(asset.public_url) || '#'}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-2 rounded-xl border border-gray-200 px-3 py-1.5 font-semibold text-primary-700 hover:border-primary-400"
                    >
                      Download
                    </a>
                    {asset.training_module_title && (
                      <span className="inline-flex items-center rounded-full bg-primary-50 px-3 py-1 text-xs font-semibold text-primary-700">
                        {asset.training_module_title}
                      </span>
                    )}
                  </div>
                  {isEditing ? (
                    <div className="mt-4 bg-gray-50 border border-gray-200 rounded-xl p-4 space-y-4">
                      <div className="grid gap-3 md:grid-cols-2">
                        <div>
                          <label className="block text-xs font-semibold text-gray-600 mb-1">Attach to module</label>
                          <select
                            value={editForm.moduleId}
                            onChange={(event) => handleEditChange('moduleId', event.target.value)}
                            className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm text-gray-900"
                          >
                            <option value="">No module</option>
                            {moduleOptions.map((module) => (
                              <option key={module.id} value={module.id}>
                                {module.label}
                              </option>
                            ))}
                          </select>
                        </div>
                        <div>
                          <label className="block text-xs font-semibold text-gray-600 mb-1">Title</label>
                          <input
                            type="text"
                            value={editForm.title}
                            onChange={(event) => handleEditChange('title', event.target.value)}
                            className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm text-gray-900"
                          />
                        </div>
                      </div>
                      <div className="grid gap-3 md:grid-cols-2">
                        <div>
                          <label className="block text-xs font-semibold text-gray-600 mb-1">Style notes</label>
                          <input
                            type="text"
                            value={editForm.style}
                            onChange={(event) => handleEditChange('style', event.target.value)}
                            className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm text-gray-900"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-semibold text-gray-600 mb-1">Duration (seconds)</label>
                          <input
                            type="number"
                            min={10}
                            max={600}
                            value={editForm.duration}
                            onChange={(event) => handleEditChange('duration', event.target.value)}
                            className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm text-gray-900"
                          />
                        </div>
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-gray-600 mb-1">Description</label>
                        <textarea
                          value={editForm.description}
                          onChange={(event) => handleEditChange('description', event.target.value)}
                          className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm text-gray-900"
                          rows={3}
                        />
                      </div>
                      <div className="flex flex-wrap gap-3 justify-end">
                        <button
                          type="button"
                          onClick={cancelEdit}
                          className="inline-flex items-center rounded-xl border border-gray-300 px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-white"
                        >
                          Cancel
                        </button>
                        <button
                          type="button"
                          onClick={handleSaveEdit}
                          disabled={savingAssetId === asset.id}
                          className="inline-flex items-center rounded-xl bg-primary-600 px-4 py-2 text-sm font-semibold text-white shadow hover:bg-primary-700 disabled:opacity-60"
                        >
                          {savingAssetId === asset.id ? 'Saving…' : 'Save changes'}
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="mt-3 flex flex-wrap gap-2 text-xs text-gray-500">
                      <button
                        type="button"
                        onClick={() => beginEdit(asset)}
                        className="inline-flex items-center rounded-xl border border-gray-200 px-3 py-1.5 font-semibold text-gray-700 hover:border-gray-300"
                      >
                        Edit details
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDeleteAsset(asset)}
                        disabled={deletingAssetId === asset.id}
                        className="inline-flex items-center rounded-xl border border-red-200 px-3 py-1.5 font-semibold text-red-600 hover:border-red-400 disabled:opacity-60"
                      >
                        {deletingAssetId === asset.id ? 'Removing…' : 'Remove asset'}
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
