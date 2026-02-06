// mobile/components/ErrorBoundary.tsx
import React, { Component, ErrorInfo, ReactNode } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, SafeAreaView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import COLORS from '../constants/colors';

interface Props {
    children: ReactNode;
}

interface State {
    hasError: boolean;
    error: Error | null;
}

class ErrorBoundary extends Component<Props, State> {
    constructor(props: Props) {
        super(props);
        this.state = { hasError: false, error: null };
    }

    static getDerivedStateFromError(error: Error): State {
        return { hasError: true, error };
    }

    componentDidCatch(error: Error, errorInfo: ErrorInfo) {
        // Log specialized error info here (e.g. Sentry, Bugsnag)
        console.error('[Global ErrorBoundary]', error, errorInfo);
    }

    handleRestart = () => {
        // Basic reset - might need a more robust restart mechanism if using Expo
        this.setState({ hasError: false, error: null });
    };

    render() {
        if (this.state.hasError) {
            return (
                <SafeAreaView style={styles.container}>
                    <View style={styles.content}>
                        <View style={styles.iconCircle}>
                            <Ionicons name="bug-outline" size={60} color={COLORS.primary} />
                        </View>
                        <Text style={styles.title}>We encountered an unexpected issue</Text>
                        <Text style={styles.subtitle}>
                            An unexpected error occurred. The developers have been notified.
                        </Text>

                        <View style={styles.errorBox}>
                            <Text style={styles.errorText}>{this.state.error?.message || 'Unknown error'}</Text>
                        </View>

                        <TouchableOpacity style={styles.button} onPress={this.handleRestart}>
                            <Text style={styles.buttonText}>Try Again</Text>
                        </TouchableOpacity>
                    </View>
                </SafeAreaView>
            );
        }

        return this.props.children;
    }
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: COLORS.background },
    content: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 40 },
    iconCircle: { width: 120, height: 120, borderRadius: 60, backgroundColor: COLORS.surface, justifyContent: 'center', alignItems: 'center', marginBottom: 24 },
    title: { fontSize: 24, fontWeight: '900', color: COLORS.textPrimary, textAlign: 'center', marginBottom: 12 },
    subtitle: { fontSize: 16, color: COLORS.textSecondary, textAlign: 'center', marginBottom: 32, lineHeight: 24 },
    errorBox: { backgroundColor: COLORS.surface, padding: 16, borderRadius: 12, width: '100%', marginBottom: 32, borderLeftWidth: 4, borderLeftColor: COLORS.primary },
    errorText: { color: COLORS.textMuted, fontSize: 13, fontFamily: 'System' },
    button: { backgroundColor: COLORS.primary, paddingHorizontal: 32, paddingVertical: 16, borderRadius: 16, width: '100%', alignItems: 'center' },
    buttonText: { color: '#fff', fontSize: 16, fontWeight: '800' }
});

export default ErrorBoundary;
