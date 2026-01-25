// styles/home.styles.ts
import { StyleSheet, Dimensions } from "react-native";
import COLORS from "../../constants/colors";
import {
    SPACING,
    PADDING,
    MARGIN,
    GAP,
    FONT_SIZE,
    TYPOGRAPHY,
    BORDER_RADIUS,
    RADIUS,
    SHADOWS,
    COMPONENT_SIZES,
    BORDER_WIDTH,
} from "../../constants/styleConstants";

const { width } = Dimensions.get('window');

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: COLORS.background,
    },
    listContainer: {
        paddingVertical: SPACING.xl,
        paddingHorizontal: 0,
        paddingBottom: 110,
    },
    header: {
        marginBottom: MARGIN.item.large,
        marginTop: SPACING.xxl,
        paddingHorizontal: SPACING.xl,
    },
    headerTitle: {
        ...TYPOGRAPHY.h1,
        color: COLORS.textPrimary,
    },
    headerSubtitle: {
        fontSize: FONT_SIZE.base,
        color: COLORS.textSecondary,
        marginTop: SPACING.xs,
        fontWeight: '500',
    },
    bookCard: {
        marginBottom: MARGIN.item.large,
        borderRadius: RADIUS.card.medium,
        backgroundColor: COLORS.cardBg,
        overflow: 'hidden',
        borderWidth: BORDER_WIDTH.thin,
        borderColor: COLORS.border,
        ...SHADOWS.strong,
    },
    floatHeader: {
        position: 'absolute',
        top: SPACING.xl,
        left: SPACING.xl,
        zIndex: 10,
        flexDirection: 'row',
        alignItems: 'center',
    },
    cardFooter: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginTop: SPACING.xl,
        paddingTop: SPACING.xl,
        borderTopWidth: BORDER_WIDTH.thin,
        borderTopColor: COLORS.border,
    },
    socialGroup: {
        flexDirection: 'row',
        gap: GAP.lg,
        alignItems: 'center',
    },
    userInfo: {
        flexDirection: "row",
        alignItems: "center",
        backgroundColor: 'rgba(0,0,0,0.6)',
        padding: SPACING.sm,
        paddingRight: SPACING.lg,
        borderRadius: BORDER_RADIUS.circular,
        borderWidth: BORDER_WIDTH.thin,
        borderColor: 'rgba(255,255,255,0.1)',
    },
    avatar: {
        width: COMPONENT_SIZES.avatar.tiny,
        height: COMPONENT_SIZES.avatar.tiny,
        borderRadius: RADIUS.avatar.small,
        marginRight: SPACING.md,
    },
    username: {
        fontSize: FONT_SIZE.xs,
        fontWeight: "600",
        color: COLORS.white,
    },
    bookImageContainer: {
        width: "100%",
        height: width, // Square aspect ratio (1:1)
        backgroundColor: COLORS.surfaceLight,
    },
    bookImage: {
        width: "100%",
        height: "100%",
    },
    bookDetails: {
        padding: PADDING.card.horizontal,
        backgroundColor: COLORS.cardBg,
    },
    bookTitle: {
        fontSize: FONT_SIZE.xl,
        fontWeight: "700",
        color: COLORS.textPrimary,
        lineHeight: 24,
        marginBottom: SPACING.sm,
    },
    ratingContainer: {
        flexDirection: "row",
        marginBottom: SPACING.lg,
        alignItems: 'center',
    },
    caption: {
        ...TYPOGRAPHY.body,
        color: COLORS.textSecondary,
        fontWeight: '400',
    },
    date: {
        ...TYPOGRAPHY.caption,
        color: COLORS.textMuted,
        textTransform: 'uppercase',
        letterSpacing: 0.5,
    },
    commentInfo: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: GAP.sm,
    },
    commentCount: {
        color: COLORS.textSecondary,
        fontWeight: '600',
        fontSize: FONT_SIZE.sm,
    },
    tabContainer: {
        flexDirection: "row",
        backgroundColor: COLORS.surface,
        padding: SPACING.xs,
        borderRadius: BORDER_RADIUS.xl,
        marginBottom: SPACING.xxl,
        marginTop: SPACING.xxl,
        borderWidth: BORDER_WIDTH.thin,
        borderColor: COLORS.border,
    },
    tab: {
        flex: 1,
        paddingVertical: SPACING.md + 2,
        alignItems: 'center',
        borderRadius: BORDER_RADIUS.md,
    },
    activeTab: {
        backgroundColor: COLORS.surfaceHighlight,
    },
    tabText: {
        fontSize: FONT_SIZE.sm,
        fontWeight: "600",
        color: COLORS.textSecondary,
    },
    activeTabText: {
        color: COLORS.textPrimary,
    },
    emptyContainer: {
        alignItems: "center",
        justifyContent: "center",
        padding: SPACING.giant,
        marginTop: SPACING.massive,
    },
    emptyText: {
        fontSize: FONT_SIZE.xl,
        fontWeight: "700",
        color: COLORS.textPrimary,
        marginTop: SPACING.xxl,
    },
    emptySubtext: {
        fontSize: FONT_SIZE.md,
        color: COLORS.textSecondary,
        textAlign: "center",
        marginTop: SPACING.md,
    },
    footerLoader: {
        marginVertical: SPACING.massive,
    },
    fab: {
        position: 'absolute',
        bottom: 110,
        right: SPACING.xxl,
        width: 60,
        height: 60,
        borderRadius: 30,
        backgroundColor: COLORS.primary,
        justifyContent: 'center',
        alignItems: 'center',
        elevation: 8,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 4,
    },
});

export default styles;
