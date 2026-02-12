/**
 * Application Design System - Multi-Style Theme Engine
 * 
 * Instructions: To switch styles, comment out the active COLORS constant 
 * and uncomment your desired style below.
 */

/* =============================================================================
   STYLE 1: ELITE PROFESSIONAL (The "Executive" Look)
   Minimalist, high-end precision, deep navy/slate, authoritative blue accents.
   ============================================================================= */
/*
const COLORS = {
    // Primary - Deep Executive Blue
    primary: "#2563EB",
    primaryDark: "#1E40AF",
    primaryLight: "#60A5FA",
    primaryGlow: "rgba(37, 99, 235, 0.35)",
    primaryEthereal: "rgba(37, 99, 235, 0.08)",

    // Secondary - Silver & Slate
    secondary: "#94A3B8",
    secondaryLight: "#F1F5F9",
    secondaryDark: "#475569",
    platinum: "#E2E8F0",

    // Accents
    accent: "#3B82F6",
    accentLight: "#93C5FD",
    cardBg: "#0F172A", // Deep Navy Surface

    // Surfaces
    background: "#020617", // Rich Midnight
    surface: "#0F172A",
    surfaceLight: "#1E293B",
    surfaceHighlight: "#334155",
    surfaceSilk: "rgba(15, 23, 42, 0.95)",
    diamondRim: "rgba(255, 255, 255, 0.12)",

    // Text
    textPrimary: "#F8FAFC",
    textSecondary: "rgba(148, 163, 184, 0.9)",
    textTertiary: "rgba(100, 116, 139, 0.8)",
    textMuted: "rgba(71, 85, 105, 0.7)",

    // Status
    success: "#10B981",
    error: "#EF4444",
    warning: "#F59E0B",
    info: "#3B82F6",

    // Glassmorphism
    glass: {
        bg: "rgba(15, 23, 42, 0.8)",
        border: "rgba(37, 99, 235, 0.2)",
        highlight: "rgba(255, 255, 255, 0.05)",
        blur: 30,
    },
    glassBorder: "rgba(37, 99, 235, 0.15)",
    glassBorderLight: "rgba(255, 255, 255, 0.1)",

    // Premium Accents
    gold: "#D4AF37",
    ratingGold: "#F59E0B",
    overlay: "rgba(2, 6, 23, 0.9)",

    // Gradients
    gradients: {
        primary: ["#2563EB", "#3B82F6"],
        silk: ["#0F172A", "#1E293B"],
        aurora: ["#3B82F6", "rgba(37, 99, 235, 0.3)", "transparent"],
        nocturnal: ["#0F172A", "#020617"],
        glow: ["rgba(37, 99, 235, 0.2)", "transparent"],
    },

    white: "#FFFFFF",
    black: "#000000",
    transparent: "transparent",
} as const;
*/


/* =============================================================================
   STYLE 2: CYBERPUNK FANCY (Original "Neon God" Look) - ACTIVE
   Vibrant, futuristic, high-contrast, neon teal and cyan glows.
   ============================================================================= */
