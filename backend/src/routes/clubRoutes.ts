import express from 'express';
import protect from '../middleware/auth.middleware';
import {
    createClub,
    getClubs,
    getMyClubs,
    getClubById,
    joinClub,
    leaveClub,
    getClubMembers,
    sendClubMessage,
    getClubMessages
} from '../controllers/clubController';

const router = express.Router();

// Public/Private routes
router.post('/', protect, createClub);
router.get('/', protect, getClubs);
router.get('/my-clubs', protect, getMyClubs);
router.get('/:id', protect, getClubById);
router.post('/:id/join', protect, joinClub);
router.post('/:id/leave', protect, leaveClub);
router.get('/:id/members', protect, getClubMembers);
router.post('/:id/messages', protect, sendClubMessage);
router.get('/:id/messages', protect, getClubMessages);

export default router;
