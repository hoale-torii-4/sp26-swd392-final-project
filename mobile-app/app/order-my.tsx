import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Platform,
  RefreshControl,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { orderService, type MyOrderResponseDto } from '../services/orderService';
import { useAuth } from '../contexts/AuthContext';
import { AppColors, BorderRadius, Spacing } from '../constants/theme';

const STATUS_META: Record<string, { label: string; color: string }> = {
  PAYMENT_CONFIRMING: { label: 'Chờ thanh toán', color: '#F59E0B' },
  PAYMENT_EXPIRED_INTERNAL: { label: 'Hết hạn thanh toán', color: '#9CA3AF' },
  PREPARING: { label: 'Đang chuẩn bị', color: '#2563EB' },
  SHIPPING: { label: 'Đang giao hàng', color: '#4F46E5' },
  PARTIAL_DELIVERY: { label: 'Giao một phần', color: '#8B5CF6' },
  DELIVERY_FAILED: { label: 'Giao thất bại', color: '#F97316' },
  COMPLETED: { label: 'Giao thành công', color: '#16A34A' },
  CANCELLED: { label: 'Đã huỷ', color: '#DC2626' },
};

const STATUS_BY_INDEX = [
  'PAYMENT_CONFIRMING',
  'PAYMENT_EXPIRED_INTERNAL',
  'PREPARING',
  'SHIPPING',
  'PARTIAL_DELIVERY',
  'DELIVERY_FAILED',
  'COMPLETED',
  'CANCELLED',
];

const normalizeStatus = (status: string | number) => {
  if (typeof status === 'number') {
    return STATUS_BY_INDEX[status] ?? String(status);
  }
  const numeric = Number(status);
  if (!Number.isNaN(numeric)) {
    return STATUS_BY_INDEX[numeric] ?? status;
  }
  return status;
};

const formatDate = (value?: string) => {
  if (!value) return '--';
  return new Date(value).toLocaleDateString('vi-VN');
};

const formatPrice = (value?: number) => {
  if (value == null) return '--';
  return value.toLocaleString('vi-VN') + '₫';
};

