import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';
import path from 'path';
import User from '../models/User';
import Book from '../models/Book';
import Follow from '../models/Follow';
import Message from '../models/Message';
import Like from '../models/Like';
import Comment from '../models/Comment';
import BookshelfItem from '../models/BookshelfItem';
import ReadingSession from '../models/ReadingSession';
import UserStreak from '../models/UserStreak';
import Notification from '../models/Notification';

// Load env vars
dotenv.config({ path: path.join(__dirname, '../../.env') });

const MONGO_URI = process.env.MONGO_URI || "mongodb://localhost:27017/readsphere";

const INDIAN_USERS = [
    { username: 'aarav_sharma', name: 'Aarav Sharma', email: 'aarav@example.com', bio: 'Lover of classical literature and historical fiction.' },
    { username: 'isha_patel', name: 'Isha Patel', email: 'isha@example.com', bio: 'Tech enthusiast by day, sci-fi explorer by night.' },
    { username: 'vihaan_reddy', name: 'Vihaan Reddy', email: 'vihaan@example.com', bio: 'Exploring the depths of mystery and psychological thrillers.' },
    { username: 'anya_gupta', name: 'Anya Gupta', email: 'anya@example.com', bio: 'Fantasy writer and avid reader of magical realism.' },
    { username: 'advik_singh', name: 'Advik Singh', email: 'advik@example.com', bio: 'Non-fiction buff focusing on philosophy and self-growth.' },
    { username: 'ananya_rao', name: 'Ananya Rao', email: 'ananya@example.com', bio: 'Poetry and romance is where my heart lies.' },
    { username: 'kabir_malhotra', name: 'Kabir Malhotra', email: 'kabir@example.com', bio: 'Horror fan looking for the next chill-inducing read.' },
    { username: 'myra_khanna', name: 'Myra Khanna', email: 'myra@example.com', bio: 'Always searching for the best upcoming fiction authors.' },
    { username: 'reyansh_joshi', name: 'Reyansh Joshi', email: 'reyansh@example.com', bio: 'History nerd and epic fantasy enthusiast.' },
    { username: 'diya_iyer', name: 'Diya Iyer', email: 'diya@example.com', bio: 'Reading everything from mystery to modern romance.' },
    { username: 'sid_kulkarni', name: 'Siddharth Kulkarni', email: 'sid@example.com', bio: 'Passionate about biographies and historical non-fiction.' },
    { username: 'zara_ali', name: 'Zara Ali', email: 'zara@example.com', bio: 'Loves psychological thrillers and dark fantasy.' },
    { username: 'arjun_mehta', name: 'Arjun Mehta', email: 'arjun@example.com', bio: 'Business strategist interested in economics and tech trends.' },
    { username: 'pari_das', name: 'Pari Das', email: 'pari@example.com', bio: 'Young adult fiction and coming-of-age stories.' },
    { username: 'rohan_shetty', name: 'Rohan Shetty', email: 'rohan@example.com', bio: 'Adventure seeker, both in books and life.' },
    { username: 'meher_kaur', name: 'Meher Kaur', email: 'meher@example.com', bio: 'Poetry, philosophy, and classical Indian literature.' },
    { username: 'dev_bajaj', name: 'Dev Bajaj', email: 'dev@example.com', bio: 'Sci-fi enthusiast with a focus on space exploration.' },
    { username: 'siya_malik', name: 'Siya Malik', email: 'siya@example.com', bio: 'Romance and contemporary fiction lover.' },
    { username: 'ayaan_khan', name: 'Ayaan Khan', email: 'ayaan@example.com', bio: 'Mystery solver and detective fiction fan.' },
    { username: 'tara_sharma', name: 'Tara Sharma', email: 'tara@example.com', bio: 'Loves cooking books and historical chronicles.' }
];

const GENRES = ['Fiction', 'Fantasy', 'Sci-Fi', 'Mystery', 'Romance', 'Non-Fiction', 'Horror'];

