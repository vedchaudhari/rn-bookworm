import mongoose, { Document, Schema } from 'mongoose';

export type ReportEntityType = 'post' | 'user' | 'comment';
export type ReportStatus = 'pending' | 'reviewing' | 'resolved' | 'dismissed';
export type ReportReason =
    | 'spam'
    | 'harassment'
    | 'inappropriate_content'
    | 'misinformation'
    | 'copyright'
    | 'other';

export interface IReport {
    reporterId: mongoose.Types.ObjectId;
    reportedEntityId: mongoose.Types.ObjectId;
    entityType: ReportEntityType;
    reason: ReportReason;
    details?: string;
    status: ReportStatus;
    reviewedBy?: mongoose.Types.ObjectId;
    reviewedAt?: Date;
    resolution?: string;
}

export interface IReportDocument extends IReport, Document {
    _id: mongoose.Types.ObjectId;
    createdAt: Date;
    updatedAt: Date;
}

const reportSchema = new Schema<IReportDocument>(
    {
        reporterId: {
            type: Schema.Types.ObjectId,
            ref: 'User',
            required: true,
            index: true
        },
        reportedEntityId: {
            type: Schema.Types.ObjectId,
            required: true,
            index: true
        },
        entityType: {
            type: String,
            enum: ['post', 'user', 'comment'],
            required: true
        },
        reason: {
            type: String,
            enum: ['spam', 'harassment', 'inappropriate_content', 'misinformation', 'copyright', 'other'],
            required: true
        },
        details: {
            type: String,
            maxlength: 500
        },
        status: {
            type: String,
            enum: ['pending', 'reviewing', 'resolved', 'dismissed'],
            default: 'pending',
            index: true
        },
        reviewedBy: {
            type: Schema.Types.ObjectId,
            ref: 'User'
        },
        reviewedAt: {
            type: Date
        },
        resolution: {
            type: String,
            maxlength: 500
        }
    },
    { timestamps: true }
);

// Compound index for finding reports by entity
reportSchema.index({ reportedEntityId: 1, entityType: 1 });

// Index for admin queries
reportSchema.index({ status: 1, createdAt: -1 });

const Report = mongoose.model<IReportDocument>('Report', reportSchema);

export default Report;
