import React, { useEffect, useState } from 'react';
import {
    View,
    Text,
    TextInput,
    TouchableOpacity,
    ScrollView,
    KeyboardAvoidingView,
    Platform,
    StyleSheet,
    Modal,
    Pressable,
} from 'react-native';
import { useRouter } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
import * as Google from 'expo-auth-session/providers/google';
import { useAuth } from '../contexts/AuthContext';
import { AppColors, Spacing, BorderRadius } from '../constants/theme';
import type { ApiError, User } from '../types/auth';
import { isInternalRole } from '../types/auth';
import { isValidEmailOrPhone } from '../services/validationService';

WebBrowser.maybeCompleteAuthSession();

export default function LoginScreen() {
    const router = useRouter();
    const { login, loginWithGoogle, setSiteMode } = useAuth();

    const googleWebClientId = process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID;
    const googleAndroidClientId = process.env.EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID;
    const googleIosClientId = process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID;

    const [request, response, promptAsync] = Google.useAuthRequest({
        webClientId: googleWebClientId,
        androidClientId: googleAndroidClientId,
        iosClientId: googleIosClientId,
    });

    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [isGoogleLoading, setIsGoogleLoading] = useState(false);
    const [serverError, setServerError] = useState<string | null>(null);

    const [emailError, setEmailError] = useState('');
    const [passwordError, setPasswordError] = useState('');

    const [sitePickerVisible, setSitePickerVisible] = useState(false);

    const validate = () => {
        let valid = true;
        setEmailError('');
        setPasswordError('');

        if (!email.trim()) {
            setEmailError('Vui lòng nhập email hoặc số điện thoại');
            valid = false;
        } else if (!isValidEmailOrPhone(email)) {
            setEmailError('Email hoặc số điện thoại không hợp lệ');
            valid = false;
        }
        if (!password) {
            setPasswordError('Vui lòng nhập mật khẩu');
            valid = false;
        } else if (password.length < 6) {
            setPasswordError('Mật khẩu phải có ít nhất 6 ký tự');
            valid = false;
        }
        return valid;
    };

    const goToSite = async (mode: 'customer' | 'admin') => {
        await setSiteMode(mode);
        setSitePickerVisible(false);
        if (mode === 'admin') {
            router.replace('/(admin-tabs)/dashboard' as any);
        } else {
            router.replace('/(tabs)' as any);
        }
    };

    const postLoginRouting = async (loggedInUser: User) => {
        if (isInternalRole(loggedInUser.Role)) {
            setSitePickerVisible(true);
            return;
        }

        await setSiteMode('customer');
        router.replace('/(tabs)' as any);
    };

    const handleLogin = async () => {
        if (!validate()) return;

        setServerError(null);
        setIsLoading(true);
        try {
            const response = await login({ email: email.trim(), password });
            if (response.Success && response.Data?.User) {
                await postLoginRouting(response.Data.User);
            } else {
                setServerError(response.Message || 'Đăng nhập thất bại.');
            }
        } catch (error) {
            const apiError = error as ApiError;
            setServerError(apiError.message || 'Đăng nhập thất bại. Vui lòng thử lại.');
        } finally {
            setIsLoading(false);
        }
    };

    const handleGoogleLogin = async () => {
        if (!googleWebClientId && !googleAndroidClientId && !googleIosClientId) {
            setServerError('Thiếu cấu hình Google Client ID. Vui lòng cấu hình app trước khi dùng Google Login.');
            return;
        }

        setServerError(null);
        setIsGoogleLoading(true);
        try {
            await promptAsync();
        } catch {
            setServerError('Không thể mở đăng nhập Google. Vui lòng thử lại.');
            setIsGoogleLoading(false);
        }
    };

    useEffect(() => {
        const consumeGoogleToken = async () => {
            if (!response) return;

            if (response.type === 'success') {
                const idToken = response.authentication?.idToken;
                if (!idToken) {
                    setServerError('Không lấy được ID Token từ Google.');
                    setIsGoogleLoading(false);
                    return;
                }

                try {
                    const loginResponse = await loginWithGoogle({ idToken });
                    if (loginResponse.Success && loginResponse.Data?.User) {
                        await postLoginRouting(loginResponse.Data.User);
                    } else {
                        setServerError(loginResponse.Message || 'Đăng nhập Google thất bại.');
                    }
                } catch (error) {
                    const apiError = error as ApiError;
                    setServerError(apiError.message || 'Đăng nhập Google thất bại. Vui lòng thử lại.');
                } finally {
                    setIsGoogleLoading(false);
                }
                return;
            }

            if (response.type === 'error' || response.type === 'dismiss' || response.type === 'cancel') {
                setIsGoogleLoading(false);
            }
        };

        consumeGoogleToken();
    }, [response, loginWithGoogle]);

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
                <View style={styles.brandHeader}>
                    <View style={styles.logoCircle}>
                        <Text style={styles.logoText}>✦</Text>
                    </View>
                    <Text style={styles.brandName}>Lộc Xuân</Text>
                    <Text style={styles.brandSub}>Premium Tết Gifts</Text>
                </View>

                <Text style={styles.title}>Chào mừng bạn trở lại</Text>
                <Text style={styles.subtitle}>
                    Đăng nhập để tiếp tục trải nghiệm dịch vụ quà tặng cao cấp.
                </Text>

                {serverError && (
                    <View style={styles.errorBanner}>
                        <Text style={styles.errorBannerText}>{serverError}</Text>
                    </View>
                )}

                <View style={styles.fieldGroup}>
                    <Text style={styles.label}>Email hoặc Số điện thoại</Text>
                    <TextInput
                        style={[styles.input, emailError ? styles.inputError : null]}
                        placeholder="example@email.com"
                        placeholderTextColor={AppColors.textMuted}
                        value={email}
                        onChangeText={(t) => { setEmail(t); setEmailError(''); }}
                        keyboardType="email-address"
                        autoCapitalize="none"
                        autoCorrect={false}
                    />
                    {emailError ? <Text style={styles.fieldError}>{emailError}</Text> : null}
                </View>

                <View style={styles.fieldGroup}>
                    <Text style={styles.label}>Mật khẩu</Text>
                    <View style={styles.passwordWrap}>
                        <TextInput
                            style={[styles.input, styles.passwordInput, passwordError ? styles.inputError : null]}
                            placeholder="Nhập mật khẩu của bạn"
                            placeholderTextColor={AppColors.textMuted}
                            value={password}
                            onChangeText={(t) => { setPassword(t); setPasswordError(''); }}
                            secureTextEntry={!showPassword}
                            autoCapitalize="none"
                        />
                        <TouchableOpacity
                            style={styles.eyeButton}
                            onPress={() => setShowPassword(!showPassword)}
                        >
                            <Text style={styles.eyeIcon}>{showPassword ? '🙈' : '👁'}</Text>
                        </TouchableOpacity>
                    </View>
                    {passwordError ? <Text style={styles.fieldError}>{passwordError}</Text> : null}
                </View>

                <TouchableOpacity
                    style={styles.forgotRow}
                    onPress={() => router.push('/forgot-password' as any)}
                >
                    <Text style={styles.forgotText}>Quên mật khẩu?</Text>
                </TouchableOpacity>

                <TouchableOpacity
                    style={[styles.submitButton, isLoading && styles.buttonDisabled]}
                    onPress={handleLogin}
                    disabled={isLoading || isGoogleLoading}
                    activeOpacity={0.85}
                >
                    <Text style={styles.submitText}>
                        {isLoading ? 'Đang xử lý...' : 'Đăng nhập'}
                    </Text>
                </TouchableOpacity>

                <TouchableOpacity
                    style={[styles.googleButton, (isGoogleLoading || !request) && styles.buttonDisabled]}
                    onPress={handleGoogleLogin}
                    disabled={isGoogleLoading || !request || isLoading}
                    activeOpacity={0.85}
                >
                    <Text style={styles.googleButtonText}>
                        {isGoogleLoading ? 'Đang kết nối Google...' : 'Đăng nhập với Google'}
                    </Text>
                </TouchableOpacity>

                <View style={styles.registerRow}>
                    <Text style={styles.registerLabel}>Chưa có tài khoản? </Text>
                    <TouchableOpacity onPress={() => router.push('/register' as any)}>
                        <Text style={styles.registerLink}>Đăng ký ngay</Text>
                    </TouchableOpacity>
                </View>

                <View style={styles.securityRow}>
                    <Text style={styles.securityText}>🔒 Hệ thống bảo mật tiêu chuẩn quốc tế</Text>
                </View>
            </ScrollView>

            <Modal visible={sitePickerVisible} transparent animationType="fade">
                <View style={styles.modalBackdrop}>
                    <View style={styles.modalCard}>
                        <Text style={styles.modalTitle}>Chọn khu vực làm việc</Text>
                        <Text style={styles.modalDesc}>
                            Tài khoản của bạn có quyền nội bộ. Bạn muốn vào trang quản trị hay trang khách hàng?
                        </Text>

                        <Pressable style={styles.modalPrimaryBtn} onPress={() => goToSite('admin')}>
                            <Text style={styles.modalPrimaryText}>Vào Admin site</Text>
                        </Pressable>

                        <Pressable style={styles.modalSecondaryBtn} onPress={() => goToSite('customer')}>
                            <Text style={styles.modalSecondaryText}>Vào Customer site</Text>
                        </Pressable>
                    </View>
                </View>
            </Modal>
        </KeyboardAvoidingView>
    );
}

