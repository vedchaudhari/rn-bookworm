import { Ionicons } from '@expo/vector-icons';
import { Tabs, useRouter } from 'expo-router';
import { View, Text, useWindowDimensions, Image, Platform } from 'react-native';
import { Image as ExpoImage } from 'expo-image';
import * as Haptics from 'expo-haptics';
import COLORS from '../../constants/colors';
import { SPACING, SHADOWS } from '../../constants/styleConstants';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuthStore } from '../../store/authContext';
import { useUIStore } from '../../store/uiStore';

import { API_URL } from '../../constants/api';

export default function TabLayout() {
    const insets = useSafeAreaInsets();
    const { width } = useWindowDimensions();
    const { user } = useAuthStore();
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
                tabBarActiveTintColor: COLORS.primary,
                tabBarInactiveTintColor: COLORS.textSecondary,
                tabBarShowLabel: false, // Instagram style: no labels
                tabBarStyle: {
                    position: 'absolute',
                    bottom: 0,
                    left: 0,
                    right: 0,
                    backgroundColor: 'rgba(14, 27, 36, 0.95)',
                    height: 60 + insets.bottom,
                    borderTopWidth: 0.5,
                    borderTopColor: 'rgba(255, 255, 255, 0.15)',
                    paddingBottom: insets.bottom,
                    shadowColor: '#000',
                    shadowOffset: { width: 0, height: -8 },
                    shadowOpacity: 0.15,
                    shadowRadius: 12,
                    elevation: 20,
                },

                tabBarItemStyle: {
                    height: 60,
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
                name="profile"
                options={{
                    title: "Profile",
                    tabBarIcon: ({ focused, color }) => (
                        <View style={{
                            width: 28,
                            height: 28,
                            borderRadius: 14,
                            borderWidth: 1.5,
                            borderColor: focused ? COLORS.primary : 'transparent',
                            padding: 1,
                        }}>
                            {user?.profileImage ? (
                                <ExpoImage
                                    source={{ uri: user.profileImage.startsWith('/') ? `${API_URL}${user.profileImage}` : user.profileImage }}
                                    style={{ width: '100%', height: '100%', borderRadius: 12 }}
                                    contentFit="cover"
                                />
                            ) : (
                                <Ionicons
                                    name={focused ? "person" : "person-outline"}
                                    size={22}
                                    color={color}
                                />
                            )}
                        </View>
                    ),
                }}
                listeners={{
                    tabPress: triggerHaptic,
                }}
            />

            {/* Hidden tabs kept for route resolution */}
            <Tabs.Screen name="streaks" options={{ href: null }} />
            <Tabs.Screen name="notifications" options={{ href: null }} />
            <Tabs.Screen name="messages" options={{ href: null }} />
        </Tabs>
    );
}

