import { View, Text, TextInput, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, Switch } from 'react-native';
import React, { useState } from 'react';
import { useRouter, Stack } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { Image } from 'expo-image';
import COLORS from '../../constants/colors';
import { useAuthStore } from '../../store/authContext';
import { useUIStore } from '../../store/uiStore';
import { apiClient } from '../../lib/apiClient';
import SafeScreen from '../../components/SafeScreen';
import GlazedButton from '../../components/GlazedButton';
import GlassCard from '../../components/GlassCard';

export default function CreateClubScreen() {
    const [name, setName] = useState('');
    const [description, setDescription] = useState('');
    const [image, setImage] = useState<string | null>(null);
    const [isPrivate, setIsPrivate] = useState(false);
    const [tags, setTags] = useState('');
    const [loading, setLoading] = useState(false);

    const router = useRouter();
    const { showAlert } = useUIStore();

    const handleImagePick = async () => {
        const result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ImagePicker.MediaTypeOptions.Images,
            allowsEditing: true,
            aspect: [1, 1],
            quality: 0.5,
        });

        if (!result.canceled) {
            setImage(result.assets[0].uri);
        }
    };

    const handleCreate = async () => {
        if (!name.trim()) {
            showAlert({ title: 'Error', message: 'Club name is required', type: 'error' });
            return;
        }

        setLoading(true);
        try {
            // 1. Upload Image if Exists
            let finalImageUrl = '';
            if (image) {
                const fileName = `club-${Date.now()}.jpg`;
                const { uploadUrl, finalUrl } = await apiClient.get<any>('/api/users/presigned-url/profile-image', { fileName, contentType: 'image/jpeg' });

                const blobRes = await fetch(image);
                const blob = await blobRes.blob();

                await fetch(uploadUrl, {
                    method: 'PUT',
                    body: blob,
                    headers: { 'Content-Type': 'image/jpeg' }
                });
                finalImageUrl = finalUrl;
            }

            // 2. Create Club
            const tagsArray = tags.split(',').map(t => t.trim()).filter(t => t);

            await apiClient.post('/api/clubs', {
                name,
                description,
                image: finalImageUrl,
                isPrivate,
                tags: tagsArray
            });

            showAlert({ title: 'Success', message: 'Club created successfully!', type: 'success' });
            router.replace('/clubs');
        } catch (error: any) {
            showAlert({ title: 'Error', message: error.message || 'Failed to create club', type: 'error' });
        } finally {
            setLoading(false);
        }
    };

    return (
        <SafeScreen top={true} bottom={false}>
            <Stack.Screen options={{ headerShown: false }} />

            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
                    <Ionicons name="arrow-back" size={24} color={COLORS.textPrimary} />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Create New Club</Text>
                <View style={{ width: 24 }} />
            </View>

            <ScrollView contentContainerStyle={styles.content}>
                {/* Image Picker */}
                <TouchableOpacity onPress={handleImagePick} style={styles.imagePicker}>
                    {image ? (
                        <Image source={{ uri: image }} style={styles.clubImage} />
                    ) : (
                        <View style={styles.placeholderImage}>
                            <Ionicons name="camera" size={32} color={COLORS.textSecondary} />
                            <Text style={styles.uploadText}>Add Cover Image</Text>
                        </View>
                    )}
                    <View style={styles.editBadge}>
                        <Ionicons name="pencil" size={12} color="#fff" />
                    </View>
                </TouchableOpacity>

                <GlassCard style={styles.formCard}>
                    <Text style={styles.label}>Club Name *</Text>
                    <TextInput
                        style={styles.input}
                        placeholder="e.g. Fantasy Readers"
                        placeholderTextColor={COLORS.textMuted}
                        value={name}
                        onChangeText={setName}
                    />

                    <Text style={styles.label}>Description</Text>
                    <TextInput
                        style={[styles.input, styles.textArea]}
                        placeholder="What is this club about?"
                        placeholderTextColor={COLORS.textMuted}
                        value={description}
                        onChangeText={setDescription}
                        multiline
                        numberOfLines={4}
                    />

                    <Text style={styles.label}>Tags (comma separated)</Text>
                    <TextInput
                        style={styles.input}
                        placeholder="e.g. fantasy, fiction, weekly"
                        placeholderTextColor={COLORS.textMuted}
                        value={tags}
                        onChangeText={setTags}
                    />

                    <View style={styles.switchRow}>
                        <View>
                            <Text style={styles.switchLabel}>Private Club</Text>
                            <Text style={styles.switchSubLabel}>Only invited members can join</Text>
                        </View>
                        <Switch
                            value={isPrivate}
                            onValueChange={setIsPrivate}
                            trackColor={{ false: COLORS.surface, true: COLORS.primary }}
                            thumbColor="#fff"
                        />
                    </View>
                </GlassCard>

                <GlazedButton
                    title="Create Club"
                    onPress={handleCreate}
                    loading={loading}
                    style={styles.createBtn}
                />
            </ScrollView>
        </SafeScreen>
    );
}

const styles = StyleSheet.create({
    header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 20 },
    backButton: { padding: 4 },
    headerTitle: { fontSize: 20, fontWeight: '700', color: COLORS.textPrimary },
    content: { padding: 20 },
    imagePicker: { alignSelf: 'center', marginBottom: 30, position: 'relative' },
    clubImage: { width: 120, height: 120, borderRadius: 60, borderWidth: 2, borderColor: COLORS.surfaceLight },
    placeholderImage: { width: 120, height: 120, borderRadius: 60, backgroundColor: COLORS.surface, justifyContent: 'center', alignItems: 'center', borderWidth: 2, borderColor: COLORS.surfaceLight, borderStyle: 'dashed' },
    uploadText: { fontSize: 12, color: COLORS.textSecondary, marginTop: 8 },
    editBadge: { position: 'absolute', bottom: 0, right: 0, backgroundColor: COLORS.primary, padding: 6, borderRadius: 12 },
    formCard: { padding: 20, borderRadius: 20, marginBottom: 24 },
    label: { fontSize: 14, fontWeight: '600', color: COLORS.textSecondary, marginBottom: 8, marginTop: 16 },
    input: { backgroundColor: 'rgba(0,0,0,0.2)', borderRadius: 12, padding: 16, color: COLORS.textPrimary, fontSize: 16 },
    textArea: { height: 100, textAlignVertical: 'top' },
    switchRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 24 },
    switchLabel: { fontSize: 16, fontWeight: '600', color: COLORS.textPrimary },
    switchSubLabel: { fontSize: 12, color: COLORS.textSecondary, marginTop: 4 },
    createBtn: { marginTop: 10 },
});
