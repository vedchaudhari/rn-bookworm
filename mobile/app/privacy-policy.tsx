import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { useRouter, Stack } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import COLORS from '../constants/colors';
import SafeScreen from '../components/SafeScreen';
import GlassCard from '../components/GlassCard';
import { SPACING, FONT_SIZE, TYPOGRAPHY, RADIUS } from '../constants/styleConstants';

export default function PrivacyPolicyScreen() {
    const router = useRouter();

    const renderHeader = () => (
        <View style={styles.header}>
            <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
                <Ionicons name="arrow-back" size={24} color={COLORS.textPrimary} />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>Privacy & Legal</Text>
            <View style={{ width: 40 }} />
        </View>
    );

    const LegalSection = ({ title, content }: { title: string; content: string }) => (
        <View style={styles.section}>
            <Text style={styles.sectionTitle}>{title}</Text>
            <Text style={styles.sectionContent}>{content}</Text>
        </View>
    );

    return (
        <SafeScreen top={true}>
            <Stack.Screen options={{ headerShown: false }} />
            {renderHeader()}

            <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
                <GlassCard style={styles.disclaimerCard}>
                    <Ionicons name="shield-checkmark" size={32} color={COLORS.primary} style={styles.cardIcon} />
                    <Text style={styles.disclaimerTitle}>Owner Liability & User Agreement</Text>
                    <Text style={styles.disclaimerText}>
                        Please read this carefully. By using Bookworm, you agree to these terms.
                    </Text>
                </GlassCard>

                <LegalSection
                    title="1. LIMITATION OF LIABILITY"
                    content="TO THE MAXIMUM EXTENT PERMITTED BY APPLICABLE LAW, THE OWNER OF THIS APPLICATION SHALL NOT BE LIABLE FOR ANY INDIRECT, INCIDENTAL, SPECIAL, CONSEQUENTIAL, OR PUNITIVE DAMAGES, OR ANY LOSS OF PROFITS OR REVENUES, WHETHER INCURRED DIRECTLY OR INDIRECTLY, OR ANY LOSS OF DATA, USE, GOODWILL, OR OTHER INTANGIBLE LOSSES, RESULTING FROM (A) YOUR ACCESS TO OR USE OF OR INABILITY TO ACCESS OR USE THE APPLICATION; (B) ANY CONTENT ACCESSED ON THE APPLICATION; OR (C) UNAUTHORIZED ACCESS, USE, OR ALTERATION OF YOUR TRANSMISSIONS OR CONTENT."
                />

                <LegalSection
                    title="2. NO GUARANTEES"
                    content="THE APPLICATION IS PROVIDED ON AN 'AS IS' AND 'AS AVAILABLE' BASIS. THE OWNER MAKES NO REPRESENTATIONS OR WARRANTIES OF ANY KIND, EXPRESS OR IMPLIED, AS TO THE OPERATION OF THE APPLICATION, OR THE INFORMATION, CONTENT, MATERIALS, OR PRODUCTS INCLUDED ON THIS APPLICATION. YOU EXPRESSLY AGREE THAT YOUR USE OF THE APPLICATION IS AT YOUR SOLE RISK. WE DO NOT GUARANTEE THE ACCURACY, COMPLETENESS, OR TIMELINESS OF DATA STORED OR DISPLAYED."
                />

                <LegalSection
                    title="3. USER-GENERATED CONTENT"
                    content="YOU ARE SOLELY RESPONSIBLE FOR THE CONTENT YOU POST. THE OWNER DOES NOT ENDORSE, SUPPORT, REPRESENT, OR GUARANTEE THE COMPLETENESS, TRUTHFULNESS, ACCURACY, OR RELIABILITY OF ANY USER-GENERATED CONTENT OR COMMUNICATIONS POSTED VIA THE APPLICATION."
                />

                <LegalSection
                    title="4. INDEMNIFICATION"
                    content="YOU AGREE TO INDEMNIFY AND HOLD HARMLESS THE OWNER FROM AND AGAINST ALL DAMAGES, LOSSES, AND EXPENSES OF ANY KIND (INCLUDING REASONABLE ATTORNEY FEES AND COSTS) ARISING OUT OF OR RELATED TO: (1) YOUR BREACH OF THESE TERMS; (2) ANY USER CONTENT YOU POST; AND (3) ANY ACTIVITY IN WHICH YOU ENGAGE ON OR THROUGH THE APPLICATION."
                />

                <LegalSection
                    title="5. PRIVACY & DATA"
                    content="WE VALUE YOUR PRIVACY. DATA COLLECTED (EMAIL, USERNAME, PROFILE DATA) IS USED SOLELY TO PROVIDE APPLICATION SERVICES. WE DO NOT SELL YOUR DATA TO THIRD PARTIES. HOWEVER, THE OWNER IS NOT LIABLE FOR DATA BREACHES BEYOND REASONABLE CONTROL."
                />

                <View style={styles.footer}>
                    <Text style={styles.lastUpdated}>Last Updated: January 26, 2026</Text>
                    <TouchableOpacity style={styles.agreeBtn} onPress={() => router.back()}>
                        <Text style={styles.agreeBtnText}>I Understand and Agree</Text>
                    </TouchableOpacity>
                </View>
            </ScrollView>
        </SafeScreen>
    );
}

const styles = StyleSheet.create({
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: SPACING.xl,
        paddingVertical: SPACING.lg,
        borderBottomWidth: 1,
        borderBottomColor: COLORS.borderLight,
    },
    backBtn: {
        width: 40,
        height: 40,
        justifyContent: 'center',
    },
    headerTitle: {
        ...TYPOGRAPHY.h4,
        color: COLORS.textPrimary,
    },
    scrollContent: {
        padding: SPACING.xl,
        paddingBottom: 40,
    },
    disclaimerCard: {
        padding: SPACING.xxl,
        alignItems: 'center',
        marginBottom: SPACING.xl,
        backgroundColor: COLORS.primary + '10',
        borderColor: COLORS.primary + '30',
        borderWidth: 1,
    },
    cardIcon: {
        marginBottom: SPACING.md,
    },
    disclaimerTitle: {
        fontSize: 20,
        fontWeight: '900',
        color: COLORS.textPrimary,
        textAlign: 'center',
        marginBottom: SPACING.sm,
    },
    disclaimerText: {
        fontSize: 14,
        color: COLORS.textSecondary,
        textAlign: 'center',
        fontWeight: '500',
    },
    section: {
        marginBottom: SPACING.xl,
    },
    sectionTitle: {
        fontSize: 14,
        fontWeight: '800',
        color: COLORS.primary,
        marginBottom: SPACING.sm,
        letterSpacing: 0.5,
    },
    sectionContent: {
        fontSize: 15,
        color: COLORS.textSecondary,
        lineHeight: 22,
        fontWeight: '500',
    },
    footer: {
        marginTop: SPACING.xxl,
        alignItems: 'center',
    },
    lastUpdated: {
        fontSize: 12,
        color: COLORS.textMuted,
        marginBottom: SPACING.xl,
        fontWeight: '600',
    },
    agreeBtn: {
        backgroundColor: COLORS.primary,
        paddingVertical: 16,
        paddingHorizontal: 32,
        borderRadius: RADIUS.card.medium,
        width: '100%',
        alignItems: 'center',
    },
    agreeBtnText: {
        color: COLORS.white,
        fontSize: 16,
        fontWeight: '800',
    },
});
