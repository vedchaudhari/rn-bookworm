
import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, FlatList, ActivityIndicator, Image, ScrollView } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useAuthStore } from '../../../store/authContext';
import COLORS from '../../../constants/colors';
import { API_URL } from '../../../constants/api';
import SafeScreen from '../../../components/SafeScreen';
import { format } from 'date-fns';

interface UserInfo {
    _id: string;
    username: string;
    profileImage: string;
}

interface StatusEntry {
    user: UserInfo;
    readAt?: string;
    deliveredAt?: string;
}

interface MessageDetails {
    _id: string;
    text?: string;
    image?: string;
    createdAt: string;
    sender: UserInfo;
    readBy: StatusEntry[];
    deliveredTo: StatusEntry[];
}

export default function MessageInfoScreen() {
    const { id: clubId, messageId } = useLocalSearchParams<{ id: string; messageId: string }>();
    const router = useRouter();
    const { token } = useAuthStore();
    const [message, setMessage] = useState<MessageDetails | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchMessageDetails();
    }, [messageId]);

    const fetchMessageDetails = async () => {
        try {
            const response = await fetch(`${API_URL}/api/clubs/${clubId}/messages/${messageId}`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            const data = await response.json();
            if (response.ok) {
                setMessage(data);
            }
        } catch (error) {
            console.error('Error fetching message details:', error);
        } finally {
            setLoading(false);
        }
    };

    const renderUserItem = ({ item, type }: { item: StatusEntry, type: 'Read' | 'Delivered' }) => (
        <View style={styles.userRow}>
            <Image source={{ uri: item.user.profileImage }} style={styles.avatar} />
            <View style={styles.userInfo}>
                <Text style={styles.username}>{item.user.username}</Text>
                <Text style={styles.timestamp}>
                    {type === 'Read'
                        ? (item.readAt ? format(new Date(item.readAt), 'p • MMM d') : '')
                        : (item.deliveredAt ? format(new Date(item.deliveredAt), 'p • MMM d') : '')}
                </Text>
            </View>
            <Ionicons
                name={type === 'Read' ? "checkmark-done" : "checkmark-done"}
                size={20}
                color={type === 'Read' ? "#34B7F1" : COLORS.textMuted}
            />
        </View>
    );

    if (loading) {
        return (
            <SafeScreen>
                <View style={[styles.container, styles.center]}>
                    <ActivityIndicator size="large" color={COLORS.primary} />
                </View>
            </SafeScreen>
        );
    }

    if (!message) {
        return (
            <SafeScreen>
                <View style={[styles.container, styles.center]}>
                    <Text style={styles.errorText}>Message not found</Text>
                </View>
            </SafeScreen>
        );
    }

    // Filter out duplicates (if any) and separate lists
    // Note: readBy implies delivered, but we show explicit lists as per WhatsApp
    // WhatsApp logic: Read By list, Delivered To list (excluding those who read it? No, usually separate lists or "Remaining")
    // Let's show:
    // 1. Read By
    // 2. Delivered To (Remaining?) -> WhatsApp shows "Read by" and "Delivered to" separately.
    // "Delivered to" usually includes everyone who got it. "Read by" is a subset.
    // But typically you want to see who received it but hasn't read it yet under "Delivered to".

    const readIds = new Set(message.readBy.map(r => r.user._id));
    const deliveredToRemaining = message.deliveredTo.filter(d => !readIds.has(d.user._id));

    return (
        <SafeScreen>
            <View style={styles.header}>
                <Ionicons name="arrow-back" size={24} color={COLORS.textPrimary} onPress={() => router.back()} />
                <Text style={styles.headerTitle}>Message Info</Text>
            </View>

            <ScrollView style={styles.content}>
                {/* Message Preview */}
                <View style={styles.messagePreview}>
                    <View style={[styles.bubble, { alignSelf: 'flex-end', backgroundColor: '#005C4B' }]}>
                        <Text style={styles.messageText}>{message.text}</Text>
                        <Text style={styles.messageTime}>{format(new Date(message.createdAt), 'p')}</Text>
                    </View>
                </View>

                {/* Read By Section */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Read by</Text>
                    <Ionicons name="checkmark-done" size={18} color="#34B7F1" style={styles.sectionIcon} />
                </View>
                {message.readBy.length > 0 ? (
                    message.readBy.map(item => (
                        <View key={item.user._id} style={styles.itemContainer}>
                            {renderUserItem({ item, type: 'Read' })}
                        </View>
                    ))
                ) : (
                    <Text style={styles.emptyText}>No views yet</Text>
                )}

                <View style={styles.divider} />

                {/* Delivered To Section */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Delivered to</Text>
                    <Ionicons name="checkmark-done" size={18} color={COLORS.textMuted} style={styles.sectionIcon} />
                </View>
                {deliveredToRemaining.length > 0 ? (
                    deliveredToRemaining.map(item => (
                        <View key={item.user._id} style={styles.itemContainer}>
                            {renderUserItem({ item, type: 'Delivered' })}
                        </View>
                    ))
                ) : (
                    <Text style={styles.emptyText}>
                        {message.readBy.length > 0 ? 'All recipients have read' : 'No deliveries yet'}
                    </Text>
                )}
            </ScrollView>
        </SafeScreen>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: COLORS.background,
    },
    center: {
        justifyContent: 'center',
        alignItems: 'center',
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 16,
        borderBottomWidth: 1,
        borderBottomColor: COLORS.glassBorder,
    },
    headerTitle: {
        fontSize: 20,
        fontWeight: 'bold',
        color: COLORS.textPrimary,
        marginLeft: 16,
    },
    content: {
        flex: 1,
    },
    messagePreview: {
        padding: 20,
        backgroundColor: COLORS.surface,
        marginBottom: 10,
    },
    bubble: {
        borderRadius: 10,
        padding: 10,
        maxWidth: '80%',
    },
    messageText: {
        color: '#FFFFFF',
        fontSize: 16,
    },
    messageTime: {
        color: 'rgba(255,255,255,0.6)',
        fontSize: 10,
        alignSelf: 'flex-end',
        marginTop: 4,
    },
    section: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 16,
        backgroundColor: COLORS.surfaceHighlight,
    },
    sectionTitle: {
        fontSize: 14,
        fontWeight: '600',
        color: COLORS.textSecondary,
        flex: 1,
    },
    sectionIcon: {
        marginLeft: 8,
    },
    userRow: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 16,
    },
    avatar: {
        width: 40,
        height: 40,
        borderRadius: 20,
        marginRight: 12,
    },
    userInfo: {
        flex: 1,
    },
    username: {
        fontSize: 16,
        fontWeight: '600',
        color: COLORS.textPrimary,
    },
    timestamp: {
        fontSize: 12,
        color: COLORS.textMuted,
    },
    divider: {
        height: 1,
        backgroundColor: COLORS.glassBorder,
        marginVertical: 8,
    },
    itemContainer: {
        backgroundColor: COLORS.background,
    },
    emptyText: {
        padding: 16,
        color: COLORS.textMuted,
        fontStyle: 'italic',
    },
    errorText: {
        color: COLORS.error,
        fontSize: 16,
    }
});
