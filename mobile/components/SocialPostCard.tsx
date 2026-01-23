// f:\rn-wss-android\rn-bookworm\mobile\components\SocialPostCard.tsx
import React from 'react';
import { View, Text, TouchableOpacity, Alert, StyleSheet } from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from 'expo-router';
import COLORS from '../constants/colors';
import styles from '../assets/styles/post.styles';
import LikeButton from './LikeButton';
import { formatPublishDate } from '../lib/utils';
import Animated, { FadeIn } from 'react-native-reanimated';
import BookmarkButton from './BookmarkButton';
import { useAuthStore } from '../store/authContext';
import { apiClient } from '../lib/apiClient';

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
    dropdown: {
        position: 'absolute',
        top: 45,
        right: 15,
        backgroundColor: COLORS.surface || '#2a2a2a',
        borderRadius: 12,
        padding: 8,
        minWidth: 150,
        zIndex: 1000,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 4.65,
        elevation: 8,
        borderWidth: 1,
        borderColor: COLORS.borderLight || '#3a3a3a',
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
        backgroundColor: COLORS.borderLight || '#3a3a3a',
        marginVertical: 4,
        opacity: 0.5,
    }
});

const SocialPostCard: React.FC<SocialPostCardProps> = ({ post, index, onDelete }) => {
    const router = useRouter();
    const { user, token } = useAuthStore();
    const isOwner = (user?._id || user?.id)?.toString() === ((post.user as any)?._id || (post.user as any)?.id || (typeof post.user === 'string' ? post.user : null))?.toString();
    const [showDropdown, setShowDropdown] = React.useState(false);

    const handleDelete = () => {
        setShowDropdown(false);
        Alert.alert(
            "Delete Book",
            "Are you sure you want to delete this book?",
            [
                { text: "Cancel", style: "cancel" },
                {
                    text: "Delete",
                    style: "destructive",
                    onPress: async () => {
                        try {
                            await apiClient.delete(`/api/books/${post._id}`);
                            if (onDelete) onDelete(post._id);
                        } catch (error: any) {
                            Alert.alert("Error", error.message || "Failed to delete book");
                        }
                    }
                }
            ]
        );
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
                    color={i <= rating ? COLORS.gold : COLORS.textMuted}
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

            {/* Header: Avatar + Username */}
            <View style={styles.header}>
                <TouchableOpacity
                    style={styles.headerLeft}
                    onPress={() => router.push({ pathname: '/user-profile', params: { userId: post.user._id } })}
                >
                    <Image source={{ uri: post.user.profileImage }} style={styles.avatar} contentFit="cover" />
                    <Text style={styles.username}>{post.user.username}</Text>
                </TouchableOpacity>

                <View style={{ zIndex: 1001 }}>
                    <TouchableOpacity onPress={() => setShowDropdown(!showDropdown)}>
                        <Ionicons name="ellipsis-horizontal" size={20} color={COLORS.textTertiary} />
                    </TouchableOpacity>

                    {showDropdown && (
                        <View style={localStyles.dropdown}>
                            <TouchableOpacity style={localStyles.dropdownItem} onPress={() => { Alert.alert("Report", "Thank you for your report. We will review it shortly."); setShowDropdown(false); }}>
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
                                        <Ionicons name="trash-outline" size={18} color={COLORS.error || '#ef4444'} />
                                        <Text style={[localStyles.dropdownText, { color: COLORS.error || '#ef4444' }]}>Delete</Text>
                                    </TouchableOpacity>
                                </>
                            )}
                        </View>
                    )}
                </View>
            </View>

            {/* Media: Full-width square Image */}
            <TouchableOpacity
                activeOpacity={0.95}
                onPress={() => router.push({ pathname: '/book-detail', params: { bookId: post._id } })}
                style={styles.mediaContainer}
            >
                <Image
                    source={{ uri: post.image }}
                    style={styles.image}
                    contentFit="cover"
                    transition={300}
                    placeholder="L6PZfS9F00~q%M_3wd9F00_S%M%M"
                />

                {/* Readable Indicator / Quick Read */}
                {post.hasContent && (
                    <TouchableOpacity
                        style={{
                            position: 'absolute',
                            bottom: 12,
                            right: 12,
                            backgroundColor: 'rgba(0,0,0,0.7)',
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


            {/* Actions: Interaction buttons */}
            <View style={styles.actionRow}>
                <View style={styles.leftActions}>
                    <LikeButton
                        bookId={post._id}
                        initialLiked={post.isLiked}
                        initialCount={post.likeCount || 0}
                        size={24}
                        showCount={false}
                    />
                    <TouchableOpacity
                        style={styles.actionButton}
                        onPress={() => router.push({ pathname: '/book-detail', params: { bookId: post._id, tab: 'comments' } })}
                    >
                        <Ionicons name="chatbubble-outline" size={22} color={COLORS.textPrimary} />
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.actionButton}>
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

            {/* Likes Count */}
            {post.likeCount && post.likeCount > 0 ? (
                <Text style={styles.likesText}>{post.likeCount.toLocaleString()} likes</Text>
            ) : null}

            {/* Rating Strip */}
            <View style={styles.ratingStrip}>
                {renderStars(post.rating)}
            </View>

            {/* Content: Title & Caption */}
            <View style={styles.contentSection}>
                <Text style={styles.captionText} numberOfLines={2}>
                    <Text style={styles.captionUsername}>{post.user.username} </Text>
                    <Text style={{ fontWeight: '700', color: COLORS.textPrimary }}>{post.title}</Text>
                    {": "}
                    {post.caption}
                </Text>
            </View>

            {/* Comment Summary */}
            {post.commentCount && post.commentCount > 0 ? (
                <TouchableOpacity onPress={() => router.push({ pathname: '/book-detail', params: { bookId: post._id, tab: 'comments' } })}>
                    <Text style={styles.viewComments}>View all {post.commentCount} comments</Text>
                </TouchableOpacity>
            ) : null}

            {/* Footer: Date */}
            <Text style={styles.timeAgo}>{formatPublishDate(post.createdAt)}</Text>
        </Animated.View>
    );
};

export default SocialPostCard;
