import React from 'react';
import { View, StyleSheet, ScrollView } from 'react-native';
import SkeletonLoader from './SkeletonLoader';
import COLORS from '../constants/colors';

export default function BookDetailSkeleton() {
    return (
        <ScrollView style={styles.container} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
            {/* Header Image Placeholder */}
            <SkeletonLoader width="100%" height={450} borderRadius={0} />

            <View style={styles.infoSection}>
                {/* Title and Author Placeholder */}
                <View style={styles.headerInfoCentered}>
                    <SkeletonLoader width="80%" height={32} borderRadius={16} style={{ marginBottom: 12 }} />
                    <SkeletonLoader width="40%" height={20} borderRadius={10} style={{ marginBottom: 16 }} />
                    <View style={{ flexDirection: 'row', gap: 6, marginBottom: 16 }}>
                        {[1, 2, 3, 4, 5].map(i => (
                            <SkeletonLoader key={i} width={20} height={20} borderRadius={4} />
                        ))}
                    </View>
                    <SkeletonLoader width={80} height={24} borderRadius={10} />
                </View>

                {/* Main Action Button Placeholder */}
                <SkeletonLoader width="80%" height={56} borderRadius={16} style={{ alignSelf: 'center', marginBottom: 24 }} />

                {/* Caption Placeholder */}
                <View style={{ gap: 8, marginBottom: 32 }}>
                    <SkeletonLoader width="100%" height={16} />
                    <SkeletonLoader width="90%" height={16} />
                    <SkeletonLoader width="95%" height={16} />
                </View>

                {/* User Section Placeholder */}
                <View style={styles.userSectionRow}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1 }}>
                        <SkeletonLoader width={44} height={44} borderRadius={22} />
                        <View style={{ gap: 6 }}>
                            <SkeletonLoader width={100} height={16} />
                            <SkeletonLoader width={60} height={12} />
                        </View>
                    </View>
                    <View style={{ flexDirection: 'row', gap: 10 }}>
                        <SkeletonLoader width={44} height={44} borderRadius={12} />
                        <SkeletonLoader width={80} height={44} borderRadius={22} />
                        <SkeletonLoader width={44} height={44} borderRadius={12} />
                    </View>
                </View>

                {/* Stats Section Placeholder */}
                <View style={styles.statsRow}>
                    <SkeletonLoader width={100} height={40} borderRadius={20} />
                    <SkeletonLoader width={100} height={40} borderRadius={20} />
                </View>
            </View>
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: COLORS.background },
    content: { paddingBottom: 60 },
    infoSection: {
        padding: 24,
        marginTop: -60,
        backgroundColor: COLORS.background,
        borderTopLeftRadius: 32,
        borderTopRightRadius: 32
    },
    headerInfoCentered: { alignItems: 'center', marginBottom: 24 },
    userSectionRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: 16,
        marginBottom: 32,
        backgroundColor: COLORS.surface,
        borderRadius: 20,
        borderWidth: 1,
        borderColor: COLORS.glassBorder
    },
    statsRow: {
        flexDirection: 'row',
        justifyContent: 'space-around',
        alignItems: 'center',
        paddingVertical: 20
    }
});