const BOOK_TEMPLATES: Record<string, any[]> = {
    'Fiction': [
        { title: 'The Midnight Library in Mumbai', author: 'S. K. Narayan', caption: 'What if you could live every life you ever imagined?' },
        { title: 'Silk and Spice', author: 'Meera Das', caption: 'A family saga spanning three generations of textile merchants.' },
        { title: 'The Last Train to Shimla', author: 'Rohan Varma', caption: 'A chance encounter on a misty morning changes everything.' },
        { title: 'Shadows of the Ghats', author: 'Kiran Rao', caption: 'A modern story of love and loss on the banks of the Ganges.' },
        { title: 'The Great Indian Dream', author: 'Amit Singh', caption: 'Exploring the aspirations of a changing nation.' },
        { title: 'Monsoon Weddings and Funerals', author: 'Priya Mani', caption: 'Life in a bustling Delhi neighborhood.' },
        { title: 'The Saffron Trail', author: 'Vikram Sethi', caption: 'A journey of self-discovery through the heart of India.' },
        { title: 'Echoes of the Deccan', author: 'Lata Mangesh', caption: 'Finding beauty in the ruins of an ancient kingdom.' },
        { title: 'The Chai Wallahs Secret', author: 'Deepak Chopra', caption: 'A tale of wisdom found in the simplest of places.' },
        { title: 'Banyan Tree Whispers', author: 'Sita Ram', caption: 'Stories that age like fine wine.' }
    ],
    'Fantasy': [
        { title: 'The Garuda Chronicles', author: 'Aryan Dev', caption: 'Ancient myths come alive in a battle for the heavens.' },
        { title: 'Mist of Magadha', author: 'Indra Das', caption: 'A kingdom hidden by magic, revealed by a thief.' },
        { title: 'The Obsidian Throne', author: 'S. Basu', caption: 'When the gods fall, mortals must rise.' },
        { title: 'Wings of the Phoenix', author: 'R. K. Singh', caption: 'The rebirth of magic in a world of machines.' },
        { title: 'Stars over Varanasi', author: 'Maya J.', caption: 'Celestial beings walk the streets of the holy city.' },
        { title: 'The Elemental Blade', author: 'Arjun K.', caption: 'One weapon to rule the four kingdoms of nature.' },
        { title: 'Temple of the Sun', author: 'Nisha G.', caption: 'A quest to find the lost source of light.' },
        { title: 'Daughters of Durga', author: 'Tanya S.', caption: 'Warriors blessed by the goddess herself.' },
        { title: 'The Naga King\'s Curse', author: 'Devdutt P.', caption: 'Deep in the jungle, an ancient power wakes.' },
        { title: 'Sky-Sailing to Shambhala', author: 'Karan B.', caption: 'A journey beyond the physical realm.' }
    ],
    'Sci-Fi': [
        { title: 'Neo-Bangalore 2099', author: 'Yash K.', caption: 'Cyberpunk thrills in the silicon valley of the future.' },
        { title: 'The Mars Initiative', author: 'Sarita V.', caption: 'The first Indian mission to colonize the red planet.' },
        { title: 'Quantum Karma', author: 'Dr. V. Prasad', caption: 'What if your past lives were stored in the cloud?' },
        { title: 'Binary Souls', author: 'Ankit R.', caption: 'Can AI truly experience human emotions?' },
        { title: 'The Last Satellite', author: 'Pooja M.', caption: 'A lonely observer witnesses the earth\'s final hours.' },
        { title: 'Genetic Gambit', author: 'Siddharth L.', caption: 'Rewriting the human code for survival.' },
        { title: 'Void Walkers', author: 'Nitin G.', caption: 'Exploring the anomalies beyond the event horizon.' },
        { title: 'Silicon Hearts', author: 'Riya D.', caption: 'A romance between a hacker and an android.' },
        { title: 'The Neural Link', author: 'Abhishek J.', caption: 'Privacy is dead when minds are connected.' },
        { title: 'Gravity\'s End', author: 'Manish P.', caption: 'The physics of the universe are breaking.' }
    ],
    'Mystery': [
        { title: 'Midnight in Mussoorie', author: 'Ruskin B.', caption: 'A cozy mystery involving a missing manuscript.' },
        { title: 'The Calcutta Cipher', author: 'Sathyajit R.', caption: 'A detective races to decode a revolutionary secret.' },
        { title: 'Deadly Diwali', author: 'Alka S.', caption: 'A festive celebration ends in a shocking murder.' },
        { title: 'The Baker St. of Bombay', author: 'Zaman Ali', caption: 'Modern-day Holmes in the heart of Mumbai.' },
        { title: 'Silent Witness', author: 'Shobha De', caption: 'The butler didn\'t do it, but he knows who did.' },
        { title: 'Chambers of Secresy', author: 'Anirban B.', caption: 'Dark secrets hidden in an old haveli.' },
        { title: 'The Jade Elephant', author: 'Madhu T.', caption: 'A heist that goes wrong in spectacular fashion.' },
        { title: 'Vanishing Act', author: 'Sanjay G.', caption: 'How can a woman disappear from a locked room?' },
        { title: 'Coded Justice', author: 'Neha R.', caption: 'A digital trail leads to a physical crime.' },
        { title: 'The Long Shadow', author: 'Rajesh S.', caption: 'Past sins come back to haunt the powerful.' }
    ],
    'Romance': [
        { title: 'Love Under the Laburnum', author: 'Preeti S.', caption: 'A sweet story of first love in a college campus.' },
        { title: 'The Arranged Engagement', author: 'Ravinder S.', caption: 'Finding love where you least expect it.' },
        { title: 'Summer in Srinagar', author: 'Durjoy D.', caption: 'Heartbreak and healing in the valley of lakes.' },
        { title: 'Coffee and Conversations', author: 'Nikita S.', caption: 'Twice-divorced and looking for a third chance.' },
        { title: 'The Bookstore Date', author: 'Savvy S.', caption: 'Two bibliophiles find their happy ending.' },
        { title: 'Rainy Day Dreams', author: 'Anjali P.', caption: 'A monsoon romance that sparks a lifetime of joy.' },
        { title: 'Across the Border', author: 'Faisal K.', caption: 'Love that transcends boundaries and politics.' },
        { title: 'Bollywood Beats', author: 'Karan J.', caption: 'Life behind the silver screen is not all glitter.' },
        { title: 'The Wedding Planner', author: 'Sunita M.', caption: 'Always the bridesmaid, finally the bride.' },
        { title: 'Stars in our Eyes', author: 'Varun S.', caption: 'A small-town girl and a big-city boy.' }
    ],
    'Non-Fiction': [
        { title: 'The Ethical Indian', author: 'Gurcharan D.', caption: 'Navigating moral dilemmas in a globalized world.' },
        { title: 'Decoding the Vedas', author: 'A. L. Basham', caption: 'An accessible guide to ancient wisdom.' },
        { title: 'Startup Nation: India', author: 'Nandan N.', caption: 'How technology is transforming the subcontinent.' },
        { title: 'The Flavors of Kerala', author: 'Shashi T.', caption: 'A culinary journey through the spice coast.' },
        { title: 'The Long Walk to Justice', author: 'Justice Chandrachud', caption: 'Memoirs from the highest court in the land.' },
        { title: 'Yoga for the Modern Soul', author: 'B. K. S. Iyengar', caption: 'Finding balance in a chaotic world.' },
        { title: 'The Himalayan Way', author: 'Sandeep S.', caption: 'Lessons learned from high-altitude trekking.' },
        { title: 'Cricket: More Than a Game', author: 'Sachin T.', caption: 'The heartbeat of a billion people.' },
        { title: 'The Mindful Leader', author: 'Deepa M.', caption: 'Strategies for empathetic management.' },
        { title: 'Waste to Wealth', author: 'Sunita N.', caption: 'Solving the environmental crisis in urban India.' }
    ],
    'Horror': [
        { title: 'The Bhangarh Haunting', author: 'Neil D\'Silva', caption: 'What happens when you stay in the cursed fort after sunset?' },
        { title: 'Shadows of the Sunderbans', author: 'K. R. Meera', caption: 'Ancient spirits lurking in the mangroves.' },
        { title: 'The Girl in the Mirror', author: 'Vikrant K.', caption: 'A reflection that has a life of its own.' },
        { title: 'Hostel Nightmares', author: 'Soma S.', caption: 'Terrifying tales from a remote boarding school.' },
        { title: 'The Aghori\'s Curse', author: 'D. G. Khan', caption: 'Don\'t mess with those who transcend life and death.' },
        { title: 'Whisper in the Dark', author: 'Aditi M.', caption: 'A child hears voices that aren\'t there.' },
        { title: 'The Abandoned Mansion', author: 'Rohan G.', caption: 'A family inherits a house with a dark past.' },
        { title: 'Buried Secrets', author: 'Priya K.', caption: 'The cemetery is not as quiet as it seems.' },
        { title: 'Night of the Full Moon', author: 'Sameer B.', caption: 'Beware the changes that come with the moon.' },
        { title: 'The Doll\'s Eye', author: 'Leila S.', caption: 'A vintage toy with a sinister glare.' }
    ]
};

