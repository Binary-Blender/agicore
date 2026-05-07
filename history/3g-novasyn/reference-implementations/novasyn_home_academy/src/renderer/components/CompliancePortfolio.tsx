import React, { useEffect, useState } from 'react';
import { useAcademyStore } from '../store/academyStore';
import type { CreatePortfolioItemInput, PortfolioItem, ReportCard, Transcript } from '../../shared/types';

const US_STATES = [
  'Alabama','Alaska','Arizona','Arkansas','California','Colorado','Connecticut','Delaware','Florida','Georgia',
  'Hawaii','Idaho','Illinois','Indiana','Iowa','Kansas','Kentucky','Louisiana','Maine','Maryland',
  'Massachusetts','Michigan','Minnesota','Mississippi','Missouri','Montana','Nebraska','Nevada','New Hampshire','New Jersey',
  'New Mexico','New York','North Carolina','North Dakota','Ohio','Oklahoma','Oregon','Pennsylvania','Rhode Island','South Carolina',
  'South Dakota','Tennessee','Texas','Utah','Vermont','Virginia','Washington','West Virginia','Wisconsin','Wyoming',
];

const ITEM_TYPES: { value: PortfolioItem['itemType']; label: string; icon: string }[] = [
  { value: 'writing_sample', label: 'Writing Sample', icon: '✍️' },
  { value: 'artwork', label: 'Artwork', icon: '🎨' },
  { value: 'project_photo', label: 'Project Photo', icon: '📸' },
  { value: 'test_result', label: 'Test Result', icon: '📝' },
  { value: 'certificate', label: 'Certificate', icon: '🏆' },
  { value: 'book_report', label: 'Book Report', icon: '📖' },
  { value: 'other', label: 'Other', icon: '📎' },
];

