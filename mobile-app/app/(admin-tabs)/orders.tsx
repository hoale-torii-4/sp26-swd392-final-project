import React, { useEffect, useMemo, useState } from 'react';
import {
    View,
    Text,
    StyleSheet,
    FlatList,
    TouchableOpacity,
    RefreshControl,
    Alert,
} from 'react-native';
import { AppColors, BorderRadius, Spacing } from '../../constants/theme';
import { adminService } from '../../services/adminService';
import { useAuth } from '../../contexts/AuthContext';

export default function AdminOrdersScreen() {
    const { user } = useAuth();
    const isAdmin = user ? String(user.Role).toUpperCase() === 'ADMIN' || Number(user.Role) === 2 : false;
    const isStaff = user ? String(user.Role).toUpperCase() === 'STAFF' || Number(user.Role) === 1 : false;

    const [loading, setLoading] = useState(false);
    const [statusFilter, setStatusFilter] = useState<string | undefined>(undefined);
    const [orders, setOrders] = useState<any[]>([]);

    const loadOrders = async () => {
        setLoading(true);
        try {
            const res = await adminService.getOrders({ status: statusFilter, page: 1, pageSize: 20 });

            if (Array.isArray(res)) {
                setOrders(res);
            } else if (Array.isArray(res?.items)) {
                setOrders(res.items);
            } else if (Array.isArray(res?.Items)) {
                setOrders(res.Items);
            } else if (Array.isArray(res?.data)) {
                setOrders(res.data);
            } else if (Array.isArray(res?.Data)) {
                setOrders(res.Data);
            } else {
                setOrders([]);
            }
        } catch {
            setOrders([]);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadOrders();
    }, [statusFilter]);

    const statuses = useMemo(() => {
        if (isStaff) {
            return ['PREPARING', 'SHIPPING', 'PARTIAL_DELIVERY', 'DELIVERY_FAILED'];
        }
        return ['PREPARING', 'SHIPPING', 'PARTIAL_DELIVERY', 'COMPLETED', 'CANCELLED', 'DELIVERY_FAILED'];
    }, [isStaff]);

    const handleStaffUpdateOrderStatus = async (orderId: string, nextStatus: string) => {
        try {
            await adminService.updateOrderStatus(orderId, nextStatus);
            Alert.alert('Thành công', `Đã cập nhật đơn sang trạng thái ${nextStatus}`);
            loadOrders();
        } catch (error: any) {
            Alert.alert('Lỗi', error?.message || 'Không thể cập nhật trạng thái đơn hàng');
        }
    };

    return (
        <View style={styles.screen}>
            <View style={styles.header}>
                <Text style={styles.title}>Quản lý đơn hàng</Text>
                <Text style={styles.subtitle}>
                    {isStaff
                        ? 'Staff: xử lý đơn cần giao, xác nhận đã giao.'
                        : 'Admin: theo dõi tổng quan trạng thái đơn hàng.'}
                </Text>
            </View>

            <FlatList
                data={orders}
                keyExtractor={(item, idx) => String(item?.id ?? item?.Id ?? idx)}
                contentContainerStyle={styles.listContent}
                refreshControl={<RefreshControl refreshing={loading} onRefresh={loadOrders} />}
                ListHeaderComponent={
                    <View>
                        <View style={styles.filterRow}>
                            <TouchableOpacity
                                style={[styles.filterChip, !statusFilter && styles.filterChipActive]}
                                onPress={() => setStatusFilter(undefined)}
                            >
                                <Text style={[styles.filterText, !statusFilter && styles.filterTextActive]}>Tất cả</Text>
                            </TouchableOpacity>

                            {statuses.map((s) => (
                                <TouchableOpacity
                                    key={s}
                                    style={[styles.filterChip, statusFilter === s && styles.filterChipActive]}
                                    onPress={() => setStatusFilter(s)}
                                >
                                    <Text style={[styles.filterText, statusFilter === s && styles.filterTextActive]}>
                                        {s}
                                    </Text>
                                </TouchableOpacity>
                            ))}
                        </View>
                    </View>
                }
                renderItem={({ item }) => {
                    const orderId = String(item?.id ?? item?.Id ?? '');
                    const code = (item?.orderCode ?? item?.OrderCode ?? orderId) || 'N/A';
                    const customer = item?.customerName ?? item?.CustomerName ?? 'Khách hàng';
                    const status = String(item?.status ?? item?.Status ?? 'N/A');
                    const total = item?.totalAmount ?? item?.TotalAmount ?? 0;

                    return (
                        <View style={styles.orderCard}>
                            <Text style={styles.orderCode}>#{String(code)}</Text>
                            <Text style={styles.orderText}>Khách: {String(customer)}</Text>
                            <Text style={styles.orderText}>Trạng thái: {status}</Text>
                            <Text style={styles.orderTotal}>{Number(total).toLocaleString('vi-VN')}đ</Text>

                            {isStaff && (
                                <View style={styles.actionRow}>
                                    {status === 'PREPARING' && (
                                        <TouchableOpacity
                                            style={[styles.actionBtn, styles.shipBtn]}
                                            onPress={() => handleStaffUpdateOrderStatus(orderId, 'SHIPPING')}
                                        >
                                            <Text style={styles.actionBtnText}>Bắt đầu giao</Text>
                                        </TouchableOpacity>
                                    )}

                                    {status === 'SHIPPING' && (
                                        <TouchableOpacity
                                            style={[styles.actionBtn, styles.completeBtn]}
                                            onPress={() => handleStaffUpdateOrderStatus(orderId, 'COMPLETED')}
                                        >
                                            <Text style={styles.actionBtnText}>Xác nhận đã giao</Text>
                                        </TouchableOpacity>
                                    )}
                                </View>
                            )}
                        </View>
                    );
                }}
                ListEmptyComponent={!loading ? <Text style={styles.emptyText}>Không có đơn hàng.</Text> : null}
            />
        </View>
    );
}

