import React, { useState, useRef } from 'react';
import { View, Text, StyleSheet, FlatList, Dimensions, TouchableOpacity, Animated } from 'react-native';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import COLORS from '../constants/colors';
import SafeScreen from '../components/SafeScreen';
import GlazedButton from '../components/GlazedButton';
import { Ionicons } from '@expo/vector-icons';
import { useAuthStore } from '../store/authContext';

const { width, height } = Dimensions.get('window');

const SLIDES = [
    {
        id: '1',
        title: 'Your Digital Library',
        description: 'Store, organize and read all your favorite books in one beautiful place.',
        image: require('../assets/images/onboarding-reading.png'),
        icon: 'library-outline'
    },
    {
        id: '2',
        title: 'Track Your Progress',
        description: 'See how much you read, set goals, and maintain your reading streak.',
        image: require('../assets/images/book-placeholder-2.png'),
        icon: 'analytics-outline'
    },
    {
        id: '3',
        title: 'Connect with Readers',
        description: 'Share recommendations, chat with fellow bookworms, and join challenges.',
        image: require('../assets/images/book-placeholder-3.png'),
        icon: 'people-outline'
    }
];

export default function Onboarding() {
    const [currentIndex, setCurrentIndex] = useState(0);
    const scrollX = useRef(new Animated.Value(0)).current;
    const slidesRef = useRef<FlatList>(null);
    const router = useRouter();
    const { completeOnboarding } = useAuthStore();

    const viewableItemsChanged = useRef(({ viewableItems }: any) => {
        if (viewableItems[0]) {
            setCurrentIndex(viewableItems[0].index);
        }
    }).current;

    const viewConfig = useRef({ viewAreaCoveragePercentThreshold: 50 }).current;

    const scrollToNext = async () => {
        if (currentIndex < SLIDES.length - 1) {
            slidesRef.current?.scrollToIndex({ index: currentIndex + 1 });
        } else {
            // Finish Onboarding
            await completeOnboarding();
        }
    };

    const renderItem = ({ item }: { item: typeof SLIDES[0] }) => {
        return (
            <View style={styles.slide}>
                <Image source={item.image} style={styles.image} contentFit="contain" />
                <View style={styles.textContainer}>
                    <View style={styles.iconCircle}>
                        <Ionicons name={item.icon as any} size={32} color={COLORS.primary} />
                    </View>
                    <Text style={styles.title}>{item.title}</Text>
                    <Text style={styles.description}>{item.description}</Text>
                </View>
            </View>
        );
    };

    return (
        <SafeScreen top={true} bottom={true}>
            <View style={styles.container}>
                <FlatList
                    data={SLIDES}
                    renderItem={renderItem}
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    pagingEnabled
                    bounces={false}
                    keyExtractor={(item) => item.id}
                    onScroll={Animated.event([{ nativeEvent: { contentOffset: { x: scrollX } } }], {
                        useNativeDriver: false,
                    })}
                    scrollEventThrottle={32}
                    onViewableItemsChanged={viewableItemsChanged}
                    viewabilityConfig={viewConfig}
                    ref={slidesRef}
                />

                <View style={styles.footer}>
                    {/* Pagination Dots */}
                    <View style={styles.pagination}>
                        {SLIDES.map((_, i) => {
                            const inputRange = [(i - 1) * width, i * width, (i + 1) * width];
                            const dotWidth = scrollX.interpolate({
                                inputRange,
                                outputRange: [10, 20, 10],
                                extrapolate: 'clamp',
                            });
                            const opacity = scrollX.interpolate({
                                inputRange,
                                outputRange: [0.3, 1, 0.3],
                                extrapolate: 'clamp',
                            });

                            return <Animated.View style={[styles.dot, { width: dotWidth, opacity }]} key={i.toString()} />;
                        })}
                    </View>

                    <GlazedButton
                        title={currentIndex === SLIDES.length - 1 ? "Start Reading" : "Next"}
                        onPress={scrollToNext}
                        style={styles.button}
                    />
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
    slide: {
        width,
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: 40,
    },
    image: {
        width: width * 0.8,
        height: height * 0.4,
        marginBottom: 40,
    },
    textContainer: {
        alignItems: 'center',
    },
    iconCircle: {
        width: 64,
        height: 64,
        borderRadius: 32,
        backgroundColor: COLORS.primary + '15',
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 24,
    },
    title: {
        fontSize: 28,
        fontWeight: '900',
        color: COLORS.white,
        textAlign: 'center',
        marginBottom: 16,
    },
    description: {
        fontSize: 16,
        color: COLORS.textSecondary,
        textAlign: 'center',
        lineHeight: 24,
    },
    footer: {
        paddingHorizontal: 40,
        paddingBottom: 40,
    },
    pagination: {
        flexDirection: 'row',
        height: 40,
        justifyContent: 'center',
        alignItems: 'center',
    },
    dot: {
        height: 10,
        borderRadius: 5,
        backgroundColor: COLORS.primary,
        marginHorizontal: 8,
    },
    button: {
        marginTop: 20,
    }
});
