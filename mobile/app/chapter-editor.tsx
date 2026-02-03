import { View, Text, StyleSheet, TextInput, TouchableOpacity, ActivityIndicator, StyleSheet as RNStyleSheet, Platform } from 'react-native';
import React, { useState, useEffect } from 'react';
import { useLocalSearchParams, Stack, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import COLORS from '../constants/colors';
import { API_URL } from '../constants/api';
import { useAuthStore } from '../store/authContext';
import { useUIStore } from '../store/uiStore';
import KeyboardScreen from '../components/KeyboardScreen';
import SafeScreen from '../components/SafeScreen';

export default function ChapterEditor() {
    const { bookId, chapterNumber, isNew } = useLocalSearchParams<{ bookId: string; chapterNumber?: string; isNew?: string }>();

    const [title, setTitle] = useState('');
    const [content, setContent] = useState('');
    const [chNum, setChNum] = useState(chapterNumber || '');
    const [isPremium, setIsPremium] = useState(false);
    const [loading, setLoading] = useState(false);
    const [fetching, setFetching] = useState(false);

    const { token } = useAuthStore();
    const router = useRouter();
    const { showAlert } = useUIStore();

    useEffect(() => {
        if (!isNew && chapterNumber) {
            fetchChapterDetails();
        }
    }, [chapterNumber]);

    const fetchChapterDetails = async () => {
        setFetching(true);
        try {
            const response = await fetch(`${API_URL}/api/chapters/${bookId}/chapters/${chapterNumber}/read`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const data = await response.json();
            if (!response.ok) throw new Error(data.message);

            setTitle(data.chapter.title);
            setContent(data.chapter.content);
            setChNum(data.chapter.chapterNumber.toString());
        } catch (error: any) {
            showAlert({ title: 'Error', message: 'Failed to load chapter content', type: 'error' });
        } finally {
            setFetching(false);
        }
    };

    const handleSave = async () => {
        if (!title.trim() || !content.trim() || !chNum) {
            showAlert({ title: 'Error', message: 'Chapter number, title, and content are required', type: 'error' });
            return;
        }

        setLoading(true);
        try {
            const url = isNew
                ? `${API_URL}/api/chapters/${bookId}/chapters`
                : `${API_URL}/api/chapters/${bookId}/chapters/${chapterNumber}`;

            const method = isNew ? 'POST' : 'PUT';

            const response = await fetch(url, {
                method,
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    chapterNumber: parseInt(chNum),
                    title,
                    content,
                    isPremium
                })
            });

            const data = await response.json();
            if (!response.ok) throw new Error(data.message);

            showAlert({
                title: 'Success',
                message: isNew ? 'Chapter created!' : 'Chapter updated!',
                type: 'success',
                onConfirm: () => router.back()
            });
        } catch (error: any) {
            showAlert({ title: 'Error', message: error.message, type: 'error' });
        } finally {
            setLoading(false);
        }
    };

    if (fetching) {
        return (
            <SafeScreen top={true}>
                <View style={styles.loadingContainer}>
                    <ActivityIndicator size="large" color={COLORS.primary} />
                </View>
            </SafeScreen>
        );
    }

    return (
        <SafeScreen top={true}>
            <Stack.Screen options={{
                title: isNew ? 'New Chapter' : `Editing Ch ${chapterNumber}`,
                headerTintColor: COLORS.textPrimary,
                headerRight: () => (
                    <TouchableOpacity onPress={handleSave} disabled={loading} style={styles.saveBtn}>
                        {loading ? <ActivityIndicator size="small" color={COLORS.primary} /> : <Text style={styles.saveBtnText}>Save</Text>}
                    </TouchableOpacity>
                )
            }} />

            <KeyboardScreen
                style={{ flex: 1 }}
                contentContainerStyle={styles.container}
            >
                <View style={styles.settingsRow}>
                    <View style={[styles.inputGroup, { flex: 1, marginRight: 12 }]}>
                        <Text style={styles.label}>Chapter Number</Text>
                        <TextInput
                            style={styles.input}
                            value={chNum}
                            onChangeText={setChNum}
                            keyboardType="numeric"
                            placeholder="1"
                            placeholderTextColor={COLORS.textMuted}
                            editable={!!isNew}
                        />
                    </View>
                    <TouchableOpacity
                        style={[styles.premiumBtn, isPremium && styles.premiumBtnActive]}
                        onPress={() => setIsPremium(!isPremium)}
                    >
                        <Ionicons name={isPremium ? "star" : "star-outline"} size={16} color={isPremium ? COLORS.white : COLORS.ratingGold} />
                        <Text style={[styles.premiumText, isPremium && { color: COLORS.white }]}>Premium</Text>
                    </TouchableOpacity>
                </View>

                <View style={styles.inputGroup}>
                    <Text style={styles.label}>Chapter Title</Text>
                    <TextInput
                        style={styles.input}
                        value={title}
                        onChangeText={setTitle}
                        placeholder="A New Beginning"
                        placeholderTextColor={COLORS.textMuted}
                    />
                </View>

                <View style={[styles.inputGroup, { flex: 1 }]}>
                    <Text style={styles.label}>Content</Text>
                    <TextInput
                        style={styles.contentInput}
                        value={content}
                        onChangeText={setContent}
                        placeholder="Once upon a time..."
                        placeholderTextColor={COLORS.textMuted}
                        multiline
                        textAlignVertical="top"
                    />
                </View>
            </KeyboardScreen>
        </SafeScreen>
    );
}

const styles = StyleSheet.create({
    container: { padding: 16, flexGrow: 1 },
    loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    settingsRow: { flexDirection: 'row', alignItems: 'flex-end', marginBottom: 20 },
    inputGroup: { marginBottom: 20 },
    label: { fontSize: 13, fontWeight: '700', color: COLORS.textTertiary, marginBottom: 8, textTransform: 'uppercase' },
    input: {
        backgroundColor: COLORS.surfaceHighlight,
        borderRadius: 12,
        padding: 14,
        color: COLORS.textPrimary,
        fontSize: 16,
        borderWidth: 1,
        borderColor: COLORS.glassBorder
    },
    contentInput: {
        flex: 1,
        minHeight: 400,
        backgroundColor: COLORS.surfaceHighlight,
        borderRadius: 16,
        padding: 20,
        color: COLORS.textPrimary,
        fontSize: 17,
        lineHeight: 26,
        borderWidth: 1,
        borderColor: COLORS.glassBorder
    },
    premiumBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: COLORS.ratingGold + '15',
        paddingHorizontal: 16,
        paddingVertical: 12,
        borderRadius: 12,
        gap: 6,
        marginBottom: 20,
        borderWidth: 1,
        borderColor: COLORS.ratingGold + '30'
    },
    premiumBtnActive: { backgroundColor: COLORS.ratingGold },
    premiumText: { fontWeight: '700', color: COLORS.ratingGold, fontSize: 14 },
    saveBtn: { marginRight: 8, paddingHorizontal: 12, paddingVertical: 6 },
    saveBtnText: { color: COLORS.primary, fontWeight: '800', fontSize: 16 },
});
