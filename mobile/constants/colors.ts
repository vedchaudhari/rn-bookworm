const COLORS = {
    // Primary Brand - Electric Cyan (The "Glow")
    primary: "#4FD1C5", // Electric Cyan / Teal
    primaryDark: "#38B2AC", // Deep Teal
    primaryLight: "#81E6D9", // Bright Cyan (for highlights)
    primaryGlow: "rgba(79, 209, 197, 0.5)", // For soft shadows/glows

    // Secondary - Muted Blue-Gray & Soft White
    secondary: "#A0AEC0", // Cool Gray
    secondaryLight: "#CBD5E0", // Lighter Cool Gray
    secondaryDark: "#718096", // Darker Cool Gray

    // Tertiary / Legacy Accents (Mapped to new theme)
    accent: "#9F7AEA", // Soft Purple (matches Ink Drops)
    accentLight: "#B794F4",
    cardBg: "#121212", // Alias for surface

    // Backgrounds - deep, rich, not flat black
    background: "#050505", // Almost pure black, deep void
    surface: "#121212", // Standard surface
    surfaceLight: "#1E1E1E", // Elevated surface
    surfaceHighlight: "#2D2D2D", // Pressed state / active

    // Text
    textPrimary: "#F7FAFC", // Soft White (High Legibility)
    textSecondary: "#A0AEC0", // Muted Blue-Gray
    textTertiary: "#718096", // Deeper Muted
    textMuted: "#4A5568",

    // Status
    success: "#68D391", // Soft Green
    error: "#FC8181", // Soft Red
    warning: "#F6E05E", // Soft Gold
    info: "#63B3ED", // Soft Blue

    // Borders - Extremely subtle
    border: "#2D3748", // Dark Navy-Gray
    borderLight: "rgba(255, 255, 255, 0.1)", // Glass border

    // Glassmorphism System
    glass: {
        bg: "rgba(30, 30, 30, 0.6)", // Base glass background
        border: "rgba(255, 255, 255, 0.08)", // Subtle white rim
        highlight: "rgba(255, 255, 255, 0.05)",
        blur: 20, // Recommended blur intensity
    },
    glassBorder: "rgba(255, 255, 255, 0.08)", // Alias for direct access

    // Special
    gold: "#FFD700", // Keep for legacy / ratings
    overlay: "rgba(0, 0, 0, 0.7)",

    // Gradients (Linear definition helpers)
    gradients: {
        primary: ["#4FD1C5", "#38B2AC"],
        darkSurface: ["#1A1A1A", "#0A0A0A"],
        glow: ["rgba(79,209,197,0.2)", "transparent"],
    },

    white: "#FFFFFF",
    black: "#000000",
    transparent: "transparent",
} as const;

export default COLORS;
