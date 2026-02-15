import mongoose, { Document, Schema } from 'mongoose';

export interface IClubMember {
    clubId: mongoose.Types.ObjectId;
    userId: mongoose.Types.ObjectId;
    role: 'admin' | 'moderator' | 'member';
    joinedAt: Date;
}

export interface IClubMemberDocument extends IClubMember, Document {
    _id: mongoose.Types.ObjectId;
}

const clubMemberSchema = new Schema<IClubMemberDocument>(
    {
        clubId: {
            type: Schema.Types.ObjectId,
            ref: 'Club',
            required: true
        },
        userId: {
            type: Schema.Types.ObjectId,
            ref: 'User',
            required: true
        },
        role: {
            type: String,
            enum: ['admin', 'moderator', 'member'],
            default: 'member'
        },
        joinedAt: {
            type: Date,
            default: Date.now
        }
    },
    { timestamps: false } // No need for update timestamps usually
);

// Compound index to prevent duplicate membership and allow fast lookups
clubMemberSchema.index({ clubId: 1, userId: 1 }, { unique: true });
clubMemberSchema.index({ userId: 1 }); // To find user's clubs

const ClubMember = mongoose.model<IClubMemberDocument>('ClubMember', clubMemberSchema);

export default ClubMember;
