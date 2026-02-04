import { View, Text, Platform, TextInput, TouchableOpacity, Image, ActivityIndicator, Keyboard, KeyboardEvent, Switch, Modal, StyleSheet } from 'react-native';
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
import AppHeader from '../../components/AppHeader';
import { CameraView, CameraType, useCameraPermissions } from 'expo-camera';

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
    const [showImageOptions, setShowImageOptions] = useState(false);

    // Scanner State
    const [isScannerOpen, setIsScannerOpen] = useState(false);
    const [scanned, setScanned] = useState(false);

    const insets = useSafeAreaInsets();
    const { token } = useAuthStore();
    const { showAlert } = useUIStore();
    const router = useRouter();

    const [isSearchingScan, setIsSearchingScan] = useState(false);
    const [scanMessage, setScanMessage] = useState<string | null>(null);

    const handleBarcodeScanned = async ({ type, data }: { type: string, data: string }) => {
        if (scanned || isSearchingScan) return;

        setScanned(true);
        setIsSearchingScan(true);
        setScanMessage("Searching for book...");

        console.log(`Bar code with type ${type} and data ${data} has been scanned!`);
        await fetchBookDetails(data);
    };

    const fetchBookDetails = async (isbn: string) => {
        try {
            // Add a slight delay to make the UX feel more deliberate and ensure API is ready
            // Sometimes rapid scans cause issues
            const response = await fetch(`https://www.googleapis.com/books/v1/volumes?q=isbn:${isbn}`);

            if (!response.ok) {
                throw new Error(`API Error: ${response.status}`);
            }

            const data = await response.json();

            if (data.totalItems > 0) {
                const book = data.items[0].volumeInfo;
                console.log("[ISBN] Raw Data:", JSON.stringify(book, null, 2));

                const title = book.title || "";
                const author = book.authors ? book.authors.join(", ") : "";

                // Better Genre Extraction
                let extractedGenre = "General";
                if (book.mainCategory) {
                    extractedGenre = book.mainCategory;
                } else if (book.categories && book.categories.length > 0) {
                    extractedGenre = book.categories[0];
                }

                // Better Description Extraction
                const description = book.description || "";

                setTitle(title);
                setAuthor(author);
                setGenre(extractedGenre);
                setCaption(description);

                setScanMessage("Book Found!");
                setTimeout(() => {
                    setIsScannerOpen(false);
                    setIsSearchingScan(false);
                    setScanned(false);
                    setScanMessage(null);
                    showAlert({ title: "Book Found!", message: `Populated details for "${title}".`, type: "success" });
                }, 1000);

            } else {
                setScanMessage("Book not found in database.");
                // Let user try again after a short delay
                setTimeout(() => {
                    setScanned(false);
                    setIsSearchingScan(false);
                    setScanMessage(null);
                }, 2500);
            }
        } catch (error) {
            console.error(error);
            setScanMessage("Network error. Please try again.");
            setTimeout(() => {
                setScanned(false);
                setIsSearchingScan(false);
                setScanMessage(null);
            }, 2500);
        }
    };

    const pickImage = async () => {
        try {
            let result = await ImagePicker.launchImageLibraryAsync({
                mediaTypes: ['images'],
                allowsEditing: false, // Disabled native editor for smoother flow
                aspect: [4, 3],
                quality: 0.8,
                base64: false
            })

            if (!result.canceled) {
                setImage(result.assets[0].uri);
                setImageBase64(result.assets[0].base64 || null);
                setShowImageOptions(false);
            }
        } catch (error) {
            console.error(error);
            showAlert({ title: "Error", message: "There was a problem selecting your image", type: "error" });
        }
    }

    const handleClearImage = () => {
        setImage(null);
        setImageBase64(null);
        setShowImageOptions(false);
    };

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

    const handleClearForm = () => {
        setTitle("");
        setAuthor("");
        setGenre("General");
        setCaption("");
        setRating(3);
        setRating(3);
        setImage(null);
        setImageBase64(null);
        setShowImageOptions(false);
        setFile(null);
        setKeepPdf(false);
        setUploadProgress(0);
        showAlert({ title: "Cleared", message: "Form has been reset.", type: "success" });
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
                '/api/books/presigned-url/cover',
                { fileName, contentType }
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
        <SafeScreen top={false} bottom={false}>
            <AppHeader />
            <KeyboardScreen
                contentContainerStyle={[styles.container]}
                style={{ flex: 1, backgroundColor: COLORS.background }}
            >
                <View style={styles.header}>
                    <Text style={styles.title}>Add Book</Text>
                    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
                        <Text style={styles.subtitle}>Recommendation</Text>
                        <View style={{ flexDirection: 'row', gap: 10 }}>
                            <TouchableOpacity
                                onPress={handleClearForm}
                                style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(255, 59, 48, 0.1)', padding: 8, borderRadius: 8 }}
                            >
                                <Ionicons name="trash-outline" size={20} color={COLORS.error} />
                            </TouchableOpacity>

                            <TouchableOpacity
                                onPress={() => {
                                    setIsScannerOpen(true);
                                    setScanned(false);
                                }}
                                style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.surfaceLight, padding: 8, borderRadius: 8 }}
                            >
                                <Ionicons name="scan-outline" size={20} color={COLORS.primary} />
                                <Text style={{ color: COLORS.primary, marginLeft: 4, fontWeight: '600' }}>Scan ISBN</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>

                <View style={styles.card}>

                    <View style={styles.formGroup}>
                        <Text style={styles.label}>Book Title</Text>
                        <View style={styles.inputContainer}>
                            <Ionicons
                                name="book-outline"
                                size={20}
                                color={COLORS.primary}
                                style={styles.inputIcon}
                            />
                            <TextInput
                                style={styles.input}
                                placeholder='Enter book title'
                                placeholderTextColor={COLORS.textMuted}
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
                                color={COLORS.primary}
                                style={styles.inputIcon}
                            />
                            <TextInput
                                style={styles.input}
                                placeholder='Enter author name'
                                placeholderTextColor={COLORS.textMuted}
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
                                color={COLORS.primary}
                                style={styles.inputIcon}
                            />
                            <TextInput
                                style={styles.input}
                                placeholder='Enter genre (e.g., Fiction, Mystery)'
                                placeholderTextColor={COLORS.textMuted}
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

                        {image ? (
                            <View style={styles.imagePreviewContainer}>
                                <Image source={{ uri: image }} style={styles.previewImage} />

                                <View style={styles.imageControlsOverlay}>
                                    <TouchableOpacity
                                        style={styles.imageMenuButton}
                                        onPress={() => setShowImageOptions(!showImageOptions)}
                                    >
                                        <Ionicons name="ellipsis-vertical" size={20} color="#fff" />
                                    </TouchableOpacity>
                                </View>

                                {showImageOptions && (
                                    <View style={styles.imageOptionsMenu}>
                                        <TouchableOpacity style={styles.menuOption} onPress={pickImage}>
                                            <Ionicons name="images-outline" size={18} color={COLORS.textPrimary} />
                                            <Text style={styles.menuOptionText}>Change</Text>
                                        </TouchableOpacity>
                                        <View style={styles.menuDivider} />
                                        <TouchableOpacity style={styles.menuOption} onPress={handleClearImage}>
                                            <Ionicons name="trash-outline" size={18} color={COLORS.error} />
                                            <Text style={[styles.menuOptionText, { color: COLORS.error }]}>Remove</Text>
                                        </TouchableOpacity>
                                    </View>
                                )}
                            </View>
                        ) : (
                            <TouchableOpacity style={styles.imagePicker} onPress={pickImage}>
                                <View style={styles.placeholderContainer}>
                                    <Ionicons name="image-outline" size={48} color={COLORS.primary} />
                                    <Text style={styles.placeholderText}>Tap to select image</Text>
                                </View>
                            </TouchableOpacity>
                        )}
                    </View>

                    <View style={styles.formGroup}>
                        <Text style={styles.label}>Caption</Text>
                        <TextInput
                            style={styles.textArea}
                            value={caption}
                            onChangeText={setCaption}
                            placeholder='Write your review or caption here...'
                            placeholderTextColor={COLORS.textMuted}
                            multiline
                        />
                    </View>

                    {/* File Upload Section */}
                    <View style={styles.fileUploadContainer}>
                        <Text style={styles.label}>Book Content (Optional)</Text>

                        <TouchableOpacity
                            style={[
                                styles.uploadBox,
                                file && styles.uploadBoxActive
                            ]}
                            onPress={pickDocument}
                        >
                            <Ionicons
                                name={file ? "document-text" : "cloud-upload-outline"}
                                size={32}
                                color={COLORS.primary}
                            />
                            <View style={{ flex: 1, paddingHorizontal: 10 }}>
                                <Text style={styles.fileName} numberOfLines={1} ellipsizeMode="middle">
                                    {file ? file.name : "Upload Manuscript"}
                                </Text>
                                <Text style={styles.fileSize}>
                                    {file ? `${(file.size / 1024).toFixed(1)} KB` : "TXT or PDF (Max 10MB)"}
                                </Text>
                            </View>

                            {file && (
                                <TouchableOpacity
                                    onPress={(e) => { e.stopPropagation(); setFile(null); }}
                                    style={styles.removeFile}
                                >
                                    <Ionicons name="close-circle" size={22} color={COLORS.error} />
                                </TouchableOpacity>
                            )}
                        </TouchableOpacity>

                        {/* PDF Options */}
                        {file?.mimeType === 'application/pdf' && (
                            <View style={styles.pdfOption}>
                                <View style={styles.pdfTextContainer}>
                                    <Text style={styles.pdfTitle}>Read as PDF</Text>
                                    <Text style={styles.pdfDesc}>Keep original layout instead of text view</Text>
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
                                        <Text style={[styles.buttonText, { color: '#000' }]}>Uploading: {uploadProgress}%</Text>
                                        <View style={{
                                            width: '80%',
                                            height: 4,
                                            backgroundColor: 'rgba(0,0,0,0.2)',
                                            borderRadius: 2,
                                            marginTop: 8,
                                            overflow: 'hidden'
                                        }}>
                                            <View style={{
                                                width: `${uploadProgress}%`,
                                                height: '100%',
                                                backgroundColor: '#000',
                                                borderRadius: 2
                                            }} />
                                        </View>
                                    </View>
                                ) : (
                                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                                        <ActivityIndicator color="#000" />
                                        {uploadProgress >= 100 && (
                                            <Text style={[styles.buttonText, { color: '#000' }]}>Processing...</Text>
                                        )}
                                    </View>
                                )
                            ) : <>
                                <Ionicons
                                    name="cloud-upload-outline"
                                    size={24}
                                    color="#000"
                                    style={styles.buttonIcon}
                                />
                                <Text style={styles.buttonText}>{file ? "Share & Publish" : "Share Recommendation"}</Text>
                            </>
                        }
                    </TouchableOpacity>

                </View>
            </KeyboardScreen>

            {/* Camera Modal */}
            <Modal
                visible={isScannerOpen}
                animationType="slide"
                presentationStyle="pageSheet"
                onRequestClose={() => setIsScannerOpen(false)}
            >
                <View style={styles.scannerContainer}>
                    <CameraView
                        style={StyleSheet.absoluteFillObject}
                        facing="back"
                        onBarcodeScanned={scanned ? undefined : handleBarcodeScanned}
                        barcodeScannerSettings={{
                            barcodeTypes: ["ean13", "ean8", "qr"], // ISBN is EAN-13
                        }}
                    >
                        <View style={styles.scannerOverlay}>
                            <View style={styles.scannerHeader}>
                                <TouchableOpacity onPress={() => setIsScannerOpen(false)} style={styles.closeButton}>
                                    <Ionicons name="close" size={28} color="#fff" />
                                </TouchableOpacity>
                                <Text style={styles.scannerTitle}>Scan Book Barcode</Text>
                            </View>
                            <View style={styles.scanTarget} />

                            {scanMessage && (
                                <View style={styles.scanStatusBadge}>
                                    <Text style={styles.scanStatusText}>{scanMessage}</Text>
                                </View>
                            )}

                            <Text style={styles.scannerInstruction}>
                                {isSearchingScan ? "Searching..." : "Align the barcode within the frame"}
                            </Text>
                        </View>
                    </CameraView>
                </View>
            </Modal>
        </SafeScreen>
    );
}
