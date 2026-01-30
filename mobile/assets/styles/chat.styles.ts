// styles/chat.styles.ts
import { StyleSheet, Platform } from "react-native";
import COLORS from "../../constants/colors";
import {
    SPACING,
    PADDING,
    FONT_SIZE,
    TYPOGRAPHY,
    BORDER_RADIUS,
    RADIUS,
    SHADOWS,
    COMPONENT_SIZES,
    BORDER_WIDTH,
    OPACITY,
} from "../../constants/styleConstants";

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: COLORS.background,
        paddingTop: SPACING.lg,
    },
    headerRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: SPACING.lg,
    },
    headerAvatar: {
        width: COMPONENT_SIZES.avatar.medium - 4,
        height: COMPONENT_SIZES.avatar.medium - 4,
        borderRadius: (COMPONENT_SIZES.avatar.medium - 4) / 2,
        borderWidth: BORDER_WIDTH.thick,
        borderColor: COLORS.surfaceLight,
    },
    avatarContainer: {
        position: 'relative',
    },
    statusDot: {
        position: 'absolute',
        bottom: 0,
        right: 0,
        width: SPACING.lg,
        height: SPACING.lg,
        borderRadius: SPACING.sm,
        backgroundColor: COLORS.success,
        borderWidth: BORDER_WIDTH.thick,
        borderColor: COLORS.background,
    },
    headerInfo: {
        justifyContent: 'center',
    },
    headerName: {
        fontSize: FONT_SIZE.lg,
        fontWeight: '800',
        color: COLORS.textPrimary,
        letterSpacing: -0.3,
    },
    headerStatus: {
        fontSize: FONT_SIZE.xxs,
        color: COLORS.primary,
        fontWeight: '700',
        textTransform: 'uppercase',
        letterSpacing: 0.5,
    },
    messagesList: {
        paddingVertical: PADDING.screen.vertical,
        paddingHorizontal: SPACING.xl,
    },
    messageContainer: {
        width: '100%',
        flexDirection: 'row',
        marginBottom: SPACING.md + 2,
        alignItems: 'flex-end',
        gap: SPACING.md + 2,
    },
    myMessage: {
        justifyContent: 'flex-end',
    },
    theirMessage: {
        justifyContent: 'flex-start',
    },
    messageAvatar: {
        width: COMPONENT_SIZES.avatar.small,
        height: COMPONENT_SIZES.avatar.small,
        borderRadius: COMPONENT_SIZES.avatar.small / 2,
        borderWidth: BORDER_WIDTH.thin,
        borderColor: COLORS.surfaceLight,
        marginBottom: 2,
    },
    messageBubble: {
        maxWidth: '80%',
        paddingHorizontal: SPACING.xl,
        paddingVertical: SPACING.lg,
        borderRadius: BORDER_RADIUS.xxl + 2,
        position: 'relative',
        minWidth: 80, // Prevent bubble from being too small
        ...SHADOWS.light,
    },
    myBubble: {
        backgroundColor: COLORS.primary,
        borderBottomRightRadius: SPACING.xs,
    },
    theirBubble: {
        backgroundColor: COLORS.surface,
        borderBottomLeftRadius: SPACING.xs,
        borderWidth: BORDER_WIDTH.thin,
        borderColor: COLORS.border,
    },
    imageBubble: {
        padding: SPACING.xs,
        backgroundColor: COLORS.surface,
        borderWidth: BORDER_WIDTH.thin,
        borderColor: COLORS.border,
    },
    deletedBubble: {
        opacity: 0.8,
        backgroundColor: COLORS.surfaceLight,
    },
    deletedText: {
        fontStyle: 'italic',
        fontSize: FONT_SIZE.xs,
    },
    editedLabel: {
        fontSize: FONT_SIZE.xxxs,
        fontWeight: '600',
        fontStyle: 'italic',
    },
    sentImage: {
        borderRadius: BORDER_RADIUS.xl + 2,
        backgroundColor: COLORS.surfaceHighlight, // Stable placeholder color
        // Dynamic width/height will be applied inline by ChatImage component
    },
    sentVideoContainer: {
        width: 240,
        height: 180,
        borderRadius: BORDER_RADIUS.xl + 2,
        overflow: 'hidden',
        backgroundColor: COLORS.surfaceHighlight,
        position: 'relative',
    },
    sentVideo: {
        width: '100%',
        height: '100%',
    },
    sentVideoThumbnail: {
        width: '100%',
        height: '100%',
    },
    playButtonOverlay: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: 'rgba(0,0,0,0.3)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    pendingIndicator: {
        marginLeft: SPACING.xs,
        width: 16,
        height: 16,
        justifyContent: 'center',
        alignItems: 'center',
    },
    messageText: {
        ...TYPOGRAPHY.body,
        lineHeight: 22,
    },
    myText: {
        color: COLORS.white,
    },
    theirText: {
        color: COLORS.textPrimary,
    },
    messageTime: {
        fontSize: FONT_SIZE.xxxs,
        marginTop: SPACING.sm,
        fontWeight: '700',
        alignSelf: 'flex-end',
        opacity: OPACITY.semiTransparent,
    },
    myTime: {
        color: 'rgba(255,255,255,0.8)',
    },
    theirTime: {
        color: COLORS.textMuted,
    },
    inputWrapper: {
        paddingHorizontal: SPACING.xl,
        // paddingBottom is handled dynamically in chat.tsx for Safe Area compliance
        backgroundColor: COLORS.background,
    },
    inputContainer: {
        flexDirection: 'row',
        backgroundColor: COLORS.surface,
        borderRadius: BORDER_RADIUS.huge,
        padding: SPACING.sm,
        alignItems: 'flex-end',
        gap: SPACING.md,
        borderWidth: BORDER_WIDTH.thin,
        borderColor: COLORS.border,
        minHeight: 52, // Ensure consistent height for single line messages
        ...SHADOWS.medium,
    },
    input: {
        flex: 1,
        maxHeight: 120,
        color: COLORS.textPrimary,
        fontSize: FONT_SIZE.base,
        fontWeight: '500',
        paddingHorizontal: SPACING.xl,
        paddingVertical: SPACING.lg,
        textAlignVertical: 'center',
    },
    iconButton: {
        width: COMPONENT_SIZES.button.medium,
        height: COMPONENT_SIZES.button.medium,
        borderRadius: COMPONENT_SIZES.button.medium / 2,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: 'rgba(245, 158, 11, 0.1)',
    },
    sendButton: {
        backgroundColor: COLORS.primary,
        width: COMPONENT_SIZES.button.medium,
        height: COMPONENT_SIZES.button.medium,
        borderRadius: COMPONENT_SIZES.button.medium / 2,
        justifyContent: 'center',
        alignItems: 'center',
        ...SHADOWS.medium,
        shadowColor: COLORS.primary,
    },
    sendButtonDisabled: {
        backgroundColor: COLORS.surfaceHighlight,
        shadowOpacity: 0,
        elevation: 0,
    },
    emptyContainer: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        paddingTop: 100,
        paddingHorizontal: SPACING.massive,
    },
    emptyIconCircle: {
        width: SPACING.colossal,
        height: SPACING.colossal,
        borderRadius: SPACING.massive,
        backgroundColor: 'rgba(255, 255, 255, 0.05)',
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: SPACING.xxl,
    },
    emptyText: {
        fontSize: FONT_SIZE.base,
        color: COLORS.textMuted,
        fontWeight: '600',
        textAlign: 'center',
        lineHeight: 22,
    },
    // Image Preview Styles
    previewOverlay: {
        flex: 1,
        backgroundColor: COLORS.black,
        justifyContent: 'space-between',
    },
    previewHeader: {
        flexDirection: 'row',
        padding: SPACING.xl,
        paddingTop: Platform.OS === 'ios' ? 60 : SPACING.xl,
        justifyContent: 'flex-start',
    },
    previewImageContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: SPACING.md,
    },
    previewImageWrapper: {
        width: '100%',
        aspectRatio: 1,
        borderRadius: BORDER_RADIUS.xl,
        overflow: 'hidden',
        borderWidth: BORDER_WIDTH.thin,
        borderColor: COLORS.glassBorder,
        ...SHADOWS.extraStrong,
    },
    previewImage: {
        width: '100%',
        height: '100%',
    },
    previewFooter: {
        flexDirection: 'row',
        padding: SPACING.xxl,
        paddingBottom: Platform.OS === 'ios' ? 40 : SPACING.huge,
        justifyContent: 'flex-end',
        alignItems: 'center',
    },
    previewSendButton: {
        width: 60,
        height: 60,
        borderRadius: 30,
        backgroundColor: COLORS.primary,
        justifyContent: 'center',
        alignItems: 'center',
        ...SHADOWS.strong,
        shadowColor: COLORS.primary,
    },
    closeButton: {
        width: 44,
        height: 44,
        borderRadius: 22,
        backgroundColor: 'rgba(255,255,255,0.1)',
        justifyContent: 'center',
        alignItems: 'center',
    },
});

export default styles;
