import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import Animated from 'react-native-reanimated';
import { useRouter } from 'expo-router';
import COLORS from '../constants/colors';
import { SPACING } from '../constants/styleConstants';
import styles from '../assets/styles/chat.styles';

interface ChatHeaderProps {
    username: string;
    displayAvatar: string;
    isOnline: boolean;
    isSelf: boolean;
    isTyping: boolean;
    displayStatus: string;
    animatedStatusStyle: any;
    onClearChat: () => void;
}

const ChatHeader: React.FC<ChatHeaderProps> = ({
    username,
    displayAvatar,
    isOnline,
    isSelf,
    isTyping,
    displayStatus,
    animatedStatusStyle,
    onClearChat
}) => {
    const router = useRouter();

    return (
        <View style={[styles.headerRow, { paddingHorizontal: SPACING.xl, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: COLORS.border }]}>
            <TouchableOpacity onPress={() => router.back()} style={{ width: 44, height: 44, justifyContent: 'center', alignItems: 'center' }}>
                <Ionicons name="arrow-back" size={24} color={COLORS.textPrimary} />
            </TouchableOpacity>

            <View style={styles.avatarContainer}>
                <Image source={{ uri: displayAvatar }} style={styles.headerAvatar} />
                {isOnline && <Animated.View style={[styles.statusDot, animatedStatusStyle]} />}
            </View>

            <View style={[styles.headerInfo, { flex: 1, marginLeft: 12 }]}>
                <Text style={styles.headerName}>{isSelf ? 'Saved Messages' : username}</Text>
                {isTyping && !isSelf ? (
                    <Text style={[styles.headerStatus, { color: COLORS.primary, textTransform: 'none' }]}>Typing...</Text>
                ) : (
                    <Text style={styles.headerStatus}>{displayStatus}</Text>
                )}
            </View>

            <TouchableOpacity
                onPress={onClearChat}
                style={{ width: 44, height: 44, justifyContent: 'center', alignItems: 'center' }}
            >
                <Ionicons name="trash-outline" size={20} color={COLORS.textMuted} />
            </TouchableOpacity>
        </View>
    );
};

export default ChatHeader;
