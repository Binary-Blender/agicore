import { S3Client, PutObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';

const region = process.env.AWS_REGION;
const bucket = process.env.AWS_S3_BUCKET;

if (!bucket) {
  console.warn('AWS_S3_BUCKET is not defined. Policy uploads will fail until it is configured.');
}

export const s3Client = new S3Client({
  region,
  credentials: process.env.AWS_ACCESS_KEY_ID && process.env.AWS_SECRET_ACCESS_KEY
    ? {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY
      }
    : undefined
});

export const uploadBufferToS3 = async (buffer: Buffer, key: string, contentType: string) => {
  if (!bucket) throw new Error('AWS_S3_BUCKET is not configured');

  const command = new PutObjectCommand({
    Bucket: bucket,
    Key: key,
    Body: buffer,
    ContentType: contentType,
    ACL: 'public-read'
  });

  await s3Client.send(command);
};

export const deleteObjectFromS3 = async (key?: string | null) => {
  if (!bucket || !key) return;

  const command = new DeleteObjectCommand({
    Bucket: bucket,
    Key: key
  });

  try {
    await s3Client.send(command);
  } catch (error) {
    console.warn('Failed to delete S3 object', { key, error });
  }
};

const trimmedCdn = process.env.CLOUDFRONT_URL?.replace(/\/$/, '');
const s3Base = bucket && region ? `https://${bucket}.s3.${region}.amazonaws.com` : undefined;

export const getPublicUrlForKey = (key: string) => {
  const base = process.env.CLOUDFRONT_URL
    ? trimmedCdn
    : s3Base;

  return `${base}/${key}`;
};

export const extractKeyFromUrl = (url?: string | null) => {
  if (!url) return null;
  const sanitized = url.split('?')[0];

  if (trimmedCdn && sanitized.startsWith(trimmedCdn)) {
    return sanitized.substring(trimmedCdn.length + 1);
  }

  if (s3Base && sanitized.startsWith(s3Base)) {
    return sanitized.substring(s3Base.length + 1);
  }

  return null;
};
