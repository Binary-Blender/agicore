interface LyricsGeneratorTabProps {
  lyrics: string;
  loading: boolean;
  usage: string;
  onLyricsChange: (lyrics: string) => void;
  onGenerate: () => void;
  onSaveDraft?: () => void;
}

export default function LyricsGeneratorTab({
  lyrics,
  loading,
  usage,
  onLyricsChange,
  onGenerate,
  onSaveDraft,
}: LyricsGeneratorTabProps) {
  const handleCopyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(lyrics);
      alert('Lyrics copied to clipboard!');
    } catch (error) {
      console.error('Failed to copy:', error);
    }
  };

  return (
    <div className="px-4 py-8 max-w-6xl">
      <div className="mb-6">
        <h2 className="text-3xl font-bold text-gray-900 mb-2">Lyrics Generator</h2>
        <p className="text-gray-600">
          AI-powered lyrics creation based on your policy document. Edit the generated lyrics or create new ones.
        </p>
      </div>

      <div className="bg-white border border-gray-200 rounded-2xl p-8 shadow-sm">
        {/* Action Bar */}
        <div className="flex items-center justify-between mb-6 pb-6 border-b border-gray-200">
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
                  Generate Lyrics
                </>
              )}
            </button>

            {lyrics && !loading && (
              <button
                onClick={handleCopyToClipboard}
                className="bg-white border border-gray-300 text-gray-700 font-semibold px-5 py-3 rounded-xl shadow-sm hover:shadow transition flex items-center gap-2"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"
                  />
                </svg>
                Copy to Clipboard
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

        {/* Lyrics Editor */}
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-3">
            Song Lyrics
          </label>
          <textarea
            value={lyrics}
            onChange={(e) => onLyricsChange(e.target.value)}
            rows={20}
            className="w-full rounded-xl border border-gray-200 px-4 py-4 text-sm text-gray-800 focus:border-primary-500 focus:ring-2 focus:ring-primary-200 transition font-mono"
            placeholder="Your AI-generated song lyrics will appear here. You can edit them directly before saving to a module."
          />
          <div className="flex items-center justify-between mt-3">
            <p className="text-xs text-gray-500">
              {lyrics ? `${lyrics.length} characters • ${lyrics.split('\n').length} lines` : 'No lyrics generated yet'}
            </p>
            {onSaveDraft && lyrics && (
              <button
                onClick={onSaveDraft}
                className="text-xs font-semibold text-primary-600 hover:text-primary-700"
              >
                Save Draft
              </button>
            )}
          </div>
        </div>

        {/* Tips Section */}
        <div className="mt-8 pt-6 border-t border-gray-200">
          <h3 className="text-sm font-semibold text-gray-700 mb-3">Tips for Best Results</h3>
          <ul className="space-y-2 text-sm text-gray-600">
            <li className="flex items-start gap-2">
              <span className="text-primary-600 mt-0.5">•</span>
              <span>The AI uses your policy text and emphasis prompts to create relevant lyrics</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-primary-600 mt-0.5">•</span>
              <span>Click "Generate Lyrics" multiple times to get different variations</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-primary-600 mt-0.5">•</span>
              <span>Edit the generated lyrics directly in the text area before saving</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-primary-600 mt-0.5">•</span>
              <span>Copy the lyrics to use them in external tools like Suno AI</span>
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
}
