import React, { useState, useEffect } from 'react';
import { useWriterStore } from '../store/writerStore';
import type { PageSetupConfig, MasterPagePreset } from '../../shared/types';

const DEFAULT_SETUP: PageSetupConfig = {
  pageSize: 'letter',
  marginTop: 1,
  marginBottom: 1,
  marginLeft: 1.25,
  marginRight: 1.25,
  headerText: '',
  footerText: '',
  showPageNumbers: true,
  pageNumberPosition: 'bottom-center',
};

const PAGE_SIZES = [
  { id: 'letter', name: 'US Letter (8.5 x 11")', w: 8.5, h: 11 },
  { id: 'a4', name: 'A4 (8.27 x 11.69")', w: 8.27, h: 11.69 },
  { id: 'a5', name: 'A5 (5.83 x 8.27")', w: 5.83, h: 8.27 },
  { id: '6x9', name: 'Trade (6 x 9")', w: 6, h: 9 },
  { id: '5.5x8.5', name: 'Digest (5.5 x 8.5")', w: 5.5, h: 8.5 },
  { id: '5x8', name: 'Small (5 x 8")', w: 5, h: 8 },
  { id: '4.25x6.87', name: 'Mass Market (4.25 x 6.87")', w: 4.25, h: 6.87 },
];

const LAYOUT_TEMPLATES = [
  { id: 'novel-6x9', name: 'Novel (6×9)', desc: 'Standard trade paperback', pageSize: '6x9' as const, mt: 0.75, mb: 0.75, ml: 0.875, mr: 0.625 },
  { id: 'digest', name: 'Digest (5.5×8.5)', desc: 'Popular fiction size', pageSize: '5.5x8.5' as const, mt: 0.7, mb: 0.7, ml: 0.8, mr: 0.6 },
  { id: 'mass-market', name: 'Mass Market', desc: 'Pocket paperback', pageSize: '4.25x6.87' as const, mt: 0.5, mb: 0.5, ml: 0.625, mr: 0.5 },
  { id: 'small-5x8', name: 'Small (5×8)', desc: 'Compact trade format', pageSize: '5x8' as const, mt: 0.625, mb: 0.625, ml: 0.75, mr: 0.5 },
  { id: 'standard-letter', name: 'Standard Letter', desc: 'Manuscript/document', pageSize: 'letter' as const, mt: 1, mb: 1, ml: 1.25, mr: 1.25 },
  { id: 'academic-a4', name: 'Academic A4', desc: 'European standard', pageSize: 'a4' as const, mt: 1, mb: 1, ml: 1.18, mr: 1.18 },
  { id: 'a5-booklet', name: 'A5 Booklet', desc: 'Small-format book', pageSize: 'a5' as const, mt: 0.6, mb: 0.6, ml: 0.7, mr: 0.5 },
];