const styles = StyleSheet.create({
    flex: { flex: 1, backgroundColor: AppColors.surface },
    container: {
        flexGrow: 1,
        paddingHorizontal: Spacing.xl,
        paddingTop: 60,
        paddingBottom: 40,
    },
    brandHeader: {
        alignItems: 'center',
        marginBottom: 32,
    },
    logoCircle: {
        width: 56,
        height: 56,
        borderRadius: 28,
        backgroundColor: AppColors.primary,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: Spacing.md,
    },
    logoText: {
        fontSize: 24,
        color: '#FFF',
    },
    brandName: {
        fontSize: 24,
        fontWeight: '800',
        color: AppColors.text,
        fontFamily: Platform.OS === 'ios' ? 'Georgia' : 'serif',
    },
    brandSub: {
        fontSize: 10,
        letterSpacing: 2,
        textTransform: 'uppercase',
        color: AppColors.primary,
        marginTop: 2,
    },
    title: {
        fontSize: 22,
        fontWeight: '700',
        color: AppColors.text,
        marginBottom: 4,
    },
    subtitle: {
        fontSize: 13,
        color: AppColors.textSecondary,
        marginBottom: 24,
        lineHeight: 19,
    },
    errorBanner: {
        backgroundColor: '#FEF2F2',
        borderWidth: 1,
        borderColor: '#FECACA',
        borderRadius: BorderRadius.sm,
        padding: Spacing.md,
        marginBottom: Spacing.lg,
    },
    errorBannerText: {
        fontSize: 13,
        color: AppColors.error,
    },
    fieldGroup: {
        marginBottom: Spacing.lg,
    },
    label: {
        fontSize: 13,
        fontWeight: '600',
        color: AppColors.textSecondary,
        marginBottom: 6,
    },
    input: {
        borderWidth: 1,
        borderColor: AppColors.border,
        borderRadius: BorderRadius.sm,
        paddingHorizontal: Spacing.lg,
        paddingVertical: 12,
        fontSize: 14,
        color: AppColors.text,
        backgroundColor: AppColors.surface,
    },
    inputError: {
        borderColor: AppColors.error,
    },
    passwordWrap: {
        position: 'relative',
    },
    passwordInput: {
        paddingRight: 50,
    },
    eyeButton: {
        position: 'absolute',
        right: 14,
        top: 0,
        bottom: 0,
        justifyContent: 'center',
    },
    eyeIcon: {
        fontSize: 18,
    },
    fieldError: {
        fontSize: 12,
        color: AppColors.error,
        marginTop: 4,
    },
    forgotRow: {
        alignSelf: 'flex-end',
        marginBottom: Spacing.xl,
        marginTop: -Spacing.sm,
    },
    forgotText: {
        fontSize: 13,
        fontWeight: '600',
        color: AppColors.primary,
    },
    submitButton: {
        backgroundColor: AppColors.primary,
        borderRadius: BorderRadius.sm,
        paddingVertical: 14,
        alignItems: 'center',
        marginBottom: Spacing.md,
    },
    googleButton: {
        borderWidth: 1,
        borderColor: AppColors.border,
        borderRadius: BorderRadius.sm,
        paddingVertical: 14,
        alignItems: 'center',
        marginBottom: Spacing.md,
    },
    googleButtonText: {
        color: AppColors.text,
        fontSize: 14,
        fontWeight: '700',
        backgroundColor: '#FFF',
    },
    buttonDisabled: {
        opacity: 0.6,
    },
    submitText: {
        color: '#FFF',
        fontSize: 14,
        fontWeight: '700',
    },
    registerRow: {
        flexDirection: 'row',
        justifyContent: 'center',
        marginBottom: Spacing.xl,
    },
    registerLabel: {
        fontSize: 13,
        color: AppColors.textSecondary,
    },
    registerLink: {
        fontSize: 13,
        fontWeight: '700',
        color: AppColors.primary,
    },
    securityRow: {
        alignItems: 'center',
    },
    securityText: {
        fontSize: 11,
        color: AppColors.textMuted,
    },
    modalBackdrop: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.45)',
        justifyContent: 'center',
        alignItems: 'center',
        padding: 24,
    },
    modalCard: {
        width: '100%',
        backgroundColor: '#FFF',
        borderRadius: BorderRadius.lg,
        padding: 20,
    },
    modalTitle: {
        fontSize: 18,
        fontWeight: '700',
        color: AppColors.text,
        marginBottom: 8,
    },
    modalDesc: {
        fontSize: 14,
        color: AppColors.textSecondary,
        marginBottom: 16,
        lineHeight: 20,
    },
    modalPrimaryBtn: {
        backgroundColor: AppColors.primary,
        borderRadius: BorderRadius.sm,
        paddingVertical: 12,
        alignItems: 'center',
        marginBottom: 10,
    },
    modalPrimaryText: {
        color: '#FFF',
        fontWeight: '700',
        fontSize: 14,
    },
    modalSecondaryBtn: {
        borderWidth: 1,
        borderColor: AppColors.primary,
        borderRadius: BorderRadius.sm,
        paddingVertical: 12,
        alignItems: 'center',
    },
    modalSecondaryText: {
        color: AppColors.primary,
        fontWeight: '700',
        fontSize: 14,
    },
});
