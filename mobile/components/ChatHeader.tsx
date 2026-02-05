import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import Animated from 'react-native-reanimated';
import { useRouter } from 'expo-router';
import COLORS from '../constants/colors';
import { SPACING, SHADOWS } from '../constants/styleConstants';
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
    onOpenPalette: () => void;
}

const ChatHeader: React.FC<ChatHeaderProps> = ({
    username,
    displayAvatar,
    isOnline,
    isSelf,
    isTyping,
    displayStatus,
    animatedStatusStyle,
    onClearChat,
    onOpenPalette
}) => {
    const router = useRouter();

    return (
        <View style={[
            styles.headerRow,
            {
                backgroundColor: COLORS.surfaceSilk,
                paddingHorizontal: SPACING.lg,
                paddingVertical: 12,
                borderBottomWidth: 1.5,
                borderBottomColor: 'rgba(0,0,0,0.6)',
                zIndex: 1000,
                ...SHADOWS.godLevel
            }
        ]}>
            {/* Subdued Top Rim */}
            <View style={{
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0,
                height: 0.8,
                backgroundColor: 'rgba(255, 255, 255, 0.08)',
                zIndex: 1001
            }} />

            <TouchableOpacity
                onPress={() => router.back()}
                style={{ width: 40, height: 40, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: 20 }}
            >
                <Ionicons name="arrow-back" size={22} color={COLORS.textPrimary} />
            </TouchableOpacity>

            <View style={[styles.avatarContainer, { marginLeft: 8 }]}>
                <Image source={{ uri: displayAvatar }} style={styles.headerAvatar} />
                {isOnline && <Animated.View style={[styles.statusDot, animatedStatusStyle]} />}
            </View>

            <View style={[styles.headerInfo, { flex: 1, marginLeft: 12 }]}>
                <Text style={styles.headerName} numberOfLines={1}>{isSelf ? 'Saved Messages' : username}</Text>
                {isTyping && !isSelf ? (
                    <Text style={[styles.headerStatus, { color: COLORS.primary, textTransform: 'none' }]}>Typing...</Text>
                ) : (
                    <Text style={styles.headerStatus}>{displayStatus}</Text>
                )}
            </View>

            <View style={{ flexDirection: 'row', gap: 8 }}>
                <TouchableOpacity
                    onPress={onOpenPalette}
                    style={{ width: 40, height: 40, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: 20 }}
                >
                    <Ionicons name="color-palette-outline" size={20} color={COLORS.primary} />
                </TouchableOpacity>

                <TouchableOpacity
                    onPress={onClearChat}
                    style={{ width: 40, height: 40, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: 20 }}
                >
                    <Ionicons name="trash-outline" size={20} color={COLORS.error} />
                </TouchableOpacity>
            </View>
        </View>
    );
};

export default ChatHeader;
