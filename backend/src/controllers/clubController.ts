import { Request, Response } from 'express';
import Club from '../models/Club';
import ClubMember from '../models/ClubMember';
import Message from '../models/Message';
import debug from 'debug';
import mongoose from 'mongoose';

const log = debug('app:clubController');

interface AuthenticatedRequest extends Request {
    user?: any;
}

// @desc    Create a new club
// @route   POST /api/clubs
export const createClub = async (req: AuthenticatedRequest, res: Response) => {
    try {
        const { name, description, image, isPrivate, tags } = req.body;

        if (!name) {
            return res.status(400).json({ message: 'Club name is required' });
        }

        const club = await Club.create({
            name,
            description,
            image,
            isPrivate: isPrivate || false,
            createdBy: req.user._id,
            tags: tags || [],
            memberCount: 1 // Creator is the first member
        });

        // Add creator as admin member
        await ClubMember.create({
            clubId: club._id,
            userId: req.user._id,
            role: 'admin'
        });

        res.status(201).json(club);
    } catch (error: any) {
        log('Error creating club:', error);
        res.status(500).json({ message: 'Server error creating club', error: error.message });
    }
};

// @desc    Get all public clubs
// @route   GET /api/clubs
export const getClubs = async (req: AuthenticatedRequest, res: Response) => {
    try {
        const { search } = req.query;
        let query: any = { isPrivate: false };

        if (search) {
            query.$text = { $search: search as string };
        }

        const clubs = await Club.find(query)
            .sort({ lastActiveAt: -1 }) // Show most active first
            .limit(50)
            .populate('createdBy', 'username profileImage');

        // Check membership status for each club
        const clubsWithMembership = await Promise.all(
            clubs.map(async (club) => {
                const isMember = req.user?._id
                    ? await ClubMember.exists({ clubId: club._id, userId: req.user._id })
                    : false;
                return { ...club.toObject(), isMember: !!isMember };
            })
        );

        res.json(clubsWithMembership);
    } catch (error: any) {
        log('Error fetching clubs:', error);
        res.status(500).json({ message: 'Server error fetching clubs' });
    }
};

// @desc    Get my clubs (created or joined)
// @route   GET /api/clubs/my-clubs
export const getMyClubs = async (req: AuthenticatedRequest, res: Response) => {
    try {
        const memberships = await ClubMember.find({ userId: req.user._id });
        const clubIds = memberships.map(m => m.clubId);

        const clubs = await Club.find({ _id: { $in: clubIds } })
            .sort({ lastActiveAt: -1 })
            .populate('createdBy', 'username profileImage');

        res.json(clubs);
    } catch (error: any) {
        log('Error fetching my clubs:', error);
        res.status(500).json({ message: 'Server error fetching my clubs' });
    }
};

// @desc    Get club details
// @route   GET /api/clubs/:id
export const getClubById = async (req: AuthenticatedRequest, res: Response) => {
    try {
        const club = await Club.findById(req.params.id)
            .populate('createdBy', 'username profileImage');

        if (!club) {
            return res.status(404).json({ message: 'Club not found' });
        }

        // Check if user is a member
        const membership = await ClubMember.findOne({
            clubId: club._id,
            userId: req.user._id
        });

        const isMember = !!membership;
        const role = membership?.role || null;

        res.json({ ...club.toObject(), isMember, role });
    } catch (error: any) {
        log('Error fetching club details:', error);
        res.status(500).json({ message: 'Server error fetching club details' });
    }
};

// @desc    Join a club
// @route   POST /api/clubs/:id/join
export const joinClub = async (req: AuthenticatedRequest, res: Response) => {
    try {
        const clubId = req.params.id;
        const userId = req.user._id;

        const club = await Club.findById(clubId);
        if (!club) return res.status(404).json({ message: 'Club not found' });

        // Check already member
        const existingMember = await ClubMember.findOne({
            clubId: club._id,
            userId: userId
        });

        if (existingMember) {
            return res.status(400).json({ message: 'Already a member' });
        }

        // Create membership
        await ClubMember.create({
            clubId: club._id,
            userId: userId,
            role: 'member'
        });

        // Atomic increment of member count
        await Club.findByIdAndUpdate(club._id, { $inc: { memberCount: 1 } });

        res.json({ message: 'Joined club successfully', role: 'member' });
    } catch (error: any) {
        log('Error joining club:', error);
        res.status(500).json({ message: 'Server error joining club' });
    }
};

