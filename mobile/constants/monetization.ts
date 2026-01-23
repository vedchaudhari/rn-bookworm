// Monetization Configuration
// Update these values with your actual AdMob and RevenueCat IDs

export const ADMOB_CONFIG = {
    // AdMob App IDs (Get from https://admob.google.com)
    APP_ID: {
        android: "ca-app-pub-3940256099942544~3347511713", // Test ID - Replace with production
        ios: "ca-app-pub-3940256099942544~1458002511",     // Test ID - Replace with production
    },

    // Ad Unit IDs
    BANNER: {
        android: "ca-app-pub-3940256099942544/6300978111", // Test Banner ID
        ios: "ca-app-pub-3940256099942544/2934735716",     // Test Banner ID
    },

    INTERSTITIAL: {
        android: "ca-app-pub-3940256099942544/1033173712", // Test Interstitial ID
        ios: "ca-app-pub-3940256099942544/4411468910",     // Test Interstitial ID
    },

    REWARDED: {
        android: "ca-app-pub-3940256099942544/5224354917", // Test Rewarded ID
        ios: "ca-app-pub-3940256099942544/1712485313",     // Test Rewarded ID
    },
};

export const SUBSCRIPTION_CONFIG = {
    // RevenueCat API Key (Get from https://www.revenuecat.com)
    REVENUECAT_API_KEY: {
        android: "your_android_api_key_here",
        ios: "your_ios_api_key_here",
    },

    // Product IDs (must match App Store Connect / Google Play Console)
    PRODUCTS: {
        MONTHLY: "readsphere_pro_monthly",
        YEARLY: "readsphere_pro_yearly",
    },

    // Premium Features
    FEATURES: {
        AD_FREE: "ad_free",
        OFFLINE_READING: "offline_reading",
        AUTHOR_BADGES: "author_badges",
        EARLY_ACCESS: "early_access",
        PREMIUM_SUPPORT: "premium_support",
    },
};

interface PricingTier {
    id: string;
    drops: number;
    price: number;
    label: string;
    badge?: string;
}

export const INK_DROPS_CONFIG = {
    // Pricing tiers (in USD)
    PRICING: [
        { id: "ink_100", drops: 100, price: 0.99, label: "Starter" },
        { id: "ink_500", drops: 500, price: 4.49, label: "Popular", badge: "Most Popular" },
        { id: "ink_1000", drops: 1000, price: 8.99, label: "Bookworm" },
        { id: "ink_5000", drops: 5000, price: 39.99, label: "Collector", badge: "Best Value" },
    ] as PricingTier[],

    // Tipping presets
    TIP_AMOUNTS: [10, 50, 100, 500, 1000],

    // Service fee percentage (platform takes this % from tips)
    SERVICE_FEE_PERCENT: 25, // 25% = author receives 75% of tip

    // Rewards
    REWARDS: {
        FIRST_BOOK_PUBLISHED: 50,
        ACCOUNT_CREATION: 25,
        DAILY_LOGIN_STREAK_7: 100,
    },
};

export const AD_FREQUENCY = {
    // How often to show interstitial ads
    CHAPTERS_BETWEEN_ADS: 3,           // Show ad every 3 chapters
    MINIMUM_TIME_BETWEEN_ADS_MS: 300000, // 5 minutes minimum between ads

    // Rewarded ad unlock duration
    PREMIUM_BOOK_UNLOCK_DURATION_MS: 86400000, // 24 hours
};

export const PREMIUM_FEATURES = {
    AD_FREE: {
        name: "Ad-Free Experience",
        description: "No banner, interstitial, or video ads",
        icon: "flash-off",
    },
    OFFLINE_READING: {
        name: "Offline Reading",
        description: "Download books and read anywhere",
        icon: "cloud-download",
    },
    AUTHOR_BADGES: {
        name: "Exclusive Badges",
        description: "Unique profile styling and author badges",
        icon: "ribbon",
    },
    EARLY_ACCESS: {
        name: "Early Access",
        description: "Read new chapters before anyone else",
        icon: "time",
    },
};
