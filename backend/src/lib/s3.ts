import { S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { redis } from "./redis";
import fs from 'fs';

const s3Client = new S3Client({
    region: process.env.AWS_REGION || 'ap-south-1',
    credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID || '',
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || '',
    },
    // Prevent the SDK from adding checksums that React Native fetch cannot easily match
    // This resolves the 403 errors seen in production builds
    requestChecksumCalculation: "WHEN_REQUIRED",
    responseChecksumValidation: "WHEN_REQUIRED"
} as any);


/**
 * Check if S3 is properly configured
 */
export const isS3Configured = (): boolean => {
    return !!(
        process.env.AWS_REGION &&
        process.env.AWS_ACCESS_KEY_ID &&
        process.env.AWS_SECRET_ACCESS_KEY &&
        process.env.AWS_S3_BUCKET_NAME
    );
};

/**
 * Uploads a file to AWS S3 and returns the public URL
 * @param filePath Local path to the file
 * @param fileName Original filename or desired S3 filename
 * @param contentType File MIME type
 * @returns Public URL of the uploaded file
 */
export const uploadFileToS3 = async (filePath: string, fileName: string, contentType: string): Promise<string> => {
    const bucketName = process.env.AWS_S3_BUCKET_NAME;
    if (!bucketName) {
        throw new Error('AWS_S3_BUCKET_NAME is not defined in environment variables');
    }

    const fileStream = fs.createReadStream(filePath);
    const key = `pdfs/${Date.now()}-${fileName.replace(/\s+/g, '_')}`;

    const uploadParams = {
        Bucket: bucketName,
        Key: key,
        Body: fileStream,
        ContentType: contentType,
    };

    try {
        await s3Client.send(new PutObjectCommand(uploadParams));

        // Return the public URL
        return `https://${bucketName}.s3.${process.env.AWS_REGION || 'ap-south-1'}.amazonaws.com/${key}`;
    } catch (error) {
        console.error('Error uploading to S3:', error);
        throw error;
    }
};

/**
 * Generates a signed URL for a file in S3, with Redis caching
 * @param s3Url Full S3 URL (already stored in DB)
 * @param expiresIn Time in seconds until the URL expires
 * @returns Signed URL (either from cache or newly generated)
 */
export const getSignedUrlForFile = async (s3Url: string, expiresIn: number = 3600): Promise<string> => {
    if (!s3Url || !s3Url.includes('amazonaws.com')) {
        return s3Url; // Return as is if not an S3 URL
    }

    const bucketName = process.env.AWS_S3_BUCKET_NAME;
    if (!bucketName) throw new Error('AWS_S3_BUCKET_NAME is not defined');

    // Extract Key from S3 URL
    // e.g. https://bucket.s3.region.amazonaws.com/pdfs/123-file.pdf
    const urlParts = s3Url.split('.amazonaws.com/');
    if (urlParts.length < 2) return s3Url;

    // Strip any existing query params from the key (idempotency)
    const key = urlParts[1].split('?')[0];
    const cacheKey = `signed_url:${key}`;

    // 1. Check Redis Cache
    try {
        const cachedUrl = await redis.get<string>(cacheKey);
        if (cachedUrl) return cachedUrl;
    } catch (e) {
        console.error('Redis error in getSignedUrlForFile:', e);
    }

    // 2. Generate New Signed URL
    try {
        const command = new GetObjectCommand({
            Bucket: bucketName,
            Key: key,
        });

        // Generate URL that expires in 'expiresIn'
        const signedUrl = await getSignedUrl(s3Client, command, { expiresIn });

        // 3. Cache in Redis
        // Set TTL slightly less than expiration to be safe (e.g. 5 minutes buffer)
        const ttl = Math.max(expiresIn - 300, 60);
        try {
            await redis.set(cacheKey, signedUrl, { ex: ttl });
        } catch (e) {
            console.error('Redis set error in getSignedUrlForFile:', e);
        }

        return signedUrl;
    } catch (error) {
        console.error('Error generating signed URL:', error);
        return s3Url; // Fallback to raw URL on error
    }
};

/**
 * Generates a presigned URL for uploading a file to S3
 * @param fileName Desired filename
 * @param contentType File MIME type
 * @param folder S3 folder (e.g. 'chat', 'covers', 'profiles')
 * @returns Object containing the upload URL and the final destination URL
 */
export const getPresignedPutUrl = async (fileName: string, contentType: string, folder: string = 'chat'): Promise<{ uploadUrl: string; finalUrl: string }> => {
    const bucketName = process.env.AWS_S3_BUCKET_NAME;
    if (!bucketName) throw new Error('AWS_S3_BUCKET_NAME is not defined');

    const key = `${folder}/${Date.now()}-${fileName.replace(/[\s()]/g, '_')}`;

    const command = new PutObjectCommand({
        Bucket: bucketName,
        Key: key,
        ContentType: contentType,
    });

    try {
        // Explicitly sign the content-type header to prevent 403 mismatches
        const uploadUrl = await getSignedUrl(s3Client, command, {
            expiresIn: 600,
            signableHeaders: new Set(['content-type', 'host'])
        });
        const finalUrl = `https://${bucketName}.s3.${process.env.AWS_REGION || 'ap-south-1'}.amazonaws.com/${key}`;

        console.log("[S3] Generated Presigned URL for folder:", folder, { finalUrl });
        return { uploadUrl, finalUrl };
    } catch (error) {

        console.error('Error generating presigned PUT URL:', error);
        throw error;
    }
};

/**
 * Deletes a file from S3 given its full S3 URL or Key
 * @param s3UrlOrKey Full S3 URL or the S3 Key
 */
export const deleteFileFromS3 = async (s3UrlOrKey: string): Promise<void> => {
    if (!s3UrlOrKey) return;

    const bucketName = process.env.AWS_S3_BUCKET_NAME;
    if (!bucketName) throw new Error('AWS_S3_BUCKET_NAME is not defined');

    let key = s3UrlOrKey;

    // If it's a full URL, extract the key
    if (s3UrlOrKey.includes('.amazonaws.com/')) {
        // 1. Remove query parameters (for signed URLs)
        const baseUrl = s3UrlOrKey.split('?')[0];

        // 2. Get the path after the hostname
        const pathPart = baseUrl.split('.amazonaws.com/')[1];

        if (pathPart) {
            // 3. Handle path-style URLs: s3.region.amazonaws.com/bucket/key
            // If the first part of the path matches our bucket, remove it
            const parts = pathPart.split('/');
            if (parts[0] === bucketName) {
                key = parts.slice(1).join('/');
            } else {
                key = pathPart;
            }
        }
    }

    try {
        await s3Client.send(new DeleteObjectCommand({
            Bucket: bucketName,
            Key: key,
        }));

        // Also invalidate Redis cache for this key
        const cacheKey = `signed_url:${key}`;
        await redis.del(cacheKey);

        console.log(`Successfully deleted ${key} from S3 and cache`);
    } catch (error) {
        console.error('Error deleting from S3:', error);
        // We don't throw here as the main book deletion should still proceed
    }
};


export default s3Client;
