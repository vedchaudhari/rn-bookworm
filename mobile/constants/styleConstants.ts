/**
 * Centralized Style Constants
 * 
 * This file provides a consistent design system for the entire mobile app.
 * Use these constants instead of hardcoded values to ensure maintainability
 * and consistency across all screens and components.
 */

import { Platform } from 'react-native';
import COLORS from './colors';

// ... rest of imports
// Based on 4px baseline grid for consistent rhythm
export const SPACING = {
    xs: 4,
    sm: 6,
    md: 8,
    lg: 12,
    xl: 16,
    xxl: 20,
    xxxl: 24,
    huge: 32,
    massive: 40,
    giant: 60,
    colossal: 80,
} as const;

// Semantic spacing for common use cases
export const PADDING = {
    screen: {
        horizontal: SPACING.xl,
        vertical: SPACING.xxxl,
    },
    card: {
        horizontal: SPACING.xl,
        vertical: SPACING.xxxl,
        small: SPACING.lg,
    },
    input: {
        horizontal: SPACING.xl,
        vertical: SPACING.lg,
    },
    section: {
        horizontal: SPACING.xxl,
        vertical: SPACING.huge,
    },
} as const;

export const MARGIN = {
    item: {
        small: SPACING.md,
        medium: SPACING.xl,
        large: SPACING.xxxl,
    },
    section: {
        small: SPACING.xxl,
        medium: SPACING.huge,
        large: SPACING.massive,
    },
} as const;

export const GAP = {
    xs: SPACING.xs,
    sm: SPACING.md,
    md: SPACING.lg,
    lg: SPACING.xl,
    xl: SPACING.xxl,
} as const;

// ==================== TYPOGRAPHY SYSTEM ====================
export const FONT_SIZE = {
    xxxs: 10,
    xxs: 11,
    xs: 12,
    sm: 13,
    md: 14,
    base: 15,
    lg: 16,
    xl: 18,
    xxl: 20,
    xxxl: 22,
    huge: 24,
    massive: 26,
    giant: 32,
    colossal: 34,
} as const;

export const FONT_WEIGHT = {
    regular: '400' as const,
    medium: '500' as const,
    semibold: '600' as const,
    bold: '700' as const,
    extrabold: '800' as const,
    black: '900' as const,
};

export const LINE_HEIGHT = {
    tight: 1.2,
    snug: 1.375,
    normal: 1.5,
    relaxed: 1.625,
    loose: 2,
} as const;

export const LETTER_SPACING = {
    tighter: -1,
    tight: -0.5,
    normal: 0,
    wide: 0.5,
    wider: 0.8,
    widest: 1,
} as const;

// Typography presets for common patterns
export const TYPOGRAPHY = {
    // Headers
    h1: {
        fontSize: FONT_SIZE.colossal,
        fontWeight: FONT_WEIGHT.extrabold,
        letterSpacing: LETTER_SPACING.tighter,
    },
    h2: {
        fontSize: FONT_SIZE.giant,
        fontWeight: FONT_WEIGHT.extrabold,
        letterSpacing: LETTER_SPACING.tight,
    },
    h3: {
        fontSize: FONT_SIZE.massive,
        fontWeight: FONT_WEIGHT.extrabold,
    },
    h4: {
        fontSize: FONT_SIZE.xxl,
        fontWeight: FONT_WEIGHT.extrabold,
    },

    // Body text
    bodyLarge: {
        fontSize: FONT_SIZE.lg,
        fontWeight: FONT_WEIGHT.medium,
        lineHeight: 26,
    },
    body: {
        fontSize: FONT_SIZE.base,
        fontWeight: FONT_WEIGHT.medium,
        lineHeight: 22,
    },
    bodySmall: {
        fontSize: FONT_SIZE.md,
        fontWeight: FONT_WEIGHT.regular,
        lineHeight: 20,
    },

    // Labels and captions
    label: {
        fontSize: FONT_SIZE.xs,
        fontWeight: FONT_WEIGHT.bold,
        textTransform: 'uppercase' as const,
        letterSpacing: LETTER_SPACING.wider,
    },
    caption: {
        fontSize: FONT_SIZE.xxs,
        fontWeight: FONT_WEIGHT.semibold,
    },

    // Buttons
    button: {
        fontSize: FONT_SIZE.lg,
        fontWeight: FONT_WEIGHT.extrabold,
        textTransform: 'uppercase' as const,
        letterSpacing: LETTER_SPACING.wide,
    },
    buttonSmall: {
        fontSize: FONT_SIZE.md,
        fontWeight: FONT_WEIGHT.bold,
    },
} as const;

// ==================== BORDER RADIUS SYSTEM ====================
export const BORDER_RADIUS = {
    xs: 6,
    sm: 10,
    md: 12,
    lg: 14,
    xl: 16,
    xxl: 20,
    xxxl: 24,
    huge: 28,
    massive: 32,
    circular: 100,
} as const;

