// mobile/components/RatingStars.tsx
import React from 'react';
import { View, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import COLORS from '../constants/colors';
import { SPACING, COMPONENT_SIZES } from '../constants/styleConstants';

interface RatingStarsProps {
    rating: number; // 0-5
    maxRating?: number;
    size?: 'small' | 'medium' | 'large';
    onRatingChange?: (rating: number) => void;
    readonly?: boolean;
    color?: string;
    emptyColor?: string;
}

/**
 * RatingStars
 * Interactive or readonly star rating component
 */
export default function RatingStars({
    rating,
    maxRating = 5,
    size = 'medium',
    onRatingChange,
    readonly = false,
    color = COLORS.secondary,
    emptyColor = COLORS.textMuted,
}: RatingStarsProps) {
    const getStarSize = () => {
        switch (size) {
            case 'small':
                return COMPONENT_SIZES.icon.small;
            case 'large':
                return COMPONENT_SIZES.icon.large;
            default:
                return COMPONENT_SIZES.icon.medium;
        }
    };

    const starSize = getStarSize();

    const handleStarPress = (index: number) => {
        if (!readonly && onRatingChange) {
            const newRating = index + 1;
            // If tapping the same rating, set to 0 (clear rating)
            onRatingChange(newRating === rating ? 0 : newRating);
        }
    };

    const renderStar = (index: number) => {
        const isFilled = index < Math.floor(rating);
        const isHalfFilled = index === Math.floor(rating) && rating % 1 !== 0;

        const StarContainer = readonly ? View : TouchableOpacity;

        return (
            <StarContainer
                key={index}
                onPress={() => handleStarPress(index)}
                style={styles.starButton}
                activeOpacity={readonly ? 1 : 0.7}
                accessibilityRole={readonly ? 'text' : 'button'}
                accessibilityLabel={`${index + 1} star${index > 0 ? 's' : ''}`}
                accessibilityState={!readonly ? { selected: isFilled } : undefined}
            >
                <Ionicons
                    name={isFilled ? 'star' : isHalfFilled ? 'star-half' : 'star-outline'}
                    size={starSize}
                    color={isFilled || isHalfFilled ? color : emptyColor}
                />
            </StarContainer>
        );
    };

    return (
        <View
            style={styles.container}
            accessibilityLabel={`Rating: ${rating} out of ${maxRating} stars`}
            accessibilityRole="adjustable"
        >
            {Array.from({ length: maxRating }, (_, index) => renderStar(index))}
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: SPACING.xs,
    },
    starButton: {
        padding: 2,
    },
});
