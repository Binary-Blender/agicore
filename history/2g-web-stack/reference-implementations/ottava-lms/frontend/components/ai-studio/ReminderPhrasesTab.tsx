interface ReminderPhrasesTabProps {
  reinforcement: string[];
  policyHighlights: string[];
  loading: boolean;
  usage: string;
  onReinforcementChange: (index: number, value: string) => void;
  onPolicyHighlightChange: (index: number, value: string) => void;
  onAddReinforcement: () => void;
  onAddPolicyHighlight: () => void;
  onGenerate: () => void;
  onClearAll?: () => void;
  onExport?: () => void;
}

export default function ReminderPhrasesTab({
  reinforcement,
  policyHighlights,
  loading,
  usage,
  onReinforcementChange,
  onPolicyHighlightChange,
  onAddReinforcement,
  onAddPolicyHighlight,
  onGenerate,
  onClearAll,
  onExport,
}: ReminderPhrasesTabProps) {
  return (
    <div className="px-4 py-8 max-w-7xl">
      <div className="mb-6">
        <h2 className="text-3xl font-bold text-gray-900 mb-2">Reminder Phrases</h2>
        <p className="text-gray-600">
          Generate 30 reminder phrases: 15 lyric reinforcers and 15 policy add-ons that will appear on-screen during training.
        </p>
      </div>

      {/* Action Bar */}
      <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm mb-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={onGenerate}
              disabled={loading}
              className="bg-gradient-to-r from-primary-600 to-primary-700 text-white font-bold px-6 py-3 rounded-xl shadow hover:shadow-lg transition disabled:opacity-60 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {loading ? (
                <>
                  <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                      fill="none"
                    />
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                    />
                  </svg>
                  Generating...
                </>
              ) : (
                <>
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M13 10V3L4 14h7v7l9-11h-7z"
                    />
                  </svg>
                  Generate All Phrases
                </>
              )}
            </button>

            {(reinforcement.length > 0 || policyHighlights.length > 0) && !loading && onClearAll && (
              <button
                onClick={onClearAll}
                className="bg-white border border-red-300 text-red-700 font-semibold px-5 py-3 rounded-xl shadow-sm hover:shadow transition"
              >
                Clear All
              </button>
            )}

            {(reinforcement.length > 0 || policyHighlights.length > 0) && !loading && onExport && (
              <button
                onClick={onExport}
                className="bg-white border border-gray-300 text-gray-700 font-semibold px-5 py-3 rounded-xl shadow-sm hover:shadow transition"
              >
                Export
              </button>
            )}
          </div>

          {usage && (
            <div className="text-xs text-gray-400 flex items-center gap-2">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
              {usage}
            </div>
          )}
        </div>
      </div>

      {/* Two Column Layout */}
      <div className="grid lg:grid-cols-2 gap-6">
        {/* Lyric Reinforcers */}
        <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-xl font-bold text-primary-700">Lyric Reinforcers</h3>
              <p className="text-sm text-gray-600 mt-1">
                Phrases that reinforce the song lyrics
              </p>
            </div>
            <button
              onClick={onAddReinforcement}
              className="text-sm font-semibold text-primary-600 hover:text-primary-700 flex items-center gap-1"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 4v16m8-8H4"
                />
              </svg>
              Add
            </button>
          </div>

          <div className="space-y-3 max-h-[600px] overflow-y-auto pr-2">
            {reinforcement.length > 0 ? (
              reinforcement.map((phrase, index) => (
                <div key={`reinforcement-${index}`} className="relative">
                  <div className="absolute left-3 top-3 text-xs font-bold text-gray-400">
                    {index + 1}
                  </div>
                  <input
                    type="text"
                    value={phrase}
                    onChange={(e) => onReinforcementChange(index, e.target.value)}
                    className="w-full rounded-xl border border-gray-200 pl-10 pr-4 py-3 text-sm focus:border-primary-500 focus:ring-2 focus:ring-primary-200 transition"
                    placeholder={`Reinforcer ${index + 1}`}
                  />
                </div>
              ))
            ) : (
              <div className="text-center py-12 text-gray-400">
                <svg
                  className="w-12 h-12 mx-auto mb-3 opacity-50"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                  />
                </svg>
                <p className="text-sm">No reinforcers yet</p>
                <p className="text-xs mt-1">Click "Generate All Phrases" to create them</p>
              </div>
            )}
          </div>
        </div>

        {/* Policy Add-ons */}
        <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-xl font-bold text-accent-700">Policy Add-ons</h3>
              <p className="text-sm text-gray-600 mt-1">
                Key policy highlights and takeaways
              </p>
            </div>
            <button
              onClick={onAddPolicyHighlight}
              className="text-sm font-semibold text-primary-600 hover:text-primary-700 flex items-center gap-1"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 4v16m8-8H4"
                />
              </svg>
              Add
            </button>
          </div>

          <div className="space-y-3 max-h-[600px] overflow-y-auto pr-2">
            {policyHighlights.length > 0 ? (
              policyHighlights.map((phrase, index) => (
                <div key={`policy-${index}`} className="relative">
                  <div className="absolute left-3 top-3 text-xs font-bold text-gray-400">
                    {index + 1}
                  </div>
                  <input
                    type="text"
                    value={phrase}
                    onChange={(e) => onPolicyHighlightChange(index, e.target.value)}
                    className="w-full rounded-xl border border-gray-200 pl-10 pr-4 py-3 text-sm focus:border-primary-500 focus:ring-2 focus:ring-primary-200 transition"
                    placeholder={`Policy highlight ${index + 1}`}
                  />
                </div>
              ))
            ) : (
              <div className="text-center py-12 text-gray-400">
                <svg
                  className="w-12 h-12 mx-auto mb-3 opacity-50"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                  />
                </svg>
                <p className="text-sm">No policy highlights yet</p>
                <p className="text-xs mt-1">Click "Generate All Phrases" to create them</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Summary */}
      <div className="mt-6 bg-blue-50 border border-blue-200 rounded-xl p-4">
        <div className="flex items-center justify-between">
          <div className="text-sm">
            <span className="font-semibold text-gray-900">Total Phrases: </span>
            <span className="text-gray-700">
              {reinforcement.filter(p => p.trim()).length + policyHighlights.filter(p => p.trim()).length} / 30
            </span>
            <span className="text-gray-500 ml-3">
              ({reinforcement.filter(p => p.trim()).length} reinforcers, {policyHighlights.filter(p => p.trim()).length} policy highlights)
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
