import React, { useState } from 'react';
import {
    View, Text, TextInput, TouchableOpacity, StyleSheet,
    KeyboardAvoidingView, Platform, ScrollView,
} from 'react-native';
import { useRouter } from 'expo-router';
import { authService } from '../services/authService';
import { AppColors, Spacing, BorderRadius } from '../constants/theme';
import { isValidEmail } from '../services/validationService';

export default function ForgotPasswordScreen() {
    const router = useRouter();
    const [email, setEmail] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');

    const handleSubmit = async () => {
        if (!email.trim()) { setError('Vui lòng nhập email'); return; }
        if (!isValidEmail(email)) { setError('Email không hợp lệ'); return; }
        setError('');
        setIsLoading(true);
        try {
            const res = await authService.forgotPassword(email.trim());
            if (res.Success) {
                router.replace({
                    pathname: '/reset-password' as any,
                    params: { email: email.trim() },
                });
            } else {
                setError(res.Message || 'Gửi yêu cầu thất bại.');
            }
        } catch {
            setError('Không thể gửi yêu cầu. Vui lòng thử lại.');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <KeyboardAvoidingView
            style={styles.flex}
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
            <ScrollView style={styles.flex} contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
                <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
                    <Text style={styles.backText}>← Quay lại</Text>
                </TouchableOpacity>

                <Text style={styles.title}>Quên mật khẩu?</Text>
                <Text style={styles.subtitle}>
                    Nhập email đã đăng ký, chúng tôi sẽ gửi mã OTP để đặt lại mật khẩu.
                </Text>

                {error ? (
                    <View style={styles.errorBanner}>
                        <Text style={styles.errorBannerText}>{error}</Text>
                    </View>
                ) : null}

                <View style={styles.fieldGroup}>
                    <Text style={styles.label}>Email</Text>
                    <TextInput
                        style={styles.input}
                        placeholder="example@email.com"
                        placeholderTextColor={AppColors.textMuted}
                        value={email}
                        onChangeText={(t) => { setEmail(t); setError(''); }}
                        keyboardType="email-address"
                        autoCapitalize="none"
                        autoCorrect={false}
                    />
                </View>

                <TouchableOpacity
                    style={[styles.submitButton, isLoading && styles.buttonDisabled]}
                    onPress={handleSubmit}
                    disabled={isLoading}
                >
                    <Text style={styles.submitText}>
                        {isLoading ? 'Đang gửi...' : 'Gửi mã OTP'}
                    </Text>
                </TouchableOpacity>
            </ScrollView>
        </KeyboardAvoidingView>
    );
}

const styles = StyleSheet.create({
    flex: { flex: 1, backgroundColor: AppColors.surface },
    container: { flexGrow: 1, paddingHorizontal: Spacing.xl, paddingTop: 60 },
    backButton: { marginBottom: 24 },
    backText: { fontSize: 14, color: AppColors.primary, fontWeight: '600' },
    title: { fontSize: 22, fontWeight: '700', color: AppColors.text, marginBottom: 8 },
    subtitle: { fontSize: 14, color: AppColors.textSecondary, lineHeight: 22, marginBottom: 28 },
    errorBanner: {
        backgroundColor: '#FEF2F2', borderWidth: 1, borderColor: '#FECACA',
        borderRadius: BorderRadius.sm, padding: Spacing.md, marginBottom: Spacing.lg,
    },
    errorBannerText: { fontSize: 13, color: AppColors.error },
    fieldGroup: { marginBottom: Spacing.xl },
    label: { fontSize: 13, fontWeight: '600', color: AppColors.textSecondary, marginBottom: 6 },
    input: {
        borderWidth: 1, borderColor: AppColors.border, borderRadius: BorderRadius.sm,
        paddingHorizontal: Spacing.lg, paddingVertical: 12, fontSize: 14,
        color: AppColors.text, backgroundColor: AppColors.surface,
    },
    submitButton: {
        backgroundColor: AppColors.primary, borderRadius: BorderRadius.sm,
        paddingVertical: 14, alignItems: 'center',
    },
    buttonDisabled: { opacity: 0.6 },
    submitText: { color: '#FFF', fontSize: 14, fontWeight: '700' },
});
