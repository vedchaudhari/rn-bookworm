import { View, Text, TextInput, TouchableOpacity, FlatList, StyleSheet, ActivityIndicator, Alert } from 'react-native';
import React, { useState, useEffect } from 'react';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import COLORS from '../constants/colors';
import { useSocialStore } from '../store/socialStore';
import { useAuthStore } from '../store/authContext';
import { API_URL } from '../constants/api';

export default function CommentSection({ bookId }) {
    const [comments, setComments] = useState([]);
    const [commentText, setCommentText] = useState('');
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [deletingId, setDeletingId] = useState(null);
    const [page, setPage] = useState(1);
    const [hasMore, setHasMore] = useState(true);

    const { addComment, deleteComment } = useSocialStore();
    const { token, user } = useAuthStore();

    useEffect(() => {
        fetchComments();
    }, []);

    const fetchComments = async (pageNum = 1) => {
        try {
            const response = await fetch(`${API_URL}/api/social/comments/${bookId}?page=${pageNum}&limit=20`, {
                headers: { 'Authorization': `Bearer ${token}` },
            });

            const data = await response.json();
            if (!response.ok) throw new Error(data.message);

            if (pageNum === 1) {
                setComments(data.comments);
            } else {
                setComments(prev => [...prev, ...data.comments]);
            }

            setHasMore(pageNum < data.totalPages);
            setPage(pageNum);
            setLoading(false);
        } catch (error) {
            console.error('Error fetching comments:', error);
            setLoading(false);
        }
    };

    const handleAddComment = async () => {
        if (!commentText.trim()) return;

        setSubmitting(true);
        const result = await addComment(bookId, commentText.trim(), token);
        setSubmitting(false);

        if (result.success) {
            setComments(prev => [result.comment, ...prev]);
            setCommentText('');
        } else {
            Alert.alert('Error', result.error || 'Failed to add comment');
        }
    };

    const handleDeleteComment = async (commentId) => {
        Alert.alert(
            'Delete Comment',
            'Are you sure you want to delete this comment?',
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Delete',
                    style: 'destructive',
                    onPress: async () => {
                        setDeletingId(commentId);
                        const result = await deleteComment(commentId, token);
                        setDeletingId(null);

                        if (result.success) {
                            setComments(prev => prev.filter(c => c._id !== commentId));
                        } else {
                            Alert.alert('Error', result.error || 'Failed to delete comment');
                        }
                    },
                },
            ]
        );
    };

    const renderComment = ({ item }) => (
        <View style={styles.commentItem}>
            <Image source={{ uri: item.user.profileImage }} style={styles.avatar} />
            <View style={styles.commentContent}>
                <Text style={styles.username}>{item.user.username}</Text>
                <Text style={styles.commentText}>{item.text}</Text>
                <Text style={styles.commentDate}>
                    {new Date(item.createdAt).toLocaleDateString()}
                </Text>
            </View>
            {item.user._id === user.id && (
                <TouchableOpacity
                    onPress={() => handleDeleteComment(item._id)}
                    style={styles.deleteButton}
                >
                    {deletingId === item._id ? (
                        <ActivityIndicator size="small" color={COLORS.primary} />
                    ) : (
                        <Ionicons name="trash-outline" size={18} color="#ff4757" />
                    )}
                </TouchableOpacity>
            )}
        </View>
    );

    if (loading) {
        return (
            <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color={COLORS.primary} />
            </View>
        );
    }

    return (
        <View style={styles.container}>
            <View style={styles.inputContainer}>
                <TextInput
                    style={styles.input}
                    placeholder="Add a comment..."
                    placeholderTextColor={COLORS.placeholderText}
                    value={commentText}
                    onChangeText={setCommentText}
                    multiline
                    maxLength={500}
                />
                <TouchableOpacity
                    onPress={handleAddComment}
                    disabled={!commentText.trim() || submitting}
                    style={[styles.sendButton, (!commentText.trim() || submitting) && styles.sendButtonDisabled]}
                >
                    {submitting ? (
                        <ActivityIndicator size="small" color="#fff" />
                    ) : (
                        <Ionicons name="send" size={20} color="#fff" />
                    )}
                </TouchableOpacity>
            </View>

            <FlatList
                data={comments}
                renderItem={renderComment}
                keyExtractor={(item) => item._id}
                style={styles.commentsList}
                ListEmptyComponent={
                    <View style={styles.emptyContainer}>
                        <Text style={styles.emptyText}>No comments yet</Text>
                        <Text style={styles.emptySubtext}>Be the first to comment!</Text>
                    </View>
                }
                onEndReached={() => {
                    if (hasMore && !loading) {
                        fetchComments(page + 1);
                    }
                }}
                onEndReachedThreshold={0.5}
            />
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20,
    },
    inputContainer: {
        flexDirection: 'row',
        padding: 12,
        borderBottomWidth: 1,
        borderBottomColor: COLORS.border,
        gap: 8,
    },
    input: {
        flex: 1,
        backgroundColor: COLORS.background,
        borderRadius: 20,
        paddingHorizontal: 16,
        paddingVertical: 8,
        maxHeight: 100,
        color: COLORS.textPrimary,
    },
    sendButton: {
        backgroundColor: COLORS.primary,
        width: 40,
        height: 40,
        borderRadius: 20,
        justifyContent: 'center',
        alignItems: 'center',
    },
    sendButtonDisabled: {
        opacity: 0.5,
    },
    commentsList: {
        flex: 1,
    },
    commentItem: {
        flexDirection: 'row',
        padding: 12,
        gap: 10,
        borderBottomWidth: 1,
        borderBottomColor: COLORS.border,
    },
    avatar: {
        width: 36,
        height: 36,
        borderRadius: 18,
    },
    commentContent: {
        flex: 1,
    },
    username: {
        fontWeight: '600',
        color: COLORS.textPrimary,
        marginBottom: 4,
    },
    commentText: {
        color: COLORS.textPrimary,
        marginBottom: 4,
    },
    commentDate: {
        fontSize: 12,
        color: COLORS.textSecondary,
    },
    deleteButton: {
        padding: 4,
    },
    emptyContainer: {
        padding: 40,
        alignItems: 'center',
    },
    emptyText: {
        fontSize: 16,
        color: COLORS.textSecondary,
        marginBottom: 4,
    },
    emptySubtext: {
        fontSize: 14,
        color: COLORS.textSecondary,
    },
});