const CHAT_MESSAGES = [
    "Hey! Have you finished reading that new fantasy book?",
    "Check out this cover! I love the art.",
    "Actually, I just started it. The first chapter is intense.",
    "Do you recommend any good mystery novels set in India?",
    "I'm currently writing a sci-fi short story. Would love your feedback.",
    "Just posted a new review! Let me know what you think.",
    "The ending of that horror book was so unexpected!",
    "I'm thinking of starting a book club for non-fictional reads.",
    "That's a great idea! I'd definitely join.",
    "Did you see the latest release by Ruskin Bond?"
];

const COMMENT_TEXTS = [
    "I absolutely loved the plot twists in this one!",
    "The character development was a bit slow, but the ending was worth it.",
    "Can't wait for the sequel! Does anyone know when it's coming out?",
    "This book changed my perspective on historical fiction.",
    "Highly recommend for anyone looking for a quick, engaging read.",
    "The author's writing style is simply beautiful.",
    "A bit too dark for my taste, but very well written.",
    "Perfect for a weekend read under a cozy blanket!",
    "Has anyone else noticed the subtle references to Indian mythology here?",
    "10/10 would read again."
];

const getRandomRating = () => Math.floor(Math.random() * 3) + 3; // 3 to 5 stars

/**
 * Helper to get a random date between now and X days ago
 */
