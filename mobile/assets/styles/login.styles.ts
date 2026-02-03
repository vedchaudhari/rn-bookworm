// styles/login.styles.ts
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

const { width } = Dimensions.get("window");

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: COLORS.background,
        padding: PADDING.screen.horizontal,
        justifyContent: "center",
    },
    topIllustration: {
        alignItems: "center",
        width: "100%",
        marginBottom: MARGIN.section.medium,
    },
    illustrationImage: {
        width: Math.min(width * 0.4, 160),
        height: Math.min(width * 0.4, 160),
    },
    card: {
        backgroundColor: COLORS.cardBg,
        borderRadius: RADIUS.card.massive,
        padding: PADDING.card.vertical,
        borderWidth: BORDER_WIDTH.thin,
        borderColor: COLORS.glassBorder,
        ...SHADOWS.extraStrong,
    },
    header: {
        alignItems: "center",
        marginBottom: MARGIN.section.medium,
    },
    title: {
        ...TYPOGRAPHY.h2,
        color: COLORS.textPrimary,
        letterSpacing: -1,
        marginBottom: SPACING.md,
    },
    subtitle: {
        fontSize: FONT_SIZE.base,
        color: COLORS.textSecondary,
        fontWeight: '500',
        textAlign: 'center',
        lineHeight: 22,
    },
    formContainer: {
        marginBottom: SPACING.lg,
    },
    inputGroup: {
        marginBottom: SPACING.xxl,
    },
    label: {
        ...TYPOGRAPHY.label,
        marginBottom: SPACING.md,
        color: COLORS.textSecondary,
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
    inputContainerFocused: {
        borderColor: COLORS.primary,
        backgroundColor: COLORS.surfaceLight,
        shadowColor: COLORS.primary,
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.2,
        shadowRadius: 10,
        elevation: 4,
    },
    inputContainerError: {
        borderColor: COLORS.error,
    },
    inputIcon: {
        marginRight: SPACING.lg,
        opacity: OPACITY.muted,
    },
    input: {
        flex: 1,
        color: COLORS.textPrimary,
        fontSize: FONT_SIZE.base,
        fontWeight: '600',
    },
    eyeIcon: {
        padding: SPACING.md + 2,
    },
    errorText: {
        fontSize: FONT_SIZE.xs,
        color: COLORS.error,
        marginTop: SPACING.sm,
        marginLeft: SPACING.xs,
        fontWeight: '600',
    },
    button: {
        backgroundColor: COLORS.primary,
        borderRadius: RADIUS.button.primary,
        height: COMPONENT_SIZES.button.large,
        justifyContent: "center",
        alignItems: "center",
        marginTop: MARGIN.item.large,
        ...SHADOWS.strong,
        shadowColor: COLORS.primary,
    },
    buttonPressed: {
        opacity: OPACITY.almostOpaque,
        transform: [{ scale: 0.98 }],
    },
    buttonDisabled: {
        opacity: OPACITY.disabled,
    },
    buttonText: {
        ...TYPOGRAPHY.button,
        color: COLORS.white,
        letterSpacing: 0.5,
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
    welcomeText: {
        fontSize: FONT_SIZE.huge,
        fontWeight: "800",
        color: COLORS.textPrimary,
        textAlign: "center",
        marginBottom: SPACING.md,
        letterSpacing: -0.5,
    },
    welcomeSubtext: {
        fontSize: FONT_SIZE.base,
        color: COLORS.textSecondary,
        textAlign: "center",
        fontWeight: '500',
        marginBottom: MARGIN.section.medium,
        lineHeight: 22,
    },
});

export default styles;
