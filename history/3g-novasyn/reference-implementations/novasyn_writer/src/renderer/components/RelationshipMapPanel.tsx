import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useWriterStore } from '../store/writerStore';

const RELATIONSHIP_TYPES = ['family', 'romantic', 'friend', 'rival', 'mentor', 'ally', 'enemy', 'colleague', 'acquaintance'] as const;

const RELATIONSHIP_COLORS: Record<string, string> = {
  family: '#a78bfa',
  romantic: '#f472b6',
  friend: '#34d399',
  rival: '#fb923c',
  mentor: '#60a5fa',
  ally: '#4ade80',
  enemy: '#ef4444',
  colleague: '#94a3b8',
  acquaintance: '#6b7280',
};

interface NodePosition {
  id: string;
  name: string;
  x: number;
  y: number;
}

export default function RelationshipMapPanel() {
  const {
    relationships,
    encyclopediaEntries,
    currentProject,
    relationshipScanning,
    relationshipScanResults,
    setShowRelationshipMap,
    createRelationship,
    updateRelationship,
    deleteRelationship,
    scanRelationships,
    clearRelationshipScanResults,
  } = useWriterStore();

  const [activeTab, setActiveTab] = useState<'map' | 'list'>('map');
  const [addingRelationship, setAddingRelationship] = useState(false);
  const [formCharA, setFormCharA] = useState('');
  const [formCharB, setFormCharB] = useState('');
  const [formType, setFormType] = useState('friend');
  const [formDesc, setFormDesc] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editType, setEditType] = useState('');
  const [editDesc, setEditDesc] = useState('');
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [nodes, setNodes] = useState<NodePosition[]>([]);
  const [draggingNode, setDraggingNode] = useState<string | null>(null);
  const [hoveredNode, setHoveredNode] = useState<string | null>(null);

  const characters = encyclopediaEntries.filter(e => e.category === 'Character');

  // Initialize node positions in a circle
  useEffect(() => {
    if (characters.length === 0) return;
    const existingIds = new Set(nodes.map(n => n.id));
    const charIds = new Set(characters.map(c => c.id));

    // Only reinitialize if character set changed
    if (characters.length === nodes.length && characters.every(c => existingIds.has(c.id))) return;

    const cx = 350;
    const cy = 250;
    const radius = Math.min(200, 80 + characters.length * 20);

    const newNodes = characters.map((c, i) => {
      const existing = nodes.find(n => n.id === c.id);
      if (existing) return existing;
      const angle = (2 * Math.PI * i) / characters.length - Math.PI / 2;
      return {
        id: c.id,
        name: c.name,
        x: cx + radius * Math.cos(angle),
        y: cy + radius * Math.sin(angle),
      };
    });
    setNodes(newNodes);
  }, [characters.length]);

  // Draw the graph
  const drawCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    canvas.width = canvas.offsetWidth * dpr;
    canvas.height = canvas.offsetHeight * dpr;
    ctx.scale(dpr, dpr);

    const w = canvas.offsetWidth;
    const h = canvas.offsetHeight;

    ctx.clearRect(0, 0, w, h);

    // Draw edges (relationships)
    for (const rel of relationships) {
      const nodeA = nodes.find(n => n.id === rel.characterAId);
      const nodeB = nodes.find(n => n.id === rel.characterBId);
      if (!nodeA || !nodeB) continue;

      const color = RELATIONSHIP_COLORS[rel.relationshipType] || '#6b7280';
      ctx.beginPath();
      ctx.moveTo(nodeA.x, nodeA.y);
      ctx.lineTo(nodeB.x, nodeB.y);
      ctx.strokeStyle = color;
      ctx.lineWidth = 2;
      ctx.stroke();

      // Relationship label at midpoint
      const mx = (nodeA.x + nodeB.x) / 2;
      const my = (nodeA.y + nodeB.y) / 2;
      ctx.font = '10px sans-serif';
      ctx.fillStyle = color;
      ctx.textAlign = 'center';
      ctx.fillText(rel.relationshipType, mx, my - 4);
    }

    // Draw nodes
    for (const node of nodes) {
      const isHovered = hoveredNode === node.id;
      const nodeRadius = isHovered ? 28 : 24;

      // Node circle
      ctx.beginPath();
      ctx.arc(node.x, node.y, nodeRadius, 0, 2 * Math.PI);
      ctx.fillStyle = isHovered ? '#4f46e5' : '#312e81';
      ctx.fill();
      ctx.strokeStyle = '#818cf8';
      ctx.lineWidth = 2;
      ctx.stroke();

      // Node label
      ctx.font = `${isHovered ? 'bold ' : ''}11px sans-serif`;
      ctx.fillStyle = '#e9ecef';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';

      // Truncate long names
      const maxLen = 10;
      const label = node.name.length > maxLen ? node.name.substring(0, maxLen - 1) + '\u2026' : node.name;
      ctx.fillText(label, node.x, node.y);
    }
  }, [nodes, relationships, hoveredNode]);

  useEffect(() => {
    drawCanvas();
  }, [drawCanvas]);

  // Mouse handlers for canvas
  const findNodeAt = (x: number, y: number): string | null => {
    for (const node of nodes) {
      const dx = x - node.x;
      const dy = y - node.y;
      if (dx * dx + dy * dy < 28 * 28) return node.id;
    }
    return null;
  };

  const handleCanvasMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const rect = canvasRef.current!.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const nodeId = findNodeAt(x, y);
    if (nodeId) setDraggingNode(nodeId);
  };

  const handleCanvasMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const rect = canvasRef.current!.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    if (draggingNode) {
      setNodes(prev => prev.map(n => n.id === draggingNode ? { ...n, x, y } : n));
    } else {
      setHoveredNode(findNodeAt(x, y));
    }
  };

  const handleCanvasMouseUp = () => {
    setDraggingNode(null);
  };

  const handleAddRelationship = async () => {
    if (!formCharA || !formCharB || formCharA === formCharB) return;
    await createRelationship({
      characterAId: formCharA,
      characterBId: formCharB,
      relationshipType: formType,
      description: formDesc,
    });
    setAddingRelationship(false);
    setFormCharA('');
    setFormCharB('');
    setFormType('friend');
    setFormDesc('');
  };

  const handleAcceptScanned = async (item: any) => {
    const charA = characters.find(c => c.name === item.characterAName);
    const charB = characters.find(c => c.name === item.characterBName);
    if (!charA || !charB) return;
    await createRelationship({
      characterAId: charA.id,
      characterBId: charB.id,
      relationshipType: item.relationshipType,
      description: item.description,
    });
  };

  const handleSaveEdit = async () => {
    if (!editingId) return;
    await updateRelationship(editingId, { relationshipType: editType, description: editDesc });
    setEditingId(null);
  };

  const getCharName = (id: string) => {
    const ch = characters.find(c => c.id === id);
    return ch ? ch.name : 'Unknown';
  };

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50" onClick={() => setShowRelationshipMap(false)}>
      <div className="bg-[var(--bg-panel)] rounded-lg border border-[var(--border)] w-[800px] max-h-[85vh] flex flex-col" onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="p-4 border-b border-[var(--border)] flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <h2 className="text-sm font-semibold text-surface-200">Character Relationships</h2>
            <div className="flex gap-1">
              {(['map', 'list'] as const).map(tab => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`px-2 py-1 text-xs rounded transition-colors ${
                    activeTab === tab ? 'bg-primary-600/30 text-primary-300' : 'text-surface-400 hover:text-surface-200'
                  }`}
                >
                  {tab === 'map' ? 'Map' : 'List'}
                </button>
              ))}
            </div>
          </div>
          <button onClick={() => setShowRelationshipMap(false)} className="text-surface-500 hover:text-surface-300">x</button>
        </div>

        {/* Toolbar */}
        <div className="px-4 py-2 border-b border-[var(--border)] flex items-center gap-2 shrink-0">
          <button
            onClick={() => setAddingRelationship(true)}
            className="px-3 py-1.5 text-xs bg-primary-600 hover:bg-primary-500 text-white rounded transition-colors"
          >
            + Add Relationship
          </button>
          <button
            onClick={scanRelationships}
            disabled={relationshipScanning || characters.length < 2}
            className="px-3 py-1.5 text-xs bg-accent-600/30 text-accent-300 hover:bg-accent-600/50 rounded transition-colors disabled:opacity-50"
          >
            {relationshipScanning ? 'Scanning...' : 'AI: Scan Manuscript'}
          </button>
          {characters.length < 2 && (
            <span className="text-xs text-surface-500 italic">Add 2+ Character encyclopedia entries to use this feature</span>
          )}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4">
          {/* Add relationship form */}
          {addingRelationship && (
            <div className="mb-4 p-3 bg-[var(--bg-page)] rounded border border-[var(--border)] space-y-2">
              <div className="flex gap-2">
                <select
                  value={formCharA}
                  onChange={e => setFormCharA(e.target.value)}
                  className="flex-1 bg-[var(--bg-panel)] text-surface-200 rounded px-2 py-1 text-xs border border-[var(--border)]"
                >
                  <option value="">Character A...</option>
                  {characters.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
                <select
                  value={formCharB}
                  onChange={e => setFormCharB(e.target.value)}
                  className="flex-1 bg-[var(--bg-panel)] text-surface-200 rounded px-2 py-1 text-xs border border-[var(--border)]"
                >
                  <option value="">Character B...</option>
                  {characters.filter(c => c.id !== formCharA).map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
                <select
                  value={formType}
                  onChange={e => setFormType(e.target.value)}
                  className="bg-[var(--bg-panel)] text-surface-200 rounded px-2 py-1 text-xs border border-[var(--border)]"
                >
                  {RELATIONSHIP_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
              <input
                type="text"
                value={formDesc}
                onChange={e => setFormDesc(e.target.value)}
                placeholder="Description (optional)"
                className="w-full bg-[var(--bg-panel)] text-surface-200 rounded px-2 py-1 text-xs border border-[var(--border)] focus:border-primary-500 focus:outline-none"
              />
              <div className="flex gap-2">
                <button onClick={handleAddRelationship} className="px-3 py-1 text-xs bg-primary-600 hover:bg-primary-500 text-white rounded">Save</button>
                <button onClick={() => setAddingRelationship(false)} className="px-3 py-1 text-xs text-surface-400 hover:text-surface-200">Cancel</button>
              </div>
            </div>
          )}

          {/* AI scan results */}
          {relationshipScanResults && relationshipScanResults.length > 0 && (
            <div className="mb-4 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-accent-300">AI-Detected Relationships ({relationshipScanResults.length})</span>
                <button onClick={clearRelationshipScanResults} className="text-xs text-surface-500 hover:text-surface-300">Dismiss All</button>
              </div>
              {relationshipScanResults.map((item: any, i: number) => (
                <div key={i} className="p-2 bg-[var(--bg-page)] rounded border border-accent-500/30 flex items-center gap-2">
                  <span className="text-xs text-surface-200 flex-1">
                    <strong>{item.characterAName}</strong>
                    <span className="mx-1" style={{ color: RELATIONSHIP_COLORS[item.relationshipType] || '#6b7280' }}>{item.relationshipType}</span>
                    <strong>{item.characterBName}</strong>
                    {item.description && <span className="text-surface-400 ml-2">— {item.description}</span>}
                  </span>
                  <button
                    onClick={() => handleAcceptScanned(item)}
                    className="px-2 py-0.5 text-xs bg-green-600/30 text-green-300 hover:bg-green-600/50 rounded"
                  >
                    Add
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* Map view */}
          {activeTab === 'map' && (
            <div className="relative">
              {characters.length === 0 ? (
                <div className="text-center text-surface-500 py-12 text-sm">
                  Add Character entries to your encyclopedia to see the relationship map.
                </div>
              ) : (
                <canvas
                  ref={canvasRef}
                  className="w-full rounded border border-[var(--border)]"
                  style={{ height: 500, cursor: draggingNode ? 'grabbing' : hoveredNode ? 'grab' : 'default' }}
                  onMouseDown={handleCanvasMouseDown}
                  onMouseMove={handleCanvasMouseMove}
                  onMouseUp={handleCanvasMouseUp}
                  onMouseLeave={handleCanvasMouseUp}
                />
              )}
              {/* Legend */}
              {characters.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-3">
                  {RELATIONSHIP_TYPES.map(t => (
                    <div key={t} className="flex items-center gap-1">
                      <div className="w-3 h-0.5 rounded" style={{ backgroundColor: RELATIONSHIP_COLORS[t] }} />
                      <span className="text-xs text-surface-500">{t}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* List view */}
          {activeTab === 'list' && (
            <div className="space-y-2">
              {relationships.length === 0 ? (
                <div className="text-center text-surface-500 py-8 text-sm">
                  No relationships defined yet. Add one or use AI Scan.
                </div>
              ) : (
                relationships.map(rel => (
                  <div key={rel.id} className="p-3 bg-[var(--bg-page)] rounded border border-[var(--border)] group">
                    {editingId === rel.id ? (
                      <div className="space-y-2">
                        <div className="flex gap-2 items-center">
                          <span className="text-xs text-surface-200">{getCharName(rel.characterAId)} &harr; {getCharName(rel.characterBId)}</span>
                          <select
                            value={editType}
                            onChange={e => setEditType(e.target.value)}
                            className="bg-[var(--bg-panel)] text-surface-200 rounded px-2 py-0.5 text-xs border border-[var(--border)]"
                          >
                            {RELATIONSHIP_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                          </select>
                        </div>
                        <input
                          type="text"
                          value={editDesc}
                          onChange={e => setEditDesc(e.target.value)}
                          className="w-full bg-[var(--bg-panel)] text-surface-200 rounded px-2 py-1 text-xs border border-[var(--border)] focus:border-primary-500 focus:outline-none"
                        />
                        <div className="flex gap-2">
                          <button onClick={handleSaveEdit} className="px-2 py-0.5 text-xs bg-primary-600 text-white rounded">Save</button>
                          <button onClick={() => setEditingId(null)} className="px-2 py-0.5 text-xs text-surface-400">Cancel</button>
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-surface-200 font-medium">{getCharName(rel.characterAId)}</span>
                        <span
                          className="text-xs font-semibold px-1.5 py-0.5 rounded"
                          style={{ color: RELATIONSHIP_COLORS[rel.relationshipType] || '#6b7280', backgroundColor: (RELATIONSHIP_COLORS[rel.relationshipType] || '#6b7280') + '20' }}
                        >
                          {rel.relationshipType}
                        </span>
                        <span className="text-xs text-surface-200 font-medium">{getCharName(rel.characterBId)}</span>
                        {rel.description && <span className="text-xs text-surface-400 flex-1 truncate ml-2">— {rel.description}</span>}
                        <div className="opacity-0 group-hover:opacity-100 flex gap-1 shrink-0">
                          <button
                            onClick={() => { setEditingId(rel.id); setEditType(rel.relationshipType); setEditDesc(rel.description); }}
                            className="px-2 py-0.5 text-xs text-primary-400 hover:text-primary-300"
                          >
                            Edit
                          </button>
                          <button
                            onClick={() => deleteRelationship(rel.id)}
                            className="px-2 py-0.5 text-xs text-red-400 hover:text-red-300"
                          >
                            Delete
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
