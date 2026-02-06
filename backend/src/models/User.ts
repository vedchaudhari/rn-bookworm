import mongoose, { Document, Schema, Model } from "mongoose";
import bcrypt from "bcryptjs";

export interface IUser {
    username: string;
    email: string;
    password?: string;
    profileImage: string;
    bio: string;
    level: number;
    points: number;
    currentStreak: number;
    longestStreak: number;
    lastActiveDate: Date;
    comparePassword(password: string): Promise<boolean>;
    inkDrops: number;
    inkDropTransactions: {
        amount: number;
        source: string;
        timestamp: Date;
    }[];
    blockedUsers: mongoose.Types.ObjectId[];

    // Author/Reader roles
    role: 'reader' | 'author' | 'admin';
    isVerifiedAuthor: boolean;
    isPro: boolean;
    subscriptionTier?: 'monthly' | 'yearly';
    subscriptionExpiry?: Date;
    isPrivate: boolean;
    expoPushToken?: string | null;
    notificationsEnabled: boolean;
}

export interface IUserDocument extends IUser, Document {
    _id: mongoose.Types.ObjectId;
    createdAt: Date;
    updatedAt: Date;
}

// Interface for the static methods (if any)
interface IUserModel extends Model<IUserDocument> { }

const userSchema = new Schema<IUserDocument>(
    {
        username: {
            type: String,
            required: true,
            unique: true,
        },
        email: {
            type: String,
            required: true,
            unique: true,
        },
        password: {
            type: String,
            required: true,
            minlength: 6,
            select: false,
        },
        profileImage: {
            type: String,
            default: "",
        },
        bio: {
            type: String,
            default: "",
            maxlength: 200,
        },
        level: {
            type: Number,
            default: 1,
        },
        points: {
            type: Number,
            default: 0,
        },
        currentStreak: {
            type: Number,
            default: 0,
        },
        longestStreak: {
            type: Number,
            default: 0,
        },
        lastActiveDate: {
            type: Date,
            default: Date.now,
        },
        inkDrops: {
            type: Number,
            default: 0,
        },
        inkDropTransactions: [
            {
                amount: { type: Number, required: true },
                source: { type: String, required: true },
                timestamp: { type: Date, default: Date.now },
                senderId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
                recipientId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
            },
        ],
        blockedUsers: [
            {
                type: mongoose.Schema.Types.ObjectId,
                ref: 'User',
            },
        ],
        role: {
            type: String,
            enum: ['reader', 'author', 'admin'],
            default: 'reader'
        },
        isVerifiedAuthor: {
            type: Boolean,
            default: false
        },
        isPro: {
            type: Boolean,
            default: false
        },
        subscriptionTier: {
            type: String,
            enum: ['monthly', 'yearly', null],
            default: null
        },
        subscriptionExpiry: {
            type: Date,
            default: null
        },
        isPrivate: {
            type: Boolean,
            default: false
        },
        expoPushToken: {
            type: String,
            default: null
        },
        notificationsEnabled: {
            type: Boolean,
            default: true
        },
    },
    { timestamps: true }
);

// hash password before saving user to db
userSchema.pre("save", async function (next) {
    if (!this.isModified("password")) return next();

    try {
        const salt = await bcrypt.genSalt(10);
        this.password = await bcrypt.hash(this.password as string, salt);
        next();
    } catch (error: any) {
        next(error);
    }
});

// compare password func
userSchema.methods.comparePassword = async function (userPassword: string): Promise<boolean> {
    if (!this.password) return false;
    return await bcrypt.compare(userPassword, this.password);
};

const User = mongoose.model<IUserDocument, IUserModel>("User", userSchema);

export default User;
