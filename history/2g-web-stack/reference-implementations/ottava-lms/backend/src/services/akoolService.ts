import axios from 'axios';

const AKOOL_API_KEY = process.env.AKOOL_API_KEY;
const AKOOL_API_URL = process.env.AKOOL_API_URL || 'https://api.akool.com/v1';

const ensureClient = () => {
  if (!AKOOL_API_KEY) {
    throw new Error('AKOOL_API_KEY is not configured. Set AKOOL_API_KEY before using Akool service.');
  }

  return axios.create({
    baseURL: AKOOL_API_URL,
    headers: {
      Authorization: `Bearer ${AKOOL_API_KEY}`,
      'Content-Type': 'application/json',
    },
    timeout: 30_000,
  });
};

export interface AkoolVideoRequest {
  image_url: string;
  prompt: string;
  duration: number;
  resolution: '720p' | '1080p' | '4k';
}

export interface AkoolVideoResponse {
  job_id: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  video_url?: string;
  progress_percent?: number;
  error?: string;
}

export const submitVideoJob = async (
  payload: AkoolVideoRequest
): Promise<AkoolVideoResponse> => {
  const client = ensureClient();
  const response = await client.post('/video-jobs', payload);
  return response.data;
};

export const getVideoJobStatus = async (jobId: string): Promise<AkoolVideoResponse> => {
  const client = ensureClient();
  const response = await client.get(`/video-jobs/${jobId}`);
  return response.data;
};

export const downloadVideo = async (
  videoUrl: string
): Promise<{ buffer: Buffer; contentType: string }> => {
  if (!AKOOL_API_KEY) {
    throw new Error('AKOOL_API_KEY is not configured.');
  }

  const response = await axios.get(videoUrl, {
    responseType: 'arraybuffer',
    timeout: 60_000,
    headers: {
      Authorization: `Bearer ${AKOOL_API_KEY}`,
    },
  });

  const contentType = response.headers['content-type'] || 'video/mp4';
  return {
    buffer: Buffer.from(response.data),
    contentType,
  };
};
