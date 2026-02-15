import mongoose, { Document, Schema, Model } from 'mongoose';

export interface IClub {
    name: string;
    description: string;
    image: string;
    createdBy: mongoose.Types.ObjectId;
    isPrivate: boolean;
    memberCount: number;
    lastActiveAt: Date;
    tags: string[];
}

export interface IClubDocument extends IClub, Document {
    _id: mongoose.Types.ObjectId;
    createdAt: Date;
    updatedAt: Date;
}

const clubSchema = new Schema<IClubDocument>(
    {
        name: {
            type: String,
            required: true,
            trim: true,
            maxlength: 50
        },
        description: {
            type: String,
            default: '',
            maxlength: 500
        },
        image: {
            type: String,
            default: ''
        },
        createdBy: {
            type: Schema.Types.ObjectId,
            ref: 'User',
            required: true
        },
        isPrivate: {
            type: Boolean,
            default: false
        },
        memberCount: {
            type: Number,
            default: 1
        },
        lastActiveAt: {
            type: Date,
            default: Date.now
        },
        tags: [{
            type: String,
            trim: true
        }]
    },
    { timestamps: true }
);

// Indexes
clubSchema.index({ name: 'text', description: 'text', tags: 'text' });
clubSchema.index({ lastActiveAt: -1 });

const Club = mongoose.model<IClubDocument>('Club', clubSchema);

export default Club;
