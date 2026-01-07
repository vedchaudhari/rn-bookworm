import { View, Text, ScrollView, ActivityIndicator, TouchableOpacity } from 'react-native';
import React, { useState, useEffect } from 'react';
import { useLocalSearchParams, Stack } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import COLORS from '../constants/colors';
import { useAuthStore } from '../store/authContext';
import { API_URL } from '../constants/api';

export default function BookReaderScreen() {
    const { bookId, bookTitle } = useLocalSearchParams();
    const [content, setContent] = useState(null);
    const [loading, setLoading] = useState(true);
    const [fontSize, setFontSize] = useState(16);

    const { token } = useAuthStore();

    useEffect(() => {
        fetchBookContent();
    }, [bookId]);

    const fetchBookContent = async () => {
        try {
            const response = await fetch(`${API_URL}/api/book-content/${bookId}`, {
                headers: { 'Authorization': `Bearer ${token}` },
            });

            const data = await response.json();
            if (!response.ok) throw new Error(data.message);

            setContent(data);
            setLoading(false);
        } catch (error) {
            console.error('Error fetching book content:', error);
            setLoading(false);
        }
    };

    const increaseFontSize = () => {
        setFontSize(prev => Math.min(prev + 2, 24));
    };

    const decreaseFontSize = () => {
        setFontSize(prev => Math.max(prev - 2, 12));
    };

    if (loading) {
        return (
            <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color={COLORS.primary} />
            </View>
        );
    }

    return (
        <>
            <Stack.Screen
                options={{
                    headerShown: true,
                    title: bookTitle,
                    headerStyle: { backgroundColor: COLORS.cardBackground },
                    headerTintColor: COLORS.textPrimary,
                    headerShadowVisible: false,
                    headerRight: () => (
                        <View style={styles.headerControls}>
                            <TouchableOpacity onPress={decreaseFontSize} style={styles.fontButton}>
                                <Ionicons name="remove-circle-outline" size={24} color={COLORS.primary} />
                            </TouchableOpacity>
                            <Text style={styles.fontSizeText}>{fontSize}</Text>
                            <TouchableOpacity onPress={increaseFontSize} style={styles.fontButton}>
                                <Ionicons name="add-circle-outline" size={24} color={COLORS.primary} />
                            </TouchableOpacity>
                        </View>
                    ),
                }}
            />
            <ScrollView style={styles.container} contentContainerStyle={styles.content}>
                {content?.chapters && content.chapters.length > 0 ? (
                    content.chapters.map((chapter, index) => (
                        <View key={index} style={styles.chapter}>
                            <Text style={[styles.chapterTitle, { fontSize: fontSize + 4 }]}>
                                {chapter.title}
                            </Text>
                            <Text style={[styles.chapterContent, { fontSize }]}>
                                {chapter.content}
                            </Text>
                        </View>
                    ))
                ) : content?.content ? (
                    <Text style={[styles.mainContent, { fontSize }]}>
                        {content.content}
                    </Text>
                ) : (
                    <View style={styles.emptyContainer}>
                        <Ionicons name="document-text-outline" size={60} color={COLORS.textSecondary} />
                        <Text style={styles.emptyText}>No content available yet</Text>
                        <Text style={styles.emptySubtext}>
                            The author hasn't added any content to this book
                        </Text>
                    </View>
                )}

                {content && (
                    <View style={styles.footer}>
                        <Text style={styles.footerText}>
                            📖 Read count: {content.readCount || 0}
                        </Text>
                    </View>
                )}
            </ScrollView>
        </>
    );
}

const styles = {
    container: {
        flex: 1,
        backgroundColor: COLORS.background,
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: COLORS.background,
    },
    headerControls: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        marginRight: 8,
    },
    fontButton: {
        padding: 4,
    },
    fontSizeText: {
        fontSize: 14,
        fontWeight: '600',
        color: COLORS.textPrimary,
        minWidth: 24,
        textAlign: 'center',
    },
    content: {
        padding: 20,
        paddingBottom: 40,
    },
    chapter: {
        marginBottom: 32,
    },
    chapterTitle: {
        fontWeight: '700',
        color: COLORS.textPrimary,
        marginBottom: 16,
    },
    chapterContent: {
        color: COLORS.textPrimary,
        lineHeight: 28,
    },
    mainContent: {
        color: COLORS.textPrimary,
        lineHeight: 28,
    },
    emptyContainer: {
        alignItems: 'center',
        padding: 40,
        marginTop: 60,
    },
    emptyText: {
        fontSize: 18,
        fontWeight: '600',
        color: COLORS.textPrimary,
        marginTop: 16,
    },
    emptySubtext: {
        fontSize: 14,
        color: COLORS.textSecondary,
        marginTop: 8,
        textAlign: 'center',
    },
    footer: {
        marginTop: 32,
        paddingTop: 16,
        borderTopWidth: 1,
        borderTopColor: COLORS.border,
        alignItems: 'center',
    },
    footerText: {
        fontSize: 14,
        color: COLORS.textSecondary,
    },
};
