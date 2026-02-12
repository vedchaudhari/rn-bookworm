// f:\rn-wss-android\rn-bookworm\mobile\components\SocialPostCard.tsx
import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from 'expo-router';
import COLORS from '../constants/colors';
import { SPACING, BORDER_RADIUS, SHADOWS, FONT_SIZE } from '../constants/styleConstants';
import styles from '../assets/styles/post.styles';
import LikeButton from './LikeButton';
import { formatPublishDate } from '../lib/utils';
import Animated, { FadeIn } from 'react-native-reanimated';
import BookmarkButton from './BookmarkButton';
import { useAuthStore } from '../store/authContext';
import { apiClient } from '../lib/apiClient';
import { useUIStore } from '../store/uiStore';
import { useSocialStore } from '../store/socialStore';
import { useEffect } from 'react';
import ProgressiveImage from './ProgressiveImage';
import ShareSheet from './ShareSheet';

interface Book {
    _id: string;
    title: string;
    caption: string;
    image: string;
    rating: number;
    createdAt: string;
    isLiked?: boolean;
    isBookmarked?: boolean;
    likeCount?: number;
    commentCount?: number;
    user: {
        _id: string;
        username: string;
        profileImage: string;
    };
    hasContent?: boolean;
}

interface SocialPostCardProps {
    post: Book;
    index: number;
    onDelete?: (bookId: string) => void;
}

const localStyles = StyleSheet.create({
    card: {
        backgroundColor: COLORS.surfaceSilk,
        borderRadius: BORDER_RADIUS.xl, // Slightly less rounded for a mature look
        marginHorizontal: SPACING.xl,
        marginBottom: SPACING.xxl,
        overflow: 'hidden',
        borderWidth: 0.5, // Thinner border
        borderColor: 'rgba(255, 255, 255, 0.08)', // Very subtle border
        ...SHADOWS.light, // Much lighter shadow for modern flat-ish look
    },
    bookTitle: {
        fontSize: FONT_SIZE.lg, // Adjusted for balance
        fontWeight: '800',
        color: COLORS.textPrimary,
        marginBottom: SPACING.xs,
        letterSpacing: 0.3,
        lineHeight: 24,
    },
    authorName: {
        fontSize: FONT_SIZE.base,
        color: COLORS.textSecondary,
        fontWeight: '700',
        letterSpacing: 0.3,
    },
    dropdown: {
        position: 'absolute',
        top: 50,
        right: 20,
        backgroundColor: 'rgba(14, 27, 36, 0.98)',
        borderRadius: 18,
        padding: 10,
        minWidth: 180,
        zIndex: 5000,
        ...SHADOWS.extraStrong,
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.15)',
    },
    dropdownItem: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 10,
        paddingHorizontal: 12,
        gap: 12,
    },
    dropdownText: {
        color: COLORS.textPrimary,
        fontSize: 14,
        fontWeight: '600',
    },
    divider: {
        height: 1,
        backgroundColor: COLORS.glassBorder,
        marginVertical: 4,
        opacity: 0.3,
    }
});

