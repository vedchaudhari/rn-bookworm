// styles/explore.styles.js
import { StyleSheet, Dimensions } from "react-native";
import COLORS from "../../constants/colors";

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
        paddingHorizontal: 20,
        paddingVertical: 32,
    },
    headerTitle: {
        fontSize: 34,
        fontWeight: '900',
        color: COLORS.textPrimary,
        letterSpacing: -1,
    },
    searchContainer: {
        marginHorizontal: 20,
        marginBottom: 24,
        backgroundColor: COLORS.surface,
        borderRadius: 20,
        borderWidth: 1,
        borderColor: COLORS.border,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.2,
        shadowRadius: 10,
        elevation: 6,
        overflow: 'hidden',
    },
    searchInputRow: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 16,
        height: 56,
    },
    searchIcon: {
        marginRight: 12,
        opacity: 0.7,
    },
    searchInput: {
        flex: 1,
        fontSize: 15,
        color: COLORS.textPrimary,
        fontWeight: '600',
    },
    searchTypeToggle: {
        flexDirection: 'row',
        padding: 4,
        gap: 8,
        backgroundColor: COLORS.surfaceHighlight,
        borderTopWidth: 1,
        borderTopColor: COLORS.border,
    },
    typeBtn: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 10,
        borderRadius: 14,
        gap: 8,
    },
    typeBtnActive: {
        backgroundColor: COLORS.primary,
    },
    typeText: {
        fontSize: 12,
        fontWeight: '700',
        color: COLORS.textMuted,
    },
    typeTextActive: {
        color: COLORS.white,
    },
    genreListContent: {
        paddingHorizontal: 20,
        gap: 12,
        paddingBottom: 24,
    },
    genreChip: {
        paddingHorizontal: 16,
        paddingVertical: 10,
        borderRadius: 14,
        backgroundColor: COLORS.surface,
        borderWidth: 1,
        borderColor: COLORS.border,
    },
    genreChipActive: {
        backgroundColor: COLORS.surfaceHighlight,
        borderColor: COLORS.primary,
    },
    genreText: {
        fontSize: 13,
        color: COLORS.textSecondary,
        fontWeight: '700',
    },
    genreTextActive: {
        color: COLORS.primary,
    },
    sectionHeader: {
        marginBottom: 20,
        marginTop: 8,
    },
    sectionHeaderTitle: {
        fontSize: 20,
        fontWeight: '800',
        color: COLORS.textPrimary,
        marginLeft: 20,
        marginBottom: 16,
        letterSpacing: -0.5,
    },
    suggestedListContent: {
        paddingHorizontal: 16,
        gap: 16,
    },
    suggestedUserCard: {
        width: 140,
        backgroundColor: COLORS.cardBg,
        borderRadius: 24,
        padding: 16,
        alignItems: 'center',
        borderWidth: 1,
        borderColor: COLORS.border,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.2,
        shadowRadius: 8,
        elevation: 4,
    },
    suggestedAvatar: {
        width: 64,
        height: 64,
        borderRadius: 32,
        marginBottom: 12,
        borderWidth: 2,
        borderColor: COLORS.surface,
    },
    suggestedName: {
        fontSize: 14,
        fontWeight: '700',
        color: COLORS.textPrimary,
        marginBottom: 12,
        textAlign: 'center',
    },
    tabContainer: {
        flexDirection: 'row',
        paddingHorizontal: 20,
        marginBottom: 24,
        gap: 12,
    },
    tab: {
        flex: 1,
        height: 44,
        alignItems: 'center',
        justifyContent: 'center',
        borderRadius: 14,
        backgroundColor: COLORS.surface,
        borderWidth: 1,
        borderColor: COLORS.border,
    },
    tabActive: {
        backgroundColor: COLORS.surfaceHighlight,
        borderColor: COLORS.primary,
    },
    tabText: {
        fontSize: 13,
        fontWeight: '700',
        color: COLORS.textMuted,
    },
    tabTextActive: {
        color: COLORS.textPrimary,
    },
    listContent: {
        paddingHorizontal: 20,
        paddingBottom: 100,
    },
    columnWrapper: {
        justifyContent: 'space-between',
        marginBottom: 20,
    },
    bookCardWrapper: {
        width: COLUMN_WIDTH,
    },
    bookCard: {
        backgroundColor: COLORS.cardBg,
        borderRadius: 20,
        overflow: 'hidden',
        borderWidth: 1,
        borderColor: COLORS.border,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.2,
        shadowRadius: 8,
        elevation: 3,
    },
    bookImage: {
        width: '100%',
        height: COLUMN_WIDTH * 1.4,
    },
    bookInfo: {
        padding: 12,
    },
    bookTitle: {
        fontSize: 15,
        fontWeight: '800',
        color: COLORS.textPrimary,
        marginBottom: 4,
        letterSpacing: -0.5,
    },
    bookAuthor: {
        fontSize: 12,
        color: COLORS.textSecondary,
        fontWeight: '600',
        marginBottom: 10,
    },
    cardFooter: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    ratingBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
    },
    ratingText: {
        fontSize: 12,
        fontWeight: '700',
        color: COLORS.textPrimary,
    },
    statsBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
    },
    statsText: {
        fontSize: 11,
        fontWeight: '600',
        color: COLORS.textMuted,
    },
    userCard: {
        marginBottom: 16,
    },
    userCardContent: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: COLORS.cardBg,
        padding: 16,
        borderRadius: 20,
        borderWidth: 1,
        borderColor: COLORS.border,
        gap: 16,
    },
    userAvatar: {
        width: 56,
        height: 56,
        borderRadius: 28,
    },
    userCardInfo: {
        flex: 1,
    },
    userCardName: {
        fontSize: 16,
        fontWeight: '800',
        color: COLORS.textPrimary,
        marginBottom: 2,
    },
    userCardBio: {
        fontSize: 13,
        color: COLORS.textSecondary,
        marginBottom: 6,
    },
    userCardBadge: {
        alignSelf: 'flex-start',
        backgroundColor: 'rgba(245, 158, 11, 0.12)',
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 6,
    },
    userCardBadgeText: {
        fontSize: 10,
        fontWeight: '800',
        color: COLORS.primary,
        textTransform: 'uppercase',
    },
    emptyContainer: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        paddingTop: 80,
        paddingHorizontal: 40,
    },
    emptyIconCircle: {
        width: 80,
        height: 80,
        borderRadius: 40,
        backgroundColor: 'rgba(255, 255, 255, 0.05)',
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 20,
    },
    emptyTitle: {
        fontSize: 20,
        fontWeight: '800',
        color: COLORS.textPrimary,
        marginBottom: 8,
    },
    emptySubtitle: {
        fontSize: 14,
        color: COLORS.textMuted,
        textAlign: 'center',
        lineHeight: 20,
    },
});

export default styles;
