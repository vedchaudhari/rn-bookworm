const COLORS = {
    // Primary Accent (Neon Teal / Cyan) - AI + Premium Hero
    primary: "#19E3D1", // Neon Teal
    primaryDark: "#00C2FF", // Cyan Glow
    primaryLight: "#4EF0E8", // Soft Aqua
    primaryGlow: "rgba(25, 227, 209, 0.4)", // Teal Glow
    primaryEthereal: "rgba(25, 227, 209, 0.08)", // Very soft glow

    // Secondary - Silver Chrome & Platinum
    secondary: "#E2E8F0",
    secondaryLight: "#F8FAFC",
    secondaryDark: "#94A3B8",
    platinum: "#F1F5F9",

    // Accents
    accent: "#00C2FF", // Cyan Accent
    accentLight: "#4EF0E8",
    cardBg: "#141A21", // Card Surface Dark

    // "God Level" Textures & Surfaces
    background: "#0B0F14", // Deep Charcoal
    surface: "#0E1B24", // Soft Dark Blue Surface
    surfaceLight: "#141A21", // Card Surface
    surfaceHighlight: "#1C2631", // Pressed/Hover state
    surfaceSilk: "rgba(20, 26, 33, 0.95)", // High-end silk texture base
    diamondRim: "rgba(255, 255, 255, 0.18)", // Sharp edge lighting

    // Text - Editorial Grade
    textPrimary: "#FFFFFF",
    textSecondary: "rgba(160, 174, 192, 0.9)", // Softened Slate
    textTertiary: "rgba(113, 128, 150, 0.8)",
    textMuted: "rgba(74, 85, 104, 0.7)",

    // Status
    success: "#10B981",
    error: "#EF4444",
    warning: "#FFD700",
    info: "#3B82F6",

    // Glassmorphism System - God Level Depth
    glass: {
        bg: "rgba(14, 27, 36, 0.82)",
        border: "rgba(25, 227, 209, 0.15)", // Teal rim
        highlight: "rgba(255, 255, 255, 0.08)",
        blur: 40,
    },
    glassBorder: "rgba(25, 227, 209, 0.12)",

    // Premium Accents
    gold: "#FFD700",
    ratingGold: "#FFD700",
    overlay: "rgba(0, 0, 0, 0.88)",

    // Gradients - God Level
    gradients: {
        primary: ["#19E3D1", "#00C2FF"],
        silk: ["#141A21", "#0E1B24"], // Silk texture feel
        aurora: ["#00C2FF", "rgba(25, 227, 209, 0.5)", "transparent"], // Complicated aura
        nocturnal: ["#0E1B24", "#0B0F14"],
        glow: ["rgba(25, 227, 209, 0.25)", "transparent"],
    },

    white: "#FFFFFF",
    black: "#000000",
    transparent: "transparent",
} as const;

export default COLORS;
