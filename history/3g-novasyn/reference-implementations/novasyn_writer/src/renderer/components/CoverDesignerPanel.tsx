import React, { useRef, useState, useEffect, useCallback } from 'react';
import { useWriterStore } from '../store/writerStore';
import type { CoverLayer } from '../../shared/types';

const COVER_W = 400;
const COVER_H = 600;
const SPINE_BASE_W = 30;

const TEMPLATES = [
  { id: 'minimal', name: 'Minimal', bg: '#1a1a2e', titleColor: '#ffffff', authorColor: '#adb5bd' },
  { id: 'classic', name: 'Classic', bg: '#2d1b0e', titleColor: '#f5deb3', authorColor: '#d2b48c' },
  { id: 'modern', name: 'Modern', bg: '#0f172a', titleColor: '#38bdf8', authorColor: '#94a3b8' },
  { id: 'nature', name: 'Nature', bg: '#1a3c34', titleColor: '#86efac', authorColor: '#a7f3d0' },
  { id: 'romance', name: 'Romance', bg: '#4a1942', titleColor: '#f9a8d4', authorColor: '#fda4af' },
  { id: 'thriller', name: 'Thriller', bg: '#1c1c1c', titleColor: '#ef4444', authorColor: '#9ca3af' },
  { id: 'scifi', name: 'Sci-Fi', bg: '#0c0a1d', titleColor: '#a78bfa', authorColor: '#818cf8' },
  { id: 'literary', name: 'Literary', bg: '#faf5e8', titleColor: '#1c1917', authorColor: '#57534e' },
];

let layerIdCounter = 1;
function nextLayerId() { return `layer-${layerIdCounter++}`; }

function createDefaultLayers(bgColor: string, titleText: string, titleColor: string, authorText: string, authorColor: string): CoverLayer[] {
  return [
    { id: nextLayerId(), type: 'background', name: 'Background', visible: true, opacity: 1, zIndex: 0, color: bgColor },
    { id: nextLayerId(), type: 'text', name: 'Title', visible: true, opacity: 1, zIndex: 1, text: titleText, textColor: titleColor, textSize: 42, textFont: "Georgia, 'Times New Roman', serif", textX: COVER_W / 2, textY: COVER_H * 0.38, textBold: true, textItalic: false },
    { id: nextLayerId(), type: 'text', name: 'Author', visible: true, opacity: 1, zIndex: 2, text: authorText, textColor: authorColor, textSize: 18, textFont: "Georgia, 'Times New Roman', serif", textX: COVER_W / 2, textY: COVER_H * 0.82, textBold: false, textItalic: false },
  ];
}