const styles = StyleSheet.create({
    screen: { flex: 1, backgroundColor: AppColors.background },
    header: {
        paddingTop: 56,
        paddingHorizontal: Spacing.lg,
        paddingBottom: Spacing.md,
    },
    title: { fontSize: 22, fontWeight: '800', color: AppColors.text },
    subtitle: { marginTop: 2, fontSize: 12, color: AppColors.textSecondary },
    listContent: { paddingHorizontal: Spacing.lg, paddingBottom: 24 },
    filterRow: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 8,
        marginBottom: Spacing.md,
    },
    filterChip: {
        borderWidth: 1,
        borderColor: AppColors.border,
        borderRadius: 16,
        paddingHorizontal: 10,
        paddingVertical: 6,
        backgroundColor: '#FFF',
    },
    filterChipActive: {
        backgroundColor: AppColors.primary,
        borderColor: AppColors.primary,
    },
    filterText: {
        color: AppColors.textSecondary,
        fontSize: 12,
        fontWeight: '600',
    },
    filterTextActive: {
        color: '#FFF',
    },
    orderCard: {
        backgroundColor: '#FFF',
        borderRadius: BorderRadius.md,
        padding: Spacing.md,
        marginBottom: 10,
        borderWidth: 1,
        borderColor: AppColors.borderLight,
    },
    orderCode: {
        fontSize: 14,
        fontWeight: '700',
        color: AppColors.primary,
        marginBottom: 4,
    },
    orderText: {
        fontSize: 13,
        color: AppColors.textSecondary,
        marginBottom: 2,
    },
    orderTotal: {
        fontSize: 15,
        fontWeight: '700',
        color: AppColors.text,
        marginTop: 6,
    },
    actionRow: {
        marginTop: 10,
        flexDirection: 'row',
        gap: 8,
    },
    actionBtn: {
        borderRadius: BorderRadius.sm,
        paddingVertical: 9,
        paddingHorizontal: 12,
    },
    shipBtn: {
        backgroundColor: '#2563EB',
    },
    completeBtn: {
        backgroundColor: '#16A34A',
    },
    actionBtnText: {
        color: '#FFF',
        fontSize: 12,
        fontWeight: '700',
    },
    emptyText: {
        color: AppColors.textMuted,
        fontSize: 13,
        marginTop: 20,
    },
});
