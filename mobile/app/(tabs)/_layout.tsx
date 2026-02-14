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
                    <View style={StyleSheet.absoluteFill}>
                        <BlurView
                            intensity={Platform.OS === 'ios' ? 85 : 95}
                            tint="dark"
                            style={StyleSheet.absoluteFill}
                        />
                        <View style={[
                            StyleSheet.absoluteFill,
                            {
                                backgroundColor: Platform.OS === 'ios' ? 'rgba(10, 15, 20, 0.2)' : 'rgba(20, 26, 33, 0.7)',
                            }
                        ]} />
                    </View>
                ),
                tabBarStyle: {
                    position: 'absolute',
                    bottom: 0,
                    left: 0,
                    right: 0,
                    backgroundColor: 'transparent',
                    height: 65 + insets.bottom + 10,
                    borderTopWidth: 0.6,
                    borderTopColor: 'rgba(255, 255, 255, 0.15)',
                    elevation: 0,
                    shadowColor: '#000',
                    shadowOffset: { width: 0, height: -10 },
                    shadowOpacity: 0.15,
                    shadowRadius: 30,
                    paddingBottom: insets.bottom + 10,
                    paddingTop: 10,
                    overflow: 'visible',
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
                            width: 56,
                            height: 56,
                            borderRadius: 28,
                            backgroundColor: COLORS.primary,
                            justifyContent: 'center',
                            alignItems: 'center',
                            top: -15, // Lift the button
                            ...SHADOWS.medium,
                            shadowColor: COLORS.primary,
                            borderWidth: 4,
                            borderColor: '#121212', // Match background for separation
                        }}>
                            <Ionicons
                                name="add"
                                size={36}
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

