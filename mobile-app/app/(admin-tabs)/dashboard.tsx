import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, RefreshControl } from 'react-native';
import { AppColors, BorderRadius, Spacing } from '../../constants/theme';
import { adminService } from '../../services/adminService';
import { useAuth } from '../../contexts/AuthContext';

export default function AdminDashboardScreen() {
    const { user } = useAuth();
    const isAdmin = user ? String(user.Role).toUpperCase() === 'ADMIN' || Number(user.Role) === 2 : false;

    const [loading, setLoading] = useState(false);
    const [summary, setSummary] = useState<any>({});
    const [orderStatus, setOrderStatus] = useState<any[]>([]);
    const [reportDashboard, setReportDashboard] = useState<any>({});

    const loadData = async () => {
        if (!isAdmin) return;

        setLoading(true);
        try {
            const [summaryRes, statusRes, reportRes] = await Promise.all([
                adminService.getDashboardSummary(),
                adminService.getOrderStatusSummary(),
                adminService.getReportsDashboard(),
            ]);

            setSummary(summaryRes || {});
            setReportDashboard(reportRes || {});

            if (Array.isArray(statusRes)) {
                setOrderStatus(statusRes);
            } else if (Array.isArray(statusRes?.items)) {
                setOrderStatus(statusRes.items);
            } else {
                setOrderStatus([]);
            }
        } catch {
            setSummary({});
            setOrderStatus([]);
            setReportDashboard({});
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadData();
    }, [isAdmin]);

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
        { label: 'Tổng đơn', value: summary?.totalOrders ?? summary?.TotalOrders ?? 0 },
        { label: 'Doanh thu', value: summary?.totalRevenue ?? summary?.TotalRevenue ?? 0 },
        { label: 'Khách hàng', value: summary?.totalCustomers ?? summary?.TotalCustomers ?? 0 },
        { label: 'Sản phẩm', value: summary?.totalProducts ?? summary?.TotalProducts ?? 0 },
    ];

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
                <Text style={styles.sectionTitle}>Báo cáo tổng hợp</Text>
                <Text style={styles.sectionLine}>Doanh thu hôm nay: {String(reportDashboard?.todayRevenue ?? reportDashboard?.TodayRevenue ?? 0)}</Text>
                <Text style={styles.sectionLine}>Đơn hôm nay: {String(reportDashboard?.todayOrders ?? reportDashboard?.TodayOrders ?? 0)}</Text>
            </View>

            <View style={styles.section}>
                <Text style={styles.sectionTitle}>Trạng thái đơn hàng</Text>
                {orderStatus.length === 0 ? (
                    <Text style={styles.emptyText}>Chưa có dữ liệu trạng thái đơn hàng.</Text>
                ) : (
                    orderStatus.map((s: any, index) => (
                        <View style={styles.row} key={`${s?.status ?? s?.Status ?? 'status'}-${index}`}>
                            <Text style={styles.rowLabel}>{s?.status ?? s?.Status ?? 'N/A'}</Text>
                            <Text style={styles.rowValue}>{String(s?.count ?? s?.Count ?? 0)}</Text>
                        </View>
                    ))
                )}
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
    emptyText: {
        fontSize: 13,
        color: AppColors.textMuted,
    },
    row: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        paddingVertical: 8,
        borderBottomWidth: 1,
        borderBottomColor: AppColors.borderLight,
    },
    rowLabel: { color: AppColors.textSecondary, fontSize: 13 },
    rowValue: { color: AppColors.text, fontSize: 13, fontWeight: '700' },
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
