import React, { useState, useRef, useEffect } from 'react';
import {
    View, Text, TextInput, TouchableOpacity, StyleSheet,
    KeyboardAvoidingView, Platform,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { authService } from '../services/authService';
import { AppColors, Spacing, BorderRadius } from '../constants/theme';

export default function VerifyEmailScreen() {
    const router = useRouter();
    const params = useLocalSearchParams<{ email: string }>();
    const email = params.email || '';

    const [otp, setOtp] = useState(['', '', '', '', '', '']);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');
    const [resendCooldown, setResendCooldown] = useState(60);

    const inputs = useRef<(TextInput | null)[]>([]);

    // Cooldown timer
    useEffect(() => {
        if (resendCooldown <= 0) return;
        const timer = setTimeout(() => setResendCooldown((c) => c - 1), 1000);
        return () => clearTimeout(timer);
    }, [resendCooldown]);

    const handleChange = (text: string, idx: number) => {
        const newOtp = [...otp];
        newOtp[idx] = text;
        setOtp(newOtp);
        setError('');
        if (text && idx < 5) inputs.current[idx + 1]?.focus();
    };

    const handleKeyPress = (key: string, idx: number) => {
        if (key === 'Backspace' && !otp[idx] && idx > 0) {
            inputs.current[idx - 1]?.focus();
        }
    };

    const handleVerify = async () => {
        const code = otp.join('');
        if (code.length < 6) { setError('Vui lòng nhập đủ 6 số'); return; }
        setIsLoading(true);
        setError('');
        try {
            const res = await authService.verifyOtp({ email, otp: code });
            if (res.Success) {
                router.replace({ pathname: '/login' as any });
            } else {
                setError(res.Message || 'Xác thực thất bại.');
            }
        } catch {
            setError('Xác thực thất bại. Vui lòng thử lại.');
        } finally {
            setIsLoading(false);
        }
    };

    const handleResend = async () => {
        if (resendCooldown > 0) return;
        try {
            await authService.resendOtp(email);
            setResendCooldown(60);
        } catch {
            setError('Gửi lại OTP thất bại.');
        }
    };

    return (
        <KeyboardAvoidingView
            style={styles.flex}
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
            <View style={styles.container}>
                <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
                    <Text style={styles.backText}>← Quay lại</Text>
                </TouchableOpacity>

                <Text style={styles.title}>Xác thực Email</Text>
                <Text style={styles.subtitle}>
                    Mã OTP 6 số đã được gửi đến{'\n'}
                    <Text style={styles.emailText}>{email}</Text>
                </Text>

                {/* OTP Inputs */}
                <View style={styles.otpRow}>
                    {otp.map((digit, idx) => (
                        <TextInput
                            key={idx}
                            ref={(r) => { inputs.current[idx] = r; }}
                            style={[styles.otpInput, digit ? styles.otpFilled : null]}
                            value={digit}
                            onChangeText={(t) => handleChange(t.replace(/[^0-9]/g, '').slice(-1), idx)}
                            onKeyPress={({ nativeEvent }) => handleKeyPress(nativeEvent.key, idx)}
                            keyboardType="number-pad"
                            maxLength={1}
                            textAlign="center"
                        />
                    ))}
                </View>

                {error ? <Text style={styles.error}>{error}</Text> : null}

                <TouchableOpacity
                    style={[styles.submitButton, isLoading && styles.buttonDisabled]}
                    onPress={handleVerify}
                    disabled={isLoading}
                >
                    <Text style={styles.submitText}>
                        {isLoading ? 'Đang xác thực...' : 'Xác nhận'}
                    </Text>
                </TouchableOpacity>

                <TouchableOpacity
                    onPress={handleResend}
                    disabled={resendCooldown > 0}
                    style={styles.resendRow}
                >
                    <Text style={[styles.resendText, resendCooldown > 0 && styles.resendDisabled]}>
                        {resendCooldown > 0
                            ? `Gửi lại mã sau ${resendCooldown}s`
                            : 'Gửi lại mã OTP'}
                    </Text>
                </TouchableOpacity>
            </View>
        </KeyboardAvoidingView>
    );
}

const styles = StyleSheet.create({
    flex: { flex: 1, backgroundColor: AppColors.surface },
    container: {
        flex: 1, paddingHorizontal: Spacing.xl, paddingTop: 60,
    },
    backButton: { marginBottom: 24 },
    backText: { fontSize: 14, color: AppColors.primary, fontWeight: '600' },
    title: { fontSize: 22, fontWeight: '700', color: AppColors.text, marginBottom: 8 },
    subtitle: { fontSize: 14, color: AppColors.textSecondary, lineHeight: 22, marginBottom: 32 },
    emailText: { fontWeight: '700', color: AppColors.primary },
    otpRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 20 },
    otpInput: {
        width: 48, height: 56, borderWidth: 1.5, borderColor: AppColors.border,
        borderRadius: BorderRadius.sm, fontSize: 22, fontWeight: '700',
        color: AppColors.text, backgroundColor: AppColors.surface,
    },
    otpFilled: { borderColor: AppColors.primary, backgroundColor: '#FEF2F2' },
    error: { fontSize: 13, color: AppColors.error, textAlign: 'center', marginBottom: 12 },
    submitButton: {
        backgroundColor: AppColors.primary, borderRadius: BorderRadius.sm,
        paddingVertical: 14, alignItems: 'center', marginBottom: 20,
    },
    buttonDisabled: { opacity: 0.6 },
    submitText: { color: '#FFF', fontSize: 14, fontWeight: '700' },
    resendRow: { alignItems: 'center' },
    resendText: { fontSize: 13, fontWeight: '600', color: AppColors.primary },
    resendDisabled: { color: AppColors.textMuted },
});