export default function MyOrdersScreen() {
  const router = useRouter();
  const { user, isAuthenticated } = useAuth();
  const [orders, setOrders] = useState<MyOrderResponseDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadOrders = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await orderService.getMyOrders();
      const payload = res?.Data ?? res?.data ?? [];
      setOrders(payload);
    } catch (err: any) {
      setError(err?.message ?? 'Không thể tải đơn hàng.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!isAuthenticated) {
      router.replace('/login' as any);
      return;
    }
    loadOrders();
  }, [isAuthenticated]);

  const renderContent = () => {
    if (loading) {
      return (
        <View style={styles.stateBox}>
          <Text style={styles.stateText}>Đang tải đơn hàng...</Text>
        </View>
      );
    }

    if (error) {
      return (
        <View style={[styles.stateBox, styles.errorBox]}>
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity style={styles.retryBtn} onPress={loadOrders}>
            <Text style={styles.retryText}>Thử lại</Text>
          </TouchableOpacity>
        </View>
      );
    }

    if (orders.length === 0) {
      return (
        <View style={styles.stateBox}>
          <Text style={styles.stateText}>Bạn chưa có đơn hàng nào.</Text>
        </View>
      );
    }

    return (
      <View style={styles.list}>
        {orders.map((order) => {
          const statusKey = normalizeStatus(order.Status);
          const status = STATUS_META[statusKey] ?? {
            label: statusKey,
            color: AppColors.textMuted,
          };
          return (
            <TouchableOpacity
              key={order.Id}
              style={styles.orderCard}
              onPress={() => router.push({ pathname: '/order-detail', params: { code: order.OrderCode } } as any)}
            >
              <View style={styles.cardHeader}>
                <View>
                  <Text style={styles.cardLabel}>Mã đơn</Text>
                  <Text style={styles.cardValue}>{order.OrderCode}</Text>
                </View>
                <View style={[styles.statusPill, { borderColor: status.color }]}> 
                  <Text style={[styles.statusText, { color: status.color }]}>{status.label}</Text>
                </View>
              </View>
              <View style={styles.cardRow}>
                <Text style={styles.cardRowLabel}>Ngày đặt</Text>
                <Text style={styles.cardRowValue}>{formatDate(order.CreatedAt)}</Text>
              </View>
              <View style={styles.cardRow}>
                <Text style={styles.cardRowLabel}>Ngày giao</Text>
                <Text style={styles.cardRowValue}>{formatDate(order.DeliveryDate)}</Text>
              </View>
              <View style={styles.cardRow}>
                <Text style={styles.cardRowLabel}>Số sản phẩm</Text>
                <Text style={styles.cardRowValue}>{order.TotalItems ?? order.Items?.length ?? 0}</Text>
              </View>
              <View style={styles.cardRow}>
                <Text style={styles.cardRowLabel}>Tổng thanh toán</Text>
                <Text style={styles.cardTotal}>{formatPrice(order.TotalAmount)}</Text>
              </View>
              {order.Items?.length > 0 && (
                <View style={styles.itemsPreview}>
                  {order.Items.slice(0, 2).map((item, idx) => (
                    <Text key={`${order.Id}-${idx}`} style={styles.itemPreviewText} numberOfLines={1}>
                      • {item.Name} x{item.Quantity}
                    </Text>
                  ))}
                  {order.Items.length > 2 && (
                    <Text style={styles.itemPreviewMore}>+{order.Items.length - 2} sản phẩm khác</Text>
                  )}
                </View>
              )}
            </TouchableOpacity>
          );
        })}
      </View>
    );
  };

  return (
    <ScrollView
      style={styles.screen}
      showsVerticalScrollIndicator={false}
      refreshControl={<RefreshControl refreshing={loading} onRefresh={loadOrders} />}
    >
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={22} color={AppColors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Đơn hàng của tôi</Text>
        <View style={{ width: 22 }} />
      </View>

      <View style={styles.summaryCard}>
        <Text style={styles.summaryTitle}>Xin chào, {user?.FullName}</Text>
        <Text style={styles.summaryDesc}>Theo dõi và cập nhật tình trạng các đơn hàng gần đây.</Text>
        <View style={styles.summaryRow}>
          <View>
            <Text style={styles.summaryLabel}>Tổng số đơn</Text>
            <Text style={styles.summaryValue}>{orders.length}</Text>
          </View>
          <TouchableOpacity style={styles.trackBtn} onPress={() => router.push('/order-tracking' as any)}>
            <Text style={styles.trackBtnText}>Tra cứu đơn khác</Text>
          </TouchableOpacity>
        </View>
      </View>

      {renderContent()}

      <View style={{ height: 32 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: AppColors.background },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: Platform.OS === 'ios' ? 56 : 40,
    paddingBottom: 16,
    paddingHorizontal: Spacing.lg,
  },
  backBtn: { padding: 4 },
  headerTitle: { fontSize: 18, fontWeight: '700', color: AppColors.text },

  summaryCard: {
    backgroundColor: AppColors.surface,
    marginHorizontal: Spacing.lg,
    borderRadius: BorderRadius.lg,
    padding: Spacing.lg,
    marginBottom: Spacing.md,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 3,
    elevation: 1,
  },
  summaryTitle: { fontSize: 16, fontWeight: '700', color: AppColors.text, marginBottom: 6 },
  summaryDesc: { fontSize: 12, color: AppColors.textSecondary, marginBottom: 12 },
  summaryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  summaryLabel: { fontSize: 10, textTransform: 'uppercase', color: AppColors.textMuted, letterSpacing: 1 },
  summaryValue: { fontSize: 22, fontWeight: '800', color: AppColors.primary },
  trackBtn: {
    backgroundColor: 'rgba(139, 26, 26, 0.1)',
    borderRadius: BorderRadius.full,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  trackBtnText: { color: AppColors.primary, fontSize: 12, fontWeight: '700' },

  list: { paddingHorizontal: Spacing.lg, gap: Spacing.md },
  orderCard: {
    backgroundColor: AppColors.surface,
    borderRadius: BorderRadius.lg,
    padding: Spacing.lg,
    borderWidth: 1,
    borderColor: AppColors.borderLight,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 10,
  },
  cardLabel: { fontSize: 10, textTransform: 'uppercase', color: AppColors.textMuted, letterSpacing: 1 },
  cardValue: { fontSize: 14, fontWeight: '700', color: AppColors.text },
  statusPill: {
    borderWidth: 1,
    borderRadius: BorderRadius.full,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  statusText: { fontSize: 11, fontWeight: '700' },
  cardRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 6,
  },
  cardRowLabel: { fontSize: 12, color: AppColors.textSecondary },
  cardRowValue: { fontSize: 12, fontWeight: '600', color: AppColors.text },
  cardTotal: { fontSize: 13, fontWeight: '800', color: AppColors.primary },

  itemsPreview: {
    marginTop: 10,
    backgroundColor: '#F9FAFB',
    borderRadius: BorderRadius.md,
    padding: Spacing.sm,
  },
  itemPreviewText: { fontSize: 11, color: AppColors.textSecondary },
  itemPreviewMore: { fontSize: 11, fontWeight: '600', color: AppColors.primary, marginTop: 4 },

  stateBox: {
    backgroundColor: AppColors.surface,
    marginHorizontal: Spacing.lg,
    borderRadius: BorderRadius.lg,
    padding: Spacing.xl,
    alignItems: 'center',
  },
  stateText: { fontSize: 13, color: AppColors.textSecondary },
  errorBox: { borderWidth: 1, borderColor: '#FECACA' },
  errorText: { fontSize: 13, color: AppColors.error, marginBottom: 8 },
  retryBtn: {
    borderWidth: 1,
    borderColor: AppColors.primary,
    borderRadius: BorderRadius.full,
    paddingHorizontal: 16,
    paddingVertical: 6,
  },
  retryText: { fontSize: 12, fontWeight: '700', color: AppColors.primary },
});