// Semantic border radius for components
export const RADIUS = {
    button: {
        primary: BORDER_RADIUS.xxl,
        secondary: BORDER_RADIUS.xl,
        icon: BORDER_RADIUS.md,
    },
    card: {
        small: BORDER_RADIUS.xl,
        medium: BORDER_RADIUS.xxl,
        large: BORDER_RADIUS.xxxl,
        massive: BORDER_RADIUS.massive,
    },
    input: BORDER_RADIUS.xl,
    chip: BORDER_RADIUS.lg,
    avatar: {
        small: 12,
        medium: 20,
        large: 60,
    },
} as const;

// ==================== SHADOW & ELEVATION ====================
export const SHADOWS = {
    none: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0,
        shadowRadius: 0,
        elevation: 0,
    },
    light: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 2,
    },
    medium: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.2,
        shadowRadius: 8,
        elevation: 4,
    },
    strong: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 12 },
        shadowOpacity: 0.5,
        shadowRadius: 16,
        elevation: 12,
    },
    extraStrong: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 20 },
        shadowOpacity: 0.6,
        shadowRadius: 28,
        elevation: 20,
    },
    // Metallic/Chrome shadow for 3D elements
    chrome: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.4,
        shadowRadius: 8,
        elevation: 5,
    },
    // Aura Glow - Soft colored under-currents
    aura: {
        shadowColor: COLORS.primaryGlow,
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.8,
        shadowRadius: 20,
        elevation: 0,
    },
    // God Level Elevation - Massively protruding
    godLevel: {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 25 },
        shadowOpacity: 0.7,
        shadowRadius: 40,
        elevation: 30,
    },
} as const;

// Colored shadows for accent elements (buttons, primary actions)
export const createColoredShadow = (color: string, strength: 'light' | 'medium' | 'strong' = 'medium') => {
    const shadowMap = {
        light: { offset: { width: 0, height: 2 }, opacity: 0.2, radius: 6, elevation: 2 },
        medium: { offset: { width: 0, height: 4 }, opacity: 0.3, radius: 8, elevation: 4 },
        strong: { offset: { width: 0, height: 8 }, opacity: 0.3, radius: 16, elevation: 8 },
    };

    const shadow = shadowMap[strength];

    return {
        shadowColor: color,
        shadowOffset: shadow.offset,
        shadowOpacity: shadow.opacity,
        shadowRadius: shadow.radius,
        elevation: shadow.elevation,
    };
};

// ==================== COMPONENT SIZES ====================
export const COMPONENT_SIZES = {
    // Input heights
    input: {
        standard: 56,
        compact: 44,
    },

    // Button heights
    button: {
        large: 56,
        medium: 44,
        small: 36,
    },

    // Avatar sizes
    avatar: {
        tiny: 24,
        small: 32,
        medium: 44,
        large: 56,
        xlarge: 64,
        profile: 120,
    },

    // Icon sizes
    icon: {
        tiny: 16,
        small: 20,
        medium: 24,
        large: 32,
        xlarge: 40,
    },

    // Touch targets (minimum for accessibility)
    touchTarget: {
        min: 44,
    },

    // Tab bar
    tabBar: {
        height: 64,
        iconSize: 24,
    },
} as const;

// ==================== BORDER WIDTHS ====================
export const BORDER_WIDTH = {
    thin: 1,
    medium: 1.5,
    thick: 2,
    extraThick: 3,
    massive: 4,
} as const;

// ==================== OPACITY ====================
export const OPACITY = {
    disabled: 0.5,
    muted: 0.7,
    semiTransparent: 0.8,
    almostOpaque: 0.9,
} as const;

// ==================== LAYOUT CONSTANTS ====================
export const LAYOUT = {
    // Safe area considerations
    safeArea: {
        minBottom: 16,
        minTop: 20,
    },

    // Grid system
    grid: {
        columns: {
            mobile: 2,
            tablet: 3,
            desktop: 4,
        },
        gutter: SPACING.xl,
    },

    // Container widths
    container: {
        maxWidth: 1200,
    },
} as const;

// ==================== ANIMATION TIMINGS ====================
export const ANIMATION = {
    duration: {
        instant: 100,
        fast: 200,
        normal: 300,
        slow: 500,
        verySlow: 800,
    },
    easing: {
        // React Native Reanimated spring configs can be added here
    },
} as const;

// Export all as a single object for convenience
export const STYLE_CONSTANTS = {
    SPACING,
    PADDING,
    MARGIN,
    GAP,
    FONT_SIZE,
    FONT_WEIGHT,
    LINE_HEIGHT,
    LETTER_SPACING,
    TYPOGRAPHY,
    BORDER_RADIUS,
    RADIUS,
    SHADOWS,
    COMPONENT_SIZES,
    BORDER_WIDTH,
    OPACITY,
    LAYOUT,
    ANIMATION,
} as const;

export default STYLE_CONSTANTS;
