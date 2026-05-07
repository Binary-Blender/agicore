'use client';

import { useCallback, useEffect, useState } from 'react';
import { visualAssetsAPI } from '@/lib/api';

interface VisualAsset {
  id: string;
  asset_type: string;
  public_url: string;
  prompt: string;
  negative_prompt?: string;
  source_reminder_phrase?: string;
  status: string;
  provider: string;
  provider_metadata?: any;
  quality_metrics?: any;
  width?: number;
  height?: number;
  created_at: string;
}

interface ImageGenerationTabProps {
  selectedModuleId: string | null;
  policyText: string;
  lyrics: string;
  reminderPhrases: string[];
  onShowToast: (type: 'success' | 'error' | 'warning', message: string) => void;
}

export default function ImageGenerationTab({
  selectedModuleId,
  policyText,
  lyrics,
  reminderPhrases,
  onShowToast,
}: ImageGenerationTabProps) {
  const [selectedPhrase, setSelectedPhrase] = useState('');
  const [generatedPrompt, setGeneratedPrompt] = useState('');
  const [negativePrompt, setNegativePrompt] = useState('');
  const [isGeneratingPrompt, setIsGeneratingPrompt] = useState(false);
  const [isGeneratingImage, setIsGeneratingImage] = useState(false);
  const [generatedImages, setGeneratedImages] = useState<VisualAsset[]>([]);
  const [loadingImages, setLoadingImages] = useState(false);

  // Configuration options
  const [imageSize, setImageSize] = useState('1024x1024');
  const [imageQuality, setImageQuality] = useState('standard');
  const [imageStyle, setImageStyle] = useState('vivid');

  const apiBase = process.env.NEXT_PUBLIC_API_URL || '';

  const resolveImageUrl = useCallback(
    (input?: string | null) => {
      if (!input) return '';
      if (/^https?:\/\//i.test(input)) return input;
      return `${apiBase}${input}`;
    },
    [apiBase]
  );

  // Load existing images for module
  const loadImages = useCallback(async () => {
    if (!selectedModuleId) {
      setGeneratedImages([]);
      return;
    }
    setLoadingImages(true);
    try {
      const response = await visualAssetsAPI.list({
        training_module_id: selectedModuleId,
        asset_type: 'image',
      });
      setGeneratedImages(response?.visual_assets || []);
    } catch (error: any) {
      console.error('Failed to load images', error);
    } finally {
      setLoadingImages(false);
    }
  }, [selectedModuleId]);

  useEffect(() => {
    loadImages();
  }, [loadImages]);

  // Generate image prompt from reminder phrase
  const handleGeneratePrompt = async () => {
    if (!selectedPhrase.trim()) {
      onShowToast('error', 'Please select or enter a reminder phrase first.');
      return;
    }

    setIsGeneratingPrompt(true);
    try {
      const response = await visualAssetsAPI.generatePrompt({
        training_module_id: selectedModuleId || undefined,
        reminder_phrase: selectedPhrase,
        policy_override: policyText || undefined,
        lyrics_override: lyrics || undefined,
      });

      setGeneratedPrompt(response.prompt || '');
      setNegativePrompt(response.negative_prompt || '');
      onShowToast('success', 'Image prompt generated! Review and adjust as needed.');
    } catch (error: any) {
      console.error('Prompt generation failed', error);
      onShowToast('error', error?.response?.data?.error || 'Failed to generate prompt.');
    } finally {
      setIsGeneratingPrompt(false);
    }
  };

  // Generate image from prompt
  const handleGenerateImage = async () => {
    if (!generatedPrompt.trim()) {
      onShowToast('error', 'Please generate or enter an image prompt first.');
      return;
    }

    if (!selectedModuleId) {
      onShowToast('error', 'Please select a training module first.');
      return;
    }

    setIsGeneratingImage(true);
    try {
      const response = await visualAssetsAPI.generateImage({
        training_module_id: selectedModuleId,
        reminder_phrase: selectedPhrase || 'Custom image',
        prompt: generatedPrompt,
        negative_prompt: negativePrompt || undefined,
        size: imageSize,
        quality: imageQuality,
        style: imageStyle,
      });

      onShowToast('success', 'Image generated successfully! It will appear in the gallery.');
      setGeneratedImages((prev) => [response.visual_asset, ...prev]);

      // Reset for next generation
      setSelectedPhrase('');
      setGeneratedPrompt('');
      setNegativePrompt('');
    } catch (error: any) {
      console.error('Image generation failed', error);
      onShowToast('error', error?.response?.data?.error || 'Failed to generate image.');
    } finally {
      setIsGeneratingImage(false);
    }
  };

  // Handle approve/reject
  const handleApprove = async (assetId: string) => {
    try {
      await visualAssetsAPI.approve(assetId);
      onShowToast('success', 'Image approved.');
      setGeneratedImages((prev) =>
        prev.map((img) => (img.id === assetId ? { ...img, status: 'approved' } : img))
      );
    } catch (error: any) {
      onShowToast('error', error?.response?.data?.error || 'Failed to approve image.');
    }
  };

  const handleReject = async (assetId: string) => {
    try {
      await visualAssetsAPI.reject(assetId);
      onShowToast('success', 'Image rejected.');
      setGeneratedImages((prev) => prev.filter((img) => img.id !== assetId));
    } catch (error: any) {
      onShowToast('error', error?.response?.data?.error || 'Failed to reject image.');
    }
  };

  const handleDelete = async (assetId: string) => {
    if (!confirm('Remove this image permanently?')) return;
    try {
      await visualAssetsAPI.remove(assetId);
      onShowToast('success', 'Image removed.');
      setGeneratedImages((prev) => prev.filter((img) => img.id !== assetId));
    } catch (error: any) {
      onShowToast('error', error?.response?.data?.error || 'Failed to remove image.');
    }
  };

  return (
    <div className="px-4 py-8 max-w-6xl">
      <div className="mb-6">
        <h2 className="text-3xl font-bold text-gray-900">Image Generation</h2>
        <p className="text-gray-600">
          Create visual reinforcements for your reminder phrases. Select a phrase, generate a
          contextual prompt using policy and lyrics context, then create professional training
          images.
        </p>
      </div>

      {!selectedModuleId && (
        <div className="mb-6 p-4 bg-yellow-50 border border-yellow-200 rounded-xl text-yellow-800 text-sm">
          Please select a training module first to generate and manage images.
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Left Column: Generation Controls */}
        <div className="space-y-6">
          {/* Step 1: Select Reminder Phrase */}
          <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              Step 1: Select Reminder Phrase
            </h3>

            {reminderPhrases.filter((p) => p.trim()).length > 0 ? (
              <div className="space-y-2 mb-4 max-h-40 overflow-y-auto">
                {reminderPhrases
                  .filter((p) => p.trim())
                  .map((phrase, index) => (
                    <button
                      key={index}
                      type="button"
                      onClick={() => setSelectedPhrase(phrase)}
                      className={`block w-full text-left px-3 py-2 rounded-lg text-sm transition ${
                        selectedPhrase === phrase
                          ? 'bg-primary-100 text-primary-800 border-2 border-primary-500'
                          : 'bg-gray-50 hover:bg-gray-100 text-gray-700 border border-gray-200'
                      }`}
                    >
                      {phrase}
                    </button>
                  ))}
              </div>
            ) : (
              <p className="text-sm text-gray-500 mb-4">
                No reminder phrases available. Add them in the Reminder Phrases tab first.
              </p>
            )}

            <textarea
              value={selectedPhrase}
              onChange={(e) => setSelectedPhrase(e.target.value)}
              placeholder="Or type a custom phrase to visualize..."
              className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm"
              rows={2}
            />
          </div>

          {/* Step 2: Generate & Edit Prompt */}
          <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              Step 2: Generate Image Prompt
            </h3>

            <button
              type="button"
              onClick={handleGeneratePrompt}
              disabled={isGeneratingPrompt || !selectedPhrase.trim()}
              className="mb-4 w-full inline-flex items-center justify-center rounded-xl bg-primary-600 px-4 py-3 text-sm font-semibold text-white shadow hover:bg-primary-700 disabled:opacity-60"
            >
              {isGeneratingPrompt ? 'Generating Prompt...' : 'Generate AI Prompt'}
            </button>

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">
                  Image Prompt
                </label>
                <textarea
                  value={generatedPrompt}
                  onChange={(e) => setGeneratedPrompt(e.target.value)}
                  placeholder="AI-generated prompt will appear here. You can edit it before generating the image."
                  className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm"
                  rows={5}
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">
                  Negative Prompt (optional)
                </label>
                <textarea
                  value={negativePrompt}
                  onChange={(e) => setNegativePrompt(e.target.value)}
                  placeholder="Elements to avoid (e.g., 'no text overlays, no watermarks')"
                  className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm"
                  rows={2}
                />
              </div>
            </div>
          </div>

          {/* Step 3: Configure & Generate */}
          <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Step 3: Generate Image</h3>

            <div className="grid grid-cols-3 gap-3 mb-4">
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">Size</label>
                <select
                  value={imageSize}
                  onChange={(e) => setImageSize(e.target.value)}
                  className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm"
                >
                  <option value="1024x1024">Square</option>
                  <option value="1792x1024">Landscape</option>
                  <option value="1024x1792">Portrait</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">Quality</label>
                <select
                  value={imageQuality}
                  onChange={(e) => setImageQuality(e.target.value)}
                  className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm"
                >
                  <option value="standard">Standard</option>
                  <option value="hd">HD</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">Style</label>
                <select
                  value={imageStyle}
                  onChange={(e) => setImageStyle(e.target.value)}
                  className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm"
                >
                  <option value="vivid">Vivid</option>
                  <option value="natural">Natural</option>
                </select>
              </div>
            </div>

            <button
              type="button"
              onClick={handleGenerateImage}
              disabled={isGeneratingImage || !generatedPrompt.trim() || !selectedModuleId}
              className="w-full inline-flex items-center justify-center rounded-xl bg-gradient-to-r from-green-600 to-green-700 px-4 py-3 text-sm font-semibold text-white shadow hover:from-green-700 hover:to-green-800 disabled:opacity-60"
            >
              {isGeneratingImage ? 'Generating Image (15-30s)...' : 'Generate Image'}
            </button>
          </div>
        </div>

        {/* Right Column: Generated Images Gallery */}
        <div>
          <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">
                Generated Images ({generatedImages.length})
              </h3>
              <button
                type="button"
                onClick={loadImages}
                disabled={loadingImages}
                className="text-sm text-primary-600 hover:text-primary-800"
              >
                {loadingImages ? 'Loading...' : 'Refresh'}
              </button>
            </div>

            {generatedImages.length === 0 ? (
              <div className="text-center py-12 text-gray-500">
                {selectedModuleId
                  ? 'No images generated yet. Start by selecting a reminder phrase.'
                  : 'Select a training module to view images.'}
              </div>
            ) : (
              <div className="space-y-4 max-h-[600px] overflow-y-auto">
                {generatedImages.map((image) => (
                  <div key={image.id} className="border border-gray-200 rounded-xl p-4">
                    <img
                      src={resolveImageUrl(image.public_url)}
                      alt={image.source_reminder_phrase || 'Generated image'}
                      className="w-full rounded-lg mb-3"
                    />
                    <div className="space-y-1 text-xs">
                      {image.source_reminder_phrase && (
                        <p className="text-gray-700">
                          <span className="font-semibold">Phrase:</span>{' '}
                          {image.source_reminder_phrase}
                        </p>
                      )}
                      <p className="text-gray-500">
                        <span className="font-semibold">Status:</span>{' '}
                        <span
                          className={`${
                            image.status === 'approved'
                              ? 'text-green-600'
                              : image.status === 'rejected'
                                ? 'text-red-600'
                                : 'text-yellow-600'
                          }`}
                        >
                          {image.status}
                        </span>
                      </p>
                      {image.width && image.height && (
                        <p className="text-gray-500">
                          <span className="font-semibold">Size:</span> {image.width}x{image.height}
                        </p>
                      )}
                      {image.quality_metrics?.generation_time_ms && (
                        <p className="text-gray-500">
                          <span className="font-semibold">Time:</span>{' '}
                          {(image.quality_metrics.generation_time_ms / 1000).toFixed(1)}s
                        </p>
                      )}
                    </div>
                    <div className="mt-3 flex flex-wrap gap-2">
                      {image.status === 'pending' && (
                        <>
                          <button
                            type="button"
                            onClick={() => handleApprove(image.id)}
                            className="text-xs px-3 py-1.5 rounded-lg bg-green-600 text-white hover:bg-green-700"
                          >
                            Approve
                          </button>
                          <button
                            type="button"
                            onClick={() => handleReject(image.id)}
                            className="text-xs px-3 py-1.5 rounded-lg bg-red-600 text-white hover:bg-red-700"
                          >
                            Reject
                          </button>
                        </>
                      )}
                      <a
                        href={resolveImageUrl(image.public_url)}
                        target="_blank"
                        rel="noreferrer"
                        className="text-xs px-3 py-1.5 rounded-lg border border-gray-200 text-primary-600 hover:border-primary-400"
                      >
                        View Full
                      </a>
                      <button
                        type="button"
                        onClick={() => handleDelete(image.id)}
                        className="text-xs px-3 py-1.5 rounded-lg border border-red-200 text-red-600 hover:border-red-400"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
