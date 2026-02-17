import { getSignedUrlForFile } from "./s3";

/**
 * Helper to sign all media in a message object (images, videos, profile images)
 * This is crucial for private S3 buckets where URLs expire.
 * @param msgObj The message object (can be a Mongoose document or a plain object)
 * @returns The message object with signed URLs
 */
export const signMessageMedia = async (msgObj: any) => {
    // Handle the case where msgObj might be a Mongoose document
    const target = typeof msgObj.toObject === 'function' ? msgObj.toObject() : msgObj;

    if (target.sender && typeof target.sender === 'object') {
        target.sender.profileImage = await getSignedUrlForFile(target.sender.profileImage);
    }
    if (target.receiver && typeof target.receiver === 'object') {
        target.receiver.profileImage = await getSignedUrlForFile(target.receiver.profileImage);
    }
    if (target.image) {
        target.image = await getSignedUrlForFile(target.image);
    }
    if (target.video) {
        target.video = await getSignedUrlForFile(target.video);
    }
    if (target.videoThumbnail) {
        target.videoThumbnail = await getSignedUrlForFile(target.videoThumbnail);
    }

    // Handle book info if present
    if (target.book && target.book.image) {
        target.book.image = await getSignedUrlForFile(target.book.image);
    }

    // Handle replyTo media if present
    if (target.replyTo && typeof target.replyTo === 'object') {
        await signMessageMedia(target.replyTo);
    }

    return target;
};
