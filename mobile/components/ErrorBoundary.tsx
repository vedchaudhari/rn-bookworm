// mobile/components/ErrorBoundary.tsx
import React, { Component, ErrorInfo, ReactNode } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, SafeAreaView, Platform } from 'react-native';
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
        // Full recovery attempt: clear error state and optionally force a re-render
        this.setState({ hasError: false, error: null });
    };

    render() {
        if (this.state.hasError) {
            return (
                <SafeAreaView style={styles.container}>
                    <View style={styles.content}>
                        <View style={styles.header}>
                            <Ionicons name="alert-circle-outline" size={80} color={COLORS.primary} />
                        </View>

                        <Text style={styles.title}>Something went wrong</Text>
                        <Text style={styles.subtitle}>
                            We've encountered an unexpected error. Our team has been notified.
                        </Text>

                        {this.state.error && (
                            <View style={styles.errorBox}>
                                <Text style={styles.errorText} numberOfLines={3}>
                                    {this.state.error.name}: {this.state.error.message}
                                </Text>
                            </View>
                        )}

                        <TouchableOpacity
                            style={styles.button}
                            onPress={this.handleRestart}
                            activeOpacity={0.8}
                        >
                            <Text style={styles.buttonText}>Try Again</Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                            style={styles.secondaryButton}
                            onPress={() => this.setState({ hasError: false, error: null })}
                        >
                            <Text style={styles.secondaryButtonText}>Go Back</Text>
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
    content: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 32 },
    header: { marginBottom: 32 },
    title: { fontSize: 26, fontWeight: '900', color: COLORS.textPrimary, textAlign: 'center', marginBottom: 12 },
    subtitle: { fontSize: 16, color: COLORS.textSecondary, textAlign: 'center', marginBottom: 40, lineHeight: 24 },
    errorBox: {
        backgroundColor: COLORS.surface,
        padding: 20,
        borderRadius: 20,
        width: '100%',
        marginBottom: 40,
        borderWidth: 1,
        borderColor: COLORS.glassBorderLight
    },
    errorText: { color: COLORS.textMuted, fontSize: 14, fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace', textAlign: 'center' },
    button: {
        backgroundColor: COLORS.primary,
        paddingHorizontal: 32,
        paddingVertical: 18,
        borderRadius: 20,
        width: '100%',
        alignItems: 'center',
        shadowColor: COLORS.primary,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 5
    },
    buttonText: { color: '#fff', fontSize: 16, fontWeight: '800', letterSpacing: 0.5 },
    secondaryButton: { marginTop: 20, padding: 12 },
    secondaryButtonText: { color: COLORS.textSecondary, fontSize: 15, fontWeight: '600' }
});

export default ErrorBoundary;
