// styles/profile.styles.ts
import { StyleSheet, Dimensions, Platform } from "react-native";
import COLORS from "../../constants/colors";
import {
    SPACING,
    PADDING,
    MARGIN,
    FONT_SIZE,
    BORDER_RADIUS,
    RADIUS,
    SHADOWS,
    COMPONENT_SIZES,
} from "../../constants/styleConstants";

const { width } = Dimensions.get('window');
const COLUMN_WIDTH = (width - (SPACING.md * 2) - (SPACING.sm * 2)) / 3;

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
    // Header Section
    headerContainer: {
        alignItems: 'center',
        paddingTop: 60, // Safe Area approx
        paddingBottom: SPACING.xl,
        position: 'relative',
    },
    // Avatar with Glow
    avatarContainer: {
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: SPACING.lg,
        position: 'relative',
    },
    avatarGlowRing: {
        width: COMPONENT_SIZES.avatar.profile + 8,
        height: COMPONENT_SIZES.avatar.profile + 8,
        borderRadius: (COMPONENT_SIZES.avatar.profile + 8) / 2,
        borderWidth: 2,
        borderColor: COLORS.primary, // The "Cyber" ring
        alignItems: 'center',
        justifyContent: 'center',
        shadowColor: COLORS.primary,
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.6,
        shadowRadius: 15,
        elevation: 10,
        backgroundColor: COLORS.primaryGlow, // Subtle backing
    },
    avatarImage: {
        width: COMPONENT_SIZES.avatar.profile,
        height: COMPONENT_SIZES.avatar.profile,
        borderRadius: COMPONENT_SIZES.avatar.profile / 2,
        backgroundColor: COLORS.surfaceLight,
    },
    cameraButton: {
        position: 'absolute',
        bottom: 0,
        right: 0,
        backgroundColor: COLORS.primary,
        width: 36,
        height: 36,
        borderRadius: 18,
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 3,
        borderColor: COLORS.background,
    },

    // User Info
    userInfoContainer: {
        alignItems: 'center',
        marginBottom: SPACING.xl,
    },
    usernameRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: SPACING.xs,
        marginBottom: 4,
    },
    usernameText: {
        fontSize: FONT_SIZE.xxl,
        fontWeight: '800',
        color: COLORS.textPrimary,
        letterSpacing: 0.5,
    },
    emailText: {
        fontSize: FONT_SIZE.sm,
        color: COLORS.textTertiary,
        fontWeight: '500',
    },

    // Dashboard Button (Prominent)
    dashboardButtonContainer: {
        width: '60%',
        marginBottom: SPACING.xl,
    },

    // Stats Grid (Side by side glass cards)
    statsGrid: {
        flexDirection: 'row',
        paddingHorizontal: SPACING.lg,
        gap: SPACING.md,
        marginTop: SPACING.xl,
    },
    statCard: {
        flex: 1,
        // height: 80, // Handled by component
    },

    // Segmented Tabs
    tabContainer: {
        flexDirection: 'row',
        marginHorizontal: SPACING.lg,
        marginTop: SPACING.xxl,
        backgroundColor: COLORS.surface,
        borderRadius: 100,
        padding: 4,
        borderWidth: 1,
        borderColor: COLORS.glassBorder,
        height: 48,
    },
    tabItem: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        borderRadius: 100,
    },
    activeTabItem: {
        backgroundColor: COLORS.surfaceHighlight, // Or gradient if possible, but solid is cleaner for tabs
    },
    tabText: {
        fontSize: FONT_SIZE.sm,
        fontWeight: '600',
        color: COLORS.textSecondary,
    },
    activeTabText: {
        color: COLORS.textPrimary,
        fontWeight: '700',
    },

    // Grid Content
    gridContainer: {
        paddingHorizontal: SPACING.md,
        paddingTop: SPACING.lg,
        paddingBottom: 100,
    },
    bookItem: {
        width: COLUMN_WIDTH,
        height: COLUMN_WIDTH * 1.5,
        marginBottom: SPACING.md,
        borderRadius: BORDER_RADIUS.md,
        marginHorizontal: SPACING.xs / 2,
        backgroundColor: COLORS.surfaceLight,
        overflow: 'hidden',
    },
    bookImage: {
        width: '100%',
        height: '100%',
    },

    // User Strip
    userListContainer: {
        paddingHorizontal: SPACING.lg,
        paddingTop: SPACING.lg,
    },
    userListItem: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: SPACING.md,
        marginBottom: SPACING.sm,
        backgroundColor: COLORS.surface,
        borderRadius: 100,
        borderWidth: 1,
        borderColor: COLORS.glassBorder,
    },
    userListAvatar: {
        width: 48,
        height: 48,
        borderRadius: 24,
        marginRight: SPACING.md,
    },
    userListName: {
        fontSize: FONT_SIZE.md,
        fontWeight: '700',
        color: COLORS.textPrimary,
    },

    // Empty State
    emptyState: {
        alignItems: 'center',
        justifyContent: 'center',
        paddingTop: 60,
        opacity: 0.7,
    },
    emptyText: {
        marginTop: SPACING.md,
        color: COLORS.textSecondary,
        fontSize: FONT_SIZE.md,
        textAlign: 'center',
    },

    // Logout
    logoutButton: {
        position: 'absolute',
        top: 60, // Match header padding
        right: SPACING.lg,
        zIndex: 10,
        padding: SPACING.sm,
        backgroundColor: COLORS.glass.bg,
        borderRadius: BORDER_RADIUS.circular,
        borderWidth: 1,
        borderColor: COLORS.glass.border,
    }
});

export default styles;
