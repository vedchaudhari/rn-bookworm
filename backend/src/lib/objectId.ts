import mongoose from 'mongoose';

/**
 * Safely converts a value to a Mongoose ObjectId.
 * Throws INVALID_ID_FORMAT if the input is not a valid 24-character hex string.
 */
export function toObjectId(id: string | mongoose.Types.ObjectId | any): mongoose.Types.ObjectId {
    if (!id) {
        throw new Error('INVALID_ID_FORMAT');
    }

    if (id instanceof mongoose.Types.ObjectId) {
        return id;
    }

    const idStr = id.toString();
    // Validates that it's a 24-character hex string
    if (idStr.length === 24 && /^[0-9a-fA-F]{24}$/.test(idStr)) {
        return new mongoose.Types.ObjectId(idStr);
    }

    console.error(`[ObjectId Utility] Invalid ID format: "${idStr}" (type: ${typeof id})`);
    throw new Error('INVALID_ID_FORMAT');
}
