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
        backgroundColor: COLORS.background, // Deep Void
        padding: PADDING.screen.horizontal,
        paddingTop: SPACING.xl,
        paddingBottom: 140, // More space for bottom tabs
    },
    card: {
        backgroundColor: 'rgba(30, 41, 59, 0.4)', // Glassmorphism
        borderRadius: BORDER_RADIUS.xxl,
        padding: PADDING.card.vertical,
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.08)', // Subtle rim
        ...SHADOWS.medium,
        marginBottom: MARGIN.item.large,
        shadowColor: COLORS.primary, // Neon glow hint
        shadowOpacity: 0.15,
    },
    header: {
        alignItems: "flex-start",
        marginBottom: MARGIN.section.medium,
        marginTop: SPACING.md,
    },
    title: {
        fontSize: FONT_SIZE.xxl,
        fontWeight: '800',
        color: COLORS.textPrimary,
        letterSpacing: -0.5,
        marginBottom: SPACING.xs,
        textShadowColor: 'rgba(0, 229, 255, 0.3)', // Neon glow
        textShadowOffset: { width: 0, height: 0 },
        textShadowRadius: 10,
    },
    subtitle: {
        fontSize: FONT_SIZE.sm,
        color: COLORS.textSecondary,
        fontWeight: '500',
        letterSpacing: 0.5,
    },
    form: {
        marginBottom: SPACING.xl,
    },
    formGroup: {
        marginBottom: MARGIN.item.large,
    },
    label: {
        fontSize: FONT_SIZE.sm,
        fontWeight: '700',
        marginBottom: SPACING.sm,
        color: COLORS.textSecondary,
        textTransform: 'uppercase',
        letterSpacing: 0.8,
    },
    inputContainer: {
        flexDirection: "row",
        alignItems: "center",
        backgroundColor: 'rgba(15, 23, 42, 0.6)', // Darker input bg
        borderRadius: BORDER_RADIUS.xl,
        paddingHorizontal: PADDING.input.horizontal,
        height: COMPONENT_SIZES.input.standard,
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.1)',
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.2,
        shadowRadius: 4,
    },
    inputIcon: {
        marginRight: SPACING.md,
        opacity: 0.8,
    },
    input: {
        flex: 1,
        color: COLORS.textPrimary,
        fontSize: FONT_SIZE.md,
        fontWeight: '600',
    },
    textArea: {
        backgroundColor: 'rgba(15, 23, 42, 0.6)',
        borderRadius: BORDER_RADIUS.xl,
        padding: PADDING.card.horizontal,
        height: 140,
        color: COLORS.textPrimary,
        fontSize: FONT_SIZE.md,
        fontWeight: '500',
        textAlignVertical: 'top',
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.1)',
    },
    ratingContainer: {
        flexDirection: "row",
        justifyContent: "center",
        alignItems: "center",
        backgroundColor: 'rgba(15, 23, 42, 0.4)',
        borderRadius: BORDER_RADIUS.xl,
        padding: PADDING.card.horizontal,
        gap: SPACING.xl,
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.05)',
    },
    starButton: {
        padding: SPACING.xs,
        shadowColor: COLORS.ratingGold,
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
    },
    imagePicker: {
        width: "100%",
        height: 240,
        backgroundColor: 'rgba(15, 23, 42, 0.3)',
        borderRadius: BORDER_RADIUS.xxl,
        borderWidth: 1.5,
        borderColor: 'rgba(25, 227, 209, 0.3)', // Neon Teal dashed looking border color (will be solid but colored)
        borderStyle: 'dashed',
        overflow: "hidden",
        justifyContent: 'center',
        alignItems: 'center',
    },
    previewImage: {
        width: "100%",
        height: "100%",
        resizeMode: 'cover',
    },
    imagePreviewContainer: {
        width: "100%",
        height: 240,
        borderRadius: BORDER_RADIUS.xxl,
        overflow: "hidden",
        position: 'relative',
        backgroundColor: '#000',
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.1)',
    },
    imageControlsOverlay: {
        position: 'absolute',
        top: 10,
        right: 10,
        flexDirection: 'row',
    },
    imageMenuButton: {
        width: 36,
        height: 36,
        borderRadius: 18,
        backgroundColor: 'rgba(0,0,0,0.6)',
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.2)',
    },
    imageOptionsMenu: {
        position: 'absolute',
        top: 50,
        right: 10,
        backgroundColor: 'rgba(30, 41, 59, 0.95)',
        borderRadius: BORDER_RADIUS.lg,
        padding: SPACING.xs,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.1)',
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        minWidth: 140,
        zIndex: 100,
    },
    menuOption: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 10,
        paddingHorizontal: 12,
        gap: 10,
    },
    menuOptionText: {
        color: COLORS.textPrimary,
        fontSize: 14,
        fontWeight: '500',
    },
    menuDivider: {
        height: 1,
        backgroundColor: 'rgba(255,255,255,0.1)',
        marginHorizontal: 4,
    },
    placeholderContainer: {
        width: "100%",
        height: "100%",
        justifyContent: "center",
        alignItems: "center",
        gap: SPACING.sm,
    },
    placeholderText: {
        color: COLORS.primary,
        fontWeight: '600',
        fontSize: FONT_SIZE.md,
        marginTop: SPACING.sm,
    },
    button: {
        backgroundColor: COLORS.primary,
        borderRadius: BORDER_RADIUS.xl,
        height: 56,
        flexDirection: "row",
        justifyContent: "center",
        alignItems: "center",
        marginTop: SPACING.xl,
        shadowColor: COLORS.primary,
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.6,
        shadowRadius: 20, // Strong glow
        elevation: 8,
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.3)', // Shine effect
    },
    buttonText: {
        fontSize: FONT_SIZE.lg,
        fontWeight: '800',
        color: '#000', // Black text on neon button
        letterSpacing: 0.5,
    },
    buttonIcon: {
        marginRight: SPACING.md,
    },

    // File upload specific
    fileUploadContainer: {
        marginTop: 20,
        marginBottom: 10,
    },
    // Scanner Styles
    scannerContainer: {
        flex: 1,
        backgroundColor: '#000',
    },
    scannerOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    scannerHeader: {
        position: 'absolute',
        top: 50,
        left: 20,
        right: 20,
        flexDirection: 'row',
        alignItems: 'center',
    },
    closeButton: {
        padding: 8,
        backgroundColor: 'rgba(0,0,0,0.5)',
        borderRadius: 20,
    },
    scannerTitle: {
        color: '#fff',
        fontSize: 18,
        fontWeight: '600',
        marginLeft: 20,
    },
    scanTarget: {
        width: 280,
        height: 150,
        borderWidth: 2,
        borderColor: COLORS.primary,
        borderRadius: 12,
        backgroundColor: 'transparent',
    },
    scannerInstruction: {
        color: '#fff',
        marginTop: 20,
        fontSize: 14,
        opacity: 0.8,
    },
    uploadBox: {
        height: 100,
        borderWidth: 1,
        borderStyle: 'dashed',
        borderColor: 'rgba(255,255,255,0.2)',
        borderRadius: BORDER_RADIUS.xl,
        backgroundColor: 'rgba(15, 23, 42, 0.3)',
        justifyContent: 'center',
        alignItems: 'center',
        flexDirection: 'row',
        gap: SPACING.md,
    },
    uploadBoxActive: {
        borderColor: COLORS.primary,
        backgroundColor: 'rgba(25, 227, 209, 0.1)',
    },
    fileName: {
        color: COLORS.textPrimary,
        fontSize: 16,
        fontWeight: '600',
        marginBottom: 4,
    },
    fileSize: {
        color: COLORS.textSecondary,
        fontSize: 12,
    },
    removeFile: {
        padding: SPACING.xs,
        marginLeft: SPACING.sm,
    },
    pdfOption: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginTop: SPACING.lg,
        paddingHorizontal: SPACING.xs,
        backgroundColor: 'rgba(255,255,255,0.03)',
        padding: SPACING.md,
        borderRadius: BORDER_RADIUS.lg,
    },
    pdfTextContainer: {
        flex: 1,
    },
    pdfTitle: {
        fontSize: FONT_SIZE.md,
        fontWeight: '600',
        color: COLORS.textPrimary,
        marginBottom: 2,
    },
    pdfDesc: {
        fontSize: FONT_SIZE.xs,
        color: COLORS.textSecondary
    },
    scanStatusBadge: {
        backgroundColor: 'rgba(0, 229, 255, 0.9)',
        paddingVertical: 8,
        paddingHorizontal: 16,
        borderRadius: 20,
        marginTop: 20,
        borderWidth: 1,
        borderColor: '#fff',
    },
    scanStatusText: {
        color: '#000',
        fontWeight: '700',
        fontSize: 14,
    }
});

export default styles;
