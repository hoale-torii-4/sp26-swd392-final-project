import React, { useCallback, useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, RefreshControl } from 'react-native';
import { AppColors, BorderRadius, Spacing } from '../../constants/theme';
import { adminService } from '../../services/adminService';
import { useAuth } from '../../contexts/AuthContext';

type DashboardSummary = {
    TotalOrders?: number;
    TotalRevenue?: number;
    TotalCustomers?: number;
    TotalProducts?: number;
    OrdersToday?: number;
    B2cPercent?: number;
    B2bPercent?: number;
};

type OrderStatusSummary = {
    PendingPayment?: number;
    Preparing?: number;
    Shipping?: number;
    DeliveryFailed?: number;
    PartiallyDelivered?: number;
    Refunding?: number;
    Refunded?: number;
    Completed?: number;
    Cancelled?: number;
};

type OrderTypeSummary = {
    B2cOrders?: number;
    B2bOrders?: number;
    B2cRevenue?: number;
    B2bRevenue?: number;
    B2cPercent?: number;
    B2bPercent?: number;
};

function toData<T>(payload: unknown): T {
    if (payload && typeof payload === 'object' && 'Data' in payload) {
        return (payload as { Data: T }).Data;
    }
    return (payload ?? {}) as T;
}

function formatPrice(value: number): string {
    return `${value.toLocaleString('vi-VN')}đ`;
}

function toNumber(value: unknown): number {
    if (typeof value === 'number') return value;
    if (typeof value === 'string') {
        const parsed = Number(value);
        return Number.isFinite(parsed) ? parsed : 0;
    }
    return 0;
}