export default function PageSetupPanel() {
  const { settings, saveSettings, setShowPageSetup } = useWriterStore();
  const [config, setConfig] = useState<PageSetupConfig>(settings.pageSetup || DEFAULT_SETUP);
  const [masterPages, setMasterPages] = useState<MasterPagePreset[]>([]);
  const [showSaveMaster, setShowSaveMaster] = useState(false);
  const [masterName, setMasterName] = useState('');
  const [masterDesc, setMasterDesc] = useState('');

  useEffect(() => {
    window.electronAPI.getMasterPages().then(setMasterPages);
  }, []);

  const handleSaveMasterPage = async () => {
    if (!masterName.trim()) return;
    await window.electronAPI.createMasterPage({
      name: masterName.trim(),
      description: masterDesc.trim(),
      pageSize: config.pageSize,
      marginTop: config.marginTop,
      marginBottom: config.marginBottom,
      marginLeft: config.marginLeft,
      marginRight: config.marginRight,
      headerText: config.headerText,
      footerText: config.footerText,
      showPageNumbers: config.showPageNumbers,
      pageNumberPosition: config.pageNumberPosition,
      columns: 1,
    });
    setMasterPages(await window.electronAPI.getMasterPages());
    setShowSaveMaster(false);
    setMasterName('');
    setMasterDesc('');
  };

  const handleDeleteMasterPage = async (id: string) => {
    await window.electronAPI.deleteMasterPage(id);
    setMasterPages(await window.electronAPI.getMasterPages());
  };

  const applyMasterPage = (mp: MasterPagePreset) => {
    setConfig({
      ...config,
      pageSize: mp.pageSize as any,
      marginTop: mp.marginTop,
      marginBottom: mp.marginBottom,
      marginLeft: mp.marginLeft,
      marginRight: mp.marginRight,
      headerText: mp.headerText,
      footerText: mp.footerText,
      showPageNumbers: mp.showPageNumbers,
      pageNumberPosition: mp.pageNumberPosition as 'bottom-center' | 'bottom-right' | 'top-right',
    });
  };

  const update = (partial: Partial<PageSetupConfig>) => {
    setConfig(prev => ({ ...prev, ...partial }));
  };

  const handleSave = () => {
    saveSettings({ pageSetup: config });
    setShowPageSetup(false);
  };

  const selectedSize = PAGE_SIZES.find(s => s.id === config.pageSize) || PAGE_SIZES[0];

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
      <div className="bg-[#16213e] rounded-lg border border-[var(--border)] w-[520px] max-h-[80vh] flex flex-col">
        {/* Header */}
        <div className="p-4 border-b border-[var(--border)] flex items-center justify-between shrink-0">
          <h2 className="text-sm font-semibold text-surface-200">Page Setup</h2>
          <button onClick={() => setShowPageSetup(false)} className="text-surface-500 hover:text-surface-300">x</button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {/* Layout Templates */}
          <div>
            <label className="text-xs text-surface-500 block mb-1.5">Page Layout Templates</label>
            <div className="grid grid-cols-2 gap-1.5">
              {LAYOUT_TEMPLATES.map(t => (
                <button
                  key={t.id}
                  onClick={() => setConfig({
                    ...config,
                    pageSize: t.pageSize,
                    marginTop: t.mt,
                    marginBottom: t.mb,
                    marginLeft: t.ml,
                    marginRight: t.mr,
                  })}
                  className="text-left px-2.5 py-1.5 text-xs rounded transition-colors text-surface-400 hover:text-surface-200 bg-white/5 hover:bg-white/10 border border-transparent hover:border-[var(--border)]"
                >
                  <div className="font-medium text-surface-300">{t.name}</div>
                  <div className="text-[10px] text-surface-500">{t.desc}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Custom Master Pages */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs text-surface-500">Custom Master Pages</label>
              <button
                onClick={() => setShowSaveMaster(!showSaveMaster)}
                className="px-2 py-0.5 text-[10px] bg-primary-600/20 text-primary-300 rounded hover:bg-primary-600/30"
              >
                {showSaveMaster ? 'Cancel' : 'Save Current'}
              </button>
            </div>
            {showSaveMaster && (
              <div className="space-y-1.5 mb-2 p-2 bg-[var(--bg-page)] rounded border border-[var(--border)]">
                <input
                  value={masterName}
                  onChange={e => setMasterName(e.target.value)}
                  placeholder="Preset name"
                  className="w-full bg-[var(--bg-panel)] text-surface-200 rounded px-2 py-1 text-xs border border-[var(--border)] focus:border-primary-500 focus:outline-none"
                />
                <input
                  value={masterDesc}
                  onChange={e => setMasterDesc(e.target.value)}
                  placeholder="Description (optional)"
                  className="w-full bg-[var(--bg-panel)] text-surface-200 rounded px-2 py-1 text-xs border border-[var(--border)] focus:border-primary-500 focus:outline-none"
                />
                <button
                  onClick={handleSaveMasterPage}
                  disabled={!masterName.trim()}
                  className="px-3 py-1 text-xs bg-primary-600 text-white rounded hover:bg-primary-500 disabled:opacity-50"
                >
                  Save Master Page
                </button>
              </div>
            )}
            {masterPages.length > 0 ? (
              <div className="grid grid-cols-2 gap-1.5">
                {masterPages.map(mp => (
                  <div key={mp.id} className="group relative">
                    <button
                      onClick={() => applyMasterPage(mp)}
                      className="w-full text-left px-2.5 py-1.5 text-xs rounded transition-colors text-surface-400 hover:text-surface-200 bg-white/5 hover:bg-white/10 border border-transparent hover:border-[var(--border)]"
                    >
                      <div className="font-medium text-surface-300">{mp.name}</div>
                      {mp.description && <div className="text-[10px] text-surface-500">{mp.description}</div>}
                    </button>
                    <button
                      onClick={() => handleDeleteMasterPage(mp.id)}
                      className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 text-red-400 hover:text-red-300 text-xs px-1"
                      title="Delete preset"
                    >
                      x
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-[10px] text-surface-600">No custom master pages saved. Configure settings above and click "Save Current".</p>
            )}
          </div>

          {/* Page Size */}
          <div>
            <label className="text-xs text-surface-500 block mb-1.5">Page Size</label>
            <div className="flex flex-wrap gap-1.5">
              {PAGE_SIZES.map(s => (
                <button
                  key={s.id}
                  onClick={() => update({ pageSize: s.id as any })}
                  className={`px-3 py-1.5 text-xs rounded transition-colors ${
                    config.pageSize === s.id ? 'bg-primary-600/30 text-primary-300 ring-1 ring-primary-500' : 'text-surface-400 hover:text-surface-200 bg-white/5'
                  }`}
                >
                  {s.name}
                </button>
              ))}
            </div>
          </div>

          {/* Margins */}
          <div>
            <label className="text-xs text-surface-500 block mb-1.5">Margins (inches)</label>
            <div className="grid grid-cols-2 gap-2">
              {([['Top', 'marginTop'], ['Bottom', 'marginBottom'], ['Left', 'marginLeft'], ['Right', 'marginRight']] as const).map(([label, key]) => (
                <div key={key} className="flex items-center gap-2">
                  <span className="text-xs text-surface-400 w-12">{label}</span>
                  <input
                    type="number"
                    min={0.25}
                    max={3}
                    step={0.25}
                    value={config[key]}
                    onChange={e => update({ [key]: Number(e.target.value) })}
                    className="flex-1 bg-[var(--bg-page)] text-surface-200 rounded px-2 py-1 text-xs border border-[var(--border)] focus:border-primary-500 focus:outline-none"
                  />
                </div>
              ))}
            </div>
          </div>

          {/* Header */}
          <div>
            <label className="text-xs text-surface-500 block mb-1">Header Text</label>
            <input
              value={config.headerText}
              onChange={e => update({ headerText: e.target.value })}
              placeholder="e.g. Book Title — Author Name"
              className="w-full bg-[var(--bg-page)] text-surface-200 rounded px-2 py-1 text-xs border border-[var(--border)] focus:border-primary-500 focus:outline-none"
            />
          </div>

          {/* Footer */}
          <div>
            <label className="text-xs text-surface-500 block mb-1">Footer Text</label>
            <input
              value={config.footerText}
              onChange={e => update({ footerText: e.target.value })}
              placeholder="e.g. Draft — Do Not Distribute"
              className="w-full bg-[var(--bg-page)] text-surface-200 rounded px-2 py-1 text-xs border border-[var(--border)] focus:border-primary-500 focus:outline-none"
            />
          </div>

          {/* Page Numbers */}
          <div className="flex items-center gap-4">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={config.showPageNumbers}
                onChange={e => update({ showPageNumbers: e.target.checked })}
                className="accent-primary-500"
              />
              <span className="text-xs text-surface-300">Page Numbers</span>
            </label>
            {config.showPageNumbers && (
              <select
                value={config.pageNumberPosition}
                onChange={e => update({ pageNumberPosition: e.target.value as any })}
                className="bg-[var(--bg-page)] text-surface-200 rounded px-2 py-1 text-xs border border-[var(--border)] focus:border-primary-500 focus:outline-none"
              >
                <option value="bottom-center">Bottom Center</option>
                <option value="bottom-right">Bottom Right</option>
                <option value="top-right">Top Right</option>
              </select>
            )}
          </div>

          {/* Bleed Settings */}
          <div className="flex items-center gap-4">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={config.bleed || false}
                onChange={e => update({ bleed: e.target.checked })}
                className="accent-primary-500"
              />
              <span className="text-xs text-surface-300">Bleed Margins</span>
            </label>
            {config.bleed && (
              <div className="flex items-center gap-2">
                <span className="text-xs text-surface-400">Bleed:</span>
                <input
                  type="number"
                  min={0.0625}
                  max={0.5}
                  step={0.0625}
                  value={config.bleedMargin ?? 0.125}
                  onChange={e => update({ bleedMargin: Number(e.target.value) })}
                  className="w-20 bg-[var(--bg-page)] text-surface-200 rounded px-2 py-1 text-xs border border-[var(--border)] focus:border-primary-500 focus:outline-none"
                />
                <span className="text-xs text-surface-500">in</span>
              </div>
            )}
          </div>

          {/* Preview */}
          <div>
            <label className="text-xs text-surface-500 block mb-1.5">Preview</label>
            <div className="bg-white rounded p-2 flex items-center justify-center" style={{ aspectRatio: `${selectedSize.w}/${selectedSize.h}` }}>
              <div
                className="border border-gray-300 bg-white relative"
                style={{
                  width: '100%',
                  height: '100%',
                  padding: `${(config.marginTop / selectedSize.h) * 100}% ${(config.marginRight / selectedSize.w) * 100}% ${(config.marginBottom / selectedSize.h) * 100}% ${(config.marginLeft / selectedSize.w) * 100}%`,
                }}
              >
                {config.headerText && (
                  <div className="absolute top-1 left-0 right-0 text-center text-[8px] text-gray-400">{config.headerText}</div>
                )}
                <div className="w-full h-full bg-gray-100 rounded-sm" />
                {config.footerText && (
                  <div className="absolute bottom-1 left-0 right-0 text-center text-[8px] text-gray-400">{config.footerText}</div>
                )}
                {config.showPageNumbers && (
                  <div className={`absolute bottom-1 text-[8px] text-gray-400 ${
                    config.pageNumberPosition === 'bottom-center' ? 'left-0 right-0 text-center' :
                    config.pageNumberPosition === 'bottom-right' ? 'right-2' : 'right-2 top-1 bottom-auto'
                  }`}>
                    1
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-3 border-t border-[var(--border)] flex justify-between shrink-0">
          <button
            onClick={() => setConfig(DEFAULT_SETUP)}
            className="px-3 py-1.5 text-xs text-surface-400 hover:text-surface-200 rounded transition-colors"
          >
            Reset Defaults
          </button>
          <div className="flex gap-2">
            <button onClick={() => setShowPageSetup(false)} className="px-3 py-1.5 text-xs text-surface-400 hover:text-surface-200 rounded transition-colors">Cancel</button>
            <button onClick={handleSave} className="px-4 py-1.5 text-xs bg-primary-600 text-white hover:bg-primary-500 rounded transition-colors">Save</button>
          </div>
        </div>
      </div>
    </div>
  );
}
