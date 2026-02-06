import React, { useState } from 'react';
import { View, Text, TouchableOpacity, ScrollView, Image, StyleSheet, ActivityIndicator, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { ImagePickerService, MediaAttachment } from '../../services/ImagePickerService';
import { ImageCompressor } from '../../services/ImageCompressor';
import ImageCropper from '../ImageCropper'; // The component we verified earlier

export default function ImagePickerFlow() {
    const [attachments, setAttachments] = useState<MediaAttachment[]>([]);
    const [selectedId, setSelectedId] = useState<string | null>(null);
    const [isEditorVisible, setEditorVisible] = useState(false);
    const [isProcessing, setProcessing] = useState(false);

    // 1. Pick Images
    const handlePickImages = async () => {
        const newAttachments = await ImagePickerService.pickImages(true);
        if (newAttachments.length > 0) {
            setAttachments(prev => [...prev, ...newAttachments]);
            // Auto-select the first new image if none selected
            if (!selectedId) setSelectedId(newAttachments[0].id);
        }
    };

    // 2. Open Editor
    const activeAttachment = attachments.find(a => a.id === selectedId);

    const openEditor = () => {
        if (activeAttachment) setEditorVisible(true);
    };

    // 3. Save Edit
    const handleCropSave = (uri: string) => {
        if (selectedId) {
            setAttachments(prev => prev.map(a =>
                a.id === selectedId ? { ...a, uri: uri, originalUri: a.originalUri } : a // Update uri for preview
            ));
        }
        setEditorVisible(false);
    };

    // 4. Send (Process Batch)
    const handleSend = async () => {
        setProcessing(true);
        try {
            const processedUris = await Promise.all(attachments.map(async (att) => {
                // If image was edited (uri != originalUri), we might just use that.
                // Or if we want to enforce HD/Compression settings, we pass it through ImageCompressor now.
                // For this example, let's assume 'att.uri' is the one we want to optimize/compress final time.

                return await ImageCompressor.processImage(att.uri, {
                    isHD: false // Configurable
                });
            }));

            Alert.alert("Ready to Upload", `Processed ${processedUris.length} images.`);
            console.log("Final URIs:", processedUris);
            // emit(processedUris)...
        } catch (e) {
            console.error(e);
            Alert.alert("Error", "Failed to process images.");
        } finally {
            setProcessing(false);
        }
    };

    const removeAttachment = (id: string) => {
        setAttachments(prev => {
            const next = prev.filter(a => a.id !== id);
            if (selectedId === id) setSelectedId(next[0]?.id || null);
            return next;
        });
    };

    return (
        <View style={styles.container}>
            {/* Main Preview Area */}
            <View style={styles.previewContainer}>
                {activeAttachment ? (
                    <View style={styles.activeImageWrapper}>
                        <Image
                            source={{ uri: activeAttachment.uri }}
                            style={styles.activeImage}
                            resizeMode="contain"
                        />
                        <TouchableOpacity style={styles.cropButton} onPress={openEditor}>
                            <Ionicons name="crop" size={24} color="#fff" />
                            <Text style={styles.cropText}>Crop & Rotate</Text>
                        </TouchableOpacity>
                    </View>
                ) : (
                    <View style={styles.placeholder}>
                        <Ionicons name="images-outline" size={64} color="#ccc" />
                        <Text style={styles.placeholderText}>No images selected</Text>
                        <TouchableOpacity onPress={handlePickImages} style={styles.pickButton}>
                            <Text style={styles.pickButtonText}>Pick Images</Text>
                        </TouchableOpacity>
                    </View>
                )}
            </View>

            {/* Bottom Strip (WhatsApp Style) */}
            {attachments.length > 0 && (
                <View style={styles.bottomStrip}>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
                        <TouchableOpacity style={styles.addMoreButton} onPress={handlePickImages}>
                            <Ionicons name="add" size={30} color="#007AFF" />
                        </TouchableOpacity>

                        {attachments.map(att => (
                            <View key={att.id} style={styles.thumbnailWrapper}>
                                <TouchableOpacity
                                    onPress={() => setSelectedId(att.id)}
                                    style={[styles.thumbnailButton, selectedId === att.id && styles.selectedThumbnail]}
                                >
                                    <Image source={{ uri: att.uri }} style={styles.thumbnail} />
                                </TouchableOpacity>
                                <TouchableOpacity style={styles.removeBadge} onPress={() => removeAttachment(att.id)}>
                                    <Ionicons name="close-circle" size={20} color="#fff" />
                                </TouchableOpacity>
                            </View>
                        ))}
                    </ScrollView>

                    <TouchableOpacity style={styles.sendButton} onPress={handleSend} disabled={isProcessing}>
                        {isProcessing ? <ActivityIndicator color="#fff" /> : <Ionicons name="send" size={24} color="#fff" />}
                    </TouchableOpacity>
                </View>
            )}

            {/* Editor Modal */}
            {activeAttachment && (
                <ImageCropper
                    visible={isEditorVisible}
                    imageUri={activeAttachment.uri} // Pass current state (could be already cropped)
                    onCancel={() => setEditorVisible(false)}
                    onCrop={handleCropSave}
                    aspectRatio={[1, 1]} // Could be dynamic
                />
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#000' },
    previewContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    activeImageWrapper: { width: '100%', height: '100%', justifyContent: 'center', alignItems: 'center' },
    activeImage: { width: '100%', height: '80%' },
    cropButton: {
        position: 'absolute', top: 60, right: 20,
        backgroundColor: 'rgba(0,0,0,0.6)', padding: 10, borderRadius: 20,
        flexDirection: 'row', alignItems: 'center', gap: 8
    },
    cropText: { color: '#fff', fontWeight: '600' },
    placeholder: { alignItems: 'center', gap: 16 },
    placeholderText: { color: '#888', fontSize: 16 },
    pickButton: { backgroundColor: '#333', paddingHorizontal: 20, paddingVertical: 10, borderRadius: 20 },
    pickButtonText: { color: '#fff' },

    bottomStrip: {
        height: 100, backgroundColor: 'rgba(30,30,30,0.95)',
        flexDirection: 'row', alignItems: 'center', paddingHorizontal: 10
    },
    scrollContent: { alignItems: 'center', gap: 10, paddingRight: 60 },
    addMoreButton: {
        width: 60, height: 60, borderRadius: 10, borderWidth: 1, borderColor: '#444',
        justifyContent: 'center', alignItems: 'center', backgroundColor: '#222'
    },
    thumbnailWrapper: { position: 'relative' },
    thumbnailButton: {
        width: 60, height: 60, borderRadius: 10, overflow: 'hidden',
        borderWidth: 2, borderColor: 'transparent'
    },
    selectedThumbnail: { borderColor: '#007AFF' },
    thumbnail: { width: '100%', height: '100%' },
    removeBadge: { position: 'absolute', top: -5, right: -5, borderRadius: 10, backgroundColor: '#000' },

    sendButton: {
        position: 'absolute', right: 16, bottom: 20,
        width: 50, height: 50, borderRadius: 25, backgroundColor: '#007AFF',
        justifyContent: 'center', alignItems: 'center', elevation: 5
    }
});
