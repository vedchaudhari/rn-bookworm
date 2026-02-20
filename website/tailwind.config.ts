import type { Config } from "tailwindcss";

const config: Config = {
    content: [
        "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
        "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
        "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
    ],
    theme: {
        extend: {
            colors: {
                primary: "#19E3D1",
                "primary-dark": "#00C2FF",
                "primary-light": "#4EF0E8",
                "primary-glow": "rgba(25, 227, 209, 0.4)",
                secondary: "#E2E8F0",
                accent: "#00C2FF",
                background: "#0B0F14",
                surface: "#0E1B24",
                "surface-light": "#141A21",
                "surface-highlight": "#1C2631",
                "surface-silk": "rgba(20, 26, 33, 0.95)",
                "text-primary": "#FFFFFF",
                "text-secondary": "rgba(160, 174, 192, 0.9)",
                "text-muted": "rgba(74, 85, 104, 0.7)",
                "glass-border": "rgba(25, 227, 209, 0.12)",
                "glass-border-light": "rgba(255, 255, 255, 0.12)",
                gold: "#FFD700",
                success: "#10B981",
                error: "#EF4444",
                warning: "#FFD700",
            },
            backgroundImage: {
                "gradient-radial": "radial-gradient(var(--tw-gradient-stops))",
                "gradient-conic": "conic-gradient(from 180deg at 50% 50%, var(--tw-gradient-stops))",
                "cyber-mesh": "radial-gradient(ellipse at 20% 50%, rgba(25,227,209,0.05) 0%, transparent 50%), radial-gradient(ellipse at 80% 20%, rgba(0,194,255,0.05) 0%, transparent 50%)",
            },
            fontFamily: {
                sans: ["Inter", "system-ui", "sans-serif"],
            },
            animation: {
                "pulse-slow": "pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite",
                "float": "float 6s ease-in-out infinite",
                "shimmer": "shimmer 2s linear infinite",
                "glow": "glow 2s ease-in-out infinite alternate",
                "slide-up": "slideUp 0.3s ease-out",
                "fade-in": "fadeIn 0.4s ease-out",
            },
            keyframes: {
                float: {
                    "0%, 100%": { transform: "translateY(0)" },
                    "50%": { transform: "translateY(-10px)" },
                },
                shimmer: {
                    "0%": { backgroundPosition: "-200% 0" },
                    "100%": { backgroundPosition: "200% 0" },
                },
                glow: {
                    "from": { boxShadow: "0 0 10px rgba(25, 227, 209, 0.3)" },
                    "to": { boxShadow: "0 0 20px rgba(25, 227, 209, 0.6), 0 0 40px rgba(25, 227, 209, 0.2)" },
                },
                slideUp: {
                    "from": { transform: "translateY(10px)", opacity: "0" },
                    "to": { transform: "translateY(0)", opacity: "1" },
                },
                fadeIn: {
                    "from": { opacity: "0" },
                    "to": { opacity: "1" },
                },
            },
            backdropBlur: {
                "4xl": "72px",
            },
            boxShadow: {
                "glass": "0 8px 32px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.08)",
                "glow-primary": "0 0 20px rgba(25, 227, 209, 0.4)",
                "glow-strong": "0 0 40px rgba(25, 227, 209, 0.6), 0 0 80px rgba(25, 227, 209, 0.2)",
                "card": "0 25px 50px rgba(0,0,0,0.5)",
                "god-level": "0 25px 80px rgba(0,0,0,0.7)",
            },
        },
    },
    plugins: [],
};

export default config;
