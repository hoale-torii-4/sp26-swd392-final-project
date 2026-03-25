import React, { useState } from 'react';
import {
    View, Text, TextInput, TouchableOpacity, StyleSheet,
    KeyboardAvoidingView, Platform, ScrollView,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import Toast from 'react-native-toast-message';
import { authService } from '../services/authService';
import { AppColors, Spacing, BorderRadius } from '../constants/theme';
import { isValidOtp, sanitizeDigits } from '../services/validationService';

export default function ResetPasswordScreen() {
    const router = useRouter();
    const params = useLocalSearchParams<{ email: string }>();
    const email = params.email || '';

    const [otp, setOtp] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');

    const handleReset = async () => {
        if (!otp.trim()) { setError('Vui lòng nhập mã OTP'); return; }
        if (!isValidOtp(otp)) { setError('Mã OTP gồm đúng 6 chữ số'); return; }
        if (!newPassword) { setError('Vui lòng nhập mật khẩu mới'); return; }
        if (newPassword.length < 6) { setError('Mật khẩu phải có ít nhất 6 ký tự'); return; }
        if (newPassword !== confirmPassword) { setError('Mật khẩu xác nhận không khớp'); return; }

        setError('');
        setIsLoading(true);
        try {
            const res = await authService.resetPassword({
                email,
                otp: otp.trim(),
                newPassword,
            });
            if (res.Success) {
                Toast.show({
                    type: 'success',
                    text1: 'Thành công',
                    text2: 'Mật khẩu đã được đặt lại.'
                });
                setTimeout(() => router.replace('/login' as any), 1500);
            } else {
                setError(res.Message || 'Đặt lại mật khẩu thất bại.');
            }
        } catch {
            setError('Đặt lại mật khẩu thất bại. Vui lòng thử lại.');
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

                <Text style={styles.title}>Đặt lại mật khẩu</Text>
                <Text style={styles.subtitle}>
                    Nhập mã OTP và mật khẩu mới cho tài khoản{'\n'}
                    <Text style={{ fontWeight: '700', color: AppColors.primary }}>{email}</Text>
                </Text>

                {error ? (
                    <View style={styles.errorBanner}>
                        <Text style={styles.errorBannerText}>{error}</Text>
                    </View>
                ) : null}

                <View style={styles.fieldGroup}>
                    <Text style={styles.label}>Mã OTP</Text>
                    <TextInput
                        style={styles.input}
                        placeholder="Nhập mã 6 số"
                        placeholderTextColor={AppColors.textMuted}
                        value={otp}
                        onChangeText={(t) => { setOtp(sanitizeDigits(t).slice(0, 6)); setError(''); }}
                        keyboardType="number-pad"
                        maxLength={6}
                    />
                </View>

                <View style={styles.fieldGroup}>
                    <Text style={styles.label}>Mật khẩu mới</Text>
                    <TextInput
                        style={styles.input}
                        placeholder="Tối thiểu 6 ký tự"
                        placeholderTextColor={AppColors.textMuted}
                        value={newPassword}
                        onChangeText={(t) => { setNewPassword(t); setError(''); }}
                        secureTextEntry
                        autoCapitalize="none"
                    />
                </View>

                <View style={styles.fieldGroup}>
                    <Text style={styles.label}>Xác nhận mật khẩu</Text>
                    <TextInput
                        style={styles.input}
                        placeholder="Nhập lại mật khẩu mới"
                        placeholderTextColor={AppColors.textMuted}
                        value={confirmPassword}
                        onChangeText={(t) => { setConfirmPassword(t); setError(''); }}
                        secureTextEntry
                        autoCapitalize="none"
                    />
                </View>

                <TouchableOpacity
                    style={[styles.submitButton, isLoading && styles.buttonDisabled]}
                    onPress={handleReset}
                    disabled={isLoading}
                >
                    <Text style={styles.submitText}>
                        {isLoading ? 'Đang xử lý...' : 'Đặt lại mật khẩu'}
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
    fieldGroup: { marginBottom: Spacing.lg },
    label: { fontSize: 13, fontWeight: '600', color: AppColors.textSecondary, marginBottom: 6 },
    input: {
        borderWidth: 1, borderColor: AppColors.border, borderRadius: BorderRadius.sm,
        paddingHorizontal: Spacing.lg, paddingVertical: 12, fontSize: 14,
        color: AppColors.text, backgroundColor: AppColors.surface,
    },
    submitButton: {
        backgroundColor: AppColors.primary, borderRadius: BorderRadius.sm,
        paddingVertical: 14, alignItems: 'center', marginTop: Spacing.sm,
    },
    buttonDisabled: { opacity: 0.6 },
    submitText: { color: '#FFF', fontSize: 14, fontWeight: '700' },
});