export default function CompliancePortfolio() {
  const {
    currentStudent,
    currentSchoolYear,
    subjects,
    complianceRequirements,
    complianceStatuses,
    portfolio,
    aiLoading,
    models,
    settings,
    loadComplianceRequirements,
    loadComplianceStatus,
    updateComplianceStatus,
    loadPortfolio,
    createPortfolioItem,
    deletePortfolioItem,
    generateReportCard,
    generateTranscript,
    generateYearEndReport,
    exportPdf,
    printResource,
  } = useAcademyStore();

  const [activeTab, setActiveTab] = useState<'compliance' | 'portfolio' | 'reports'>('compliance');
  const [selectedState, setSelectedState] = useState('');
  const [showAddPortfolio, setShowAddPortfolio] = useState(false);
  const [portfolioTitle, setPortfolioTitle] = useState('');
  const [portfolioType, setPortfolioType] = useState<PortfolioItem['itemType']>('writing_sample');
  const [portfolioContent, setPortfolioContent] = useState('');
  const [portfolioSubjectId, setPortfolioSubjectId] = useState('');
  const [portfolioTags, setPortfolioTags] = useState('');
  const [portfolioFilter, setPortfolioFilter] = useState<string>('all');

  // Reports state
  const [reportPeriod, setReportPeriod] = useState('Fall Semester');
  const [reportStyle, setReportStyle] = useState<'traditional' | 'narrative' | 'standards_based' | 'hybrid'>('narrative');
  const [reportResult, setReportResult] = useState<string | null>(null);
  const [reportTitle, setReportTitle] = useState('');
  const [selectedModel, setSelectedModel] = useState('');

  useEffect(() => {
    if (currentStudent?.state) {
      setSelectedState(currentStudent.state);
    }
  }, [currentStudent?.state]);

  useEffect(() => {
    if (selectedState) {
      loadComplianceRequirements(selectedState);
    }
  }, [selectedState]);

  useEffect(() => {
    if (currentStudent && currentSchoolYear) {
      loadComplianceStatus(currentStudent.id, currentSchoolYear.id);
    }
  }, [currentStudent?.id, currentSchoolYear?.id]);

  useEffect(() => {
    if (currentStudent) {
      loadPortfolio(currentStudent.id, currentSchoolYear?.id);
    }
  }, [currentStudent?.id, currentSchoolYear?.id]);

  if (!currentStudent) {
    return (
      <div className="h-full flex items-center justify-center text-[var(--text-muted)]">
        Select a student to view compliance & portfolio
      </div>
    );
  }

  if (!currentSchoolYear) {
    return (
      <div className="h-full flex items-center justify-center text-[var(--text-muted)]">
        Create a school year first
      </div>
    );
  }

  const handleAddPortfolioItem = async () => {
    if (!portfolioTitle.trim()) return;
    const input: CreatePortfolioItemInput = {
      studentId: currentStudent.id,
      schoolYearId: currentSchoolYear.id,
      subjectId: portfolioSubjectId || undefined,
      title: portfolioTitle,
      itemType: portfolioType,
      content: portfolioContent,
      tags: portfolioTags ? portfolioTags.split(',').map(t => t.trim()).filter(Boolean) : [],
    };
    await createPortfolioItem(input);
    setPortfolioTitle('');
    setPortfolioContent('');
    setPortfolioTags('');
    setShowAddPortfolio(false);
  };

  const handleGenerateReportCard = async () => {
    const model = selectedModel || settings.defaultModel;
    const result = await generateReportCard({
      studentId: currentStudent.id,
      schoolYearId: currentSchoolYear.id,
      period: reportPeriod,
      style: reportStyle,
      model,
    });
    setReportResult(result.html);
    setReportTitle(`Report Card — ${currentStudent.name} — ${reportPeriod}`);
  };

  const handleGenerateTranscript = async () => {
    const model = selectedModel || settings.defaultModel;
    const result = await generateTranscript({
      studentId: currentStudent.id,
      model,
    });
    setReportResult(result.html);
    setReportTitle(`Transcript — ${currentStudent.name}`);
  };

  const handleGenerateYearEnd = async () => {
    const model = selectedModel || settings.defaultModel;
    const html = await generateYearEndReport(currentStudent.id, currentSchoolYear.id, model);
    setReportResult(html);
    setReportTitle(`Year-End Report — ${currentStudent.name} — ${currentSchoolYear.name}`);
  };

  const filteredPortfolio = portfolioFilter === 'all'
    ? portfolio
    : portfolio.filter(p => p.itemType === portfolioFilter);

  return (
    <div className="h-full flex flex-col overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-[var(--border)]">
        <div>
          <h1 className="text-xl font-bold text-[var(--text-primary)]">Records & Compliance</h1>
          <p className="text-sm text-[var(--text-muted)]">{currentStudent.name} — {currentSchoolYear.name}</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-[var(--border)] px-4">
        {(['compliance', 'portfolio', 'reports'] as const).map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
              activeTab === tab
                ? 'border-[var(--accent)] text-[var(--accent)]'
                : 'border-transparent text-[var(--text-muted)] hover:text-[var(--text-secondary)]'
            }`}
          >
            {tab === 'compliance' && '📋 Compliance'}
            {tab === 'portfolio' && `📁 Portfolio (${portfolio.length})`}
            {tab === 'reports' && '📄 Reports'}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <div className="flex-1 overflow-y-auto p-4">
        {/* ── Compliance Tab ── */}
        {activeTab === 'compliance' && (
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <label className="text-sm text-[var(--text-muted)]">State:</label>
              <select
                value={selectedState}
                onChange={e => setSelectedState(e.target.value)}
                className="px-3 py-1.5 bg-[var(--bg-secondary)] border border-[var(--border)] rounded-lg text-[var(--text-primary)] text-sm"
              >
                <option value="">Select state...</option>
                {US_STATES.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>

            {selectedState && complianceRequirements.length === 0 && (
              <div className="p-6 bg-[var(--bg-secondary)] rounded-lg text-center">
                <div className="text-4xl mb-3">📋</div>
                <p className="text-[var(--text-primary)] font-medium mb-2">No compliance requirements found for {selectedState}</p>
                <p className="text-sm text-[var(--text-muted)]">
                  Compliance requirements are state-specific. Requirements will appear here once configured.
                  Many states have minimal requirements for homeschooling.
                </p>
              </div>
            )}

            {complianceStatuses.length > 0 && (
              <div className="space-y-2">
                {complianceStatuses.map(cs => (
                  <div key={cs.id} className="p-3 bg-[var(--bg-secondary)] rounded-lg">
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <span className={`text-sm ${
                            cs.status === 'completed' ? 'text-green-400' :
                            cs.status === 'in_progress' ? 'text-yellow-400' :
                            cs.status === 'not_applicable' ? 'text-gray-400' :
                            'text-[var(--text-muted)]'
                          }`}>
                            {cs.status === 'completed' ? '✅' :
                             cs.status === 'in_progress' ? '🔄' :
                             cs.status === 'not_applicable' ? '➖' : '⬜'}
                          </span>
                          <span className="text-sm font-medium text-[var(--text-primary)]">
                            {cs.requirement?.description || 'Requirement'}
                          </span>
                          {cs.requirement?.isRequired && (
                            <span className="text-xs px-1.5 py-0.5 bg-red-500/20 text-red-400 rounded">Required</span>
                          )}
                        </div>
                        <div className="text-xs text-[var(--text-muted)] mt-1 ml-6">
                          {cs.requirement?.requirementType} {cs.notes && `— ${cs.notes}`}
                        </div>
                      </div>
                      <select
                        value={cs.status}
                        onChange={e => updateComplianceStatus(cs.id, { status: e.target.value as any })}
                        className="px-2 py-1 bg-[var(--bg-primary)] border border-[var(--border)] rounded text-xs text-[var(--text-primary)]"
                      >
                        <option value="not_started">Not Started</option>
                        <option value="in_progress">In Progress</option>
                        <option value="completed">Completed</option>
                        <option value="not_applicable">N/A</option>
                      </select>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Summary Stats */}
            {selectedState && (
              <div className="p-4 bg-[var(--bg-secondary)] rounded-lg">
                <h3 className="text-sm font-semibold text-[var(--text-primary)] mb-3">Year Summary</h3>
                <div className="grid grid-cols-3 gap-4 text-center">
                  <div>
                    <div className="text-lg font-bold text-[var(--text-primary)]">{currentSchoolYear.actualSchoolDays}</div>
                    <div className="text-xs text-[var(--text-muted)]">/ {currentSchoolYear.targetSchoolDays} days</div>
                  </div>
                  <div>
                    <div className="text-lg font-bold text-[var(--text-primary)]">{subjects.length}</div>
                    <div className="text-xs text-[var(--text-muted)]">Subjects</div>
                  </div>
                  <div>
                    <div className="text-lg font-bold text-[var(--text-primary)]">{portfolio.length}</div>
                    <div className="text-xs text-[var(--text-muted)]">Portfolio Items</div>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ── Portfolio Tab ── */}
        {activeTab === 'portfolio' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <select
                  value={portfolioFilter}
                  onChange={e => setPortfolioFilter(e.target.value)}
                  className="px-3 py-1.5 bg-[var(--bg-secondary)] border border-[var(--border)] rounded-lg text-[var(--text-primary)] text-sm"
                >
                  <option value="all">All Types</option>
                  {ITEM_TYPES.map(t => (
                    <option key={t.value} value={t.value}>{t.icon} {t.label}</option>
                  ))}
                </select>
                <span className="text-sm text-[var(--text-muted)]">{filteredPortfolio.length} items</span>
              </div>
              <button
                onClick={() => setShowAddPortfolio(!showAddPortfolio)}
                className="px-3 py-1.5 text-sm bg-[var(--accent)] text-white rounded-lg hover:opacity-90"
              >
                + Add Item
              </button>
            </div>

            {showAddPortfolio && (
              <div className="p-4 bg-[var(--bg-secondary)] rounded-lg space-y-3">
                <input
                  type="text"
                  value={portfolioTitle}
                  onChange={e => setPortfolioTitle(e.target.value)}
                  placeholder="Title (e.g., 'Essay on Marine Life')"
                  className="w-full px-3 py-2 bg-[var(--bg-primary)] border border-[var(--border)] rounded-lg text-[var(--text-primary)] text-sm"
                />
                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label className="text-xs text-[var(--text-muted)]">Type</label>
                    <select
                      value={portfolioType}
                      onChange={e => setPortfolioType(e.target.value as any)}
                      className="w-full px-3 py-2 bg-[var(--bg-primary)] border border-[var(--border)] rounded-lg text-[var(--text-primary)] text-sm"
                    >
                      {ITEM_TYPES.map(t => (
                        <option key={t.value} value={t.value}>{t.icon} {t.label}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="text-xs text-[var(--text-muted)]">Subject (optional)</label>
                    <select
                      value={portfolioSubjectId}
                      onChange={e => setPortfolioSubjectId(e.target.value)}
                      className="w-full px-3 py-2 bg-[var(--bg-primary)] border border-[var(--border)] rounded-lg text-[var(--text-primary)] text-sm"
                    >
                      <option value="">None</option>
                      {subjects.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="text-xs text-[var(--text-muted)]">Tags (comma-separated)</label>
                    <input
                      type="text"
                      value={portfolioTags}
                      onChange={e => setPortfolioTags(e.target.value)}
                      placeholder="e.g., creative writing, Q2"
                      className="w-full px-3 py-2 bg-[var(--bg-primary)] border border-[var(--border)] rounded-lg text-[var(--text-primary)] text-sm"
                    />
                  </div>
                </div>
                <textarea
                  value={portfolioContent}
                  onChange={e => setPortfolioContent(e.target.value)}
                  placeholder="Content or notes (optional)"
                  rows={3}
                  className="w-full px-3 py-2 bg-[var(--bg-primary)] border border-[var(--border)] rounded-lg text-[var(--text-primary)] text-sm resize-none"
                />
                <div className="flex justify-end gap-2">
                  <button onClick={() => setShowAddPortfolio(false)} className="px-3 py-1.5 text-sm text-[var(--text-muted)]">Cancel</button>
                  <button
                    onClick={handleAddPortfolioItem}
                    disabled={!portfolioTitle.trim()}
                    className="px-4 py-1.5 text-sm bg-[var(--accent)] text-white rounded-lg hover:opacity-90 disabled:opacity-50"
                  >
                    Add to Portfolio
                  </button>
                </div>
              </div>
            )}

            {filteredPortfolio.length === 0 ? (
              <div className="text-center py-12 text-[var(--text-muted)]">
                <div className="text-5xl mb-3">📁</div>
                <p>No portfolio items yet. Add work samples to build your portfolio!</p>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-3">
                {filteredPortfolio.map(item => {
                  const typeInfo = ITEM_TYPES.find(t => t.value === item.itemType);
                  const subjectName = subjects.find(s => s.id === item.subjectId)?.name;
                  return (
                    <div key={item.id} className="p-3 bg-[var(--bg-secondary)] rounded-lg group">
                      <div className="flex items-start justify-between">
                        <div className="flex items-start gap-2 flex-1 min-w-0">
                          <span className="text-xl flex-shrink-0">{typeInfo?.icon || '📎'}</span>
                          <div className="min-w-0">
                            <div className="text-sm font-medium text-[var(--text-primary)] truncate">{item.title}</div>
                            <div className="text-xs text-[var(--text-muted)]">
                              {typeInfo?.label}{subjectName ? ` · ${subjectName}` : ''} · {new Date(item.createdAt).toLocaleDateString()}
                            </div>
                            {item.tags.length > 0 && (
                              <div className="flex flex-wrap gap-1 mt-1">
                                {item.tags.map((tag, i) => (
                                  <span key={i} className="text-xs px-1.5 py-0.5 bg-[var(--bg-tertiary)] text-[var(--text-muted)] rounded">{tag}</span>
                                ))}
                              </div>
                            )}
                          </div>
                        </div>
                        <button
                          onClick={() => deletePortfolioItem(item.id)}
                          className="text-xs text-red-400 hover:text-red-300 opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          Delete
                        </button>
                      </div>
                      {item.content && (
                        <div className="mt-2 text-xs text-[var(--text-muted)] line-clamp-2 ml-7">{item.content}</div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* ── Reports Tab ── */}
        {activeTab === 'reports' && (
          <div className="space-y-6">
            {/* Model Selection */}
            <div className="flex items-center gap-3">
              <label className="text-sm text-[var(--text-muted)]">AI Model:</label>
              <select
                value={selectedModel}
                onChange={e => setSelectedModel(e.target.value)}
                className="px-3 py-1.5 bg-[var(--bg-secondary)] border border-[var(--border)] rounded-lg text-[var(--text-primary)] text-sm"
              >
                <option value="">Default ({settings.defaultModel})</option>
                {models.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
              </select>
            </div>

            {/* Report Card */}
            <section className="p-4 bg-[var(--bg-secondary)] rounded-lg">
              <h3 className="text-base font-semibold text-[var(--text-primary)] mb-3">Report Card</h3>
              <p className="text-sm text-[var(--text-muted)] mb-3">AI generates a complete report card from your student's data.</p>
              <div className="grid grid-cols-2 gap-3 mb-3">
                <div>
                  <label className="text-xs text-[var(--text-muted)]">Period</label>
                  <input
                    type="text"
                    value={reportPeriod}
                    onChange={e => setReportPeriod(e.target.value)}
                    placeholder="e.g., Fall Semester 2025"
                    className="w-full px-3 py-2 bg-[var(--bg-primary)] border border-[var(--border)] rounded-lg text-[var(--text-primary)] text-sm"
                  />
                </div>
                <div>
                  <label className="text-xs text-[var(--text-muted)]">Style</label>
                  <select
                    value={reportStyle}
                    onChange={e => setReportStyle(e.target.value as any)}
                    className="w-full px-3 py-2 bg-[var(--bg-primary)] border border-[var(--border)] rounded-lg text-[var(--text-primary)] text-sm"
                  >
                    <option value="narrative">Narrative (written evaluation)</option>
                    <option value="traditional">Traditional (letter grades)</option>
                    <option value="standards_based">Standards-Based (proficiency levels)</option>
                    <option value="hybrid">Hybrid (grades + narrative)</option>
                  </select>
                </div>
              </div>
              <button
                onClick={handleGenerateReportCard}
                disabled={aiLoading}
                className="px-4 py-2 bg-[var(--accent)] text-white rounded-lg hover:opacity-90 disabled:opacity-50 text-sm"
              >
                {aiLoading ? 'Generating...' : 'Generate Report Card'}
              </button>
            </section>

            {/* Transcript */}
            <section className="p-4 bg-[var(--bg-secondary)] rounded-lg">
              <h3 className="text-base font-semibold text-[var(--text-primary)] mb-2">Academic Transcript</h3>
              <p className="text-sm text-[var(--text-muted)] mb-3">Official transcript across all school years with GPA and credits.</p>
              <button
                onClick={handleGenerateTranscript}
                disabled={aiLoading}
                className="px-4 py-2 bg-[var(--accent)] text-white rounded-lg hover:opacity-90 disabled:opacity-50 text-sm"
              >
                {aiLoading ? 'Generating...' : 'Generate Transcript'}
              </button>
            </section>

            {/* Year-End Report */}
            <section className="p-4 bg-[var(--bg-secondary)] rounded-lg">
              <h3 className="text-base font-semibold text-[var(--text-primary)] mb-2">Year-End Portfolio Report</h3>
              <p className="text-sm text-[var(--text-muted)] mb-3">Comprehensive year-end document with subject narratives, reading log, assessment summary, attendance, and portfolio overview. Suitable for state compliance.</p>
              <button
                onClick={handleGenerateYearEnd}
                disabled={aiLoading}
                className="px-4 py-2 bg-[var(--accent)] text-white rounded-lg hover:opacity-90 disabled:opacity-50 text-sm"
              >
                {aiLoading ? 'Generating...' : 'Generate Year-End Report'}
              </button>
            </section>

            {/* Report Preview */}
            {reportResult && (
              <section className="border border-[var(--border)] rounded-lg overflow-hidden">
                <div className="flex items-center justify-between p-3 bg-[var(--bg-secondary)] border-b border-[var(--border)]">
                  <span className="text-sm font-medium text-[var(--text-primary)]">{reportTitle}</span>
                  <div className="flex gap-2">
                    <button
                      onClick={() => printResource(reportResult)}
                      className="px-3 py-1 text-xs bg-[var(--bg-tertiary)] text-[var(--text-secondary)] rounded hover:bg-[var(--bg-hover)]"
                    >
                      Print
                    </button>
                    <button
                      onClick={() => exportPdf(reportResult, reportTitle)}
                      className="px-3 py-1 text-xs bg-[var(--accent)] text-white rounded hover:opacity-90"
                    >
                      Export PDF
                    </button>
                    <button
                      onClick={() => setReportResult(null)}
                      className="px-3 py-1 text-xs text-[var(--text-muted)] hover:text-[var(--text-primary)]"
                    >
                      Close
                    </button>
                  </div>
                </div>
                <div
                  className="p-4 bg-white text-black max-h-[500px] overflow-y-auto"
                  dangerouslySetInnerHTML={{ __html: reportResult }}
                />
              </section>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
