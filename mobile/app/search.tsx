import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, TextInput, FlatList, TouchableOpacity, ActivityIndicator, Keyboard } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import SafeScreen from '../components/SafeScreen';
import COLORS from '../constants/colors';
import { apiClient } from '../lib/apiClient';
import AppHeader from '../components/AppHeader';
import Animated, { FadeInDown } from 'react-native-reanimated';
import GlazedView from '../components/GlazedView';
import { Image } from 'expo-image';

export default function GlobalSearch() {
    const [query, setQuery] = useState('');
    const [results, setResults] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);
    const [type, setType] = useState<'all' | 'books' | 'users'>('all');
    const router = useRouter();
    const inputRef = useRef<TextInput>(null);

    useEffect(() => {
        const timer = setTimeout(() => {
            if (query.length > 1) {
                performSearch();
            } else {
                setResults([]);
            }
        }, 500);

        return () => clearTimeout(timer);
    }, [query, type]);

    const performSearch = async () => {
        setLoading(true);
        try {
            const data = await apiClient.get<any>('/api/discovery/search', {
                q: query,
                type: (type === 'all' ? undefined : type) as any
            });
            setResults(data.books || []);
        } catch (error) {
            console.error('Search error:', error);
        } finally {
            setLoading(false);
        }
    };

    const renderItem = ({ item, index }: { item: any; index: number }) => (
        <Animated.View entering={FadeInDown.delay(index * 50).springify()}>
            <TouchableOpacity
                style={styles.card}
                onPress={() => router.push({ pathname: '/book-detail', params: { bookId: item._id } })}
            >
                <Image source={{ uri: item.image }} style={styles.bookImage} contentFit="cover" />
                <View style={styles.bookInfo}>
                    <Text style={styles.bookTitle}>{item.title}</Text>
                    <Text style={styles.bookAuthor}>{item.author || 'Author'}</Text>
                    <View style={styles.badgeRow}>
                        <View style={styles.genreBadge}>
                            <Text style={styles.genreText}>{item.genre || 'General'}</Text>
                        </View>
                    </View>
                </View>
            </TouchableOpacity>
        </Animated.View>
    );

    return (
        <SafeScreen top={false} bottom={false}>
            <AppHeader showBack showSearch={false} />
            <View style={styles.container}>
                <View style={styles.searchBarContainer}>
                    <Ionicons name="search" size={22} color={COLORS.primary} style={styles.searchIcon} />
                    <TextInput
                        ref={inputRef}
                        style={styles.input}
                        placeholder="Search books, authors, or genres..."
                        placeholderTextColor={COLORS.textMuted}
                        value={query}
                        onChangeText={setQuery}
                        autoFocus
                    />
                    {loading && <ActivityIndicator color={COLORS.primary} />}
                    {query.length > 0 && (
                        <TouchableOpacity onPress={() => setQuery('')}>
                            <Ionicons name="close-circle" size={20} color={COLORS.textMuted} />
                        </TouchableOpacity>
                    )}
                </View>

                {query.length === 0 ? (
                    <View style={styles.centered}>
                        <Ionicons name="compass-outline" size={80} color={COLORS.surfaceHighlight} />
                        <Text style={styles.hintTitle}>Discover Books</Text>
                        <Text style={styles.hintText}>Explore thousands of stories across your favorite genres.</Text>
                    </View>
                ) : (
                    <FlatList
                        data={results}
                        renderItem={renderItem}
                        keyExtractor={(item) => item._id}
                        contentContainerStyle={styles.list}
                        ListEmptyComponent={!loading ? (
                            <View style={styles.centered}>
                                <Text style={styles.noResults}>No matches found for "{query}"</Text>
                            </View>
                        ) : null}
                    />
                )}
            </View>
        </SafeScreen>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: COLORS.background,
    },
    searchBarContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: COLORS.surface,
        margin: 16,
        paddingHorizontal: 16,
        paddingVertical: 12,
        borderRadius: 20,
        borderWidth: 1,
        borderColor: COLORS.surfaceHighlight,
    },
    searchIcon: {
        marginRight: 12,
    },
    input: {
        flex: 1,
        color: COLORS.white,
        fontSize: 16,
        fontWeight: '500',
    },
    list: {
        paddingHorizontal: 16,
        paddingBottom: 40,
    },
    card: {
        flexDirection: 'row',
        backgroundColor: COLORS.surface,
        borderRadius: 25,
        marginBottom: 16,
        overflow: 'hidden',
        borderWidth: 1,
        borderColor: COLORS.surfaceLight,
    },
    bookImage: {
        width: 90,
        height: 130,
    },
    bookInfo: {
        flex: 1,
        padding: 16,
        justifyContent: 'center',
    },
    bookTitle: {
        color: COLORS.white,
        fontSize: 18,
        fontWeight: '800',
        marginBottom: 4,
    },
    bookAuthor: {
        color: COLORS.textMuted,
        fontSize: 14,
        fontWeight: '700',
        marginBottom: 12,
    },
    badgeRow: {
        flexDirection: 'row',
        gap: 8,
    },
    genreBadge: {
        backgroundColor: COLORS.primary + '20',
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 8,
    },
    genreText: {
        color: COLORS.primary,
        fontSize: 10,
        fontWeight: '900',
    },
    centered: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: 40,
        marginTop: 60,
    },
    hintTitle: {
        color: COLORS.white,
        fontSize: 22,
        fontWeight: '900',
        marginTop: 20,
        textAlign: 'center',
    },
    hintText: {
        color: COLORS.textMuted,
        fontSize: 15,
        textAlign: 'center',
        marginTop: 10,
        lineHeight: 22,
    },
    noResults: {
        color: COLORS.textMuted,
        fontSize: 16,
        fontWeight: '600',
    }
});