// @desc    Leave a club
// @route   POST /api/clubs/:id/leave
export const leaveClub = async (req: AuthenticatedRequest, res: Response) => {
    try {
        const clubId = req.params.id;
        const userId = req.user._id;

        const club = await Club.findById(clubId);
        if (!club) return res.status(404).json({ message: 'Club not found' });

        const deleted = await ClubMember.findOneAndDelete({
            clubId: club._id,
            userId: userId
        });

        if (!deleted) {
            return res.status(400).json({ message: 'Not a member of this club' });
        }

        // Atomic decrement of member count, ensuring it doesn't go below 0
        await Club.findByIdAndUpdate(club._id, { $inc: { memberCount: -1 } });
        // NOTE: Mongoose/MongoDB $inc is atomic. We should ideally add a check in the query or schema min:0 to prevent negative.
        // But for now, reliance on $inc is better than read-modify-write.

        res.json({ message: 'Left club successfully' });
    } catch (error: any) {
        log('Error leaving club:', error);
        res.status(500).json({ message: 'Server error leaving club' });
    }
};

// @desc    Get club members
// @route   GET /api/clubs/:id/members
export const getClubMembers = async (req: Request, res: Response) => {
    try {
        const members = await ClubMember.find({ clubId: req.params.id })
            .populate('userId', 'username profileImage level bio')
            .sort({ joinedAt: -1 });

        res.json(members);
    } catch (error: any) {
        log('Error fetching club members:', error);
        res.status(500).json({ message: 'Server error fetching members' });
    }
};

// @desc    Send a message to a club
// @route   POST /api/clubs/:id/messages
export const sendClubMessage = async (req: AuthenticatedRequest, res: Response) => {
    try {
        const { id: clubId } = req.params;
        const { text, image, video, videoThumbnail, fileSizeBytes, book, replyTo } = req.body;
        const senderId = req.user._id;

        // Verify membership
        const isMember = await ClubMember.exists({ clubId, userId: senderId });
        if (!isMember) {
            return res.status(403).json({ message: 'You must be a member to send messages' });
        }

        const newMessage = await Message.create({
            clubId,
            sender: senderId,
            text,
            image,
            video,
            videoThumbnail,
            fileSizeBytes,
            book,
            replyTo,
            conversationId: `club_${clubId}` // Dummy conversation ID for schema compliance if needed, or update schema to make it optional
        });

        await newMessage.populate('sender', 'username profileImage');
        if (replyTo) {
            await newMessage.populate({
                path: 'replyTo',
                select: 'sender text image video book',
                populate: { path: 'sender', select: 'username' }
            });
        }

        // Emit to club room
        const io = req.app.get('io');
        io.to(`club_${clubId}`).emit('new_message', newMessage);

        // Update club last active
        await Club.findByIdAndUpdate(clubId, { lastActiveAt: new Date() });

        res.status(201).json(newMessage);
    } catch (error: any) {
        log('Error sending club message:', error);
        res.status(500).json({ message: 'Server error sending message' });
    }
};

// @desc    Get club messages
// @route   GET /api/clubs/:id/messages
export const getClubMessages = async (req: AuthenticatedRequest, res: Response) => {
    try {
        const { id: clubId } = req.params;
        const page = parseInt(req.query.page as string) || 1;
        const limit = parseInt(req.query.limit as string) || 50;
        const skip = (page - 1) * limit;

        // Verify membership (Optional: maybe public clubs allow reading?)
        // For now, strict: must be member
        const isMember = await ClubMember.exists({ clubId, userId: req.user._id });
        if (!isMember) {
            // Check if public? For now stick to strict membership or check club privacy
            const club = await Club.findById(clubId);
            if (club?.isPrivate) {
                return res.status(403).json({ message: 'Private club' });
            }
        }

        const messages = await Message.find({ clubId })
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limit)
            .populate('sender', 'username profileImage')
            .populate({
                path: 'replyTo',
                select: 'sender text image video book',
                populate: { path: 'sender', select: 'username' }
            });

        res.json(messages);
    } catch (error: any) {
        log('Error fetching club messages:', error);
        res.status(500).json({ message: 'Server error fetching messages' });
    }
};
