import { Ionicons } from '@expo/vector-icons';
import { Tabs } from 'expo-router';
import { View, Text, useWindowDimensions } from 'react-native';
import COLORS from '../../constants/colors';
import { SPACING, SHADOWS } from '../../constants/styleConstants';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useMessageStore } from '../../store/messageStore';
import { useNotificationStore } from '../../store/notificationStore';

export default function TabLayout() {
    const insets = useSafeAreaInsets();
    const { width } = useWindowDimensions();
    const { unreadCount: msgUnread } = useMessageStore();
    const { unreadCount: notifUnread } = useNotificationStore();

    const MARGIN = 16;
    const TAB_WIDTH = width - (MARGIN * 2);

    return (
        <Tabs
            screenOptions={{
                headerShown: false,
                tabBarActiveTintColor: COLORS.primary,
                tabBarInactiveTintColor: COLORS.textSecondary,
                tabBarStyle: {
                    position: 'absolute',
                    bottom: Math.max(insets.bottom, 12), // Lowered slightly to resolve FAB conflict
                    left: 20,
                    right: 20,
                    backgroundColor: 'rgba(14, 27, 36, 0.9)',
                    borderRadius: 30,
                    height: 64,
                    borderTopWidth: 1.2,
                    borderTopColor: COLORS.diamondRim,
                    paddingBottom: 0,
                    ...SHADOWS.godLevel,
                    shadowColor: COLORS.primary,
                },
                tabBarItemStyle: {
                    height: 64,
                    paddingTop: 8,
                },
                tabBarLabelStyle: {
                    fontSize: 11,
                    fontWeight: '800',
                    marginBottom: 12,
                    letterSpacing: 0.5,
                }
            }}
        >
            <Tabs.Screen
                name="index"
                options={{
                    title: "Home",
                    tabBarIcon: ({ color, size }) => (<Ionicons
                        name="home-outline"
                        size={size}
                        color={color}
                    />)
                }}
            />
            <Tabs.Screen
                name="explore"
                options={{
                    title: "Explore",
                    tabBarIcon: ({ color, size }) => (<Ionicons
                        name="compass-outline"
                        size={size}
                        color={color}
                    />)
                }}
            />
            <Tabs.Screen
                name="bookshelf"
                options={{
                    title: "Books",
                    tabBarIcon: ({ color, size }) => (<Ionicons
                        name="library-outline"
                        size={size}
                        color={color}
                    />)
                }}
            />
            <Tabs.Screen
                name="streaks"
                options={{
                    href: null,
                }}
            />
            <Tabs.Screen
                name="create"
                options={{
                    href: null,
                }}
            />
            <Tabs.Screen
                name="notifications"
                options={{
                    href: null,
                }}
            />
            <Tabs.Screen
                name="messages"
                options={{
                    title: "Messages",
                    tabBarIcon: ({ color, size }) => (
                        <View>
                            <Ionicons
                                name="chatbubbles-outline"
                                size={size}
                                color={color}
                            />
                            {msgUnread > 0 && (
                                <View style={{
                                    position: 'absolute',
                                    right: -8,
                                    top: -4,
                                    backgroundColor: '#FF3B30',
                                    borderRadius: 8,
                                    minWidth: 16,
                                    height: 16,
                                    justifyContent: 'center',
                                    alignItems: 'center',
                                    borderWidth: 1.5,
                                    borderColor: COLORS.surface,
                                }}>
                                    <Text style={{
                                        color: '#FFF',
                                        fontSize: 9,
                                        fontWeight: 'bold',
                                        paddingHorizontal: 2
                                    }}>
                                        {msgUnread > 99 ? '99+' : msgUnread}
                                    </Text>
                                </View>
                            )}
                        </View>
                    )
                }}
            />
            <Tabs.Screen
                name="profile"
                options={{
                    title: "Profile",
                    tabBarIcon: ({ color, size }) => (<Ionicons
                        name="person-outline"
                        size={size}
                        color={color}
                    />)
                }}
            />
        </Tabs>
    )
}
