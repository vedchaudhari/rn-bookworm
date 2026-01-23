import { View, Text, TextInput, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
import React, { useState } from 'react';
import { useLocalSearchParams, useRouter, Stack } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import COLORS from '../constants/colors';
import { useBookNoteStore } from '../store/bookNoteStore';
import { useUIStore } from '../store/uiStore';
import KeyboardScreen from '../components/KeyboardScreen';
import SafeScreen from '../components/SafeScreen';
import { SPACING, BORDER_RADIUS, FONT_SIZE, SHADOWS } from '../constants/styleConstants';

export default function CreateNoteScreen() {
    const { bookId, bookshelfItemId, bookTitle } = useLocalSearchParams<{
        bookId: string;
        bookshelfItemId: string;
        bookTitle: string;
    }>();
    const router = useRouter();
    const { createNote, isCreating } = useBookNoteStore();
    const { showAlert } = useUIStore();

    const [note, setNote] = useState('');
    const [pageNumber, setPageNumber] = useState('');
    const [highlight, setHighlight] = useState('');
    const [type, setType] = useState<'note' | 'highlight'>('note');
    const [tags, setTags] = useState('');

    const handleSave = async () => {
        if (!note.trim() && !highlight.trim()) {
            showAlert({ title: 'Error', message: 'Please enter a note or highlight', type: 'error' });
            return;
        }

        const page = parseInt(pageNumber);
        if (isNaN(page)) {
            showAlert({ title: 'Error', message: 'Please enter a valid page number', type: 'error' });
            return;
        }

        if (!bookId || !bookshelfItemId) {
            showAlert({ title: 'Error', message: 'Missing book information', type: 'error' });
            return;
        }

        const success = await createNote({
            bookId,
            bookshelfItemId,
            type,
            pageNumber: page,
            userNote: note.trim(),
            highlightedText: highlight.trim(),
            visibility: 'private',
            tags: tags.split(',').map(tag => tag.trim()).filter(tag => tag.length > 0)
        });

        if (success) {
            router.back();
        } else {
            showAlert({ title: 'Error', message: 'Failed to create note. Please try again.', type: 'error' });
        }
    };

    return (
        <SafeScreen top={true}>
            <Stack.Screen
                options={{
                    headerTitle: 'Add Note',
                    headerLeft: () => (
                        <TouchableOpacity onPress={() => router.back()} style={{ marginLeft: 10 }}>
                            <Ionicons name="close" size={24} color={COLORS.textPrimary} />
                        </TouchableOpacity>
                    ),
                    headerShown: true
                }}
            />
            <KeyboardScreen
                style={styles.container}
                contentContainerStyle={styles.content}
            >
                <Text style={styles.bookTitle}>{bookTitle}</Text>

                <View style={styles.typeSelector}>
                    <TouchableOpacity
                        style={[styles.typeBtn, type === 'note' && styles.typeBtnActive]}
                        onPress={() => setType('note')}
                    >
                        <Text style={[styles.typeText, type === 'note' && styles.typeTextActive]}>Note</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                        style={[styles.typeBtn, type === 'highlight' && styles.typeBtnActive]}
                        onPress={() => setType('highlight')}
                    >
                        <Text style={[styles.typeText, type === 'highlight' && styles.typeTextActive]}>Highlight</Text>
                    </TouchableOpacity>
                </View>

                <View style={styles.inputGroup}>
                    <Text style={styles.label}>Page Number</Text>
                    <TextInput
                        style={styles.input}
                        value={pageNumber}
                        onChangeText={setPageNumber}
                        placeholder="e.g. 42"
                        keyboardType="numeric"
                        placeholderTextColor={COLORS.textMuted}
                    />
                </View>

                {type === 'highlight' && (
                    <View style={styles.inputGroup}>
                        <Text style={styles.label}>Highlighted Text</Text>
                        <TextInput
                            style={[styles.input, styles.textArea]}
                            value={highlight}
                            onChangeText={setHighlight}
                            placeholder="Quote from the book..."
                            multiline
                            numberOfLines={3}
                            placeholderTextColor={COLORS.textMuted}
                        />
                    </View>
                )}

                <View style={styles.inputGroup}>
                    <Text style={styles.label}>{type === 'highlight' ? 'Add Personal Note (Optional)' : 'Your Note'}</Text>
                    <TextInput
                        style={[styles.input, styles.textArea]}
                        value={note}
                        onChangeText={setNote}
                        placeholder="What are your thoughts?"
                        multiline
                        numberOfLines={5}
                        placeholderTextColor={COLORS.textMuted}
                    />
                </View>

                <View style={styles.inputGroup}>
                    <Text style={styles.label}>Tags (comma separated)</Text>
                    <TextInput
                        style={styles.input}
                        value={tags}
                        onChangeText={setTags}
                        placeholder="thought, theory, character..."
                        placeholderTextColor={COLORS.textMuted}
                    />
                </View>

                <TouchableOpacity
                    style={[styles.saveBtn, isCreating && styles.saveBtnDisabled]}
                    onPress={handleSave}
                    disabled={isCreating}
                >
                    {isCreating ? (
                        <ActivityIndicator color="#fff" size="small" />
                    ) : (
                        <Text style={styles.saveBtnText}>Save Note</Text>
                    )}
                </TouchableOpacity>
            </KeyboardScreen>
        </SafeScreen>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: COLORS.background },
    content: { padding: SPACING.lg },
    bookTitle: { fontSize: FONT_SIZE.lg, fontWeight: '800', color: COLORS.textPrimary, marginBottom: SPACING.xl },
    typeSelector: { flexDirection: 'row', backgroundColor: COLORS.surface, borderRadius: 12, padding: 4, marginBottom: SPACING.xl },
    typeBtn: { flex: 1, paddingVertical: 10, alignItems: 'center', borderRadius: 8 },
    typeBtnActive: { backgroundColor: COLORS.surfaceHighlight },
    typeText: { fontSize: 14, fontWeight: '600', color: COLORS.textSecondary },
    typeTextActive: { color: COLORS.white },
    inputGroup: { marginBottom: SPACING.lg },
    label: { fontSize: 14, fontWeight: '600', color: COLORS.textSecondary, marginBottom: 8 },
    input: { backgroundColor: COLORS.surface, borderRadius: 12, padding: 12, color: COLORS.textPrimary, fontSize: 15, borderWidth: 1, borderColor: COLORS.borderLight },
    textArea: { minHeight: 100, textAlignVertical: 'top' },
    saveBtn: { backgroundColor: COLORS.primary, borderRadius: 16, paddingVertical: 16, alignItems: 'center', marginTop: SPACING.xl, ...SHADOWS.medium },
    saveBtnDisabled: { opacity: 0.7 },
    saveBtnText: { color: '#fff', fontSize: 16, fontWeight: '800' },
});
