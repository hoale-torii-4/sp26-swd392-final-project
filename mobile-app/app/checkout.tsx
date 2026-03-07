import React from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { AppColors, Spacing, BorderRadius } from '../constants/theme';

export default function CheckoutScreen() {
    const router = useRouter();

    return (
        <View style={styles.screen}>
            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.container}>
                {/* Header */}
                <View style={styles.header}>
                    <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
                        <Ionicons name="arrow-back" size={22} color={AppColors.text} />
                    </TouchableOpacity>
                    <Text style={styles.headerTitle}>Thanh toán</Text>
                    <View style={{ width: 22 }} />
                </View>

                {/* Shipping Info */}
                <View style={styles.card}>
                    <Text style={styles.cardTitle}>📦 Thông tin giao hàng</Text>
                    <View style={styles.fieldGroup}>
                        <Text style={styles.label}>Họ và tên người nhận</Text>
                        <View style={styles.inputPlaceholder}>
                            <Text style={styles.inputPlaceholderText}>Nhập họ và tên</Text>
                        </View>
                    </View>
                    <View style={styles.fieldGroup}>
                        <Text style={styles.label}>Số điện thoại</Text>
                        <View style={styles.inputPlaceholder}>
                            <Text style={styles.inputPlaceholderText}>Nhập số điện thoại</Text>
                        </View>
                    </View>
                    <View style={styles.fieldGroup}>
                        <Text style={styles.label}>Địa chỉ giao hàng</Text>
                        <View style={[styles.inputPlaceholder, { height: 80 }]}>
                            <Text style={styles.inputPlaceholderText}>Nhập địa chỉ chi tiết</Text>
                        </View>
                    </View>
                </View>

                {/* Gift Message */}
                <View style={styles.card}>
                    <Text style={styles.cardTitle}>💌 Lời chúc kèm theo</Text>
                    <View style={[styles.inputPlaceholder, { height: 100 }]}>
                        <Text style={styles.inputPlaceholderText}>
                            Viết lời chúc gửi tặng người nhận (tùy chọn)
                        </Text>
                    </View>
                </View>

                {/* Payment Method */}
                <View style={styles.card}>
                    <Text style={styles.cardTitle}>💳 Phương thức thanh toán</Text>
                    <TouchableOpacity style={[styles.paymentOption, styles.paymentOptionActive]}>
                        <View style={[styles.radio, styles.radioActive]} />
                        <Text style={styles.paymentText}>Thanh toán khi nhận hàng (COD)</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.paymentOption}>
                        <View style={styles.radio} />
                        <Text style={styles.paymentText}>Chuyển khoản ngân hàng</Text>
                    </TouchableOpacity>
                </View>

                {/* Note */}
                <View style={styles.noteRow}>
                    <Ionicons name="information-circle-outline" size={14} color={AppColors.textMuted} />
                    <Text style={styles.noteText}>
                        Đơn hàng sẽ được xử lý trong vòng 24h. Bạn sẽ nhận thông báo khi đơn hàng
                        được xác nhận.
                    </Text>
                </View>
            </ScrollView>

            {/* Sticky Footer */}
            <View style={styles.footer}>
                <TouchableOpacity style={styles.placeOrderBtn} activeOpacity={0.85}>
                    <Text style={styles.placeOrderText}>Đặt hàng</Text>
                </TouchableOpacity>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    screen: { flex: 1, backgroundColor: AppColors.background },
    container: { paddingBottom: 100 },
    header: {
        flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
        paddingTop: Platform.OS === 'ios' ? 56 : 40, paddingBottom: 16, paddingHorizontal: Spacing.lg,
    },
    backBtn: { padding: 4 },
    headerTitle: {
        fontSize: 18, fontWeight: '700', color: AppColors.text,
    },

    card: {
        backgroundColor: AppColors.surface, marginHorizontal: Spacing.lg,
        borderRadius: BorderRadius.lg, padding: Spacing.lg, marginBottom: Spacing.md,
        shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.04, shadowRadius: 3, elevation: 1,
    },
    cardTitle: { fontSize: 15, fontWeight: '700', color: AppColors.text, marginBottom: 14 },
    fieldGroup: { marginBottom: Spacing.md },
    label: {
        fontSize: 11, fontWeight: '700', color: AppColors.textMuted,
        textTransform: 'uppercase', letterSpacing: 1, marginBottom: 6,
    },
    inputPlaceholder: {
        borderWidth: 1, borderColor: AppColors.border, borderRadius: BorderRadius.sm,
        paddingHorizontal: Spacing.md, paddingVertical: 12, justifyContent: 'flex-start',
    },
    inputPlaceholderText: { fontSize: 14, color: AppColors.textMuted },

    paymentOption: {
        flexDirection: 'row', alignItems: 'center', gap: 12,
        paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: AppColors.borderLight,
    },
    paymentOptionActive: { backgroundColor: 'rgba(139, 26, 26, 0.04)', borderRadius: BorderRadius.sm, paddingHorizontal: 12 },
    radio: {
        width: 20, height: 20, borderRadius: 10, borderWidth: 2, borderColor: AppColors.border,
    },
    radioActive: {
        borderColor: AppColors.primary, borderWidth: 6,
    },
    paymentText: { fontSize: 14, color: AppColors.text },

    noteRow: {
        flexDirection: 'row', alignItems: 'flex-start', gap: 8,
        paddingHorizontal: Spacing.xl, marginTop: 4,
    },
    noteText: { flex: 1, fontSize: 12, color: AppColors.textMuted, lineHeight: 18 },

    footer: {
        position: 'absolute', bottom: 0, left: 0, right: 0,
        backgroundColor: AppColors.surface, borderTopWidth: 1, borderTopColor: AppColors.borderLight,
        paddingHorizontal: Spacing.xl, paddingTop: 12,
        paddingBottom: Platform.OS === 'ios' ? 34 : 16,
    },
    placeOrderBtn: {
        backgroundColor: AppColors.primary, borderRadius: BorderRadius.sm,
        paddingVertical: 14, alignItems: 'center',
    },
    placeOrderText: { color: '#FFF', fontSize: 14, fontWeight: '700' },
});
