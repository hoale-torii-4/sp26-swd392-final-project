import React, { useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { AppColors, BorderRadius, Spacing } from '../../constants/theme';
import ConfirmModal from '../../components/ConfirmModal';
import { useAuth } from '../../contexts/AuthContext';

export default function AdminAccountScreen() {
    const router = useRouter();
    const { user, logout, setSiteMode } = useAuth();
    const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);

    const initials = user?.FullName?.charAt(0)?.toUpperCase() || 'U';

    const handleSwitchToCustomer = async () => {
        await setSiteMode('customer');
        router.replace('/(tabs)' as any);
    };

    const confirmLogout = async () => {
        setShowLogoutConfirm(false);
        await logout();
        router.replace('/login' as any);
    };

    return (
        <ScrollView style={styles.screen} contentContainerStyle={{ paddingBottom: 28 }}>
            <View style={styles.header}>
                <View style={styles.avatar}>
                    <Text style={styles.avatarText}>{initials}</Text>
                </View>
                <Text style={styles.name}>{user?.FullName ?? 'Internal User'}</Text>
                <Text style={styles.email}>{user?.Email ?? ''}</Text>
                <View style={styles.roleBadge}>
                    <Text style={styles.roleBadgeText}>STAFF / ADMIN MODE</Text>
                </View>
            </View>

            <View style={styles.card}>
                <Text style={styles.cardTitle}>Chuyển site nhanh</Text>
                <TouchableOpacity style={styles.switchBtn} onPress={handleSwitchToCustomer}>
                    <Ionicons name="swap-horizontal" size={18} color="#FFF" />
                    <Text style={styles.switchText}>Đổi sang Customer site</Text>
                </TouchableOpacity>
            </View>

            <View style={styles.card}>
                <Text style={styles.cardTitle}>Tiện ích quản trị</Text>
                <Item icon="grid-outline" label="Dashboard" />
                <Item icon="receipt-outline" label="Quản lý đơn hàng" />
                <Item icon="layers-outline" label="Kho & tồn" />
            </View>

            <TouchableOpacity style={styles.logoutBtn} onPress={() => setShowLogoutConfirm(true)}>
                <Ionicons name="log-out-outline" size={18} color={AppColors.primary} />
                <Text style={styles.logoutText}>Đăng xuất</Text>
            </TouchableOpacity>

            <ConfirmModal
                visible={showLogoutConfirm}
                title="Đăng xuất"
                message="Bạn có chắc muốn đăng xuất khỏi tài khoản này không?"
                confirmText="Đăng xuất"
                cancelText="Hủy"
                onConfirm={confirmLogout}
                onCancel={() => setShowLogoutConfirm(false)}
                isDestructive
            />
        </ScrollView>
    );
}

function Item({ icon, label }: { icon: string; label: string }) {
    return (
        <View style={styles.itemRow}>
            <Ionicons name={icon as any} size={18} color={AppColors.textMuted} />
            <Text style={styles.itemText}>{label}</Text>
            <Ionicons name="chevron-forward" size={16} color={AppColors.textMuted} />
        </View>
    );
}

const styles = StyleSheet.create({
    screen: { flex: 1, backgroundColor: AppColors.background },
    header: {
        alignItems: 'center',
        paddingTop: Platform.OS === 'ios' ? 60 : 44,
        paddingBottom: 20,
        backgroundColor: AppColors.surface,
    },
    avatar: {
        width: 64,
        height: 64,
        borderRadius: 32,
        backgroundColor: AppColors.dark,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 10,
    },
    avatarText: { color: '#FFF', fontSize: 24, fontWeight: '800' },
    name: { fontSize: 18, fontWeight: '700', color: AppColors.text },
    email: { fontSize: 13, color: AppColors.textSecondary, marginTop: 2 },
    roleBadge: {
        marginTop: 10,
        backgroundColor: 'rgba(139, 26, 26, 0.12)',
        borderColor: AppColors.primary,
        borderWidth: 1,
        borderRadius: 20,
        paddingHorizontal: 10,
        paddingVertical: 4,
    },
    roleBadgeText: { color: AppColors.primary, fontWeight: '700', fontSize: 11 },

    card: {
        marginTop: Spacing.lg,
        marginHorizontal: Spacing.lg,
        backgroundColor: '#FFF',
        borderRadius: BorderRadius.lg,
        padding: Spacing.lg,
        borderWidth: 1,
        borderColor: AppColors.borderLight,
    },
    cardTitle: { fontSize: 16, fontWeight: '700', color: AppColors.text, marginBottom: 12 },
    switchBtn: {
        backgroundColor: AppColors.primary,
        borderRadius: BorderRadius.sm,
        paddingVertical: 12,
        justifyContent: 'center',
        alignItems: 'center',
        flexDirection: 'row',
        gap: 8,
    },
    switchText: { color: '#FFF', fontWeight: '700', fontSize: 13 },

    itemRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
        paddingVertical: 12,
        borderBottomWidth: 1,
        borderBottomColor: AppColors.borderLight,
    },
    itemText: { flex: 1, fontSize: 13, color: AppColors.textSecondary },

    logoutBtn: {
        marginTop: Spacing.xl,
        marginHorizontal: Spacing.lg,
        borderWidth: 1,
        borderColor: AppColors.primary,
        borderRadius: BorderRadius.sm,
        paddingVertical: 13,
        justifyContent: 'center',
        alignItems: 'center',
        flexDirection: 'row',
        gap: 8,
    },
    logoutText: { color: AppColors.primary, fontWeight: '700', fontSize: 14 },
});
