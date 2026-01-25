import React from 'react';
import { StyleSheet, View } from 'react-native';
import { Image, ImageProps } from 'expo-image';
import COLORS from '../constants/colors';

interface ProgressiveImageProps extends ImageProps {
    containerStyle?: any;
}

const ProgressiveImage: React.FC<ProgressiveImageProps> = ({
    source,
    style,
    containerStyle,
    ...props
}) => {
    const flattened = (StyleSheet.flatten(style) || {}) as any;

    // Layout props to move to the container
    const containerLayoutKeys = [
        'width', 'height', 'margin', 'marginTop', 'marginBottom',
        'marginLeft', 'marginRight', 'marginHorizontal', 'marginVertical',
        'position', 'top', 'bottom', 'left', 'right', 'zIndex',
        'flex', 'alignSelf', 'borderRadius'
    ];

    const containerStyleMerged: any = {};
    const imageStyleMerged: any = {};

    Object.keys(flattened).forEach(key => {
        if (containerLayoutKeys.includes(key)) {
            containerStyleMerged[key] = flattened[key];
            // borderRadius is needed on both for overflow:hidden and rounded content
            if (key === 'borderRadius') imageStyleMerged[key] = flattened[key];
        } else {
            imageStyleMerged[key] = flattened[key];
        }
    });

    return (
        <View style={[
            styles.container,
            containerStyleMerged,
            containerStyle,
        ]}>
            <Image
                source={source}
                style={[styles.image, imageStyleMerged]}
                transition={500}
                cachePolicy="memory-disk"
                placeholder={require('../assets/images/book-placeholder-1.png')}
                placeholderContentFit="cover"
                {...props}
            />
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        backgroundColor: COLORS.surfaceHighlight,
        overflow: 'hidden',
        justifyContent: 'center',
        alignItems: 'center',
    },
    image: {
        width: '100%',
        height: '100%',
    },
});

export default ProgressiveImage;
