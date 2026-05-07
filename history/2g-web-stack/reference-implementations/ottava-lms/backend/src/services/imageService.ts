import { getOpenAIClient } from './openaiService';

export interface ImageGenerationOptions {
  prompt: string;
  negativePrompt?: string;
  size?: '1024x1024' | '1024x1792' | '1792x1024';
  quality?: 'standard' | 'hd';
  style?: 'vivid' | 'natural';
  user?: string;
}

export interface ImageGenerationResult {
  buffer: Buffer;
  mimeType: string;
  providerMetadata: Record<string, any>;
}

const defaultImageModel = process.env.OPENAI_IMAGE_MODEL || 'dall-e-3';

export const generateImageFromPrompt = async (
  options: ImageGenerationOptions
): Promise<ImageGenerationResult> => {
  const client = getOpenAIClient();
  const model = defaultImageModel;
  const compositePrompt = options.negativePrompt
    ? `${options.prompt.trim()}\n\nAvoid: ${options.negativePrompt.trim()}`
    : options.prompt.trim();

  // Build request params - only include style for dall-e-3
  const requestParams: any = {
    model,
    prompt: compositePrompt,
    size: options.size || '1024x1024',
    quality: options.quality || 'standard',
    response_format: 'b64_json',
    user: options.user,
  };

  // Style parameter only supported by dall-e-3
  if (model === 'dall-e-3' && options.style) {
    requestParams.style = options.style;
  }

  const response = await client.images.generate(requestParams);

  const imageData = response.data?.[0];
  if (!imageData?.b64_json) {
    throw new Error('Image generation did not return binary data.');
  }

  const buffer = Buffer.from(imageData.b64_json, 'base64');
  const mimeType = 'image/png';

  return {
    buffer,
    mimeType,
    providerMetadata: {
      model,
      size: options.size || '1024x1024',
      revised_prompt: imageData?.revised_prompt,
      quality: options.quality || 'standard',
      style: options.style || 'vivid',
    },
  };
};
