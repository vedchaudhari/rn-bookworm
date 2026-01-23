import React, { useState, useEffect, useMemo } from 'react';
import { StyleSheet, View, ActivityIndicator, Text, TouchableOpacity, Platform, Alert } from 'react-native';
import { useAuthStore } from '../store/authContext';
import { WebView } from 'react-native-webview';
import { useLocalSearchParams, Stack, useRouter } from 'expo-router';
import SafeScreen from '../components/SafeScreen';
import COLORS from '../constants/colors';
import { Ionicons } from '@expo/vector-icons';
import { API_URL } from '../constants/api';
import { File, Paths } from 'expo-file-system';

export default function PdfReaderScreen() {
    const { pdfUrl, title, bookId } = useLocalSearchParams<{ pdfUrl: string, title: string, bookId: string }>();
    const router = useRouter();
    const { token } = useAuthStore();
    const [isLoading, setIsLoading] = useState(true);
    const [pdfBase64, setPdfBase64] = useState<string | null>(null);
    const [hasError, setHasError] = useState(false);

    // Ensure URL is absolute
    const fullUrl = useMemo(() => {
        if (!pdfUrl) return null;
        return pdfUrl.startsWith('http') ? pdfUrl : `${API_URL}${pdfUrl}`;
    }, [pdfUrl]);

    // Handle Download and Base64 Conversion on Android
    useEffect(() => {
        if (fullUrl) {
            // Sync status to "Currently Reading"
            syncReadingStatus();

            if (Platform.OS === 'android') {
                handleAndroidDownload();
            } else if (Platform.OS === 'ios') {
                setIsLoading(false);
            }
        }
    }, [fullUrl]);

    const syncReadingStatus = async () => {
        if (!bookId || !token) return;
        try {
            console.log('PDF Reader: Syncing reading status for bookId:', bookId);
            await fetch(`${API_URL}/api/bookshelf/book/${bookId}/status`, {
                method: 'PATCH',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ status: 'currently_reading' })
            });
        } catch (err) {
            console.error('PDF Reader Sync Error:', err);
        }
    };

    const handleAndroidDownload = async () => {
        if (!fullUrl) {
            console.error('PDF Reader: No fullUrl provided');
            return;
        }
        console.log('PDF Reader: Starting download from', fullUrl);
        setIsLoading(true);
        setHasError(false);

        try {
            const fileName = (fullUrl.split('/').pop() || `document-${Date.now()}.pdf`).split('?')[0];

            // Use the new SDK 54 API
            console.log('PDF Reader: Downloading file to cache:', fileName);
            const file = await File.downloadFileAsync(
                fullUrl,
                new File(Paths.cache, fileName),
                { idempotent: true }
            );

            console.log('PDF Reader: Download success. Path:', file.uri, 'Size:', file.size);

            if (file.size < 100) {
                console.warn('PDF Reader: File is suspiciously small. Possible download error.');
            }

            // Read the file as base64
            console.log('PDF Reader: Extracting base64 data for rendering...');
            const base64Data = await file.base64();

            if (!base64Data) {
                throw new Error('Base64 extraction failed (empty result)');
            }

            console.log('PDF Reader: Base64 data length:', base64Data.length);
            setPdfBase64(base64Data);
            setIsLoading(false);
        } catch (error: any) {
            console.error('PDF Reader Error:', error);
            console.error('PDF Reader Error Context:', {
                fullUrl,
                os: Platform.OS,
                version: Platform.Version
            });
            setHasError(true);
            setIsLoading(false);
            Alert.alert('Error', 'Failed to load PDF. Check your connection or the file source.');
        }
    };

    // PDF.js Implementation for Android (renders from Base64)
    const pdfJsHtml = useMemo(() => {
        if (Platform.OS !== 'android' || !pdfBase64) return null;

        return `
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
            <title>PDF Viewer</title>
            <script src="https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js"></script>
            <style>
                body, html { margin: 0; padding: 0; height: 100%; overflow: hidden; background-color: #1a1a1a; }
                #viewer-container { height: 100vh; overflow-y: auto; text-align: center; display: flex; flex-direction: column; align-items: center; }
                canvas { margin: 10px auto; display: block; box-shadow: 0 4px 12px rgba(0,0,0,0.6); max-width: 95%; height: auto !important; }
                #status { color: #facc15; position: fixed; bottom: 20px; left: 50%; transform: translateX(-50%); font-family: sans-serif; background: rgba(0,0,0,0.7); padding: 5px 15px; borderRadius: 20px; font-size: 12px; z-index: 100; }
            </style>
        </head>
        <body>
            <div id="status">Syncing Reader...</div>
            <div id="viewer-container"></div>

            <script>
                const base64Data = '${pdfBase64}';
                const pdfjsLib = window['pdfjs-dist/build/pdf'];
                pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';

                async function renderPDF() {
                    try {
                        const loadingTask = pdfjsLib.getDocument({ data: atob(base64Data) });
                        const pdf = await loadingTask.promise;
                        document.getElementById('status').innerText = 'Page 1 of ' + pdf.numPages;

                        const container = document.getElementById('viewer-container');
                        
                        for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
                            const page = await pdf.getPage(pageNum);
                            const viewport = page.getViewport({ scale: 2.0 }); // High quality scale
                            
                            const canvas = document.createElement('canvas');
                            container.appendChild(canvas);
                            
                            const context = canvas.getContext('2d');
                            canvas.height = viewport.height;
                            canvas.width = viewport.width;

                            await page.render({ canvasContext: context, viewport: viewport }).promise;
                            
                            // Update status as pages load
                            if (pageNum % 2 === 0 || pageNum === pdf.numPages) {
                                document.getElementById('status').innerText = 'Rendering ' + pageNum + '/' + pdf.numPages;
                            }
                        }
                        document.getElementById('status').style.display = 'none';
                    } catch (error) {
                        document.getElementById('status').innerText = 'Render Error: ' + error.message;
                        window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'error', message: error.message }));
                    }
                }

                renderPDF();
            </script>
        </body>
        </html>
        `;
    }, [pdfBase64]);

    const handleLoadEnd = () => {
        if (Platform.OS === 'ios') setIsLoading(false);
    };

    const handleError = () => {
        setIsLoading(false);
        setHasError(true);
        if (Platform.OS === 'ios') {
            Alert.alert('Error', 'Failed to load PDF.');
        }
    };

    return (
        <SafeScreen top={true} bottom={false}>
            <Stack.Screen options={{ headerShown: false }} />

            <View style={styles.container}>
                {/* Header */}
                <View style={styles.header}>
                    <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
                        <Ionicons name="arrow-back" size={24} color={COLORS.textPrimary} />
                    </TouchableOpacity>
                    <Text style={styles.headerTitle} numberOfLines={1}>{title || 'Reader'}</Text>
                    <View style={{ width: 24 }} />
                </View>

                {/* Content */}
                <View style={styles.pdfContainer}>
                    {!fullUrl ? (
                        <View style={styles.centerContainer}>
                            <Text style={styles.errorText}>No PDF URL provided</Text>
                        </View>
                    ) : (
                        <WebView
                            source={Platform.OS === 'ios' ? { uri: fullUrl } : (pdfBase64 ? { html: pdfJsHtml! } : undefined)}
                            style={styles.webview}
                            onLoadEnd={handleLoadEnd}
                            onError={handleError}
                            onMessage={(e) => {
                                try {
                                    const data = JSON.parse(e.nativeEvent.data);
                                    if (data.type === 'error') {
                                        setHasError(true);
                                    }
                                } catch (err) { }
                            }}
                            startInLoadingState={true}
                            renderLoading={() => <View />} // We use our custom loading UI
                            originWhitelist={['*']}
                            javaScriptEnabled={true}
                            domStorageEnabled={true}
                        />
                    )}

                    {/* Custom Loading / Download UI for Android */}
                    {isLoading && (
                        <View style={styles.loadingOverlay}>
                            <ActivityIndicator color={COLORS.primary} size="large" />
                            {Platform.OS === 'android' && (
                                <Text style={styles.loadingText}>
                                    {pdfBase64 ? 'Rendering PDF...' : 'Downloading PDF...'}
                                </Text>
                            )}
                        </View>
                    )}

                    {hasError && (
                        <View style={styles.centerContainer}>
                            <Ionicons name="alert-circle-outline" size={48} color={COLORS.textSecondary} />
                            <Text style={styles.errorText}>Failed to load content</Text>
                            <TouchableOpacity
                                onPress={() => Platform.OS === 'android' ? handleAndroidDownload() : router.replace({ pathname: '/pdf-reader', params: { pdfUrl, title } })}
                                style={styles.retryButton}
                            >
                                <Text style={styles.retryText}>Retry</Text>
                            </TouchableOpacity>
                        </View>
                    )}
                </View>
            </View>
        </SafeScreen>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: COLORS.background,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 16,
        paddingVertical: 12,
        backgroundColor: COLORS.background,
        borderBottomWidth: 1,
        borderBottomColor: COLORS.borderLight,
        zIndex: 10,
    },
    backButton: {
        padding: 4,
    },
    headerTitle: {
        fontSize: 18,
        fontWeight: '700',
        color: COLORS.textPrimary,
        flex: 1,
        textAlign: 'center',
        marginHorizontal: 10,
    },
    pdfContainer: {
        flex: 1,
        position: 'relative',
        backgroundColor: '#1a1a1a',
    },
    webview: {
        flex: 1,
        backgroundColor: '#1a1a1a',
    },
    loadingOverlay: {
        ...StyleSheet.absoluteFillObject,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: COLORS.background,
        zIndex: 5,
    },
    loadingText: {
        marginTop: 16,
        color: COLORS.textSecondary,
        fontSize: 14,
        fontWeight: '600',
    },
    centerContainer: {
        ...StyleSheet.absoluteFillObject,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: COLORS.background,
        padding: 20,
        zIndex: 10,
    },
    errorText: {
        color: COLORS.textSecondary,
        fontSize: 16,
        marginBottom: 16,
        marginTop: 8,
    },
    retryButton: {
        paddingVertical: 10,
        paddingHorizontal: 20,
        backgroundColor: COLORS.surfaceHighlight,
        borderRadius: 8,
    },
    retryText: {
        color: COLORS.textPrimary,
        fontWeight: '600',
    }
});