export default function AdminDashboardScreen() {
    const { user } = useAuth();
    const isAdmin = user ? String(user.Role).toUpperCase() === 'ADMIN' || Number(user.Role) === 2 : false;

    const [loading, setLoading] = useState(false);
    const [summary, setSummary] = useState<DashboardSummary>({});
    const [orderStatusSummary, setOrderStatusSummary] = useState<OrderStatusSummary>({});
    const [orderTypeSummary, setOrderTypeSummary] = useState<OrderTypeSummary>({});

    const STATUS_LABELS: Record<string, string> = {
        PendingPayment: 'Chờ thanh toán',
        Preparing: 'Đang chuẩn bị',
        Shipping: 'Đang giao',
        DeliveryFailed: 'Giao thất bại',
        PartiallyDelivered: 'Giao một phần',
        Refunding: 'Đang hoàn tiền',
        Refunded: 'Đã hoàn tiền',
        Completed: 'Hoàn thành',
        Cancelled: 'Đã hủy',
    };

    const STATUS_COLORS: Record<string, string> = {
        PendingPayment: '#D97706',
        Preparing: '#2563EB',
        Shipping: '#4F46E5',
        DeliveryFailed: '#DC2626',
        PartiallyDelivered: '#EA580C',
        Refunding: '#E11D48',
        Refunded: '#7C3AED',
        Completed: '#059669',
        Cancelled: '#6B7280',
    };

    const loadData = useCallback(async () => {
        if (!isAdmin) return;

        setLoading(true);
        try {
            const [summaryRes, statusRes, typeRes] = await Promise.all([
                adminService.getDashboardSummary(),
                adminService.getOrderStatusSummary(),
                adminService.getOrderTypeSummary(),
            ]);

            setSummary(toData<DashboardSummary>(summaryRes));
            setOrderStatusSummary(toData<OrderStatusSummary>(statusRes));
            setOrderTypeSummary(toData<OrderTypeSummary>(typeRes));
        } catch {
            setSummary({});
            setOrderStatusSummary({});
            setOrderTypeSummary({});
        } finally {
            setLoading(false);
        }
    }, [isAdmin]);

    useEffect(() => {
        loadData();
    }, [loadData]);

    if (!isAdmin) {
        return (
            <View style={styles.deniedWrap}>
                <Text style={styles.deniedTitle}>Khu vực báo cáo chỉ dành cho Admin</Text>
                <Text style={styles.deniedDesc}>
                    Staff vui lòng sử dụng tab Đơn hàng để xử lý giao vận, cập nhật trạng thái và xác nhận giao hàng.
                </Text>
            </View>
        );
    }

    const statCards = [
        { label: 'Tổng đơn', value: toNumber(summary.TotalOrders) },
        { label: 'Doanh thu', value: formatPrice(toNumber(summary.TotalRevenue)) },
        { label: 'Khách hàng', value: toNumber(summary.TotalCustomers) },
        { label: 'Sản phẩm', value: toNumber(summary.TotalProducts) },
    ];

    const keys = ['PendingPayment', 'Preparing', 'Shipping', 'DeliveryFailed', 'PartiallyDelivered', 'Refunding', 'Refunded', 'Completed', 'Cancelled'] as const;
    const statusRows = keys.map((key) => ({
        key,
        label: STATUS_LABELS[key],
        count: toNumber(orderStatusSummary[key]),
        color: STATUS_COLORS[key],
    }));
    const statusTotal = statusRows.reduce((sum, row) => sum + row.count, 0);

    const b2cPercent = Math.round(toNumber(orderTypeSummary.B2cPercent));
    const b2bPercent = Math.round(toNumber(orderTypeSummary.B2bPercent));

    return (
        <ScrollView
            style={styles.screen}
            contentContainerStyle={styles.content}
            refreshControl={<RefreshControl refreshing={loading} onRefresh={loadData} />}
        >
            <Text style={styles.title}>Báo cáo Admin</Text>
            <Text style={styles.subTitle}>Theo dõi doanh thu, đơn hàng và hiệu suất hệ thống</Text>

            <View style={styles.cardGrid}>
                {statCards.map((item) => (
                    <View style={styles.card} key={item.label}>
                        <Text style={styles.cardLabel}>{item.label}</Text>
                        <Text style={styles.cardValue}>{String(item.value)}</Text>
                    </View>
                ))}
            </View>

            <View style={styles.section}>
                <Text style={styles.sectionTitle}>Đơn hôm nay</Text>
                <Text style={styles.sectionBig}>{toNumber(summary.OrdersToday)}</Text>
            </View>

            <View style={styles.section}>
                <Text style={styles.sectionTitle}>Biểu đồ trạng thái đơn hàng</Text>
                {statusRows.every((row) => row.count === 0) ? (
                    <Text style={styles.emptyText}>Chưa có dữ liệu trạng thái đơn hàng.</Text>
                ) : (
                    statusRows.map((row) => (
                        <View style={styles.chartRow} key={row.key}>
                            <Text style={styles.rowLabel}>{row.label}</Text>
                            <View style={styles.chartTrack}>
                                <View
                                    style={[
                                        styles.chartFill,
                                        {
                                            width: `${Math.max(statusTotal > 0 ? (row.count / statusTotal) * 100 : 0, row.count > 0 ? 6 : 0)}%`,
                                            backgroundColor: row.color,
                                        },
                                    ]}
                                />
                            </View>
                            <Text style={styles.rowValue}>{row.count}</Text>
                        </View>
                    ))
                )}
            </View>

            <View style={styles.section}>
                <Text style={styles.sectionTitle}>Biểu đồ loại đơn hàng</Text>
                <View style={styles.typeChartTrack}>
                    <View style={[styles.typeChartFillPrimary, { width: `${Math.max(0, Math.min(100, b2cPercent))}%` }]} />
                </View>
                <View style={styles.legendRow}>
                    <View style={styles.legendItem}>
                        <View style={[styles.legendDot, { backgroundColor: AppColors.primary }]} />
                        <Text style={styles.legendText}>B2C: {toNumber(orderTypeSummary.B2cOrders)} ({b2cPercent}%)</Text>
                    </View>
                    <View style={styles.legendItem}>
                        <View style={[styles.legendDot, { backgroundColor: '#F59E0B' }]} />
                        <Text style={styles.legendText}>B2B: {toNumber(orderTypeSummary.B2bOrders)} ({b2bPercent}%)</Text>
                    </View>
                </View>
                <Text style={styles.sectionLine}>Doanh thu B2C: {formatPrice(toNumber(orderTypeSummary.B2cRevenue))}</Text>
                <Text style={styles.sectionLine}>Doanh thu B2B: {formatPrice(toNumber(orderTypeSummary.B2bRevenue))}</Text>
            </View>
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    screen: { flex: 1, backgroundColor: AppColors.background },
    content: { padding: Spacing.lg, paddingTop: 56, paddingBottom: 24 },
    title: {
        fontSize: 24,
        fontWeight: '800',
        color: AppColors.text,
        marginBottom: 4,
    },
    subTitle: {
        color: AppColors.textSecondary,
        fontSize: 13,
        marginBottom: Spacing.lg,
    },
    cardGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 12,
    },
    card: {
        width: '48%',
        backgroundColor: '#FFF',
        borderRadius: BorderRadius.md,
        padding: Spacing.md,
        borderWidth: 1,
        borderColor: AppColors.borderLight,
    },
    cardLabel: {
        fontSize: 12,
        color: AppColors.textMuted,
        marginBottom: 6,
    },
    cardValue: {
        fontSize: 22,
        fontWeight: '700',
        color: AppColors.primary,
    },
    section: {
        marginTop: Spacing.lg,
        backgroundColor: '#FFF',
        borderRadius: BorderRadius.md,
        padding: Spacing.md,
        borderWidth: 1,
        borderColor: AppColors.borderLight,
    },
    sectionTitle: {
        fontSize: 16,
        fontWeight: '700',
        color: AppColors.text,
        marginBottom: Spacing.sm,
    },
    sectionLine: {
        fontSize: 13,
        color: AppColors.textSecondary,
        marginBottom: 4,
    },
    sectionBig: {
        fontSize: 28,
        fontWeight: '800',
        color: AppColors.primary,
        marginTop: 6,
    },
    emptyText: {
        fontSize: 13,
        color: AppColors.textMuted,
    },
    chartRow: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 8,
        gap: 8,
    },
    rowLabel: { color: AppColors.textSecondary, fontSize: 12, width: 94 },
    rowValue: { color: AppColors.text, fontSize: 12, fontWeight: '700', width: 28, textAlign: 'right' },
    chartTrack: {
        flex: 1,
        height: 12,
        backgroundColor: '#EEF2F7',
        borderRadius: 999,
        overflow: 'hidden',
    },
    chartFill: {
        height: '100%',
        borderRadius: 999,
    },
    typeChartTrack: {
        height: 14,
        borderRadius: 999,
        overflow: 'hidden',
        backgroundColor: '#FEF3C7',
        marginBottom: 12,
    },
    typeChartFillPrimary: {
        height: '100%',
        backgroundColor: AppColors.primary,
        borderRadius: 999,
    },
    legendRow: {
        gap: 8,
        marginBottom: 10,
    },
    legendItem: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
    },
    legendDot: {
        width: 10,
        height: 10,
        borderRadius: 999,
    },
    legendText: {
        fontSize: 12,
        color: AppColors.textSecondary,
    },
    deniedWrap: {
        flex: 1,
        backgroundColor: AppColors.background,
        justifyContent: 'center',
        paddingHorizontal: Spacing.xl,
    },
    deniedTitle: {
        fontSize: 20,
        fontWeight: '700',
        color: AppColors.text,
        marginBottom: 10,
        textAlign: 'center',
    },
    deniedDesc: {
        fontSize: 14,
        color: AppColors.textSecondary,
        textAlign: 'center',
        lineHeight: 20,
    },
});