const SocialPostCard: React.FC<SocialPostCardProps> = ({ post, index, onDelete }) => {
    const router = useRouter();
    const { user, token } = useAuthStore();
    const { showAlert } = useUIStore();
    const { syncBookMetrics, bookMetrics } = useSocialStore();

    // Subscribe to global metrics
    const metrics = bookMetrics[post._id];
    const syncedLikeCount = metrics?.likeCount ?? post.likeCount ?? 0;
    const syncedCommentCount = metrics?.commentCount ?? post.commentCount ?? 0;

    // Initialize metrics on mount
    useEffect(() => {
        if (post._id) {
            syncBookMetrics(post._id, post.isLiked || false, post.likeCount || 0, post.commentCount || 0);
        }
    }, [post._id]);

    const isOwner = (user?._id || user?.id)?.toString() === ((post.user as any)?._id || (post.user as any)?.id || (typeof post.user === 'string' ? post.user : null))?.toString();
    const [showDropdown, setShowDropdown] = React.useState(false);
    const [shareVisible, setShareVisible] = React.useState(false);

    const handleDelete = () => {
        setShowDropdown(false);
        showAlert({
            title: "Delete Book",
            message: "Are you sure you want to delete this book?",
            showCancel: true,
            confirmText: "Delete",
            type: "warning",
            onConfirm: async () => {
                try {
                    await apiClient.delete(`/api/books/${post._id}`);
                    if (onDelete) onDelete(post._id);
                } catch (error: any) {
                    showAlert({ title: "Error", message: error.message || "Failed to delete book", type: "error" });
                }
            }
        });
    };

    const handleEdit = () => {
        setShowDropdown(false);
        router.push({
            pathname: '/book-edit',
            params: { bookId: post._id }
        });
    };

    const renderStars = (rating: number) => {
        const stars = [];
        for (let i = 1; i <= 5; i++) {
            stars.push(
                <Ionicons
                    key={i}
                    name={i <= rating ? "star" : "star-outline"}
                    size={12}
                    color={i <= rating ? COLORS.ratingGold : COLORS.textMuted}
                    style={{ marginRight: 1 }}
                />
            );
        }
        return stars;
    };

    return (
        <Animated.View entering={FadeIn.delay(index * 100)} style={styles.container}>
            {/* Overlay to close dropdown when clicking anywhere in the card */}
            {showDropdown && (
                <TouchableOpacity
                    style={[StyleSheet.absoluteFill, { zIndex: 999 }]}
                    activeOpacity={1}
                    onPress={() => setShowDropdown(false)}
                />
            )}

            {/* 1. Header: User Info (NOW AT TOP) */}
            <View style={styles.header}>
                <TouchableOpacity
                    style={styles.headerLeft}
                    onPress={() => {
                        const userId = post.user?._id;
                        if (userId) {
                            router.push({ pathname: '/user-profile', params: { userId } });
                        }
                    }}
                >
                    <ProgressiveImage
                        source={{ uri: post.user?.profileImage || 'https://via.placeholder.com/100/1a1a2e/00e5ff?text=User' }}
                        style={styles.avatar}
                        contentFit="cover"
                    />
                    <Text style={styles.username}>{post.user?.username || 'Unknown User'}</Text>
                </TouchableOpacity>

                <View style={{ zIndex: 1001 }}>
                    <TouchableOpacity onPress={() => setShowDropdown(!showDropdown)}>
                        <Ionicons name="ellipsis-horizontal" size={20} color={COLORS.textTertiary} />
                    </TouchableOpacity>

                    {showDropdown && (
                        <View style={localStyles.dropdown}>
                            <TouchableOpacity style={localStyles.dropdownItem} onPress={() => { showAlert({ title: "Report", message: "Thank you for your report. We will review it shortly.", type: "success" }); setShowDropdown(false); }}>
                                <Ionicons name="flag-outline" size={18} color={COLORS.textPrimary} />
                                <Text style={localStyles.dropdownText}>Report</Text>
                            </TouchableOpacity>

                            {isOwner && (
                                <>
                                    <View style={localStyles.divider} />
                                    <TouchableOpacity style={localStyles.dropdownItem} onPress={handleEdit}>
                                        <Ionicons name="create-outline" size={18} color={COLORS.textPrimary} />
                                        <Text style={localStyles.dropdownText}>Edit</Text>
                                    </TouchableOpacity>
                                    <View style={localStyles.divider} />
                                    <TouchableOpacity style={localStyles.dropdownItem} onPress={handleDelete}>
                                        <Ionicons name="trash-outline" size={18} color={COLORS.error} />
                                        <Text style={[localStyles.dropdownText, { color: COLORS.error }]}>Delete</Text>
                                    </TouchableOpacity>
                                </>
                            )}
                        </View>
                    )}
                </View>
            </View>

            {/* 2. Media: Book Image */}
            <TouchableOpacity
                activeOpacity={0.95}
                onPress={() => router.push({ pathname: '/book-detail', params: { bookId: post._id } })}
                style={styles.mediaContainer}
            >
                <ProgressiveImage
                    source={{ uri: post.image }}
                    style={styles.image}
                    placeholder="L6PZfS9F00~q%M_3wd9F00_S%M%M"
                />

                {/* Readable Indicator */}
                {post.hasContent && (
                    <TouchableOpacity
                        style={{
                            position: 'absolute',
                            bottom: 12,
                            right: 12,
                            backgroundColor: COLORS.overlay,
                            flexDirection: 'row',
                            alignItems: 'center',
                            paddingVertical: 6,
                            paddingHorizontal: 12,
                            borderRadius: 20,
                            gap: 6
                        }}
                        onPress={(e) => {
                            e.stopPropagation();
                            router.push({ pathname: '/book-detail', params: { bookId: post._id, tab: 'read' } })
                        }}
                    >
                        <Ionicons name="book" size={14} color="#fff" />
                        <Text style={{ color: '#fff', fontSize: 12, fontWeight: '700' }}>Read</Text>
                    </TouchableOpacity>
                )}
            </TouchableOpacity>

            {/* 3. Actions Row */}
            {/* 3. Actions Row */}
            <View style={styles.actionRow}>
                <View style={styles.leftActions}>
                    <LikeButton
                        bookId={post._id}
                        initialLiked={post.isLiked}
                        initialCount={post.likeCount || 0}
                        initialCommentCount={post.commentCount || 0}
                        size={24}
                        showCount={false}
                    />
                    <TouchableOpacity
                        style={styles.actionButton}
                        onPress={() => router.push({ pathname: '/book-detail', params: { bookId: post._id, tab: 'comments' } })}
                    >
                        <Ionicons name="chatbubble-outline" size={22} color={COLORS.textPrimary} />
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.actionButton} onPress={() => setShareVisible(true)}>
                        <Ionicons name="paper-plane-outline" size={22} color={COLORS.textPrimary} />
                    </TouchableOpacity>
                </View>
                <BookmarkButton
                    bookId={post._id}
                    initialBookmarked={post.isBookmarked}
                    size={22}
                    style={styles.actionButton}
                />
            </View>

            <ShareSheet
                visible={shareVisible}
                onClose={() => setShareVisible(false)}
                content={{
                    type: 'book',
                    data: post
                }}
            />

            {/* 4. Likes Count Label */}
            {
                syncedLikeCount > 0 ? (
                    <Text style={styles.likesText}>{syncedLikeCount.toLocaleString()} likes</Text>
                ) : null
            }

            {/* 5. Content Strip (Rating + Title/Caption) */}
            <View style={styles.ratingStrip}>
                {renderStars(post.rating)}
            </View>

            <View style={styles.contentSection}>
                <Text style={styles.captionText} numberOfLines={3}>
                    <Text style={{ fontWeight: '800', color: COLORS.textPrimary }}>{post.title}</Text>
                    {": "}
                    {post.caption}
                </Text>

                {/* Comment Summary */}
                {syncedCommentCount > 0 ? (
                    <TouchableOpacity
                        onPress={() => router.push({ pathname: '/book-detail', params: { bookId: post._id, tab: 'comments' } })}
                        style={{ marginTop: 8 }}
                    >
                        <Text style={styles.viewComments}>View all {syncedCommentCount} comments</Text>
                    </TouchableOpacity>
                ) : null}
            </View>

            {/* 6. Date */}
            <Text style={styles.timeAgo}>{formatPublishDate(post.createdAt)}</Text>
        </Animated.View >
    );
};

export default SocialPostCard;
