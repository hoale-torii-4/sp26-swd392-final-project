import React, { useState } from 'react';
import {
    View, Text, ScrollView, TextInput, TouchableOpacity,
    StyleSheet, Alert, Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import Toast from 'react-native-toast-message';
import { useAuth } from '../../contexts/AuthContext';
import { authService } from '../../services/authService';
import { AppColors, Spacing, BorderRadius } from '../../constants/theme';
import ConfirmModal from '../../components/ConfirmModal';

export default function AccountScreen() {
    const router = useRouter();
    const { user, isAuthenticated, logout } = useAuth();

    const initials = user?.FullName?.charAt(0).toUpperCase() || 'U';

    // Profile state
    const [fullName, setFullName] = useState(user?.FullName || '');
    const [phone, setPhone] = useState(user?.Phone || '');
    const [profileMsg, setProfileMsg] = useState('');

    // Password state
    const [oldPw, setOldPw] = useState('');
    const [newPw, setNewPw] = useState('');
    const [confirmPw, setConfirmPw] = useState('');
    const [pwLoading, setPwLoading] = useState(false);
    const [pwMsg, setPwMsg] = useState('');
    const [pwIsSuccess, setPwIsSuccess] = useState(false);

    const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);

    // If not authenticated, show login prompt
    if (!isAuthenticated || !user) {
        return (
            <View style={styles.loginPrompt}>
                <Ionicons name="person-circle-outline" size={80} color={AppColors.border} />
                <Text style={styles.loginPromptTitle}>Đăng nhập để tiếp tục</Text>
                <Text style={styles.loginPromptDesc}>
                    Quản lý tài khoản, theo dõi đơn hàng và nhiều hơn nữa.
                </Text>
                <TouchableOpacity
                    style={styles.loginBtn}
                    onPress={() => router.push('/login' as any)}
                >
                    <Text style={styles.loginBtnText}>Đăng nhập</Text>
                </TouchableOpacity>
                <TouchableOpacity
                    style={styles.registerBtn}
                    onPress={() => router.push('/register' as any)}
                >
                    <Text style={styles.registerBtnText}>Đăng ký tài khoản mới</Text>
                </TouchableOpacity>
            </View>
        );
    }

    const handleProfileSave = () => {
        setProfileMsg('Thông tin đã được cập nhật thành công!');
        setTimeout(() => setProfileMsg(''), 3000);
    };

    const handleChangePassword = async () => {
        if (!oldPw) { setPwMsg('Vui lòng nhập mật khẩu hiện tại'); setPwIsSuccess(false); return; }
        if (!newPw || newPw.length < 6) { setPwMsg('Mật khẩu mới phải có ít nhất 6 ký tự'); setPwIsSuccess(false); return; }
        if (newPw !== confirmPw) { setPwMsg('Mật khẩu xác nhận không khớp'); setPwIsSuccess(false); return; }

        setPwLoading(true);
        setPwMsg('');
        try {
            const res = await authService.changePassword({ oldPassword: oldPw, newPassword: newPw });
            if (res.Success) {
                setPwIsSuccess(true);
                setPwMsg('');
                setOldPw(''); setNewPw(''); setConfirmPw('');
                Toast.show({
                    type: 'success',
                    text1: 'Thành công',
                    text2: 'Mật khẩu đã được thay đổi. Vui lòng đăng nhập lại.',
                });
                setTimeout(async () => {
                    await logout();
                    router.replace('/login' as any);
                }, 1500);
            } else {
                setPwIsSuccess(false);
                setPwMsg(res.Message || 'Đổi mật khẩu thất bại.');
            }
        } catch {
            setPwIsSuccess(false);
            setPwMsg('Đổi mật khẩu thất bại. Vui lòng thử lại.');
        } finally {
            setPwLoading(false);
        }
    };

    const handleLogout = () => {
        setShowLogoutConfirm(true);
    };

    const confirmLogout = async () => {
        setShowLogoutConfirm(false);
        await logout();
        router.replace('/login' as any);
    };

    return (
        <ScrollView style={styles.screen} showsVerticalScrollIndicator={false}>
            {/* Header */}
            <View style={styles.header}>
                <View style={styles.avatar}>
                    <Text style={styles.avatarText}>{initials}</Text>
                </View>
                <Text style={styles.userName}>{user.FullName}</Text>
                <Text style={styles.userEmail}>{user.Email}</Text>
            </View>

            {/* Menu Items */}
            <View style={styles.menuCard}>
                <MenuItem icon="person-outline" label="Thông tin tài khoản" active />
                <MenuItem
                    icon="receipt-outline"
                    label="Đơn hàng của tôi"
                    onPress={() => router.push('/order-my' as any)}
                />
                <MenuItem
                    icon="location-outline"
                    label="Sổ địa chỉ"
                    onPress={() => router.push('/addresses' as any)}
                />
                <MenuItem
                    icon="cube-outline"
                    label="Giỏ quà custom (Mix & Match)"
                    onPress={() => router.push('/custom-boxes' as any)}
                />
            </View>

            {/* Profile Form */}
            <View style={styles.card}>
                <Text style={styles.cardTitle}>Thông tin cá nhân</Text>
                <View style={styles.fieldGroup}>
                    <Text style={styles.label}>Họ và tên</Text>
                    <TextInput
                        style={styles.input}
                        value={fullName}
                        onChangeText={setFullName}
                    />
                </View>
                <View style={styles.fieldGroup}>
                    <Text style={styles.label}>Email</Text>
                    <TextInput
                        style={[styles.input, styles.inputDisabled]}
                        value={user.Email}
                        editable={false}
                    />
                </View>
                <View style={styles.fieldGroup}>
                    <Text style={styles.label}>Số điện thoại</Text>
                    <TextInput
                        style={styles.input}
                        value={phone}
                        onChangeText={setPhone}
                        placeholder="0909 123 456"
                        placeholderTextColor={AppColors.textMuted}
                        keyboardType="phone-pad"
                    />
                </View>
                {profileMsg ? <Text style={styles.successMsg}>{profileMsg}</Text> : null}
                <TouchableOpacity style={styles.saveBtn} onPress={handleProfileSave}>
                    <Text style={styles.saveBtnText}>Cập nhật thông tin</Text>
                </TouchableOpacity>
            </View>

            {/* Change Password */}
            <View style={styles.card}>
                <Text style={styles.cardTitle}>Đổi mật khẩu</Text>
                <View style={styles.fieldGroup}>
                    <Text style={styles.label}>Mật khẩu hiện tại</Text>
                    <TextInput
                        style={styles.input}
                        value={oldPw}
                        onChangeText={setOldPw}
                        secureTextEntry
                        placeholder="••••••"
                        placeholderTextColor={AppColors.textMuted}
                    />
                </View>
                <View style={styles.fieldGroup}>
                    <Text style={styles.label}>Mật khẩu mới</Text>
                    <TextInput
                        style={styles.input}
                        value={newPw}
                        onChangeText={setNewPw}
                        secureTextEntry
                        placeholder="••••••"
                        placeholderTextColor={AppColors.textMuted}
                    />
                </View>
                <View style={styles.fieldGroup}>
                    <Text style={styles.label}>Xác nhận mật khẩu</Text>
                    <TextInput
                        style={styles.input}
                        value={confirmPw}
                        onChangeText={setConfirmPw}
                        secureTextEntry
                        placeholder="••••••"
                        placeholderTextColor={AppColors.textMuted}
                    />
                </View>
                {pwMsg ? (
                    <Text style={[styles.pwMsg, { color: pwIsSuccess ? AppColors.success : AppColors.error }]}>
                        {pwMsg}
                    </Text>
                ) : null}
                <TouchableOpacity
                    style={[styles.saveBtn, pwLoading && styles.btnDisabled]}
                    onPress={handleChangePassword}
                    disabled={pwLoading}
                >
                    <Text style={styles.saveBtnText}>
                        {pwLoading ? 'Đang xử lý...' : 'Đổi mật khẩu'}
                    </Text>
                </TouchableOpacity>
            </View>

            {/* Account Info */}
            <View style={styles.metaRow}>
                <Text style={styles.metaText}>
                    📅 Ngày tạo: {user.CreatedAt ? new Date(user.CreatedAt).toLocaleDateString('vi-VN') : '—'}
                </Text>
                <Text style={styles.metaText}>
                    🔹 Trạng thái: <Text style={{ color: AppColors.success, fontWeight: '700' }}>Đang hoạt động</Text>
                </Text>
            </View>

            {/* Logout */}
            <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
                <Ionicons name="log-out-outline" size={20} color={AppColors.primary} />
                <Text style={styles.logoutText}>Đăng xuất</Text>
            </TouchableOpacity>

            <View style={{ height: 40 }} />
            
            <ConfirmModal
                visible={showLogoutConfirm}
                title="Đăng xuất"
                message="Bạn có chắc muốn đăng xuất khỏi tài khoản này không?"
                confirmText="Đăng xuất"
                cancelText="Hủy"
                onConfirm={confirmLogout}
                onCancel={() => setShowLogoutConfirm(false)}
                isDestructive={true}
            />
        </ScrollView>
    );
}

