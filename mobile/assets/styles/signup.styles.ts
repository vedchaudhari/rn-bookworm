// styles/signup.styles.ts
import { StyleSheet, Dimensions } from "react-native";
import COLORS from "../../constants/colors";
import {
    SPACING,
    PADDING,
    MARGIN,
    FONT_SIZE,
    TYPOGRAPHY,
    BORDER_RADIUS,
    RADIUS,
    SHADOWS,
    COMPONENT_SIZES,
    BORDER_WIDTH,
    OPACITY,
} from "../../constants/styleConstants";

const { width, height } = Dimensions.get("window");

const styles = StyleSheet.create({
    gradientBackground: {
        position: 'absolute',
        left: 0,
        right: 0,
        top: 0,
        bottom: 0,
    },
    floatingIcon1: {
        position: 'absolute',
        top: height * 0.15,
        right: 30,
        transform: [{ rotate: '-15deg' }],
    },
    floatingIcon2: {
        position: 'absolute',
        top: height * 0.25,
        left: 20,
        transform: [{ rotate: '12deg' }],
    },
    floatingIcon3: {
        position: 'absolute',
        bottom: height * 0.2,
        right: 40,
        transform: [{ rotate: '20deg' }],
    },
    container: {
        flex: 1,
        justifyContent: "center",
        paddingHorizontal: PADDING.screen.horizontal + 4,
        paddingVertical: SPACING.massive,
    },
    header: {
        alignItems: "center",
        marginBottom: MARGIN.section.large,
    },
    logoContainer: {
        width: 80,
        height: 80,
        borderRadius: 40,
        backgroundColor: 'rgba(245, 158, 11, 0.1)',
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: SPACING.xl,
        borderWidth: 2,
        borderColor: 'rgba(245, 158, 11, 0.3)',
    },
    title: {
        fontSize: FONT_SIZE.huge + 4,
        fontWeight: '800',
        color: COLORS.textPrimary,
        letterSpacing: -1.5,
        marginBottom: SPACING.sm,
        textAlign: 'center',
    },
    subtitle: {
        fontSize: FONT_SIZE.base,
        color: COLORS.textSecondary,
        fontWeight: '500',
        textAlign: 'center',
        lineHeight: 22,
        opacity: 0.9,
    },
    card: {
        backgroundColor: `${COLORS.cardBg}F5`,
        borderRadius: RADIUS.card.massive,
        padding: PADDING.card.vertical + 4,
        borderWidth: BORDER_WIDTH.thin,
        borderColor: COLORS.glassBorder,
        ...SHADOWS.extraStrong,
        backdropFilter: 'blur(10px)',
    },
    formContainer: {
        marginBottom: SPACING.md,
    },
    inputGroup: {
        marginBottom: SPACING.xl,
    },
    label: {
        fontSize: FONT_SIZE.sm,
        fontWeight: '600',
        marginBottom: SPACING.md,
        color: COLORS.textSecondary,
        letterSpacing: 0.3,
    },
    inputContainer: {
        flexDirection: "row",
        alignItems: "center",
        backgroundColor: COLORS.surface,
        borderRadius: BORDER_RADIUS.xl,
        paddingHorizontal: PADDING.input.horizontal,
        height: COMPONENT_SIZES.input.standard,
        borderWidth: BORDER_WIDTH.thin,
        borderColor: COLORS.glassBorder,
    },
    inputIcon: {
        marginRight: SPACING.lg,
        opacity: 0.7,
    },
    input: {
        flex: 1,
        color: COLORS.textPrimary,
        fontSize: FONT_SIZE.base,
        fontWeight: '500',
    },
    button: {
        borderRadius: RADIUS.button.primary,
        height: COMPONENT_SIZES.button.large,
        marginTop: MARGIN.item.large,
        overflow: 'hidden',
        ...SHADOWS.strong,
    },
    buttonGradient: {
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
        paddingHorizontal: SPACING.xxl,
    },
    buttonDisabled: {
        opacity: OPACITY.disabled,
    },
    buttonText: {
        fontSize: FONT_SIZE.md,
        fontWeight: '700',
        color: COLORS.white,
        letterSpacing: 0.8,
    },
    footer: {
        flexDirection: "row",
        justifyContent: "center",
        marginTop: MARGIN.section.medium,
        paddingTop: PADDING.card.vertical,
        borderTopWidth: BORDER_WIDTH.thin,
        borderTopColor: COLORS.glassBorder,
    },
    footerText: {
        color: COLORS.textMuted,
        marginRight: SPACING.sm,
        fontWeight: '500',
        fontSize: FONT_SIZE.md,
    },
    link: {
        color: COLORS.primary,
        fontWeight: "700",
        fontSize: FONT_SIZE.md,
    },
    trustIndicators: {
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        marginTop: MARGIN.section.medium,
        paddingVertical: SPACING.lg,
        gap: SPACING.md,
    },
    trustItem: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: SPACING.sm - 2,
    },
    trustText: {
        fontSize: FONT_SIZE.xs,
        color: COLORS.textSecondary,
        fontWeight: '600',
    },
    trustDot: {
        width: 3,
        height: 3,
        borderRadius: 1.5,
        backgroundColor: COLORS.textMuted,
        opacity: 0.5,
    },
});

export default styles;
