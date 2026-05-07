interface PolicyUploadTabProps {
  policyFile: File | null;
  policyText: string;
  emphasisPrompt: string;
  onPolicyFileChange: (file: File | null) => void;
  onPolicyTextChange: (text: string) => void;
  onEmphasisPromptChange: (text: string) => void;
  onNext?: () => void;
}

export default function PolicyUploadTab({
  policyFile,
  policyText,
  emphasisPrompt,
  onPolicyFileChange,
  onPolicyTextChange,
  onEmphasisPromptChange,
  onNext,
}: PolicyUploadTabProps) {
  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    if (file.type !== 'application/pdf') {
      alert('Policy document must be a PDF.');
      event.target.value = '';
      return;
    }
    onPolicyFileChange(file);
  };

  const policyTextFilled = policyText.trim().length > 0;
  const isComplete = policyTextFilled;

  return (
    <div className="px-4 py-8 max-w-4xl">
      <div className="mb-6">
        <h2 className="text-3xl font-bold text-gray-900 mb-2">Policy Upload</h2>
        <p className="text-gray-600">
          Upload your policy document and provide guidance for AI generation.
        </p>
      </div>

      <div className="bg-white border border-gray-200 rounded-2xl p-8 shadow-sm space-y-6">
        {/* File Upload */}
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-3">
            Policy PDF Document <span className="text-xs text-gray-500 font-normal">(optional)</span>
          </label>
          <div className="relative">
            <input
              type="file"
              accept="application/pdf"
              onChange={handleFileUpload}
              className="w-full rounded-xl border-2 border-dashed border-gray-300 bg-gray-50 px-6 py-8 text-sm font-medium text-gray-600 hover:border-primary-400 focus:outline-none focus:border-primary-500 cursor-pointer file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-primary-50 file:text-primary-700 hover:file:bg-primary-100"
            />
          </div>
          {policyFile ? (
            <div className="mt-3 flex items-center gap-2 text-sm">
              <span className="inline-flex items-center gap-1 px-3 py-1 rounded-lg bg-green-50 text-green-700 font-medium">
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                  <path
                    fillRule="evenodd"
                    d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                    clipRule="evenodd"
                  />
                </svg>
                {policyFile.name}
              </span>
            </div>
          ) : (
            <p className="text-xs text-gray-500 mt-2">
              Optional: attach a PDF learners can download from the module.
            </p>
          )}
        </div>

        {/* Policy Text */}
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-3">
            Policy Text Content
            <span className="text-red-500 ml-1">*</span>
          </label>
          <textarea
            value={policyText}
            onChange={(e) => onPolicyTextChange(e.target.value)}
            rows={8}
            className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm text-gray-800 focus:border-primary-500 focus:ring-2 focus:ring-primary-200 transition"
            placeholder="Paste the full policy content here. This text will be used by AI to generate lyrics and reminder phrases. The PDF above is for learner reference only."
          />
          <p className="text-xs text-gray-500 mt-2">
            {policyText.length} characters • AI will analyze this text to create content
          </p>
        </div>

        {/* Emphasis Prompt */}
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-3">
            What Should the AI Emphasize? <span className="text-xs text-gray-500 font-normal">(optional)</span>
          </label>
          <textarea
            value={emphasisPrompt}
            onChange={(e) => onEmphasisPromptChange(e.target.value)}
            rows={4}
            className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm text-gray-800 focus:border-primary-500 focus:ring-2 focus:ring-primary-200 transition"
            placeholder="Example: Reporting deadlines, HIPAA breach penalties, privacy hotline number..."
          />
          <p className="text-xs text-gray-500 mt-2">
            Provide guidance to help AI stay focused. Leave blank for a general summary-based song.
          </p>
        </div>

        {/* Upload History Section */}
        <div className="pt-6 border-t border-gray-200">
          <h3 className="text-sm font-semibold text-gray-700 mb-3">Recent Uploads</h3>
          <div className="text-sm text-gray-500">
            No recent uploads to display.
          </div>
        </div>
      </div>

      {/* Next Step Button */}
      {onNext && (
        <div className="mt-6 flex items-center justify-between bg-blue-50 border border-blue-200 rounded-xl p-4">
          <div>
            <p className="text-sm font-semibold text-gray-900">
              {isComplete ? 'Ready to generate lyrics!' : 'Paste the policy content to continue'}
            </p>
            <p className="text-xs text-gray-600 mt-1">
              Your policy information will be saved automatically
            </p>
          </div>
          <button
            onClick={onNext}
            disabled={!isComplete}
            className="bg-gradient-to-r from-primary-600 to-primary-700 text-white font-bold px-8 py-3 rounded-xl shadow hover:shadow-lg transition disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Next: Generate Lyrics →
          </button>
        </div>
      )}
    </div>
  );
}