function MenuItem({
    icon,
    label,
    active,
    onPress,
}: {
    icon: string;
    label: string;
    active?: boolean;
    onPress?: () => void;
}) {
    return (
        <TouchableOpacity
            style={[styles.menuItem, active && styles.menuItemActive]}
            onPress={onPress}
        >
            <Ionicons name={icon as any} size={20} color={active ? AppColors.primary : AppColors.textMuted} />
            <Text style={[styles.menuItemText, active && styles.menuItemTextActive]}>{label}</Text>
            <Ionicons name="chevron-forward" size={16} color={AppColors.textMuted} />
        </TouchableOpacity>
    );
}

const styles = StyleSheet.create({
    screen: { flex: 1, backgroundColor: AppColors.background },
    header: {
        alignItems: 'center',
        paddingTop: Platform.OS === 'ios' ? 60 : 44,
        paddingBottom: 24,
        backgroundColor: AppColors.surface,
    },
    avatar: {
        width: 64, height: 64, borderRadius: 32, backgroundColor: AppColors.dark,
        justifyContent: 'center', alignItems: 'center', marginBottom: 10,
    },
    avatarText: { fontSize: 24, fontWeight: '800', color: '#FFF' },
    userName: {
        fontSize: 18, fontWeight: '700', color: AppColors.text,
        fontFamily: Platform.OS === 'ios' ? 'Georgia' : 'serif',
    },
    userEmail: { fontSize: 13, color: AppColors.textSecondary, marginTop: 2 },

    menuCard: {
        backgroundColor: AppColors.surface, marginHorizontal: Spacing.lg,
        borderRadius: BorderRadius.lg, marginTop: Spacing.lg, overflow: 'hidden',
        shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.04, shadowRadius: 3, elevation: 1,
    },
    menuItem: {
        flexDirection: 'row', alignItems: 'center', gap: 12,
        paddingHorizontal: Spacing.lg, paddingVertical: 14,
        borderBottomWidth: 1, borderBottomColor: AppColors.borderLight,
    },
    menuItemActive: { backgroundColor: 'rgba(139, 26, 26, 0.06)' },
    menuItemText: { flex: 1, fontSize: 14, color: AppColors.textSecondary },
    menuItemTextActive: { color: AppColors.primary, fontWeight: '600' },

    card: {
        backgroundColor: AppColors.surface, marginHorizontal: Spacing.lg,
        borderRadius: BorderRadius.lg, padding: Spacing.lg, marginTop: Spacing.lg,
        shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.04, shadowRadius: 3, elevation: 1,
    },
    cardTitle: { fontSize: 16, fontWeight: '700', color: AppColors.text, marginBottom: 16 },
    fieldGroup: { marginBottom: Spacing.md },
    label: { fontSize: 11, fontWeight: '700', color: AppColors.textMuted, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 6 },
    input: {
        borderWidth: 1, borderColor: AppColors.border, borderRadius: BorderRadius.sm,
        paddingHorizontal: Spacing.md, paddingVertical: 10, fontSize: 14, color: AppColors.text,
    },
    inputDisabled: { backgroundColor: '#F9FAFB', color: AppColors.textMuted },
    successMsg: { fontSize: 13, color: AppColors.success, fontWeight: '600', marginBottom: 10 },
    pwMsg: { fontSize: 13, fontWeight: '600', marginBottom: 10 },
    saveBtn: {
        backgroundColor: AppColors.primary, borderRadius: BorderRadius.sm,
        paddingVertical: 12, alignItems: 'center',
    },
    saveBtnText: { color: '#FFF', fontSize: 12, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 1 },
    btnDisabled: { opacity: 0.6 },

    metaRow: {
        paddingHorizontal: Spacing.xl, marginTop: Spacing.xl, gap: 6,
    },
    metaText: { fontSize: 12, color: AppColors.textMuted },

    logoutBtn: {
        flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
        marginHorizontal: Spacing.lg, marginTop: Spacing.xl,
        borderWidth: 1, borderColor: AppColors.primary, borderRadius: BorderRadius.sm,
        paddingVertical: 14,
    },
    logoutText: { fontSize: 14, fontWeight: '700', color: AppColors.primary },

    // Login prompt
    loginPrompt: {
        flex: 1, justifyContent: 'center', alignItems: 'center',
        paddingHorizontal: 40, backgroundColor: AppColors.background,
    },
    loginPromptTitle: { fontSize: 18, fontWeight: '700', color: AppColors.text, marginTop: 16, marginBottom: 8 },
    loginPromptDesc: { fontSize: 13, color: AppColors.textSecondary, textAlign: 'center', marginBottom: 24 },
    loginBtn: {
        backgroundColor: AppColors.primary, borderRadius: BorderRadius.sm,
        paddingHorizontal: 40, paddingVertical: 14, marginBottom: 12, width: '100%', alignItems: 'center',
    },
    loginBtnText: { color: '#FFF', fontSize: 14, fontWeight: '700' },
    registerBtn: {
        borderWidth: 1, borderColor: AppColors.primary, borderRadius: BorderRadius.sm,
        paddingHorizontal: 40, paddingVertical: 14, width: '100%', alignItems: 'center',
    },
    registerBtnText: { color: AppColors.primary, fontSize: 14, fontWeight: '700' },
});