const getRandomPastDate = (daysAgo: number, referenceDate: Date = new Date()) => {
    const date = new Date(referenceDate);
    const randomMs = Math.floor(Math.random() * daysAgo * 24 * 60 * 60 * 1000);
    date.setTime(date.getTime() - randomMs);
    return date;
};

async function seed() {
    try {
        console.log('Connecting to MongoDB...');
        await mongoose.connect(MONGO_URI);
        console.log('Connected!');

        console.log('Cleaning up existing seeded data...');
        const seededUsers = await User.find({ email: { $regex: /@example\.com$/ } });
        const seededUserIds = seededUsers.map(u => u._id);

        await Promise.all([
            Book.deleteMany({ user: { $in: seededUserIds } }),
            Follow.deleteMany({ $or: [{ follower: { $in: seededUserIds } }, { following: { $in: seededUserIds } }] }),
            Message.deleteMany({ $or: [{ sender: { $in: seededUserIds } }, { receiver: { $in: seededUserIds } }] }),
            Like.deleteMany({ user: { $in: seededUserIds } }),
            Comment.deleteMany({ user: { $in: seededUserIds } }),
            BookshelfItem.deleteMany({ userId: { $in: seededUserIds } }),
            ReadingSession.deleteMany({ userId: { $in: seededUserIds } }),
            UserStreak.deleteMany({ userId: { $in: seededUserIds } }),
            Notification.deleteMany({ user: { $in: seededUserIds } }),
            User.deleteMany({ _id: { $in: seededUserIds } })
        ]);
        console.log('Cleanup complete.');

        const createdUsers = [];
        console.log('Creating users and streaks with history...');
        for (let i = 0; i < INDIAN_USERS.length; i++) {
            const userData = INDIAN_USERS[i];
            const points = Math.floor(Math.random() * 1500) + 100; // More points for history
            const userJoinedDate = getRandomPastDate(20); // Joined up to 20 days ago

            // Generate more realistic Expo push token (some users won't have tokens)
            const hasToken = Math.random() > 0.15; // 85% of users have registered for push
            const generateRealisticToken = () => {
                const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_';
                let token = '';
                for (let i = 0; i < 22; i++) {
                    token += chars.charAt(Math.floor(Math.random() * chars.length));
                }
                return `ExponentPushToken[${token}]`;
            };

            // Determine streak state based on index for testing
            let streakState = 'active'; // random default
            if (i === 0) streakState = 'active'; // Aarav: Checked in today
            else if (i === 1) streakState = 'pending'; // Isha: Checked in yesterday
            else if (i === 2) streakState = 'broken'; // Vihaan: Checked in 2 days ago (Broken)
            else if (i === 3) streakState = 'new'; // Anya: Never checked in
            else streakState = Math.random() > 0.5 ? 'active' : 'pending';

            let currentStreak = Math.floor(Math.random() * 12) + 1;
            let lastCheckInDate = new Date();

            if (streakState === 'active') {
                lastCheckInDate = new Date();
            } else if (streakState === 'pending') {
                lastCheckInDate = new Date();
                lastCheckInDate.setDate(lastCheckInDate.getDate() - 1);
            } else if (streakState === 'broken') {
                lastCheckInDate = new Date();
                lastCheckInDate.setDate(lastCheckInDate.getDate() - 2);
                // We write a high streak, but the service will detect it as broken
                currentStreak = 15;
            } else if (streakState === 'new') {
                lastCheckInDate = new Date(0);
                currentStreak = 0;
            }

            const user = await User.create({
                ...userData,
                password: 'Password123!', // Default password
                role: 'author',
                isVerifiedAuthor: true,
                profileImage: `https://api.dicebear.com/7.x/avataaars/svg?seed=${userData.username}`,
                inkDrops: 1000,
                points: points,
                level: Math.floor(points / 100) + 1,
                currentStreak: currentStreak,
                longestStreak: Math.max(currentStreak, Math.floor(Math.random() * 15) + 12),
                createdAt: userJoinedDate,
                lastActiveDate: new Date(),
                expoPushToken: hasToken ? generateRealisticToken() : null,
                notificationsEnabled: hasToken ? (Math.random() > 0.1) : false // 90% of token holders have notifications enabled
            });

            // Create corresponding streak object
            await UserStreak.create({
                userId: user._id,
                currentStreak: currentStreak,
                longestStreak: user.longestStreak,
                totalCheckIns: user.longestStreak + Math.floor(Math.random() * 5),
                lastCheckInDate: lastCheckInDate,
                createdAt: userJoinedDate,
                canRestoreStreak: false // Default to false, service will update if broken
            });

            createdUsers.push(user);
        }
        console.log(`${createdUsers.length} users and streaks established with historical start dates.`);

        console.log('Creating follows...');
        let followCount = 0;
        for (const follower of createdUsers) {
            for (const following of createdUsers) {
                if (follower._id.toString() !== following._id.toString()) {
                    try {
                        await Follow.findOneAndUpdate(
                            { follower: follower._id, following: following._id },
                            { status: 'accepted' },
                            { upsert: true, new: true }
                        );
                        followCount++;
                    } catch (e) { /* Ignore duplicate errors */ }
                }
            }
        }
        console.log(`Created ${followCount} social connections.`);

        console.log('Creating books, likes, and comments...');
        let bookCount = 0;
        let likeCountTotal = 0;
        let commentCountTotal = 0;
        const allCreatedBooks = [];

        for (const genre of GENRES) {
            const templates = BOOK_TEMPLATES[genre];
            for (let i = 0; i < templates.length; i++) {
                const template = templates[i];
                const randomUserProfile = createdUsers[Math.floor(Math.random() * createdUsers.length)];
                const bookCreatedDate = getRandomPastDate(15);

                const book = await Book.create({
                    ...template,
                    genre,
                    user: randomUserProfile._id,
                    image: `https://picsum.photos/seed/${encodeURIComponent(template.title)}/400/600`,
                    rating: getRandomRating(),
                    publishStatus: 'published',
                    visibility: 'public',
                    hasContent: false,
                    contentType: 'none',
                    totalPages: Math.floor(Math.random() * 300) + 150,
                    createdAt: bookCreatedDate
                });
                allCreatedBooks.push(book);
                bookCount++;

                // Randomize likes for this book
                const numLikes = Math.floor(Math.random() * 8) + 1;
                const shuffledLikingUsers = [...createdUsers].sort(() => 0.5 - Math.random()).slice(0, numLikes);
                for (const ul of shuffledLikingUsers) {
                    await Like.create({
                        user: ul._id,
                        book: book._id,
                        createdAt: getRandomPastDate(5, new Date()) // Recent social activity
                    });
                    likeCountTotal++;
                }

                // Randomize comments for this book
                const numComments = Math.floor(Math.random() * 4); // 0-3 comments
                const shuffledCommentingUsers = [...createdUsers].sort(() => 0.5 - Math.random()).slice(0, numComments);
                for (const uc of shuffledCommentingUsers) {
                    await Comment.create({
                        user: uc._id,
                        book: book._id,
                        text: COMMENT_TEXTS[Math.floor(Math.random() * COMMENT_TEXTS.length)],
                        createdAt: getRandomPastDate(4, new Date())
                    });
                    commentCountTotal++;
                }
            }
            console.log(`Generated 10 books for ${genre} with historical social activity.`);
        }

        console.log('Creating bookshelves and progress...');
        let shelfCount = 0;
        let sessionCount = 0;
        for (const user of createdUsers) {
            // Assign 4-6 random books to each user's shelf
            const numBooksOnShelf = Math.floor(Math.random() * 3) + 4;
            const shuffledBooks = [...allCreatedBooks].sort(() => 0.5 - Math.random()).slice(0, numBooksOnShelf);

            for (let i = 0; i < shuffledBooks.length; i++) {
                const book = shuffledBooks[i];
                const status: any = i === 0 ? 'currently_reading' : (i === 1 ? 'completed' : 'want_to_read');
                const progress = status === 'completed' ? 100 : (status === 'currently_reading' ? Math.floor(Math.random() * 80) + 5 : 0);
                const currentPage = Math.floor((progress / 100) * book.totalPages);
                const shelfJoinedDate = getRandomPastDate(10); // Added to shelf in last 10 days

                const shelfItem = await BookshelfItem.create({
                    userId: user._id,
                    bookId: book._id,
                    status,
                    progress,
                    currentPage,
                    totalPages: book.totalPages,
                    lastReadAt: status !== 'want_to_read' ? new Date() : null,
                    startedReadingAt: status !== 'want_to_read' ? shelfJoinedDate : null,
                    completedAt: status === 'completed' ? getRandomPastDate(3) : null,
                    rating: status === 'completed' ? getRandomRating() : null,
                    priority: 'medium',
                    createdAt: shelfJoinedDate
                });
                shelfCount++;

                // Create reading sessions for currently_reading and completed books
                if (status !== 'want_to_read') {
                    // Spread sessions over the last 30 days to populate Daily/Weekly/Monthly charts
                    const maxSessionAge = 30;
                    const numSessions = Math.floor(Math.random() * 15) + 15; // 15-30 sessions per active book

                    for (let s = 0; s < numSessions; s++) {
                        const sessionDate = getRandomPastDate(maxSessionAge);
                        const duration = Math.floor(Math.random() * 60) + 10; // 10-70 mins
                        const pages = Math.max(1, Math.floor(duration / 1.5)); // Approx 1.5 min per page
                        const startTime = new Date(sessionDate);

                        // Randomize hour to simulate different reading times (Morning, Afternoon, Night)
                        startTime.setHours(Math.floor(Math.random() * 18) + 6);
                        startTime.setMinutes(Math.floor(Math.random() * 60));

                        const endTime = new Date(startTime.getTime() + duration * 60000);

                        await ReadingSession.create({
                            userId: user._id,
                            bookId: book._id,
                            bookshelfItemId: shelfItem._id,
                            startTime,
                            endTime,
                            duration,
                            pagesRead: pages,
                            startPage: Math.max(0, currentPage - pages),
                            endPage: currentPage,
                            source: 'auto',
                            deviceType: 'mobile',
                            contributesToStreak: true,
                            sessionDate: startTime.toISOString().split('T')[0],
                            createdAt: startTime
                        });
                        sessionCount++;
                    }
                }
            }
        }
        console.log(`Filled ${shelfCount} bookshelf slots with ${sessionCount} reading sessions.`);

        console.log('Creating chat conversations...');
        let messageCount = 0;
        for (let i = 0; i < createdUsers.length - 1; i++) {
            const userA = createdUsers[i];
            const userB = createdUsers[i + 1];
            const convId = (Message as any).getConversationId(userA._id, userB._id);

            const numMsgs = Math.floor(Math.random() * 5) + 5; // More messages for grouping
            let lastSender = Math.random() > 0.5 ? userA : userB;
            let previousMessageId: any = null;

            for (let j = 0; j < numMsgs; j++) {
                // 70% chance to stay with same sender to test grouping
                const sender = Math.random() > 0.3 ? lastSender : (lastSender === userA ? userB : userA);
                const receiver = sender === userA ? userB : userA;
                lastSender = sender;

                const hasImage = Math.random() > 0.8;
                const isReply = j > 0 && Math.random() > 0.6 && previousMessageId;

                const message = await Message.create({
                    sender: sender._id,
                    receiver: receiver._id,
                    text: CHAT_MESSAGES[Math.floor(Math.random() * CHAT_MESSAGES.length)],
                    image: hasImage ? `https://picsum.photos/seed/msg_${messageCount}/400/400` : undefined,
                    conversationId: convId,
                    read: Math.random() > 0.3,
                    replyTo: isReply ? previousMessageId : undefined,
                    createdAt: getRandomPastDate(5) // More recent
                });

                previousMessageId = message._id;
                messageCount++;
            }
        }
        console.log(`Simulated ${messageCount} chat messages.`);

        console.log('Creating notifications...');
        let notifCount = 0;
        for (const user of createdUsers) {
            // Give each user 5-10 random notifications
            const numNotifs = Math.floor(Math.random() * 6) + 5;
            for (let k = 0; k < numNotifs; k++) {
                const typeArr: any[] = ["LIKE", "COMMENT", "FOLLOW", "ACHIEVEMENT", "FOLLOW_ACCEPTED"];
                const type = typeArr[Math.floor(Math.random() * typeArr.length)];
                const otherUser = createdUsers[Math.floor(Math.random() * createdUsers.length)];
                const book = allCreatedBooks[Math.floor(Math.random() * allCreatedBooks.length)];

                let data: any = {};
                switch (type) {
                    case "LIKE":
                        data = { bookId: book._id, bookTitle: book.title, likedBy: otherUser._id, likedByUsername: otherUser.username };
                        break;
                    case "COMMENT":
                        data = { bookId: book._id, bookTitle: book.title, commentedBy: otherUser._id, commentedByUsername: otherUser.username, commentText: "Great read!" };
                        break;
                    case "FOLLOW":
                        data = { followedBy: otherUser._id, followedByUsername: otherUser.username };
                        break;
                    case "FOLLOW_ACCEPTED":
                        data = { acceptedBy: otherUser._id, acceptedByUsername: otherUser.username };
                        break;
                    case "ACHIEVEMENT":
                        data = { achievementName: "Avid Reader", points: 50 };
                        break;
                }

                await Notification.create({
                    user: user._id,
                    type,
                    data,
                    read: Math.random() > 0.5,
                    createdAt: getRandomPastDate(15)
                });
                notifCount++;
            }
        }
        console.log(`Created ${notifCount} notifications.`);

        console.log('\n--- SEEDING SUMMARY ---');
        console.log(`Users: ${createdUsers.length}`);
        console.log(`Books: ${bookCount}`);
        console.log(`Likes: ${likeCountTotal}`);
        console.log(`Comments: ${commentCountTotal}`);
        console.log(`Notifications: ${notifCount}`);
        console.log(`Bookshelf Items: ${shelfCount}`);
        console.log(`Reading Sessions: ${sessionCount}`);
        console.log(`Messages: ${messageCount}`);
        console.log('------------------------\n');

        process.exit(0);
    } catch (error) {
        console.error('Seeding failed:', error);
        process.exit(1);
    }
}

seed();
