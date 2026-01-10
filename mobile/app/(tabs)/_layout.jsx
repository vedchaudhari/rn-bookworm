import { Ionicons } from '@expo/vector-icons'
import { Tabs } from 'expo-router'
import { View, Text } from 'react-native'
import COLORS from '../../constants/colors'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useMessageStore } from '../../store/messageStore'
import { useNotificationStore } from '../../store/notificationStore'

export default function TabLayout() {
    const insets = useSafeAreaInsets();
    const { unreadCount: msgUnread } = useMessageStore();
    const { unreadCount: notifUnread } = useNotificationStore();

    return (
        <Tabs
            screenOptions={{
                headerShown: false,
                tabBarActiveTintColor: COLORS.primary,
                tabBarInactiveTintColor: COLORS.textSecondary, // Lighter grey for better visibility
                //tabBarShowLabel: false,
                tabBarStyle: {
                    position: 'absolute',
                    marginBottom: 28,
                    bottom: 20,
                    left: 20,
                    right: 20,
                    backgroundColor: COLORS.surface + 'F2', // High opacity for "premium" feel
                    borderRadius: 30,
                    height: 64,
                    borderTopWidth: 1,
                    borderTopColor: COLORS.glassBorder,
                    paddingBottom: 0,
                    shadowColor: '#000',
                    shadowOffset: { width: 0, height: 10 },
                    shadowOpacity: 0.3,
                    shadowRadius: 20,
                    elevation: 10,
                },
                tabBarItemStyle: {
                    height: 64,
                    paddingTop: 6,
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
                name="create"
                options={{
                    title: "Create",
                    tabBarIcon: ({ color, size }) => (<Ionicons
                        name="add-circle-outline"
                        size={size}
                        color={color}
                    />)
                }}
            />
            <Tabs.Screen
                name="notifications"
                options={{
                    title: "Notifications",
                    tabBarIcon: ({ color, size }) => (
                        <View>
                            <Ionicons
                                name="notifications-outline"
                                size={size}
                                color={color}
                            />
                            {notifUnread > 0 && (
                                <View style={{
                                    position: 'absolute',
                                    right: -6,
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
                                        {notifUnread > 99 ? '99+' : notifUnread}
                                    </Text>
                                </View>
                            )}
                        </View>
                    )
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