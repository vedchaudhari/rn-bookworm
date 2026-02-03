import { View, Text, Platform, TextInput, TouchableOpacity, Image, ActivityIndicator, Keyboard, KeyboardEvent, Switch } from 'react-native';
import React, { useState, useEffect } from 'react';
import { useRouter } from 'expo-router';
import styles from '../../assets/styles/create.styles';
import COLORS from '../../constants/colors';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from "expo-image-picker";
import * as DocumentPicker from 'expo-document-picker';
import { useAuthStore } from '../../store/authContext';
import { API_URL } from '../../constants/api';
import { apiClient } from '../../lib/apiClient';
import { useUIStore } from '../../store/uiStore';
import KeyboardScreen from '../../components/KeyboardScreen';
import SafeScreen from '../../components/SafeScreen';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function CreateTab() {
    const [title, setTitle] = useState("");
    const [caption, setCaption] = useState("");
    const [rating, setRating] = useState(3);
    const [image, setImage] = useState<string | null>(null);
    const [imageBase64, setImageBase64] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);
    const [genre, setGenre] = useState("General");
    const [author, setAuthor] = useState("");
    const [file, setFile] = useState<any>(null); // For book content
    const [keepPdf, setKeepPdf] = useState(false);
    const [uploadProgress, setUploadProgress] = useState(0);

    const insets = useSafeAreaInsets();
    const { token } = useAuthStore();
    const { showAlert } = useUIStore();
    const router = useRouter();

    const pickImage = async () => {
        try {
            const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();

            if (!permissionResult.granted) {
                showAlert({ title: "Permission required", message: "Permission to access the media library is required.", type: "warning" });
                return;
            }

            let result = await ImagePicker.launchImageLibraryAsync({
                mediaTypes: ['images'],
                allowsEditing: true,
                aspect: [4, 3],
                quality: 0.5,
                base64: false
            })

            if (!result.canceled) {
                setImage(result.assets[0].uri);
                setImageBase64(result.assets[0].base64 || null);
            }
        } catch (error) {
            console.error(error);
            showAlert({ title: "Error", message: "There was a problem selecting your image", type: "error" });
        }
    }

    const pickDocument = async () => {
        try {
            const result = await DocumentPicker.getDocumentAsync({
                type: ['text/plain', 'application/pdf'],
                copyToCacheDirectory: true
            });

            if (result.assets && result.assets.length > 0) {
                const pickedFile = result.assets[0];
                if (pickedFile.size && pickedFile.size > 10 * 1024 * 1024) {
                    showAlert({ title: "File too large", message: "Please select a file smaller than 10MB", type: "warning" });
                    return;
                }
                setFile(pickedFile);
            }
        } catch (error) {
            console.error("Error picking document:", error);
            showAlert({ title: "Error", message: "Failed to select document", type: "error" });
        }
    };

    const handleSubmit = async () => {
        if (!image || !title || !caption) {
            showAlert({ title: "Incomplete form", message: "All fields are required", type: "warning" });
            return;
        }

        try {
            setLoading(true);
            setUploadProgress(0);

            // 1. Upload Cover Image to S3
            const imageUri = image;
            const fileName = imageUri.split('/').pop() || 'cover.jpg';
            const fileExtension = fileName.split('.').pop()?.toLowerCase() || 'jpg';

            // Map common extensions to specific mime types
            let contentType = 'image/jpeg';
            if (fileExtension === 'png') contentType = 'image/png';
            else if (fileExtension === 'webp') contentType = 'image/webp';


            // Get Presigned URL for covers
            const { uploadUrl, finalUrl } = await apiClient.get<{ uploadUrl: string; finalUrl: string }>(
                '/api/messages/presigned-url',
                { fileName, contentType, folder: 'covers' }
            );

            // Upload to S3
            const imageBlobRes = await fetch(imageUri);
            const imageBlob = await imageBlobRes.blob();

            const s3UploadRes = await fetch(uploadUrl, {
                method: 'PUT',
                body: imageBlob,
                headers: { 'Content-Type': contentType }
            });

            if (!s3UploadRes.ok) throw new Error('Cover upload failed');

            // 2. Create Book with S3 URL
            const bookData = await apiClient.post<any>('/api/books', {
                title,
                caption,
                rating: rating.toString(),
                image: finalUrl, // S3 URL
                genre,
                author,
            });

            const bookId = bookData._id || bookData.id;


            // 2. Upload File if selected
            if (file && bookId) {
                const formData = new FormData();
                // Use standard React Native FormData format (stream from native side)
                // This prevents OOM errors and 'Network Error' with large files
                formData.append('manuscript', {
                    uri: file.uri,
                    name: file.name,
                    type: file.mimeType || 'application/pdf'
                } as any);




                // Use XMLHttpRequest for upload progress tracking
                const uploadFileWithProgress = (): Promise<any> => {
                    return new Promise((resolve, reject) => {
                        const xhr = new XMLHttpRequest();
                        // Add keepPdf query param if enabled
                        const uploadUrl = `${API_URL}/api/chapters/${bookId}/upload${keepPdf ? '?keepPdf=true' : ''}`;
                        xhr.open('POST', uploadUrl);
                        xhr.setRequestHeader('Authorization', `Bearer ${token}`);
                        // Content-Type header is handled automatically by XMLHttpRequest with FormData

                        xhr.upload.onprogress = (event) => {
                            if (event.lengthComputable) {
                                const percentComplete = Math.round((event.loaded / event.total) * 100);
                                setUploadProgress(percentComplete);
                            }
                        };

                        xhr.onload = () => {
                            if (xhr.status >= 200 && xhr.status < 300) {
                                try {
                                    const response = JSON.parse(xhr.responseText);
                                    resolve(response);
                                } catch (e) {
                                    reject(new Error('Invalid response format'));
                                }
                            } else {
                                try {
                                    const errorResponse = JSON.parse(xhr.responseText);
                                    reject(new Error(errorResponse.message || 'Upload failed'));
                                } catch (e) {
                                    reject(new Error(`Upload failed with status ${xhr.status}`));
                                }
                            }
                        };

                        xhr.onerror = () => reject(new Error('Network error during upload'));

                        xhr.send(formData);
                    });
                };

                await uploadFileWithProgress();

                const uploadData = { message: 'Upload successful' }; // Placeholder since we handle XHR response above

                // Auto publish after upload for simplicity
                await fetch(`${API_URL}/api/chapters/${bookId}/bulk-publish`, {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${token}`,
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({})
                });
            }

            showAlert({
                title: "Success",
                message: file ? "Book created and all chapters published via upload!" : "Your book recommendation has been posted!",
                type: "success"
            });

            setTitle("");
            setCaption("");
            setRating(3);
            setImage(null);
            setImageBase64(null);
            setGenre("General");
            setAuthor("");
            setFile(null);
            router.push("/");

        } catch (error: any) {
            console.error("Error creating post: ", error);
            showAlert({ title: "Error", message: error.message || "Something went wrong", type: "error" });
        } finally {
            setLoading(false);
        }
    };

    const renderRatingPicker = () => {
        const stars = [];
        for (let i = 1; i <= 5; i++) {
            stars.push(
                <TouchableOpacity key={i} onPress={() => setRating(i)} style={styles.starButton}>
                    <Ionicons
                        name={i <= rating ? "star" : "star-outline"}
                        size={32}
                        color={i <= rating ? COLORS.ratingGold : COLORS.textSecondary}
                    />
                </TouchableOpacity>
            )
        }

        return <View style={styles.ratingContainer}>{stars}</View>
    }

    return (
        <SafeScreen isTabScreen={true}>
            <KeyboardScreen
                contentContainerStyle={[styles.container, { paddingBottom: insets.bottom + 40 }]}
                style={{ flex: 1, backgroundColor: COLORS.background }}
            >
                <View style={styles.card}>
                    <View style={styles.header}>
                        <Text style={styles.title}>Add Book Recommendation</Text>
                        <Text style={styles.subtitle}>Share your favorite reads with others</Text>
                    </View>

                    <View style={styles.formGroup}>
                        <Text style={styles.label}>Book Title</Text>
                        <View style={styles.inputContainer}>
                            <Ionicons
                                name="book-outline"
                                size={20}
                                color={COLORS.textSecondary}
                                style={styles.inputIcon}
                            />
                            <TextInput
                                style={styles.input}
                                placeholder='Enter book title'
                                placeholderTextColor={COLORS.textSecondary}
                                value={title}
                                onChangeText={setTitle}
                            />
                        </View>
                    </View>

                    <View style={styles.formGroup}>
                        <Text style={styles.label}>Author</Text>
                        <View style={styles.inputContainer}>
                            <Ionicons
                                name="person-outline"
                                size={20}
                                color={COLORS.textSecondary}
                                style={styles.inputIcon}
                            />
                            <TextInput
                                style={styles.input}
                                placeholder='Enter author name'
                                placeholderTextColor={COLORS.textSecondary}
                                value={author}
                                onChangeText={setAuthor}
                            />
                        </View>
                    </View>

                    <View style={styles.formGroup}>
                        <Text style={styles.label}>Genre</Text>
                        <View style={styles.inputContainer}>
                            <Ionicons
                                name="library-outline"
                                size={20}
                                color={COLORS.textSecondary}
                                style={styles.inputIcon}
                            />
                            <TextInput
                                style={styles.input}
                                placeholder='Enter genre (e.g., Fiction, Mystery)'
                                placeholderTextColor={COLORS.textSecondary}
                                value={genre}
                                onChangeText={setGenre}
                            />
                        </View>
                    </View>

                    <View style={styles.formGroup}>
                        <Text style={styles.label}>Rating</Text>
                        {renderRatingPicker()}
                    </View>

                    <View style={styles.formGroup}>
                        <Text style={styles.label}>Book Image</Text>

                        <TouchableOpacity style={styles.imagePicker} onPress={pickImage}>
                            {
                                image
                                    ? (<Image source={{ uri: image }} style={styles.previewImage} />)
                                    : (
                                        <View style={styles.placeholderContainer}>
                                            <Ionicons name="image-outline" size={40} color={COLORS.textSecondary} />
                                            <Text style={styles.placeholderText}>Tap to select image</Text>
                                        </View>
                                    )
                            }
                        </TouchableOpacity>
                    </View>

                    <View style={styles.formGroup}>
                        <Text style={styles.label}>Caption</Text>
                        <TextInput
                            style={styles.textArea}
                            value={caption}
                            onChangeText={setCaption}
                            placeholder='Enter captions'
                            placeholderTextColor={COLORS.textSecondary}
                            multiline
                        />
                    </View>

                    {/* File Upload Section */}
                    <View style={styles.formGroup}>
                        <Text style={styles.label}>Book Content (Optional)</Text>
                        <Text style={{ fontSize: 12, color: COLORS.textSecondary, marginBottom: 8 }}>Upload a TXT or PDF file to automatically create chapters.</Text>

                        <TouchableOpacity
                            style={[styles.imagePicker, { height: 80, flexDirection: 'row', gap: 12, justifyContent: 'center', alignItems: 'center' }]}
                            onPress={pickDocument}
                        >
                            <Ionicons name={file ? "document" : "cloud-upload"} size={32} color={COLORS.primary} />
                            <View style={{ alignItems: 'center' }}>
                                <Text style={{ color: COLORS.textPrimary, fontWeight: '600', textAlign: 'center' }}>
                                    {file ? file.name : "Upload Book File"}
                                </Text>
                                <Text style={{ color: COLORS.textSecondary, fontSize: 12, textAlign: 'center' }}>
                                    {file ? `${(file.size / 1024).toFixed(1)} KB` : "Supports TXT, PDF (Max 10MB)"}
                                </Text>
                            </View>
                            {file && (
                                <TouchableOpacity onPress={(e) => { e.stopPropagation(); setFile(null); }}>
                                    <Ionicons name="close-circle" size={24} color={COLORS.error} />
                                </TouchableOpacity>
                            )}
                        </TouchableOpacity>

                        {/* PDF Options */}
                        {file?.mimeType === 'application/pdf' && (
                            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 12, paddingHorizontal: 4 }}>
                                <View style={{ flex: 1 }}>
                                    <Text style={{ fontSize: 14, fontWeight: '600', color: COLORS.textPrimary }}>Read as PDF</Text>
                                    <Text style={{ fontSize: 12, color: COLORS.textSecondary }}>Keep original layout instead of converting to text</Text>
                                </View>
                                <Switch
                                    value={keepPdf}
                                    onValueChange={setKeepPdf}
                                    trackColor={{ false: '#767577', true: COLORS.primary }}
                                    thumbColor={'#f4f3f4'}
                                />
                            </View>
                        )}
                    </View>

                    <TouchableOpacity style={styles.button} onPress={handleSubmit} disabled={loading}>
                        {
                            loading ? (
                                uploadProgress > 0 && uploadProgress < 100 ? (
                                    <View style={{ width: '100%', alignItems: 'center' }}>
                                        <Text style={styles.buttonText}>Uploading: {uploadProgress}%</Text>
                                        <View style={{
                                            width: '80%',
                                            height: 4,
                                            backgroundColor: 'rgba(255,255,255,0.3)',
                                            borderRadius: 2,
                                            marginTop: 8,
                                            overflow: 'hidden'
                                        }}>
                                            <View style={{
                                                width: `${uploadProgress}%`,
                                                height: '100%',
                                                backgroundColor: COLORS.white,
                                                borderRadius: 2
                                            }} />
                                        </View>
                                    </View>
                                ) : (
                                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                                        <ActivityIndicator color={COLORS.white} />
                                        {uploadProgress >= 100 && (
                                            <Text style={styles.buttonText}>Processing Book...</Text>
                                        )}
                                    </View>
                                )
                            ) : <>
                                <Ionicons
                                    name="cloud-upload-outline"
                                    size={20}
                                    color={COLORS.white}
                                    style={styles.buttonIcon}
                                />
                                <Text style={styles.buttonText}>{file ? "Share & Publish" : "Share"}</Text>
                            </>
                        }
                    </TouchableOpacity>

                </View>
            </KeyboardScreen>
        </SafeScreen>
    );
}
