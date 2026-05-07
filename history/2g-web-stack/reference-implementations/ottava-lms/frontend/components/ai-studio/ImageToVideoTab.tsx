'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { visualAssetsAPI } from '@/lib/api';

interface VisualAsset {
  id: string;
  asset_type: string;
  public_url: string;
  prompt: string;
  source_reminder_phrase?: string;
  status: string;
  parent_asset_id?: string;
  job_id?: string;
  provider_metadata?: any;
  created_at: string;
}

interface ImageToVideoTabProps {
  selectedModuleId: string | null;
  onShowToast: (type: 'success' | 'error' | 'warning', message: string) => void;
}

export default function ImageToVideoTab({
  selectedModuleId,
  onShowToast,
}: ImageToVideoTabProps) {
  const [approvedImages, setApprovedImages] = useState<VisualAsset[]>([]);
  const [selectedImage, setSelectedImage] = useState<VisualAsset | null>(null);
  const [loadingImages, setLoadingImages] = useState(false);

  // Video configuration
  const [animationPrompt, setAnimationPrompt] = useState('');
  const [resolution, setResolution] = useState('720p');
  const [videoLength, setVideoLength] = useState(5);

  // Video generation state
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedVideos, setGeneratedVideos] = useState<VisualAsset[]>([]);
  const [loadingVideos, setLoadingVideos] = useState(false);
  const [pendingJobs, setPendingJobs] = useState<Map<string, VisualAsset>>(new Map());

  const pollingRef = useRef<NodeJS.Timeout | null>(null);

  const apiBase = process.env.NEXT_PUBLIC_API_URL || '';

  const resolveAssetUrl = useCallback(
    (input?: string | null) => {
      if (!input) return '';
      if (/^https?:\/\//i.test(input)) return input;
      return `${apiBase}${input}`;
    },
    [apiBase]
  );

  // Load approved images
  const loadImages = useCallback(async () => {
    if (!selectedModuleId) {
      setApprovedImages([]);
      return;
    }
    setLoadingImages(true);
    try {
      const response = await visualAssetsAPI.list({
        training_module_id: selectedModuleId,
        asset_type: 'image',
        status: 'approved',
      });
      setApprovedImages(response?.visual_assets || []);
    } catch (error: any) {
      console.error('Failed to load images', error);
    } finally {
      setLoadingImages(false);
    }
  }, [selectedModuleId]);

  // Load generated videos
  const loadVideos = useCallback(async () => {
    if (!selectedModuleId) {
      setGeneratedVideos([]);
      return;
    }
    setLoadingVideos(true);
    try {
      const response = await visualAssetsAPI.list({
        training_module_id: selectedModuleId,
        asset_type: 'video',
      });
      const videos = response?.visual_assets || [];
      setGeneratedVideos(videos);

      // Track processing jobs for polling
      const processing = new Map<string, VisualAsset>();
      videos.forEach((v: VisualAsset) => {
        if (v.status === 'processing' && v.job_id) {
          processing.set(v.id, v);
        }
      });
      setPendingJobs(processing);
    } catch (error: any) {
      console.error('Failed to load videos', error);
    } finally {
      setLoadingVideos(false);
    }
  }, [selectedModuleId]);

  useEffect(() => {
    loadImages();
    loadVideos();
  }, [loadImages, loadVideos]);

  // Poll for pending job status
  useEffect(() => {
    if (pendingJobs.size === 0) {
      if (pollingRef.current) {
        clearInterval(pollingRef.current);
        pollingRef.current = null;
      }
      return;
    }

    const pollJobs = async () => {
      const updatedJobs = new Map(pendingJobs);
      let hasChanges = false;

      for (const [assetId] of pendingJobs) {
        try {
          const status = await visualAssetsAPI.getVideoStatus(assetId);
          if (status.status === 'completed' || status.status === 'failed') {
            updatedJobs.delete(assetId);
            hasChanges = true;

            if (status.status === 'completed') {
              onShowToast('success', 'Video generation completed!');
            } else {
              onShowToast('error', `Video generation failed: ${status.error || 'Unknown error'}`);
            }
          }
        } catch (error) {
          console.error('Failed to poll job status', error);
        }
      }

      if (hasChanges) {
        setPendingJobs(updatedJobs);
        loadVideos();
      }
    };

    pollingRef.current = setInterval(pollJobs, 10000); // Poll every 10 seconds

    return () => {
      if (pollingRef.current) {
        clearInterval(pollingRef.current);
      }
    };
  }, [pendingJobs, loadVideos, onShowToast]);

  // Suggest animation prompt
  const suggestAnimationPrompt = () => {
    if (!selectedImage) return;

    const suggestions = [
      'Camera slowly pans across the scene from left to right',
      'Gentle zoom into the main subject with soft focus transition',
      'Subtle movement with floating particles effect',
      'Professional training video with smooth motion blur',
      'Ken Burns effect with slow zoom and pan',
      'Slow dolly shot moving towards the subject',
      'Ambient lighting changes creating depth',
    ];

    setAnimationPrompt(suggestions[Math.floor(Math.random() * suggestions.length)]);
  };

  // Generate video from selected image
  const handleGenerateVideo = async () => {
    if (!selectedImage) {
      onShowToast('error', 'Please select an image first.');
      return;
    }
    if (!animationPrompt.trim()) {
      onShowToast('error', 'Please enter an animation prompt.');
      return;
    }

    setIsGenerating(true);
    try {
      const response = await visualAssetsAPI.generateVideo({
        source_image_id: selectedImage.id,
        animation_prompt: animationPrompt.trim(),
        duration: videoLength,
        resolution: resolution,
      });

      onShowToast('success', 'Video generation started! This may take 1-3 minutes.');

      // Add to pending jobs for polling
      if (response.visual_asset) {
        setPendingJobs((prev) => new Map(prev).set(response.visual_asset.id, response.visual_asset));
        setGeneratedVideos((prev) => [response.visual_asset, ...prev]);
      }

      // Reset form
      setAnimationPrompt('');
      setSelectedImage(null);
    } catch (error: any) {
      console.error('Video generation failed', error);
      onShowToast(
        'error',
        error?.response?.data?.error || 'Failed to start video generation. Please try again.'
      );
    } finally {
      setIsGenerating(false);
    }
  };

  // Handle approve/reject
  const handleApprove = async (assetId: string) => {
    try {
      await visualAssetsAPI.approve(assetId);
      onShowToast('success', 'Video approved.');
      setGeneratedVideos((prev) =>
        prev.map((v) => (v.id === assetId ? { ...v, status: 'approved' } : v))
      );
    } catch (error: any) {
      onShowToast('error', error?.response?.data?.error || 'Failed to approve video.');
    }
  };

  const handleReject = async (assetId: string) => {
    try {
      await visualAssetsAPI.reject(assetId);
      onShowToast('success', 'Video rejected.');
      setGeneratedVideos((prev) => prev.filter((v) => v.id !== assetId));
    } catch (error: any) {
      onShowToast('error', error?.response?.data?.error || 'Failed to reject video.');
    }
  };

  const handleDelete = async (assetId: string) => {
    if (!confirm('Remove this video permanently?')) return;
    try {
      await visualAssetsAPI.remove(assetId);
      onShowToast('success', 'Video removed.');
      setGeneratedVideos((prev) => prev.filter((v) => v.id !== assetId));
      setPendingJobs((prev) => {
        const updated = new Map(prev);
        updated.delete(assetId);
        return updated;
      });
    } catch (error: any) {
      onShowToast('error', error?.response?.data?.error || 'Failed to remove video.');
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'processing':
        return (
          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-yellow-100 text-yellow-800">
            <svg className="animate-spin -ml-0.5 mr-1.5 h-3 w-3" fill="none" viewBox="0 0 24 24">
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
              />
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
              />
            </svg>
            Processing
          </span>
        );
      case 'completed':
      case 'pending':
        return (
          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-blue-100 text-blue-800">
            Pending QC
          </span>
        );
      case 'approved':
        return (
          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-green-100 text-green-800">
            Approved
          </span>
        );
      case 'rejected':
        return (
          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-red-100 text-red-800">
            Rejected
          </span>
        );
      case 'failed':
        return (
          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-red-100 text-red-800">
            Failed
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-gray-100 text-gray-800">
            {status}
          </span>
        );
    }
  };

  return (
    <div className="px-4 py-8 max-w-6xl">
      <div className="mb-6">
        <h2 className="text-3xl font-bold text-gray-900">Image to Video</h2>
        <p className="text-gray-600">
          Transform your approved images into animated videos. Select an image, describe the motion,
          and generate professional training videos.
        </p>
      </div>

      {!selectedModuleId && (
        <div className="mb-6 p-4 bg-yellow-50 border border-yellow-200 rounded-xl text-yellow-800 text-sm">
          Please select a training module first to view approved images.
        </div>
      )}

      {pendingJobs.size > 0 && (
        <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-xl text-blue-800">
          <div className="flex items-center">
            <svg className="animate-spin mr-2 h-5 w-5" fill="none" viewBox="0 0 24 24">
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
              />
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
              />
            </svg>
            <span className="font-semibold">
              {pendingJobs.size} video{pendingJobs.size > 1 ? 's' : ''} processing...
            </span>
          </div>
          <p className="text-sm mt-1">
            Video generation typically takes 1-3 minutes. Status updates automatically.
          </p>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Column 1: Image Selection */}
        <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">Approved Images</h3>
            <button
              type="button"
              onClick={loadImages}
              disabled={loadingImages}
              className="text-xs text-primary-600 hover:text-primary-800"
            >
              {loadingImages ? 'Loading...' : 'Refresh'}
            </button>
          </div>

          {loadingImages ? (
            <p className="text-sm text-gray-500">Loading images...</p>
          ) : approvedImages.length === 0 ? (
            <p className="text-sm text-gray-500">
              No approved images available. Generate and approve images in the Image Generation tab
              first.
            </p>
          ) : (
            <div className="space-y-3 max-h-[500px] overflow-y-auto">
              {approvedImages.map((image) => (
                <button
                  key={image.id}
                  type="button"
                  onClick={() => setSelectedImage(image)}
                  className={`block w-full text-left rounded-xl border p-2 transition ${
                    selectedImage?.id === image.id
                      ? 'border-primary-500 bg-primary-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <img
                    src={resolveAssetUrl(image.public_url)}
                    alt={image.source_reminder_phrase || 'Image'}
                    className="w-full rounded-lg mb-2"
                  />
                  <p className="text-xs text-gray-700 truncate">
                    {image.source_reminder_phrase || 'No phrase'}
                  </p>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Column 2: Video Configuration */}
        <div className="space-y-6">
          <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Animation Settings</h3>

            {selectedImage ? (
              <div className="mb-4 p-3 bg-gray-50 rounded-lg">
                <p className="text-xs font-semibold text-gray-600">Selected Image:</p>
                <p className="text-sm text-gray-800 truncate">
                  {selectedImage.source_reminder_phrase || 'Unnamed image'}
                </p>
              </div>
            ) : (
              <div className="mb-4 p-3 bg-gray-50 rounded-lg text-sm text-gray-500">
                Select an image from the left panel
              </div>
            )}

            <div className="space-y-4">
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs font-semibold text-gray-600">Animation Prompt</label>
                  <button
                    type="button"
                    onClick={suggestAnimationPrompt}
                    className="text-xs text-primary-600 hover:underline"
                    disabled={!selectedImage}
                  >
                    Suggest
                  </button>
                </div>
                <textarea
                  value={animationPrompt}
                  onChange={(e) => setAnimationPrompt(e.target.value)}
                  placeholder="Describe how the image should animate (e.g., 'Camera slowly pans across the scene')"
                  className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm"
                  rows={4}
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">Resolution</label>
                <select
                  value={resolution}
                  onChange={(e) => setResolution(e.target.value)}
                  className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm"
                >
                  <option value="720p">720p HD</option>
                  <option value="1080p">1080p Full HD</option>
                  <option value="4k">4K Ultra HD</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">
                  Video Length
                </label>
                <select
                  value={videoLength}
                  onChange={(e) => setVideoLength(Number(e.target.value))}
                  className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm"
                >
                  <option value={5}>5 seconds</option>
                  <option value={10}>10 seconds</option>
                </select>
              </div>
            </div>

            <button
              type="button"
              onClick={handleGenerateVideo}
              disabled={isGenerating || !selectedImage || !animationPrompt.trim()}
              className="mt-6 w-full inline-flex items-center justify-center rounded-xl bg-gradient-to-r from-purple-600 to-purple-700 px-4 py-3 text-sm font-semibold text-white shadow hover:from-purple-700 hover:to-purple-800 disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {isGenerating ? (
                <>
                  <svg
                    className="animate-spin -ml-1 mr-2 h-4 w-4"
                    fill="none"
                    viewBox="0 0 24 24"
                  >
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                    />
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                    />
                  </svg>
                  Starting Generation...
                </>
              ) : (
                'Generate Video'
              )}
            </button>

            <p className="mt-2 text-xs text-gray-500 text-center">
              Generation typically takes 1-3 minutes
            </p>
          </div>
        </div>

        {/* Column 3: Generated Videos */}
        <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">
              Generated Videos ({generatedVideos.length})
            </h3>
            <button
              type="button"
              onClick={loadVideos}
              disabled={loadingVideos}
              className="text-xs text-primary-600 hover:text-primary-800"
            >
              {loadingVideos ? 'Loading...' : 'Refresh'}
            </button>
          </div>

          {generatedVideos.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              <div className="mb-4">
                <svg
                  className="mx-auto h-12 w-12 text-gray-400"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={1.5}
                    d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z"
                  />
                </svg>
              </div>
              <p className="text-sm font-medium">No videos generated yet</p>
              <p className="text-xs mt-1">
                Select an approved image and configure animation settings to generate videos.
              </p>
            </div>
          ) : (
            <div className="space-y-4 max-h-[600px] overflow-y-auto">
              {generatedVideos.map((video) => (
                <div key={video.id} className="border border-gray-200 rounded-xl p-4">
                  {video.status === 'processing' ? (
                    <div className="aspect-video bg-gray-100 rounded-lg mb-3 flex items-center justify-center">
                      <div className="text-center">
                        <svg
                          className="animate-spin mx-auto h-8 w-8 text-purple-600 mb-2"
                          fill="none"
                          viewBox="0 0 24 24"
                        >
                          <circle
                            className="opacity-25"
                            cx="12"
                            cy="12"
                            r="10"
                            stroke="currentColor"
                            strokeWidth="4"
                          />
                          <path
                            className="opacity-75"
                            fill="currentColor"
                            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                          />
                        </svg>
                        <p className="text-sm text-gray-600">Generating video...</p>
                      </div>
                    </div>
                  ) : video.public_url ? (
                    <video
                      src={resolveAssetUrl(video.public_url)}
                      controls
                      className="w-full rounded-lg mb-3"
                    />
                  ) : (
                    <div className="aspect-video bg-gray-100 rounded-lg mb-3 flex items-center justify-center">
                      <p className="text-sm text-gray-500">Video not available</p>
                    </div>
                  )}

                  <div className="space-y-1 text-xs">
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-gray-600">Status:</span>
                      {getStatusBadge(video.status)}
                    </div>
                    {video.source_reminder_phrase && (
                      <p className="text-gray-700">
                        <span className="font-semibold">Source:</span>{' '}
                        {video.source_reminder_phrase}
                      </p>
                    )}
                    {video.prompt && (
                      <p className="text-gray-500 truncate">
                        <span className="font-semibold">Animation:</span> {video.prompt}
                      </p>
                    )}
                  </div>

                  <div className="mt-3 flex flex-wrap gap-2">
                    {(video.status === 'pending' || video.status === 'completed') && (
                      <>
                        <button
                          type="button"
                          onClick={() => handleApprove(video.id)}
                          className="text-xs px-3 py-1.5 rounded-lg bg-green-600 text-white hover:bg-green-700"
                        >
                          Approve
                        </button>
                        <button
                          type="button"
                          onClick={() => handleReject(video.id)}
                          className="text-xs px-3 py-1.5 rounded-lg bg-red-600 text-white hover:bg-red-700"
                        >
                          Reject
                        </button>
                      </>
                    )}
                    {video.public_url && video.status !== 'processing' && (
                      <a
                        href={resolveAssetUrl(video.public_url)}
                        target="_blank"
                        rel="noreferrer"
                        className="text-xs px-3 py-1.5 rounded-lg border border-gray-200 text-primary-600 hover:border-primary-400"
                      >
                        View Full
                      </a>
                    )}
                    <button
                      type="button"
                      onClick={() => handleDelete(video.id)}
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
  );
}
