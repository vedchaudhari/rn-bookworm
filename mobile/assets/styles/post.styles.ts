// f:\rn-wss-android\rn-bookworm\mobile\assets\styles\post.styles.ts
import { StyleSheet, Dimensions } from "react-native";
import COLORS from "../../constants/colors";
import {
    SPACING,
    FONT_SIZE,
    RADIUS,
    SHADOWS,
    BORDER_WIDTH,
} from "../../constants/styleConstants";

const { width } = Dimensions.get('window');
const CARD_MARGIN = SPACING.lg;
const CARD_WIDTH = width - (CARD_MARGIN * 2);

const styles = StyleSheet.create({
    container: {
        width: CARD_WIDTH,
        alignSelf: 'center',
        backgroundColor: COLORS.cardBg,
        marginBottom: SPACING.xxl,
        borderRadius: RADIUS.card.medium,
        overflow: 'hidden',
        borderWidth: BORDER_WIDTH.thin,
        borderColor: COLORS.border,
        ...SHADOWS.strong,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: SPACING.lg,
        paddingHorizontal: SPACING.xl,
        justifyContent: 'space-between',
        backgroundColor: COLORS.cardBg,
    },
    headerLeft: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    avatar: {
        width: 32,
        height: 32,
        borderRadius: 16,
        marginRight: SPACING.md,
        borderWidth: BORDER_WIDTH.thin,
        borderColor: COLORS.border,
    },
    username: {
        fontSize: FONT_SIZE.md,
        fontWeight: '700',
        color: COLORS.textPrimary,
    },
    mediaContainer: {
        width: CARD_WIDTH,
        aspectRatio: 1, // Compact 1:1 Square
        backgroundColor: COLORS.surface,
        overflow: 'hidden',
    },
    image: {
        width: '100%',
        height: '100%',
    },
    actionRow: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: SPACING.xl,
        paddingTop: SPACING.lg,
        paddingBottom: SPACING.xs,
        justifyContent: 'space-between',
    },
    leftActions: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: SPACING.xxl,
    },
    actionButton: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    likesText: {
        fontSize: FONT_SIZE.md,
        fontWeight: '700',
        color: COLORS.textPrimary,
        paddingHorizontal: SPACING.xl,
        marginTop: SPACING.lg, // Increased from sm
    },
    contentSection: {
        paddingHorizontal: SPACING.xl,
        marginTop: SPACING.md, // Increased from sm
    },
    captionText: {
        fontSize: FONT_SIZE.md,
        lineHeight: 20, // Increased from 18
        color: COLORS.textPrimary,
    },
    captionUsername: {
        fontWeight: '600',
    },
    ratingStrip: {
        flexDirection: 'row',
        paddingHorizontal: SPACING.xl,
        marginTop: SPACING.lg, // Increased from sm
    },
    viewComments: {
        fontSize: FONT_SIZE.sm,
        color: COLORS.textMuted,
        paddingHorizontal: SPACING.xl,
        marginTop: SPACING.md,
    },
    timeAgo: {
        fontSize: FONT_SIZE.xxxs,
        color: COLORS.textMuted,
        paddingHorizontal: SPACING.xl,
        marginTop: SPACING.lg, // Increased from sm
        marginBottom: SPACING.xxl, // Balanced bottom gap
        textTransform: 'uppercase',
        letterSpacing: 1, // Slight increase for air
    }
});

export default styles;
