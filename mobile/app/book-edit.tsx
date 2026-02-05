// mobile/app/book-edit.tsx
import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, ActivityIndicator, StyleSheet, KeyboardAvoidingView, ScrollView, Platform } from 'react-native';
import { useLocalSearchParams, useRouter, Stack, useNavigation } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import COLORS from '../constants/colors';
import { apiClient } from '../lib/apiClient';
import { useUIStore } from '../store/uiStore';
import SafeScreen from '../components/SafeScreen';
import GlassCard from '../components/GlassCard';

export default function BookEditScreen() {
    const { bookId } = useLocalSearchParams<{ bookId: string }>();
    const router = useRouter();
    const navigation = useNavigation();
    const insets = useSafeAreaInsets();
    const { showAlert } = useUIStore();

    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    const [title, setTitle] = useState('');
    const [caption, setCaption] = useState('');
    const [rating, setRating] = useState(0);
    const [genre, setGenre] = useState('');
    const [author, setAuthor] = useState('');
    const [image, setImage] = useState('');

    useEffect(() => {
        if (bookId) fetchBook();
    }, [bookId]);

    const fetchBook = async () => {
        try {
            setLoading(true);
            const data = await apiClient.get<any>('/api/books', { page: 1, limit: 100 });
            const book = data.books.find((b: any) => b._id === bookId);

            if (book) {
                setTitle(book.title);
                setCaption(book.caption);
                setRating(book.rating);
                setGenre(book.genre || '');
                setAuthor(book.author || '');
                setImage(book.image);
            } else {
                showAlert({
                    title: 'Error',
                    message: 'Book not found',
                    type: 'error',
                    onConfirm: () => router.back()
                });
            }
        } catch (error: any) {
            showAlert({ title: 'Error', message: error.message || 'Failed to fetch book', type: 'error' });
        } finally {
            setLoading(false);
        }
    };

    const handleSave = async () => {
        console.log('[BookEdit] handleSave called, bookId:', bookId, 'type:', typeof bookId);

        if (!bookId || typeof bookId !== 'string') {
            console.error('[BookEdit] Invalid bookId');
            showAlert({ title: 'Error', message: 'Invalid Book ID', type: 'error' });
            return;
        }

        if (!title.trim() || !caption.trim()) {
            console.log('[BookEdit] Validation failed');
            showAlert({ title: 'Error', message: 'Title and caption are required', type: 'error' });
            return;
        }

        try {
            console.log('[BookEdit] Starting save...');
            setSaving(true);
            console.log('[BookEdit] sending PATCH request to /api/books/' + bookId);

            // Adding specific timeout for debugging
            const response = await apiClient.patch(`/api/books/${bookId}`, {
                title,
                caption,
                rating,
                genre,
                author,
            }, { timeout: 10000 } as any);

            console.log('[BookEdit] Save success, response:', response);
            showAlert({
                title: 'Success',
                message: 'Book updated successfully',
                type: 'success',
                onConfirm: () => {
                    console.log('[BookEdit] Alert confirmed, redirecting...');
                    try {
                        router.replace({
                            pathname: '/book-detail',
                            params: { bookId: bookId }
                        } as any);
                    } catch (e) {
                        console.error('[BookEdit] Redirect error:', e);
                        router.replace('/(tabs)/books' as any);
                    }
                }
            });
        } catch (error: any) {
            console.error('[BookEdit] Save error:', error);
            const errMsg = error.message || 'Failed to update book';
            if (errMsg.includes('timeout')) {
                showAlert({ title: 'Timeout', message: 'The server is not responding. Check your connection.', type: 'error' });
            } else {
                showAlert({ title: 'Error', message: errMsg, type: 'error' });
            }
        } finally {
            console.log('[BookEdit] Finally block - stopping spinner');
            setSaving(false);
        }
    };

    const renderStars = () => {
        return (
            <View style={styles.starContainer}>
                {[1, 2, 3, 4, 5].map((star) => (
                    <TouchableOpacity key={star} onPress={() => setRating(star)}>
                        <Ionicons
                            name={star <= rating ? "star" : "star-outline"}
                            size={32}
                            color={star <= rating ? COLORS.ratingGold : COLORS.textTertiary}
                        />
                    </TouchableOpacity>
                ))}
            </View>
        );
    };

    if (loading) {
        return (
            <SafeScreen><View style={styles.center}><ActivityIndicator size="large" color={COLORS.primary} /></View></SafeScreen>
        );
    }

    return (
        <SafeScreen top={true} bottom={true}>
            <Stack.Screen options={{ headerShown: false }} />

            <View style={[styles.header, { paddingTop: insets.top }]}>
                <TouchableOpacity onPress={() => router.back()} style={styles.headerButton}>
                    <Ionicons name="close" size={28} color={COLORS.textPrimary} />
                    <Text style={styles.headerTitle}>Edit Book</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={handleSave} disabled={saving}>
                    {saving ? (
                        <ActivityIndicator size="small" color={COLORS.primary} />
                    ) : (
                        <Text style={styles.saveText}>Save</Text>
                    )}
                </TouchableOpacity>
            </View>

            <KeyboardAvoidingView
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                style={styles.container}
            >
                <ScrollView
                    contentContainerStyle={styles.scrollContent}
                    keyboardShouldPersistTaps="handled"
                    showsVerticalScrollIndicator={false}
                >
                    <View style={styles.imageContainer}>
                        <Image source={{ uri: image }} style={styles.bookImage} contentFit="cover" />
                        <View style={styles.imageOverlay}>
                            <Ionicons name="camera" size={24} color="#fff" />
                            <Text style={styles.overlayText}>Image cannot be changed here</Text>
                        </View>
                    </View>

                    <View style={styles.form}>
                        <Text style={styles.label}>Title</Text>
                        <TextInput
                            style={styles.input}
                            value={title}
                            onChangeText={setTitle}
                            placeholder="Book Title"
                            placeholderTextColor={COLORS.textMuted}
                        />

                        <Text style={styles.label}>Author</Text>
                        <TextInput
                            style={styles.input}
                            value={author}
                            onChangeText={setAuthor}
                            placeholder="Author Name"
                            placeholderTextColor={COLORS.textMuted}
                        />

                        <Text style={styles.label}>Genre</Text>
                        <TextInput
                            style={styles.input}
                            value={genre}
                            onChangeText={setGenre}
                            placeholder="Genre (e.g. Fiction, Sci-Fi)"
                            placeholderTextColor={COLORS.textMuted}
                        />

                        <Text style={styles.label}>Rating</Text>
                        {renderStars()}

                        <Text style={styles.label}>Caption / Description</Text>
                        <TextInput
                            style={[styles.input, styles.textArea]}
                            value={caption}
                            onChangeText={setCaption}
                            placeholder="Write a short caption..."
                            placeholderTextColor={COLORS.textMuted}
                            multiline
                            numberOfLines={4}
                        />
                    </View>
                </ScrollView>
            </KeyboardAvoidingView>
        </SafeScreen>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: COLORS.background },
    scrollContent: { padding: 20 },
    center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 20,
        paddingBottom: 20,
        backgroundColor: COLORS.background,
    },
    headerButton: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
    },
    headerTitle: {
        fontSize: 20,
        fontWeight: '800',
        color: COLORS.textPrimary,
    },
    saveText: { color: COLORS.primary, fontWeight: '700', fontSize: 16 },
    imageContainer: { width: '100%', height: 200, borderRadius: 16, overflow: 'hidden', marginBottom: 24, position: 'relative' },
    bookImage: { width: '100%', height: '100%' },
    imageOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: COLORS.overlay, justifyContent: 'center', alignItems: 'center', gap: 8 },
    overlayText: { color: '#fff', fontSize: 12, fontWeight: '600' },
    form: { gap: 16 },
    label: { fontSize: 14, fontWeight: '700', color: COLORS.textSecondary, marginBottom: -8, marginLeft: 4 },
    input: { backgroundColor: COLORS.surface, borderRadius: 12, padding: 16, color: COLORS.textPrimary, fontSize: 16, borderWidth: 1, borderColor: COLORS.glass.border },
    textArea: { minHeight: 120, textAlignVertical: 'top' },
    starContainer: { flexDirection: 'row', gap: 8, paddingVertical: 8 },
    saveButton: { backgroundColor: COLORS.primary, borderRadius: 16, padding: 18, alignItems: 'center', marginTop: 32, marginBottom: 40 },
    buttonText: { color: '#fff', fontSize: 16, fontWeight: '800' },
    disabledButton: { opacity: 0.6 },
});
