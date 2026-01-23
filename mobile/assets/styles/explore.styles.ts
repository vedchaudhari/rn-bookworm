// styles/explore.styles.ts
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
    OPACITY,
} from "../../constants/styleConstants";

const { width } = Dimensions.get('window');
const COLUMN_WIDTH = (width - 56) / 2;

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: COLORS.background,
    },
    loadingContainer: {
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
        backgroundColor: COLORS.background,
    },
    header: {
        paddingHorizontal: PADDING.section.horizontal,
        paddingVertical: PADDING.section.vertical,
    },
    headerTitle: {
        ...TYPOGRAPHY.h1,
        fontWeight: '900',
        color: COLORS.textPrimary,
        letterSpacing: -1,
    },
    searchContainer: {
        marginHorizontal: SPACING.xxl,
        marginBottom: MARGIN.item.large,
        backgroundColor: COLORS.surface,
        borderRadius: RADIUS.card.medium,
        borderWidth: BORDER_WIDTH.thin,
        borderColor: COLORS.border,
        ...SHADOWS.medium,
        overflow: 'hidden',
    },
    searchInputRow: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: SPACING.xl,
        height: COMPONENT_SIZES.input.standard,
    },
    searchIcon: {
        marginRight: SPACING.lg,
        opacity: OPACITY.muted,
    },
    searchInput: {
        flex: 1,
        fontSize: FONT_SIZE.base,
        color: COLORS.textPrimary,
        fontWeight: '600',
    },
    searchTypeToggle: {
        flexDirection: 'row',
        padding: SPACING.xs,
        gap: GAP.sm,
        backgroundColor: COLORS.surfaceHighlight,
        borderTopWidth: BORDER_WIDTH.thin,
        borderTopColor: COLORS.border,
    },
    typeBtn: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: SPACING.md + 2,
        borderRadius: BORDER_RADIUS.lg,
        gap: GAP.sm,
    },
    typeBtnActive: {
        backgroundColor: COLORS.primary,
    },
    typeText: {
        fontSize: FONT_SIZE.xs,
        fontWeight: '700',
        color: COLORS.textMuted,
    },
    typeTextActive: {
        color: COLORS.white,
    },
    genreListContent: {
        paddingHorizontal: SPACING.xxl,
        gap: GAP.md,
        paddingBottom: MARGIN.item.large,
    },
    genreChip: {
        paddingHorizontal: SPACING.xl,
        paddingVertical: SPACING.md + 2,
        borderRadius: BORDER_RADIUS.lg,
        backgroundColor: COLORS.surface,
        borderWidth: BORDER_WIDTH.thin,
        borderColor: COLORS.border,
    },
    genreChipActive: {
        backgroundColor: COLORS.surfaceHighlight,
        borderColor: COLORS.primary,
    },
    genreText: {
        fontSize: FONT_SIZE.sm,
        color: COLORS.textSecondary,
        fontWeight: '700',
    },
    genreTextActive: {
        color: COLORS.primary,
    },
    sectionHeader: {
        marginBottom: SPACING.xxl,
        marginTop: SPACING.md,
    },
    sectionHeaderTitle: {
        fontSize: FONT_SIZE.xxl,
        fontWeight: '800',
        color: COLORS.textPrimary,
        marginLeft: SPACING.xxl,
        marginBottom: SPACING.xl,
        letterSpacing: -0.5,
    },
    suggestedListContent: {
        paddingHorizontal: SPACING.xl,
        gap: GAP.lg,
    },
    suggestedUserCard: {
        width: 140,
        backgroundColor: COLORS.cardBg,
        borderRadius: RADIUS.card.large,
        padding: PADDING.card.horizontal,
        alignItems: 'center',
        borderWidth: BORDER_WIDTH.thin,
        borderColor: COLORS.border,
        ...SHADOWS.medium,
    },
    suggestedAvatar: {
        width: COMPONENT_SIZES.avatar.xlarge,
        height: COMPONENT_SIZES.avatar.xlarge,
        borderRadius: COMPONENT_SIZES.avatar.xlarge / 2,
        marginBottom: SPACING.lg,
        borderWidth: BORDER_WIDTH.thick,
        borderColor: COLORS.surface,
    },
    suggestedName: {
        fontSize: FONT_SIZE.md,
        fontWeight: '700',
        color: COLORS.textPrimary,
        marginBottom: SPACING.lg,
        textAlign: 'center',
    },
    tabContainer: {
        flexDirection: 'row',
        paddingHorizontal: SPACING.xxl,
        marginBottom: MARGIN.item.large,
        gap: GAP.md,
    },
    tab: {
        flex: 1,
        height: COMPONENT_SIZES.button.medium,
        alignItems: 'center',
        justifyContent: 'center',
        borderRadius: BORDER_RADIUS.lg,
        backgroundColor: COLORS.surface,
        borderWidth: BORDER_WIDTH.thin,
        borderColor: COLORS.border,
    },
    tabActive: {
        backgroundColor: COLORS.surfaceHighlight,
        borderColor: COLORS.primary,
    },
    tabText: {
        fontSize: FONT_SIZE.sm,
        fontWeight: '700',
        color: COLORS.textMuted,
    },
    tabTextActive: {
        color: COLORS.textPrimary,
    },
    listContent: {
        paddingHorizontal: SPACING.xxl,
        paddingBottom: 100,
    },
    columnWrapper: {
        justifyContent: 'space-between',
        marginBottom: SPACING.xxl,
    },
    bookCardWrapper: {
        width: COLUMN_WIDTH,
    },
    bookCard: {
        backgroundColor: COLORS.cardBg,
        borderRadius: RADIUS.card.medium,
        overflow: 'hidden',
        borderWidth: BORDER_WIDTH.thin,
        borderColor: COLORS.border,
        ...SHADOWS.light,
    },
    bookImage: {
        width: '100%',
        height: COLUMN_WIDTH * 1.4,
    },
    bookInfo: {
        padding: SPACING.lg,
    },
    bookTitle: {
        fontSize: FONT_SIZE.base,
        fontWeight: '800',
        color: COLORS.textPrimary,
        marginBottom: SPACING.xs,
        letterSpacing: -0.5,
    },
    bookAuthor: {
        fontSize: FONT_SIZE.xs,
        color: COLORS.textSecondary,
        fontWeight: '600',
        marginBottom: SPACING.md + 2,
    },
    cardFooter: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    ratingBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: GAP.xs,
    },
    ratingText: {
        fontSize: FONT_SIZE.xs,
        fontWeight: '700',
        color: COLORS.textPrimary,
    },
    statsBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: GAP.xs,
    },
    statsText: {
        fontSize: FONT_SIZE.xxs,
        fontWeight: '600',
        color: COLORS.textMuted,
    },
    userCard: {
        marginBottom: SPACING.xl,
    },
    userCardContent: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: COLORS.cardBg,
        padding: PADDING.card.horizontal,
        borderRadius: RADIUS.card.medium,
        borderWidth: BORDER_WIDTH.thin,
        borderColor: COLORS.border,
        gap: GAP.lg,
    },
    userAvatar: {
        width: COMPONENT_SIZES.avatar.large,
        height: COMPONENT_SIZES.avatar.large,
        borderRadius: COMPONENT_SIZES.avatar.large / 2,
    },
    userCardInfo: {
        flex: 1,
    },
    userCardName: {
        fontSize: FONT_SIZE.lg,
        fontWeight: '800',
        color: COLORS.textPrimary,
        marginBottom: 2,
    },
    userCardBio: {
        fontSize: FONT_SIZE.sm,
        color: COLORS.textSecondary,
        marginBottom: SPACING.sm,
    },
    userCardBadge: {
        alignSelf: 'flex-start',
        backgroundColor: 'rgba(245, 158, 11, 0.12)',
        paddingHorizontal: SPACING.md,
        paddingVertical: SPACING.xs,
        borderRadius: BORDER_RADIUS.xs,
    },
    userCardBadgeText: {
        fontSize: FONT_SIZE.xxxs,
        fontWeight: '800',
        color: COLORS.primary,
        textTransform: 'uppercase',
    },
    emptyContainer: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        paddingTop: SPACING.colossal,
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
    emptyTitle: {
        fontSize: FONT_SIZE.xxl,
        fontWeight: '800',
        color: COLORS.textPrimary,
        marginBottom: SPACING.md,
    },
    emptySubtitle: {
        fontSize: FONT_SIZE.md,
        color: COLORS.textMuted,
        textAlign: 'center',
        lineHeight: 20,
    },
});

export default styles;
