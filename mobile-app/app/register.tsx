import React, { useState } from 'react';
import {
    View, Text, TextInput, TouchableOpacity, ScrollView,
    KeyboardAvoidingView, Platform, StyleSheet,
} from 'react-native';
import { useRouter } from 'expo-router';
import { authService } from '../services/authService';
import { AppColors, Spacing, BorderRadius } from '../constants/theme';
import type { ApiError } from '../types/auth';
import { hasMinLength, isValidEmail, isValidPhone, sanitizeDigits } from '../services/validationService';

export default function RegisterScreen() {
    const router = useRouter();
    const [fullName, setFullName] = useState('');
    const [email, setEmail] = useState('');
    const [phone, setPhone] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [serverError, setServerError] = useState<string | null>(null);
    const [errors, setErrors] = useState<Record<string, string>>({});

    const validate = () => {
        const e: Record<string, string> = {};
        if (!fullName.trim()) e.fullName = 'Vui lòng nhập họ và tên';
        else if (!hasMinLength(fullName, 2)) e.fullName = 'Họ và tên phải có ít nhất 2 ký tự';
        if (!email.trim()) e.email = 'Vui lòng nhập email';
        else if (!isValidEmail(email)) e.email = 'Email không hợp lệ';
        if (phone.trim() && !isValidPhone(phone)) e.phone = 'Số điện thoại không hợp lệ';
        if (!password) e.password = 'Vui lòng nhập mật khẩu';
        else if (password.length < 6) e.password = 'Mật khẩu phải có ít nhất 6 ký tự';
        if (!confirmPassword) e.confirmPassword = 'Vui lòng xác nhận mật khẩu';
        else if (password !== confirmPassword) e.confirmPassword = 'Mật khẩu xác nhận không khớp';
        setErrors(e);
        return Object.keys(e).length === 0;
    };

    const handleRegister = async () => {
        if (!validate()) return;
        setServerError(null);
        setIsLoading(true);
        try {
            const response = await authService.register({
                fullName: fullName.trim(),
                email: email.trim(),
                phone: phone.trim() || null,
                password,
            });
            if (response.Success) {
                router.replace({ pathname: '/verify-email' as any, params: { email: email.trim() } });
            } else {
                setServerError(response.Message || 'Đăng ký thất bại.');
            }
        } catch (error) {
            const apiError = error as ApiError;
            setServerError(apiError.message || 'Đăng ký thất bại. Vui lòng thử lại.');
        } finally {
            setIsLoading(false);
        }
    };

    const renderField = (
        label: string,
        value: string,
        onChange: (t: string) => void,
        key: string,
        opts?: { placeholder?: string; secureTextEntry?: boolean; keyboardType?: any; autoCapitalize?: any },
    ) => (
        <View style={styles.fieldGroup}>
            <Text style={styles.label}>{label}</Text>
            <TextInput
                style={[styles.input, errors[key] ? styles.inputError : null]}
                placeholder={opts?.placeholder || ''}
                placeholderTextColor={AppColors.textMuted}
                value={value}
                onChangeText={(t) => {
                    const normalized = key === 'phone' ? sanitizeDigits(t).slice(0, 11) : t;
                    onChange(normalized);
                    setErrors((prev) => { const n = { ...prev }; delete n[key]; return n; });
                }}
                secureTextEntry={opts?.secureTextEntry && !showPassword}
                keyboardType={opts?.keyboardType || 'default'}
                autoCapitalize={opts?.autoCapitalize || 'none'}
                autoCorrect={false}
            />
            {errors[key] ? <Text style={styles.fieldError}>{errors[key]}</Text> : null}
        </View>
    );

    return (
        <KeyboardAvoidingView
            style={styles.flex}
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
            <ScrollView
                style={styles.flex}
                contentContainerStyle={styles.container}
                keyboardShouldPersistTaps="handled"
            >
                {/* Back */}
                <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
                    <Text style={styles.backText}>← Quay lại</Text>
                </TouchableOpacity>

                <Text style={styles.title}>Tạo tài khoản mới</Text>
                <Text style={styles.subtitle}>
                    Đăng ký để khám phá bộ sưu tập quà Tết sang trọng.
                </Text>

                {serverError && (
                    <View style={styles.errorBanner}>
                        <Text style={styles.errorBannerText}>{serverError}</Text>
                    </View>
                )}

                {renderField('Họ và tên *', fullName, setFullName, 'fullName', {
                    placeholder: 'Nguyễn Văn A',
                    autoCapitalize: 'words',
                })}
                {renderField('Email *', email, setEmail, 'email', {
                    placeholder: 'example@email.com',
                    keyboardType: 'email-address',
                })}
                {renderField('Số điện thoại', phone, setPhone, 'phone', {
                    placeholder: '0909 123 456',
                    keyboardType: 'phone-pad',
                })}
                {renderField('Mật khẩu *', password, setPassword, 'password', {
                    placeholder: 'Tối thiểu 6 ký tự',
                    secureTextEntry: true,
                })}
                {renderField('Xác nhận mật khẩu *', confirmPassword, setConfirmPassword, 'confirmPassword', {
                    placeholder: 'Nhập lại mật khẩu',
                    secureTextEntry: true,
                })}

                <TouchableOpacity
                    style={[styles.submitButton, isLoading && styles.buttonDisabled]}
                    onPress={handleRegister}
                    disabled={isLoading}
                    activeOpacity={0.85}
                >
                    <Text style={styles.submitText}>
                        {isLoading ? 'Đang xử lý...' : 'Đăng ký'}
                    </Text>
                </TouchableOpacity>

                <View style={styles.loginRow}>
                    <Text style={styles.loginLabel}>Đã có tài khoản? </Text>
                    <TouchableOpacity onPress={() => router.push('/login' as any)}>
                        <Text style={styles.loginLink}>Đăng nhập</Text>
                    </TouchableOpacity>
                </View>
            </ScrollView>
        </KeyboardAvoidingView>
    );
}

const styles = StyleSheet.create({
    flex: { flex: 1, backgroundColor: AppColors.surface },
    container: {
        flexGrow: 1,
        paddingHorizontal: Spacing.xl,
        paddingTop: 50,
        paddingBottom: 40,
    },
    backButton: { marginBottom: Spacing.lg },
    backText: { fontSize: 14, color: AppColors.primary, fontWeight: '600' },
    title: { fontSize: 22, fontWeight: '700', color: AppColors.text, marginBottom: 4 },
    subtitle: { fontSize: 13, color: AppColors.textSecondary, marginBottom: 24, lineHeight: 19 },
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
    inputError: { borderColor: AppColors.error },
    fieldError: { fontSize: 12, color: AppColors.error, marginTop: 4 },
    submitButton: {
        backgroundColor: AppColors.primary, borderRadius: BorderRadius.sm,
        paddingVertical: 14, alignItems: 'center', marginBottom: Spacing.xl, marginTop: Spacing.sm,
    },
    buttonDisabled: { opacity: 0.6 },
    submitText: { color: '#FFF', fontSize: 14, fontWeight: '700' },
    loginRow: { flexDirection: 'row', justifyContent: 'center' },
    loginLabel: { fontSize: 13, color: AppColors.textSecondary },
    loginLink: { fontSize: 13, fontWeight: '700', color: AppColors.primary },
});
