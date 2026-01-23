import { View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator, Alert, RefreshControl, Modal, TextInput, ScrollView } from 'react-native';
import React, { useState, useEffect } from 'react';
import { useLocalSearchParams, Stack, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import COLORS from '../constants/colors';
import { API_URL } from '../constants/api';
import { useAuthStore } from '../store/authContext';
import SafeScreen from '../components/SafeScreen';
import GlassCard from '../components/GlassCard';

interface Chapter {
    _id: string;
    chapterNumber: number;
    title: string;
    isPublished: boolean;
    isPremium: boolean;
    wordCount: number;
    readingTimeEstimate: number;
}

export default function ChapterManager() {
    const { bookId, bookTitle } = useLocalSearchParams<{ bookId: string; bookTitle: string }>();
    const [chapters, setChapters] = useState<Chapter[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);

    // Merge Modal State
    const [showMergeModal, setShowMergeModal] = useState(false);
    const [mergeChapter1, setMergeChapter1] = useState('');
    const [mergeChapter2, setMergeChapter2] = useState('');

    const { token } = useAuthStore();
    const router = useRouter();

    useEffect(() => {
        fetchChapters();
    }, [bookId]);

    const fetchChapters = async () => {
        try {
            const response = await fetch(`${API_URL}/api/chapters/${bookId}/chapters/author`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const data = await response.json();
            if (!response.ok) throw new Error(data.message);
            setChapters(data.chapters);
        } catch (error: any) {
            Alert.alert('Error', error.message || 'Failed to fetch chapters');
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    const handlePublish = async (chapterNumber: number) => {
        try {
            const response = await fetch(`${API_URL}/api/chapters/${bookId}/chapters/${chapterNumber}/publish`, {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (!response.ok) throw new Error('Failed to publish');
            Alert.alert('Success', 'Chapter published!');
            fetchChapters();
        } catch (error: any) {
            Alert.alert('Error', error.message);
        }
    };

    const handleDelete = (chapterNumber: number) => {
        Alert.alert(
            'Delete Chapter',
            `Are you sure you want to delete Chapter ${chapterNumber}?`,
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Delete',
                    style: 'destructive',
                    onPress: async () => {
                        try {
                            const response = await fetch(`${API_URL}/api/chapters/${bookId}/chapters/${chapterNumber}`, {
                                method: 'DELETE',
                                headers: { 'Authorization': `Bearer ${token}` }
                            });
                            if (!response.ok) throw new Error('Failed to delete');
                            fetchChapters();
                        } catch (error: any) {
                            Alert.alert('Error', error.message);
                        }
                    }
                }
            ]
        );
    };

    const handleMerge = async () => {
        if (!mergeChapter1 || !mergeChapter2) return;
        try {
            const response = await fetch(`${API_URL}/api/chapters/${bookId}/merge`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    chapter1Number: parseInt(mergeChapter1),
                    chapter2Number: parseInt(mergeChapter2)
                })
            });
            const data = await response.json();
            if (!response.ok) throw new Error(data.message);

            Alert.alert('Success', 'Chapters merged successfully');
            setShowMergeModal(false);
            setMergeChapter1('');
            setMergeChapter2('');
            fetchChapters();
        } catch (error: any) {
            Alert.alert('Merge Error', error.message);
        }
    };

    const renderChapterItem = ({ item }: { item: Chapter }) => (
        <GlassCard style={styles.chapterCard}>
            <View style={styles.chapterHeader}>
                <View style={styles.chapterInfo}>
                    <Text style={styles.chapterNum}>CH {item.chapterNumber}</Text>
                    <Text style={styles.chapterTitle} numberOfLines={1}>{item.title}</Text>
                </View>
                <View style={[styles.statusBadge, { backgroundColor: item.isPublished ? COLORS.success + '20' : COLORS.warning + '20' }]}>
                    <Text style={[styles.statusText, { color: item.isPublished ? COLORS.success : COLORS.warning }]}>
                        {item.isPublished ? 'PUBLISHED' : 'DRAFT'}
                    </Text>
                </View>
            </View>

            <View style={styles.metaRow}>
                <Ionicons name="document-text-outline" size={14} color={COLORS.textTertiary} />
                <Text style={styles.metaValue}>{item.wordCount} words</Text>
                <Ionicons name="time-outline" size={14} color={COLORS.textTertiary} style={{ marginLeft: 12 }} />
                <Text style={styles.metaValue}>{item.readingTimeEstimate} min read</Text>
            </View>

            <View style={styles.actionRow}>
                {!item.isPublished && (
                    <TouchableOpacity style={[styles.actionBtn, styles.publishBtn]} onPress={() => handlePublish(item.chapterNumber)}>
                        <Ionicons name="cloud-upload-outline" size={16} color={COLORS.white} />
                        <Text style={styles.publishBtnText}>Publish</Text>
                    </TouchableOpacity>
                )}

                <TouchableOpacity
                    style={styles.iconBtn}
                    onPress={() => router.push({ pathname: '/chapter-editor', params: { bookId, chapterNumber: item.chapterNumber, title: item.title } })}
                >
                    <Ionicons name="create-outline" size={20} color={COLORS.primary} />
                </TouchableOpacity>

                <TouchableOpacity style={styles.iconBtn} onPress={() => handleDelete(item.chapterNumber)}>
                    <Ionicons name="trash-outline" size={20} color={COLORS.error} />
                </TouchableOpacity>
            </View>
        </GlassCard>
    );

    return (
        <SafeScreen top={true}>
            <Stack.Screen options={{ title: 'Manage Chapters', headerTintColor: COLORS.textPrimary }} />

            <View style={styles.container}>
                <View style={styles.header}>
                    <Text style={styles.bookTitle} numberOfLines={2}>{bookTitle}</Text>
                    <View style={styles.headerBtns}>
                        <TouchableOpacity style={styles.headerBtn} onPress={() => setShowMergeModal(true)}>
                            <Ionicons name="git-merge-outline" size={20} color={COLORS.secondary} />
                            <Text style={styles.headerBtnText}>Merge</Text>
                        </TouchableOpacity>
                        <TouchableOpacity style={[styles.headerBtn, { backgroundColor: COLORS.primary }]} onPress={() => router.push({ pathname: '/chapter-editor', params: { bookId, isNew: 'true' } })}>
                            <Ionicons name="add" size={24} color={COLORS.white} />
                            <Text style={[styles.headerBtnText, { color: COLORS.white }]}>New</Text>
                        </TouchableOpacity>
                    </View>
                </View>

                {loading ? (
                    <ActivityIndicator size="large" color={COLORS.primary} style={{ marginTop: 50 }} />
                ) : (
                    <FlatList
                        data={chapters}
                        keyExtractor={item => item._id}
                        renderItem={renderChapterItem}
                        contentContainerStyle={styles.listContent}
                        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchChapters(); }} tintColor={COLORS.primary} />}
                        ListEmptyComponent={
                            <View style={styles.emptyContainer}>
                                <Ionicons name="layers-outline" size={64} color={COLORS.textMuted} />
                                <Text style={styles.emptyText}>No chapters yet. Start writing or upload a file!</Text>
                            </View>
                        }
                    />
                )}
            </View>

            {/* Merge Modal */}
            <Modal visible={showMergeModal} transparent animationType="fade">
                <View style={styles.modalOverlay}>
                    <GlassCard style={styles.modalContent}>
                        <Text style={styles.modalTitle}>Merge Chapters</Text>
                        <Text style={styles.modalSubtitle}>This will append the content of the second chapter to the first and delete the second one.</Text>

                        <View style={styles.inputGroup}>
                            <Text style={styles.inputLabel}>First Chapter #</Text>
                            <TextInput
                                style={styles.input}
                                placeholder="1"
                                placeholderTextColor={COLORS.textMuted}
                                keyboardType="numeric"
                                value={mergeChapter1}
                                onChangeText={setMergeChapter1}
                            />
                        </View>

                        <View style={styles.inputGroup}>
                            <Text style={styles.inputLabel}>Second Chapter #</Text>
                            <TextInput
                                style={styles.input}
                                placeholder="2"
                                placeholderTextColor={COLORS.textMuted}
                                keyboardType="numeric"
                                value={mergeChapter2}
                                onChangeText={setMergeChapter2}
                            />
                        </View>

                        <View style={styles.modalActions}>
                            <TouchableOpacity style={styles.cancelBtn} onPress={() => setShowMergeModal(false)}>
                                <Text style={styles.cancelBtnText}>Cancel</Text>
                            </TouchableOpacity>
                            <TouchableOpacity style={styles.submitBtn} onPress={handleMerge}>
                                <Text style={styles.submitBtnText}>Confirm Merge</Text>
                            </TouchableOpacity>
                        </View>
                    </GlassCard>
                </View>
            </Modal>
        </SafeScreen>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, padding: 16 },
    header: { marginBottom: 20 },
    bookTitle: { fontSize: 24, fontWeight: '800', color: COLORS.textPrimary, marginBottom: 12 },
    headerBtns: { flexDirection: 'row', gap: 12 },
    headerBtn: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.05)', paddingHorizontal: 16, paddingVertical: 10, borderRadius: 12, gap: 8 },
    headerBtnText: { fontWeight: '700', color: COLORS.textPrimary },
    listContent: { paddingBottom: 40 },
    chapterCard: { marginBottom: 12, padding: 16, borderRadius: 16 },
    chapterHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
    chapterInfo: { flexDirection: 'row', alignItems: 'center', flex: 1 },
    chapterNum: { fontSize: 13, fontWeight: '800', color: COLORS.primary, marginRight: 8 },
    chapterTitle: { fontSize: 17, fontWeight: '700', color: COLORS.textPrimary, flex: 1 },
    statusBadge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 },
    statusText: { fontSize: 10, fontWeight: '800' },
    metaRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 16 },
    metaValue: { fontSize: 13, color: COLORS.textTertiary, marginLeft: 4 },
    actionRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
    actionBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 8, borderRadius: 8, gap: 6 },
    publishBtn: { backgroundColor: COLORS.primary },
    publishBtnText: { color: COLORS.white, fontWeight: '700', fontSize: 14 },
    iconBtn: { padding: 8, backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: 8 },
    emptyContainer: { alignItems: 'center', justifyContent: 'center', marginTop: 100 },
    emptyText: { color: COLORS.textMuted, textAlign: 'center', marginTop: 16, fontSize: 16 },
    modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.8)', justifyContent: 'center', padding: 20 },
    modalContent: { padding: 24, borderRadius: 24 },
    modalTitle: { fontSize: 22, fontWeight: '800', color: COLORS.textPrimary, marginBottom: 8 },
    modalSubtitle: { fontSize: 14, color: COLORS.textSecondary, marginBottom: 20 },
    inputGroup: { marginBottom: 16 },
    inputLabel: { fontSize: 14, fontWeight: '600', color: COLORS.textPrimary, marginBottom: 8 },
    input: { backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: 12, padding: 12, color: COLORS.textPrimary, fontSize: 16 },
    modalActions: { flexDirection: 'row', gap: 12, marginTop: 8 },
    cancelBtn: { flex: 1, paddingVertical: 14, alignItems: 'center' },
    cancelBtnText: { color: COLORS.textSecondary, fontWeight: '700' },
    submitBtn: { flex: 2, backgroundColor: COLORS.secondary, paddingVertical: 14, borderRadius: 12, alignItems: 'center' },
    submitBtnText: { color: COLORS.white, fontWeight: '800' },
});
