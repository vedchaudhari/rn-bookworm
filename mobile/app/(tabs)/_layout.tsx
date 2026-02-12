import { Ionicons } from '@expo/vector-icons';
import { Tabs, useRouter } from 'expo-router';
import { View, Text, useWindowDimensions, Image, Platform, StyleSheet } from 'react-native';
import { Image as ExpoImage } from 'expo-image';
import * as Haptics from 'expo-haptics';
import { BlurView } from 'expo-blur';
import COLORS from '../../constants/colors';
import { SPACING, SHADOWS } from '../../constants/styleConstants';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuthStore } from '../../store/authContext';
import { useUIStore } from '../../store/uiStore';

import { API_URL } from '../../constants/api';

import { useMessageStore } from '../../store/messageStore';

export default function TabLayout() {
    const insets = useSafeAreaInsets();
    const { width } = useWindowDimensions();
    const { user } = useAuthStore();
    const { unreadCount } = useMessageStore();
    const router = useRouter();

    const triggerHaptic = () => {
        if (Platform.OS !== 'web') {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        }
    };

    return (
        <Tabs
            screenOptions={{
                headerShown: false,
                tabBarActiveTintColor: COLORS.primary, // Neon Teal
                tabBarInactiveTintColor: 'rgba(255, 255, 255, 0.4)', // More subtle inactive
                tabBarShowLabel: false, // Instagram style: no labels
                tabBarBackground: () => (
                    <BlurView intensity={80} tint="dark" style={StyleSheet.absoluteFill} />
                ),
                tabBarStyle: {
                    position: 'absolute',
                    bottom: 0,
                    left: 0,
                    right: 0,
                    backgroundColor: 'transparent',
                    height: 85,
                    borderTopWidth: 0,
                    elevation: 0,
                    shadowColor: '#000',
                    shadowOffset: { width: 0, height: -10 },
                    shadowOpacity: 0.3,
                    shadowRadius: 20,
                    paddingBottom: insets.bottom + 10,
                    paddingTop: 10,
                },

                tabBarItemStyle: {
                    height: 50,
                    justifyContent: 'center',
                },

            }}
        >
            <Tabs.Screen
                name="index"
                options={{
                    title: "Home",
                    tabBarIcon: ({ color, focused }) => (
                        <Ionicons
                            name={focused ? "home" : "home-outline"}
                            size={26}
                            color={color}
                        />
                    ),
                }}
                listeners={{
                    tabPress: triggerHaptic,
                }}
            />
            <Tabs.Screen
                name="explore"
                options={{
                    title: "Explore",
                    tabBarIcon: ({ color, focused }) => (
                        <Ionicons
                            name={focused ? "search" : "search-outline"}
                            size={26}
                            color={color}
                        />
                    ),
                }}
                listeners={{
                    tabPress: triggerHaptic,
                }}
            />
            <Tabs.Screen
                name="create"
                options={{
                    title: "Create",
                    tabBarIcon: ({ focused }) => (
                        <View style={{
                            width: 48,
                            height: 48,
                            borderRadius: 24,
                            backgroundColor: COLORS.primary,
                            justifyContent: 'center',
                            alignItems: 'center',
                            marginBottom: 0,
                            ...SHADOWS.medium,
                            shadowColor: COLORS.primary,
                        }}>
                            <Ionicons
                                name="add"
                                size={32}
                                color={COLORS.black}
                            />
                        </View>
                    ),
                }}
                listeners={{
                    tabPress: (e) => {
                        e.preventDefault();
                        triggerHaptic();
                        router.push('/create');
                    },
                }}
            />
            <Tabs.Screen
                name="bookshelf"
                options={{
                    title: "Books",
                    tabBarIcon: ({ color, focused }) => (
                        <Ionicons
                            name={focused ? "library" : "library-outline"}
                            size={26}
                            color={color}
                        />
                    ),
                }}
                listeners={{
                    tabPress: triggerHaptic,
                }}
            />
            <Tabs.Screen
                name="messages"
                options={{
                    title: "Chat",
                    tabBarBadge: unreadCount > 0 ? (unreadCount > 9 ? '9+' : unreadCount) : undefined,
                    tabBarBadgeStyle: { backgroundColor: COLORS.primary, color: 'white', fontSize: 10, minWidth: 16, height: 16, lineHeight: 15 },
                    tabBarIcon: ({ color, focused }) => (
                        <Ionicons
                            name={focused ? "chatbubbles" : "chatbubbles-outline"}
                            size={26}
                            color={color}
                        />
                    ),
                }}
                listeners={{
                    tabPress: triggerHaptic,
                }}
            />

            {/* Hidden tabs kept for route resolution */}
            <Tabs.Screen name="streaks" options={{ href: null }} />
            <Tabs.Screen name="notifications" options={{ href: null }} />
            <Tabs.Screen name="profile" options={{ href: null }} />
        </Tabs>
    );
}