const COLORS = {
    // Primary - Neon Teal
    primary: "#19E3D1",
    primaryDark: "#00C2FF",
    primaryLight: "#4EF0E8",
    primaryGlow: "rgba(25, 227, 209, 0.4)",
    primaryEthereal: "rgba(25, 227, 209, 0.08)",

    // Secondary - Silver Chrome
    secondary: "#E2E8F0",
    secondaryLight: "#F8FAFC",
    secondaryDark: "#94A3B8",
    platinum: "#F1F5F9",

    // Accents
    accent: "#00C2FF",
    accentLight: "#4EF0E8",
    cardBg: "#141A21",

    // Surfaces
    background: "#0B0F14", // Deep Charcoal
    surface: "#0E1B24",
    surfaceLight: "#141A21",
    surfaceHighlight: "#1C2631",
    surfaceSilk: "rgba(20, 26, 33, 0.95)",
    diamondRim: "rgba(255, 255, 255, 0.18)",

    // Text
    textPrimary: "#FFFFFF",
    textSecondary: "rgba(160, 174, 192, 0.9)",
    textTertiary: "rgba(113, 128, 150, 0.8)",
    textMuted: "rgba(74, 85, 104, 0.7)",

    // Status
    success: "#10B981",
    error: "#EF4444",
    warning: "#FFD700",
    info: "#3B82F6",

    // Glassmorphism
    glass: {
        bg: "rgba(14, 27, 36, 0.82)",
        border: "rgba(25, 227, 209, 0.15)",
        highlight: "rgba(255, 255, 255, 0.08)",
        blur: 40,
    },
    glassBorder: "rgba(25, 227, 209, 0.12)",
    glassBorderLight: "rgba(255, 255, 255, 0.12)",

    // Premium Accents
    gold: "#FFD700",
    ratingGold: "#FFD700",
    overlay: "rgba(0, 0, 0, 0.88)",

    // Gradients
    gradients: {
        primary: ["#19E3D1", "#00C2FF"],
        silk: ["#141A21", "#0E1B24"],
        aurora: ["#00C2FF", "rgba(25, 227, 209, 0.5)", "transparent"],
        nocturnal: ["#0E1B24", "#0B0F14"],
        glow: ["rgba(25, 227, 209, 0.25)", "transparent"],
    },

    white: "#FFFFFF",
    black: "#000000",
    transparent: "transparent",
} as const;


/* =============================================================================
   STYLE 3: ORGANIC MILD (The "Reader's Oasis" Look)
   Soft sage greens, warm creams, earthy tones, easy on the eyes.
   ============================================================================= */
/*
const COLORS = {
    // Primary - Soft Sage
    primary: "#6B8E23", // Olive Drab / Sage
    primaryDark: "#556B2F",
    primaryLight: "#9FB379",
    primaryGlow: "rgba(107, 142, 35, 0.25)",
    primaryEthereal: "rgba(107, 142, 35, 0.05)",

    // Secondary - Sand & Earth
    secondary: "#D2B48C", // Tan
    secondaryLight: "#FAF9F6", // Off White
    secondaryDark: "#8B7355",
    platinum: "#F5F5DC", // Beige

    // Accents
    accent: "#8B7355",
    accentLight: "#BC8F8F",
    cardBg: "#FDFDFB", // Warm Surface

    // Surfaces
    background: "#F5F5F0", // Soft cream/grey
    surface: "#FFFFFF",
    surfaceLight: "#F8F8F4",
    surfaceHighlight: "#E8E8E0",
    surfaceSilk: "rgba(255, 255, 255, 0.98)",
    diamondRim: "rgba(0, 0, 0, 0.05)",

    // Text - Softer Contrast
    textPrimary: "#2F4F4F", // Dark Slate Grey
    textSecondary: "#4A4A4A",
    textTertiary: "#696969",
    textMuted: "#808080",

    // Status
    success: "#4F7942",
    error: "#A52A2A",
    warning: "#B8860B",
    info: "#4682B4",

    // Glassmorphism - Softer 
    glass: {
        bg: "rgba(255, 255, 255, 0.8)",
        border: "rgba(107, 142, 35, 0.1)",
        highlight: "rgba(255, 255, 255, 0.3)",
        blur: 15,
    },
    glassBorder: "rgba(0, 0, 0, 0.05)",
    glassBorderLight: "rgba(0, 0, 0, 0.03)",

    // Premium Accents
    gold: "#DAA520",
    ratingGold: "#DAA520",
    overlay: "rgba(47, 79, 79, 0.8)",

    // Gradients
    gradients: {
        primary: ["#6B8E23", "#8BAC5D"],
        silk: ["#FAF9F6", "#F5F5F0"],
        aurora: ["#BDB76B", "rgba(107, 142, 35, 0.1)", "transparent"],
        nocturnal: ["#F5F5F0", "#E8E8E0"],
        glow: ["rgba(107, 142, 35, 0.1)", "transparent"],
    },

    white: "#FFFFFF",
    black: "#000000",
    transparent: "transparent",
} as const;
*/

export default COLORS;
