import { Ionicons } from '@expo/vector-icons'
import { Tabs } from 'expo-router'
import COLORS from '../../constants/colors'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

export default function TabLayout() {
    const insets = useSafeAreaInsets();

    return (
        <Tabs
            screenOptions={{
                headerShown: false,
                tabBarActiveTintColor: COLORS.primary,
                tabBarInactiveTintColor: COLORS.textSecondary, // Lighter grey for better visibility
                tabBarShowLabel: false,
                tabBarStyle: {
                    position: 'absolute',
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
                name="notifications"
                options={{
                    title: "Notifications",
                    tabBarIcon: ({ color, size }) => (<Ionicons
                        name="notifications-outline"
                        size={size}
                        color={color}
                    />)
                }}
            />
            <Tabs.Screen
                name="messages"
                options={{
                    title: "Messages",
                    tabBarIcon: ({ color, size }) => (<Ionicons
                        name="chatbubbles-outline"
                        size={size}
                        color={color}
                    />)
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