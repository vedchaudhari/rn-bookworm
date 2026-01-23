// backend/src/utils/dbCleanup.ts
import mongoose from 'mongoose';
import BookshelfItem from '../models/BookshelfItem';
import BookNote from '../models/BookNote';

/**
 * DB CLEANUP UTILITY
 * 
 * Scans collections for duplicate records that violate unique constraints
 * (e.g., same book on same user's shelf) and removes them.
 */
export const runDataCleanup = async () => {
    console.log('🚀 Starting Database Integrity Scan...');

    try {
        // 1. Clean BookshelfItem Duplicates (Same User & Same Book)
        const bookshelfDuplicates = await BookshelfItem.aggregate([
            {
                $group: {
                    _id: { userId: '$userId', bookId: '$bookId' },
                    duplicates: { $push: '$_id' },
                    count: { $sum: 1 }
                }
            },
            { $match: { count: { $gt: 1 } } }
        ]);

        console.log(`🔍 Found ${bookshelfDuplicates.length} bookshelf duplicate sets.`);

        for (const item of bookshelfDuplicates) {
            const [keep, ...remove] = item.duplicates;
            console.log(`   - Removing ${remove.length} duplicates for User: ${item._id.userId}, Book: ${item._id.bookId}`);
            await BookshelfItem.deleteMany({ _id: { $in: remove } });
        }

        // 2. Clear out any null/undefined IDs that might have caused collisions
        const orphanBookshelf = await BookshelfItem.deleteMany({
            $or: [{ userId: null }, { bookId: null }]
        });
        if (orphanBookshelf.deletedCount > 0) {
            console.log(`🗑️ Deleted ${orphanBookshelf.deletedCount} orphan bookshelf items.`);
        }

        // 3. Sync Indexes
        console.log('🔄 Syncing Database Indexes...');
        await BookshelfItem.syncIndexes();
        await BookNote.syncIndexes();

        console.log('✅ Database Integrity Scan Completed Successfully.');
        return {
            success: true,
            bookshelfCleaned: bookshelfDuplicates.length,
            orphansRemoved: orphanBookshelf.deletedCount
        };
    } catch (error) {
        console.error('❌ Database Cleanup Failed:', error);
        throw error;
    }
};
