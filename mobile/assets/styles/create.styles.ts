// styles/create.styles.ts
import { StyleSheet } from "react-native";
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
} from "../../constants/styleConstants";

const styles = StyleSheet.create({
    container: {
        flexGrow: 1,
        backgroundColor: COLORS.background,
        padding: PADDING.screen.horizontal,
        paddingBottom: 120,
    },
    card: {
        backgroundColor: COLORS.cardBg,
        borderRadius: RADIUS.card.large,
        padding: PADDING.card.vertical,
        borderWidth: BORDER_WIDTH.thin,
        borderColor: COLORS.glassBorder,
        ...SHADOWS.medium,
        marginBottom: MARGIN.item.large,
    },
    header: {
        alignItems: "flex-start",
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
    },
    form: {
        marginBottom: SPACING.xl,
    },
    formGroup: {
        marginBottom: MARGIN.item.large,
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
    textArea: {
        backgroundColor: COLORS.surface,
        borderRadius: BORDER_RADIUS.xl,
        padding: PADDING.card.horizontal,
        height: 140,
        color: COLORS.textPrimary,
        fontSize: FONT_SIZE.base,
        fontWeight: '500',
        textAlignVertical: 'top',
        borderWidth: BORDER_WIDTH.thin,
        borderColor: COLORS.glassBorder,
    },
    ratingContainer: {
        flexDirection: "row",
        justifyContent: "center",
        alignItems: "center",
        backgroundColor: COLORS.surface,
        borderRadius: BORDER_RADIUS.xl,
        padding: PADDING.card.horizontal,
        gap: SPACING.lg,
        borderWidth: BORDER_WIDTH.thin,
        borderColor: COLORS.glassBorder,
    },
    starButton: {
        padding: SPACING.xs,
    },
    imagePicker: {
        width: "100%",
        height: 220,
        backgroundColor: COLORS.surface,
        borderRadius: RADIUS.card.medium,
        borderWidth: BORDER_WIDTH.thick,
        borderColor: COLORS.glassBorder,
        borderStyle: 'dashed',
        overflow: "hidden",
    },
    previewImage: {
        width: "100%",
        height: "100%",
    },
    placeholderContainer: {
        width: "100%",
        height: "100%",
        justifyContent: "center",
        alignItems: "center",
    },
    placeholderText: {
        color: COLORS.textMuted,
        marginTop: SPACING.lg,
        fontWeight: '600',
        fontSize: FONT_SIZE.md,
    },
    button: {
        backgroundColor: COLORS.primary,
        borderRadius: RADIUS.button.primary,
        height: COMPONENT_SIZES.button.large,
        flexDirection: "row",
        justifyContent: "center",
        alignItems: "center",
        marginTop: SPACING.xl,
        ...SHADOWS.strong,
        shadowColor: COLORS.primary,
    },
    buttonText: {
        ...TYPOGRAPHY.button,
        color: COLORS.white,
    },
    buttonIcon: {
        marginRight: SPACING.md + 2,
    },
});

export default styles;