export default function CoverDesignerPanel() {
  const { currentProject, chapters, setShowCoverDesigner } = useWriterStore();
  const frontCanvasRef = useRef<HTMLCanvasElement>(null);
  const fullWrapCanvasRef = useRef<HTMLCanvasElement>(null);

  const [template, setTemplate] = useState(TEMPLATES[0]);
  const [viewMode, setViewMode] = useState<'front' | 'full-wrap'>('front');
  const [controlTab, setControlTab] = useState<'layers' | 'template' | 'wrap'>('layers');
  const [showBorder, setShowBorder] = useState(false);
  const [borderColor, setBorderColor] = useState('#ffffff');

  // Layers
  const [layers, setLayers] = useState<CoverLayer[]>(() =>
    createDefaultLayers(TEMPLATES[0].bg, currentProject?.name || 'Book Title', TEMPLATES[0].titleColor, '', TEMPLATES[0].authorColor)
  );
  const [selectedLayerId, setSelectedLayerId] = useState<string | null>(null);
  const selectedLayer = layers.find(l => l.id === selectedLayerId) || null;

  // Image cache
  const imageCache = useRef<Record<string, HTMLImageElement>>({});

  // Back cover
  const [backBlurb, setBackBlurb] = useState('');
  const [backBlurbSize, setBackBlurbSize] = useState(13);
  const [showBarcode, setShowBarcode] = useState(true);

  // Spine
  const [pageCount, setPageCount] = useState(300);
  const spineWidth = Math.max(SPINE_BASE_W, Math.round(pageCount * 0.13));

  // Layer helpers
  const updateLayer = (id: string, updates: Partial<CoverLayer>) => {
    setLayers(prev => prev.map(l => l.id === id ? { ...l, ...updates } : l));
  };

  const addLayer = (type: CoverLayer['type']) => {
    const id = nextLayerId();
    const maxZ = Math.max(0, ...layers.map(l => l.zIndex));
    let newLayer: CoverLayer;
    if (type === 'background') {
      newLayer = { id, type, name: 'Background', visible: true, opacity: 1, zIndex: maxZ + 1, color: '#333333' };
    } else if (type === 'image') {
      newLayer = { id, type, name: 'Image', visible: true, opacity: 1, zIndex: maxZ + 1, imageX: 50, imageY: 50, imageWidth: 200, imageHeight: 200 };
    } else {
      newLayer = { id, type, name: 'Text', visible: true, opacity: 1, zIndex: maxZ + 1, text: 'Text', textColor: '#ffffff', textSize: 24, textFont: "Georgia, serif", textX: COVER_W / 2, textY: COVER_H / 2, textBold: false, textItalic: false };
    }
    setLayers(prev => [...prev, newLayer]);
    setSelectedLayerId(id);
  };

  const deleteLayer = (id: string) => {
    setLayers(prev => prev.filter(l => l.id !== id));
    if (selectedLayerId === id) setSelectedLayerId(null);
  };

  const moveLayer = (id: string, direction: 'up' | 'down') => {
    setLayers(prev => {
      const sorted = [...prev].sort((a, b) => a.zIndex - b.zIndex);
      const idx = sorted.findIndex(l => l.id === id);
      if (idx === -1) return prev;
      const swapIdx = direction === 'up' ? idx + 1 : idx - 1;
      if (swapIdx < 0 || swapIdx >= sorted.length) return prev;
      const tmp = sorted[idx].zIndex;
      sorted[idx] = { ...sorted[idx], zIndex: sorted[swapIdx].zIndex };
      sorted[swapIdx] = { ...sorted[swapIdx], zIndex: tmp };
      return sorted;
    });
  };

  const handleUploadImage = async (layerId: string) => {
    const result = await window.electronAPI.uploadCoverImage();
    if (result) {
      const img = new Image();
      img.src = result.dataUrl;
      imageCache.current[layerId] = img;
      updateLayer(layerId, {
        imageDataUrl: result.dataUrl,
        imageWidth: Math.min(result.width, COVER_W),
        imageHeight: Math.min(result.height, COVER_H),
        name: result.fileName,
      });
    }
  };

  // Pre-load cached images
  useEffect(() => {
    for (const layer of layers) {
      if (layer.type === 'image' && layer.imageDataUrl && !imageCache.current[layer.id]) {
        const img = new Image();
        img.src = layer.imageDataUrl;
        imageCache.current[layer.id] = img;
      }
    }
  }, [layers]);

  // Draw layers onto a canvas context
  const drawLayers = useCallback((ctx: CanvasRenderingContext2D, w: number, h: number) => {
    ctx.clearRect(0, 0, w, h);
    const sorted = [...layers].sort((a, b) => a.zIndex - b.zIndex);

    for (const layer of sorted) {
      if (!layer.visible) continue;
      ctx.globalAlpha = layer.opacity;

      if (layer.type === 'background' && layer.color) {
        ctx.fillStyle = layer.color;
        ctx.fillRect(0, 0, w, h);
      }

      if (layer.type === 'image') {
        const img = imageCache.current[layer.id];
        if (img && img.complete) {
          ctx.drawImage(img, layer.imageX || 0, layer.imageY || 0, layer.imageWidth || 200, layer.imageHeight || 200);
        }
      }

      if (layer.type === 'text' && layer.text) {
        ctx.fillStyle = layer.textColor || '#ffffff';
        const fontStyle = `${layer.textItalic ? 'italic ' : ''}${layer.textBold ? 'bold ' : ''}${layer.textSize || 24}px ${layer.textFont || 'Georgia, serif'}`;
        ctx.font = fontStyle;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        wrapText(ctx, layer.text, layer.textX || w / 2, layer.textY || h / 2, w - 40, (layer.textSize || 24) * 1.3);
      }
    }

    ctx.globalAlpha = 1;

    // Border overlay
    if (showBorder) {
      ctx.strokeStyle = borderColor;
      ctx.lineWidth = 3;
      ctx.strokeRect(15, 15, w - 30, h - 30);
    }
  }, [layers, showBorder, borderColor]);

  const drawBackCover = useCallback((ctx: CanvasRenderingContext2D, x: number, w: number, h: number) => {
    const bgLayer = layers.find(l => l.type === 'background');
    ctx.fillStyle = bgLayer?.color || '#1a1a2e';
    ctx.fillRect(x, 0, w, h);

    if (showBorder) {
      ctx.strokeStyle = borderColor;
      ctx.lineWidth = 3;
      ctx.strokeRect(x + 15, 15, w - 30, h - 30);
    }

    if (backBlurb) {
      const titleLayer = layers.find(l => l.name === 'Title');
      ctx.fillStyle = titleLayer?.textColor || '#ffffff';
      ctx.font = `${backBlurbSize}px Georgia, 'Times New Roman', serif`;
      ctx.textAlign = 'left';
      ctx.textBaseline = 'top';

      const lines: string[] = [];
      const maxW = w - 60;
      for (const paragraph of backBlurb.split('\n')) {
        const words = paragraph.split(' ');
        let line = '';
        for (const word of words) {
          const test = line + (line ? ' ' : '') + word;
          if (ctx.measureText(test).width > maxW && line) {
            lines.push(line);
            line = word;
          } else {
            line = test;
          }
        }
        lines.push(line);
        lines.push('');
      }

      let yPos = h * 0.1;
      for (const line of lines) {
        if (line === '') { yPos += backBlurbSize * 0.6; continue; }
        ctx.fillText(line, x + 30, yPos);
        yPos += backBlurbSize * 1.5;
        if (yPos > h * 0.75) break;
      }
    }

    if (showBarcode) {
      const barcodeW = 120;
      const barcodeH = 70;
      const bx = x + w / 2 - barcodeW / 2;
      const by = h - barcodeH - 30;
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(bx, by, barcodeW, barcodeH);
      ctx.strokeStyle = '#000000';
      ctx.lineWidth = 1;
      ctx.strokeRect(bx, by, barcodeW, barcodeH);
      for (let i = 0; i < 30; i++) {
        const lw = Math.random() > 0.5 ? 2 : 1;
        ctx.fillStyle = '#000000';
        ctx.fillRect(bx + 10 + i * 3.3, by + 8, lw, barcodeH - 28);
      }
      ctx.fillStyle = '#000000';
      ctx.font = '8px monospace';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'bottom';
      ctx.fillText('ISBN 978-0-000000-0-0', bx + barcodeW / 2, by + barcodeH - 4);
    }
  }, [layers, backBlurb, backBlurbSize, showBarcode, showBorder, borderColor]);

  const drawSpine = useCallback((ctx: CanvasRenderingContext2D, x: number, sw: number, h: number) => {
    const bgLayer = layers.find(l => l.type === 'background');
    const titleLayer = layers.find(l => l.name === 'Title');
    const authorLayer = layers.find(l => l.name === 'Author');

    ctx.fillStyle = bgLayer?.color || '#1a1a2e';
    ctx.fillRect(x, 0, sw, h);

    ctx.strokeStyle = (titleLayer?.textColor || '#ffffff') + '30';
    ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, h); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(x + sw, 0); ctx.lineTo(x + sw, h); ctx.stroke();

    ctx.save();
    ctx.translate(x + sw / 2, h / 2);
    ctx.rotate(-Math.PI / 2);
    ctx.fillStyle = titleLayer?.textColor || '#ffffff';
    const spineFontSize = Math.min(sw * 0.5, 14);
    ctx.font = `bold ${spineFontSize}px Georgia, serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    const titleText = titleLayer?.text || '';
    const authorText = authorLayer?.text || '';
    const spineText = titleText + (authorText ? `  —  ${authorText}` : '');
    ctx.fillText(spineText, 0, 0, h - 40);
    ctx.restore();
  }, [layers]);

  // Draw front-only canvas
  useEffect(() => {
    const canvas = frontCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const dpr = 2;
    canvas.width = COVER_W * dpr;
    canvas.height = COVER_H * dpr;
    ctx.scale(dpr, dpr);
    drawLayers(ctx, COVER_W, COVER_H);
  }, [drawLayers]);

  // Draw full wrap canvas
  useEffect(() => {
    if (viewMode !== 'full-wrap') return;
    const canvas = fullWrapCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const totalW = COVER_W * 2 + spineWidth;
    const dpr = 2;
    canvas.width = totalW * dpr;
    canvas.height = COVER_H * dpr;
    ctx.scale(dpr, dpr);
    drawBackCover(ctx, 0, COVER_W, COVER_H);
    drawSpine(ctx, COVER_W, spineWidth, COVER_H);
    ctx.save();
    ctx.translate(COVER_W + spineWidth, 0);
    drawLayers(ctx, COVER_W, COVER_H);
    ctx.restore();
  }, [viewMode, drawLayers, drawBackCover, drawSpine, spineWidth]);

  const applyTemplate = (t: typeof TEMPLATES[0]) => {
    setTemplate(t);
    // Update background and text layer colors to match template
    setLayers(prev => prev.map(l => {
      if (l.type === 'background') return { ...l, color: t.bg };
      if (l.name === 'Title') return { ...l, textColor: t.titleColor };
      if (l.name === 'Author') return { ...l, textColor: t.authorColor };
      return l;
    }));
  };

  const handleExportFront = async () => {
    const canvas = frontCanvasRef.current;
    if (!canvas) return;
    const dataUrl = canvas.toDataURL('image/png');
    await window.electronAPI.exportCover(dataUrl, currentProject?.name || 'Cover');
  };

  const handleExportFullWrap = async () => {
    const canvas = fullWrapCanvasRef.current;
    if (!canvas) return;
    const dataUrl = canvas.toDataURL('image/png');
    await window.electronAPI.exportCoverFullWrap(dataUrl, currentProject?.name || 'Cover');
  };

  useEffect(() => {
    const totalWords = chapters.reduce((sum, ch) => sum + (ch.wordCount || 0), 0);
    setPageCount(Math.max(50, Math.round(totalWords / 250)));
  }, [chapters]);

  const sortedLayers = [...layers].sort((a, b) => b.zIndex - a.zIndex);

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
      <div className="bg-[#16213e] rounded-lg border border-[var(--border)] w-[960px] max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="p-4 border-b border-[var(--border)] flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <h2 className="text-sm font-semibold text-surface-200">Cover Designer</h2>
            <div className="flex gap-1">
              <button onClick={() => setViewMode('front')} className={`px-2 py-0.5 text-[10px] rounded ${viewMode === 'front' ? 'bg-primary-600/30 text-primary-300' : 'text-surface-400 hover:text-surface-200'}`}>Front Only</button>
              <button onClick={() => setViewMode('full-wrap')} className={`px-2 py-0.5 text-[10px] rounded ${viewMode === 'full-wrap' ? 'bg-primary-600/30 text-primary-300' : 'text-surface-400 hover:text-surface-200'}`}>Full Wrap</button>
            </div>
          </div>
          <button onClick={() => setShowCoverDesigner(false)} className="text-surface-500 hover:text-surface-300">x</button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4 flex gap-4">
          {/* Canvas preview */}
          <div className="shrink-0 flex flex-col items-center gap-3">
            {viewMode === 'front' ? (
              <>
                <canvas ref={frontCanvasRef} style={{ width: COVER_W * 0.6, height: COVER_H * 0.6 }} className="rounded shadow-lg border border-[var(--border)]" />
                <button onClick={handleExportFront} className="px-4 py-1.5 text-xs bg-primary-600 hover:bg-primary-500 text-white rounded transition-colors w-full">Export Front as PNG</button>
              </>
            ) : (
              <>
                <canvas ref={fullWrapCanvasRef} style={{ width: (COVER_W * 2 + spineWidth) * 0.38, height: COVER_H * 0.38 }} className="rounded shadow-lg border border-[var(--border)]" />
                <div className="flex gap-2 w-full">
                  <button onClick={handleExportFront} className="flex-1 px-3 py-1.5 text-xs bg-primary-600/20 text-primary-300 hover:bg-primary-600/30 rounded transition-colors">Export Front</button>
                  <button onClick={handleExportFullWrap} className="flex-1 px-3 py-1.5 text-xs bg-primary-600 hover:bg-primary-500 text-white rounded transition-colors">Export Full Wrap</button>
                </div>
                <div className="text-[10px] text-surface-600 text-center">Back ({COVER_W}px) + Spine ({spineWidth}px) + Front ({COVER_W}px)</div>
              </>
            )}
          </div>

          {/* Controls */}
          <div className="flex-1 flex flex-col overflow-hidden">
            {/* Tabs */}
            <div className="flex gap-1 mb-3">
              {(['layers', 'template', 'wrap'] as const).map(tab => (
                <button
                  key={tab}
                  onClick={() => setControlTab(tab)}
                  className={`px-3 py-1 text-xs rounded ${controlTab === tab ? 'bg-primary-600/30 text-primary-300' : 'text-surface-400 hover:text-surface-200 hover:bg-white/5'}`}
                >
                  {tab === 'layers' ? 'Layers' : tab === 'template' ? 'Templates' : 'Full Wrap'}
                </button>
              ))}
            </div>

            <div className="flex-1 overflow-y-auto space-y-3">
              {/* LAYERS TAB */}
              {controlTab === 'layers' && (
                <>
                  {/* Add layer buttons */}
                  <div className="flex gap-1">
                    <button onClick={() => addLayer('background')} className="px-2 py-1 text-[10px] bg-blue-600/20 text-blue-300 hover:bg-blue-600/30 rounded">+ Background</button>
                    <button onClick={() => addLayer('image')} className="px-2 py-1 text-[10px] bg-green-600/20 text-green-300 hover:bg-green-600/30 rounded">+ Image</button>
                    <button onClick={() => addLayer('text')} className="px-2 py-1 text-[10px] bg-purple-600/20 text-purple-300 hover:bg-purple-600/30 rounded">+ Text</button>
                  </div>

                  {/* Layer list */}
                  <div className="space-y-1">
                    {sortedLayers.map(layer => (
                      <div
                        key={layer.id}
                        onClick={() => setSelectedLayerId(layer.id)}
                        className={`flex items-center gap-2 px-2 py-1.5 rounded cursor-pointer text-xs ${
                          selectedLayerId === layer.id ? 'bg-primary-600/20 border border-primary-500/30' : 'hover:bg-white/5 border border-transparent'
                        }`}
                      >
                        <button
                          onClick={e => { e.stopPropagation(); updateLayer(layer.id, { visible: !layer.visible }); }}
                          className={`w-4 text-center ${layer.visible ? 'text-green-400' : 'text-surface-600'}`}
                          title={layer.visible ? 'Hide' : 'Show'}
                        >
                          {layer.visible ? '●' : '○'}
                        </button>
                        <span className={`px-1.5 py-0.5 text-[9px] rounded ${
                          layer.type === 'background' ? 'bg-blue-600/20 text-blue-300' :
                          layer.type === 'image' ? 'bg-green-600/20 text-green-300' :
                          'bg-purple-600/20 text-purple-300'
                        }`}>
                          {layer.type === 'background' ? 'BG' : layer.type === 'image' ? 'IMG' : 'TXT'}
                        </span>
                        <span className="flex-1 truncate text-surface-300">{layer.name}</span>
                        <span className="text-[9px] text-surface-600">{Math.round(layer.opacity * 100)}%</span>
                        <button onClick={e => { e.stopPropagation(); moveLayer(layer.id, 'up'); }} className="text-surface-500 hover:text-surface-300" title="Move up">↑</button>
                        <button onClick={e => { e.stopPropagation(); moveLayer(layer.id, 'down'); }} className="text-surface-500 hover:text-surface-300" title="Move down">↓</button>
                        <button onClick={e => { e.stopPropagation(); deleteLayer(layer.id); }} className="text-red-400 hover:text-red-300" title="Delete">x</button>
                      </div>
                    ))}
                  </div>

                  {/* Selected layer properties */}
                  {selectedLayer && (
                    <div className="p-3 bg-[var(--bg-page)] rounded border border-[var(--border)] space-y-2">
                      <div className="text-xs text-surface-400 font-medium">{selectedLayer.name} Properties</div>

                      {/* Name */}
                      <div>
                        <label className="text-[10px] text-surface-500 block mb-0.5">Name</label>
                        <input value={selectedLayer.name} onChange={e => updateLayer(selectedLayer.id, { name: e.target.value })} className="w-full bg-[var(--bg-panel)] text-surface-200 rounded px-2 py-1 text-xs border border-[var(--border)] focus:border-primary-500 focus:outline-none" />
                      </div>

                      {/* Opacity */}
                      <div>
                        <label className="text-[10px] text-surface-500 block mb-0.5">Opacity: {Math.round(selectedLayer.opacity * 100)}%</label>
                        <input type="range" min="0" max="100" value={Math.round(selectedLayer.opacity * 100)} onChange={e => updateLayer(selectedLayer.id, { opacity: Number(e.target.value) / 100 })} className="w-full" />
                      </div>

                      {/* Background layer */}
                      {selectedLayer.type === 'background' && (
                        <div>
                          <label className="text-[10px] text-surface-500 block mb-0.5">Color</label>
                          <div className="flex items-center gap-2">
                            <input type="color" value={selectedLayer.color || '#000000'} onChange={e => updateLayer(selectedLayer.id, { color: e.target.value })} className="w-6 h-6 rounded cursor-pointer" />
                            <span className="text-xs text-surface-400">{selectedLayer.color}</span>
                          </div>
                        </div>
                      )}

                      {/* Image layer */}
                      {selectedLayer.type === 'image' && (
                        <>
                          <button onClick={() => handleUploadImage(selectedLayer.id)} className="px-3 py-1 text-xs bg-green-600/20 text-green-300 hover:bg-green-600/30 rounded transition-colors">
                            {selectedLayer.imageDataUrl ? 'Replace Image' : 'Upload Image'}
                          </button>
                          {selectedLayer.imageDataUrl && (
                            <>
                              <div className="grid grid-cols-2 gap-2">
                                <div>
                                  <label className="text-[10px] text-surface-500">X</label>
                                  <input type="number" value={selectedLayer.imageX || 0} onChange={e => updateLayer(selectedLayer.id, { imageX: Number(e.target.value) })} className="w-full bg-[var(--bg-panel)] text-surface-200 rounded px-2 py-0.5 text-xs border border-[var(--border)]" />
                                </div>
                                <div>
                                  <label className="text-[10px] text-surface-500">Y</label>
                                  <input type="number" value={selectedLayer.imageY || 0} onChange={e => updateLayer(selectedLayer.id, { imageY: Number(e.target.value) })} className="w-full bg-[var(--bg-panel)] text-surface-200 rounded px-2 py-0.5 text-xs border border-[var(--border)]" />
                                </div>
                                <div>
                                  <label className="text-[10px] text-surface-500">Width</label>
                                  <input type="number" value={selectedLayer.imageWidth || 200} onChange={e => updateLayer(selectedLayer.id, { imageWidth: Number(e.target.value) })} className="w-full bg-[var(--bg-panel)] text-surface-200 rounded px-2 py-0.5 text-xs border border-[var(--border)]" />
                                </div>
                                <div>
                                  <label className="text-[10px] text-surface-500">Height</label>
                                  <input type="number" value={selectedLayer.imageHeight || 200} onChange={e => updateLayer(selectedLayer.id, { imageHeight: Number(e.target.value) })} className="w-full bg-[var(--bg-panel)] text-surface-200 rounded px-2 py-0.5 text-xs border border-[var(--border)]" />
                                </div>
                              </div>
                            </>
                          )}
                        </>
                      )}

                      {/* Text layer */}
                      {selectedLayer.type === 'text' && (
                        <>
                          <div>
                            <label className="text-[10px] text-surface-500 block mb-0.5">Text</label>
                            <input value={selectedLayer.text || ''} onChange={e => updateLayer(selectedLayer.id, { text: e.target.value })} className="w-full bg-[var(--bg-panel)] text-surface-200 rounded px-2 py-1 text-xs border border-[var(--border)] focus:border-primary-500 focus:outline-none" />
                          </div>
                          <div className="flex items-center gap-2">
                            <input type="color" value={selectedLayer.textColor || '#ffffff'} onChange={e => updateLayer(selectedLayer.id, { textColor: e.target.value })} className="w-6 h-6 rounded cursor-pointer" />
                            <input type="range" min="10" max="72" value={selectedLayer.textSize || 24} onChange={e => updateLayer(selectedLayer.id, { textSize: Number(e.target.value) })} className="flex-1" />
                            <span className="text-[10px] text-surface-500 w-8">{selectedLayer.textSize || 24}px</span>
                          </div>
                          <div className="flex items-center gap-3">
                            <label className="flex items-center gap-1 cursor-pointer">
                              <input type="checkbox" checked={selectedLayer.textBold || false} onChange={e => updateLayer(selectedLayer.id, { textBold: e.target.checked })} className="accent-primary-500" />
                              <span className="text-xs text-surface-300 font-bold">B</span>
                            </label>
                            <label className="flex items-center gap-1 cursor-pointer">
                              <input type="checkbox" checked={selectedLayer.textItalic || false} onChange={e => updateLayer(selectedLayer.id, { textItalic: e.target.checked })} className="accent-primary-500" />
                              <span className="text-xs text-surface-300 italic">I</span>
                            </label>
                          </div>
                          <div className="grid grid-cols-2 gap-2">
                            <div>
                              <label className="text-[10px] text-surface-500">X</label>
                              <input type="number" value={Math.round(selectedLayer.textX || 0)} onChange={e => updateLayer(selectedLayer.id, { textX: Number(e.target.value) })} className="w-full bg-[var(--bg-panel)] text-surface-200 rounded px-2 py-0.5 text-xs border border-[var(--border)]" />
                            </div>
                            <div>
                              <label className="text-[10px] text-surface-500">Y</label>
                              <input type="number" value={Math.round(selectedLayer.textY || 0)} onChange={e => updateLayer(selectedLayer.id, { textY: Number(e.target.value) })} className="w-full bg-[var(--bg-panel)] text-surface-200 rounded px-2 py-0.5 text-xs border border-[var(--border)]" />
                            </div>
                          </div>
                        </>
                      )}
                    </div>
                  )}

                  {/* Border */}
                  <div className="flex items-center gap-3">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input type="checkbox" checked={showBorder} onChange={e => setShowBorder(e.target.checked)} className="accent-primary-500" />
                      <span className="text-xs text-surface-300">Border</span>
                    </label>
                    {showBorder && <input type="color" value={borderColor} onChange={e => setBorderColor(e.target.value)} className="w-6 h-6 rounded cursor-pointer" />}
                  </div>
                </>
              )}

              {/* TEMPLATE TAB */}
              {controlTab === 'template' && (
                <div>
                  <label className="text-xs text-surface-500 block mb-1.5">Genre Templates</label>
                  <div className="flex flex-wrap gap-1.5">
                    {TEMPLATES.map(t => (
                      <button
                        key={t.id}
                        onClick={() => applyTemplate(t)}
                        className={`px-2 py-1 text-xs rounded transition-colors ${template.id === t.id ? 'ring-1 ring-primary-500 text-primary-300' : 'text-surface-400 hover:text-surface-200'}`}
                        style={{ background: t.bg, border: '1px solid #2a2a4a' }}
                      >
                        <span style={{ color: t.titleColor }}>{t.name}</span>
                      </button>
                    ))}
                  </div>
                  <p className="text-[10px] text-surface-600 mt-2">Templates update background and text colors in your layers.</p>
                </div>
              )}

              {/* FULL WRAP TAB */}
              {controlTab === 'wrap' && (
                <div className="space-y-3">
                  <div>
                    <label className="text-xs text-surface-400 block mb-1">Page Count: {pageCount} (Spine: {(pageCount * 0.002252).toFixed(3)}")</label>
                    <input type="range" min="50" max="800" value={pageCount} onChange={e => setPageCount(Number(e.target.value))} className="w-full" />
                    <div className="flex justify-between text-[10px] text-surface-600"><span>50 pages</span><span>800 pages</span></div>
                  </div>
                  <div>
                    <label className="text-xs text-surface-400 block mb-1">Back Cover Blurb</label>
                    <textarea value={backBlurb} onChange={e => setBackBlurb(e.target.value)} placeholder="Book description / blurb text..." className="w-full bg-[var(--bg-page)] text-surface-200 rounded px-2 py-1 text-xs border border-[var(--border)] focus:border-primary-500 focus:outline-none resize-none h-20" />
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-[10px] text-surface-500">Size:</span>
                      <input type="range" min="10" max="18" value={backBlurbSize} onChange={e => setBackBlurbSize(Number(e.target.value))} className="flex-1" />
                      <span className="text-[10px] text-surface-500 w-8">{backBlurbSize}px</span>
                    </div>
                  </div>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input type="checkbox" checked={showBarcode} onChange={e => setShowBarcode(e.target.checked)} className="accent-primary-500" />
                    <span className="text-xs text-surface-300">Show ISBN Barcode Placeholder</span>
                  </label>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-3 border-t border-[var(--border)] flex justify-end shrink-0">
          <button onClick={() => setShowCoverDesigner(false)} className="px-3 py-1.5 text-xs text-surface-400 hover:text-surface-200 rounded transition-colors">Close</button>
        </div>
      </div>
    </div>
  );
}

function wrapText(ctx: CanvasRenderingContext2D, text: string, x: number, y: number, maxWidth: number, lineHeight: number) {
  const words = text.split(' ');
  let line = '';
  const lines: string[] = [];
  for (const word of words) {
    const testLine = line + (line ? ' ' : '') + word;
    if (ctx.measureText(testLine).width > maxWidth && line) {
      lines.push(line);
      line = word;
    } else {
      line = testLine;
    }
  }
  lines.push(line);
  const startY = y - ((lines.length - 1) * lineHeight) / 2;
  for (let i = 0; i < lines.length; i++) {
    ctx.fillText(lines[i], x, startY + i * lineHeight);
  }
}
