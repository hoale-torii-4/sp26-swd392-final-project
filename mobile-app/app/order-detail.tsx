import React, { useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { AppColors, Spacing, BorderRadius } from '../constants/theme';
import { orderService, type OrderDto } from '../services/orderService';
import { useAuth } from '../contexts/AuthContext';

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

const formatDate = (value?: string | null) => {
  if (!value) return '--';
  return new Date(value).toLocaleString('vi-VN');
};

const formatMoney = (value?: number | null) => {
  if (value == null) return '--';
  return value.toLocaleString('vi-VN') + '₫';
};

export default function OrderDetailScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const { code, id, email } = useLocalSearchParams<{ code?: string; id?: string; email?: string }>();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [order, setOrder] = useState<OrderDto | null>(null);

  const orderCode = useMemo(() => (code ?? '').toString().trim(), [code]);
  const orderId = useMemo(() => (id ?? '').toString().trim(), [id]);
  const queryEmail = useMemo(() => (email ?? '').toString().trim() || user?.Email || '', [email, user?.Email]);

  useEffect(() => {
    const loadOrderDetail = async () => {
      setLoading(true);
      setError(null);
      try {
        let data: OrderDto | null = null;

        if (orderId) {
          data = await orderService.getOrderDetailById(orderId);
        } else if (orderCode) {
          data = await orderService.getOrderDetailByCode(orderCode, queryEmail || undefined);
        }

        if (!data) {
          setError('Không tìm thấy thông tin đơn hàng.');
          setOrder(null);
        } else {
          setOrder(data);
        }
      } catch (err: any) {
        setError(err?.message ?? 'Không thể tải chi tiết đơn hàng.');
        setOrder(null);
      } finally {
        setLoading(false);
      }
    };

    if (!orderCode && !orderId) {
      setLoading(false);
      setError('Thiếu mã đơn hàng để tra cứu.');
      return;
    }

    loadOrderDetail();
  }, [orderCode, orderId, queryEmail]);

  const statusKey = String(order?.Status ?? '');
  const statusMeta = STATUS_META[statusKey] ?? { label: statusKey || 'N/A', color: AppColors.textMuted };

  return (
    <ScrollView style={styles.screen}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Text style={styles.backText}>← Quay lại</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Chi tiết đơn hàng</Text>
      </View>

      {loading ? (
        <View style={styles.stateCard}>
          <ActivityIndicator color={AppColors.primary} />
          <Text style={styles.stateText}>Đang tải chi tiết đơn hàng...</Text>
        </View>
      ) : error ? (
        <View style={styles.stateCard}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      ) : order ? (
        <>
          <View style={styles.card}>
            <Text style={styles.title}>Mã đơn hàng</Text>
            <Text style={styles.code}>#{order.OrderCode}</Text>

            <View style={[styles.statusBadge, { borderColor: statusMeta.color }]}> 
              <Text style={[styles.statusText, { color: statusMeta.color }]}>{statusMeta.label}</Text>
            </View>

            <View style={styles.row}>
              <Text style={styles.rowLabel}>Loại đơn</Text>
              <Text style={styles.rowValue}>{String(order.OrderType)}</Text>
            </View>
            <View style={styles.row}>
              <Text style={styles.rowLabel}>Ngày đặt</Text>
              <Text style={styles.rowValue}>{formatDate(order.CreatedAt)}</Text>
            </View>
            <View style={styles.row}>
              <Text style={styles.rowLabel}>Ngày giao</Text>
              <Text style={styles.rowValue}>{formatDate(order.DeliveryDate)}</Text>
            </View>
            <View style={styles.row}>
              <Text style={styles.rowLabel}>Tổng thanh toán</Text>
              <Text style={styles.totalValue}>{formatMoney(order.TotalAmount)}</Text>
            </View>
          </View>

          <View style={styles.card}>
            <Text style={styles.sectionTitle}>Sản phẩm ({order.Items?.length ?? 0})</Text>
            {(order.Items ?? []).map((item, idx) => {
              const lineTotal =
                item.TotalPrice ??
                (item.UnitPrice != null ? item.UnitPrice * item.Quantity : item.Price != null ? item.Price * item.Quantity : undefined);

              return (
                <View key={`${item.Id}-${idx}`} style={styles.itemRow}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.itemName}>{item.Name ?? `Sản phẩm #${idx + 1}`}</Text>
                    <Text style={styles.itemMeta}>SL: {item.Quantity}</Text>
                  </View>
                  <Text style={styles.itemPrice}>{formatMoney(lineTotal)}</Text>
                </View>
              );
            })}
          </View>

          {order.DeliveryAddresses?.length ? (
            <View style={styles.card}>
              <Text style={styles.sectionTitle}>Địa chỉ giao ({order.DeliveryAddresses.length})</Text>
              {order.DeliveryAddresses.map((addr) => (
                <View key={addr.Id} style={styles.addressRow}>
                  <Text style={styles.addressName}>{addr.ReceiverName} • {addr.ReceiverPhone}</Text>
                  <Text style={styles.addressText}>{addr.FullAddress}</Text>
                </View>
              ))}
            </View>
          ) : null}

          {order.DeliveryShipments?.length ? (
            <View style={styles.card}>
              <Text style={styles.sectionTitle}>Lịch sử giao vận</Text>
              {order.DeliveryShipments.map((s) => (
                <View key={s.DeliveryId} style={styles.shipRow}>
                  <Text style={styles.shipId}>Delivery #{s.DeliveryId}</Text>
                  <Text style={styles.shipMeta}>Trạng thái: {s.Status}</Text>
                  {s.FailureReason ? <Text style={styles.shipFail}>Lý do lỗi: {s.FailureReason}</Text> : null}
                </View>
              ))}
            </View>
          ) : null}
        </>
      ) : null}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: AppColors.background },
  header: {
    paddingTop: Platform.OS === 'ios' ? 56 : 40,
    paddingBottom: 16,
    paddingHorizontal: Spacing.lg,
  },
  backBtn: { marginBottom: 10 },
  backText: { fontSize: 14, color: AppColors.primary, fontWeight: '600' },
  headerTitle: { fontSize: 18, fontWeight: '700', color: AppColors.text },
  stateCard: {
    backgroundColor: AppColors.surface,
    margin: Spacing.lg,
    borderRadius: BorderRadius.lg,
    padding: Spacing.lg,
    alignItems: 'center',
    gap: 10,
  },
  stateText: { fontSize: 13, color: AppColors.textSecondary },
  errorText: { fontSize: 13, color: AppColors.error },
  card: {
    backgroundColor: AppColors.surface,
    marginHorizontal: Spacing.lg,
    marginBottom: Spacing.md,
    borderRadius: BorderRadius.lg,
    padding: Spacing.lg,
  },
  title: { fontSize: 12, color: AppColors.textMuted, textTransform: 'uppercase' },
  code: { fontSize: 20, fontWeight: '800', color: AppColors.primary, marginVertical: 6 },
  statusBadge: {
    alignSelf: 'flex-start',
    borderWidth: 1,
    borderRadius: BorderRadius.full,
    paddingHorizontal: 10,
    paddingVertical: 4,
    marginBottom: 8,
  },
  statusText: { fontSize: 12, fontWeight: '700' },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 8,
  },
  rowLabel: { fontSize: 12, color: AppColors.textSecondary },
  rowValue: { fontSize: 12, color: AppColors.text, fontWeight: '600' },
  totalValue: { fontSize: 13, color: AppColors.primary, fontWeight: '800' },
  sectionTitle: { fontSize: 14, fontWeight: '700', color: AppColors.text, marginBottom: 8 },
  itemRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: AppColors.borderLight,
  },
  itemName: { fontSize: 13, color: AppColors.text, fontWeight: '600' },
  itemMeta: { fontSize: 11, color: AppColors.textMuted, marginTop: 2 },
  itemPrice: { fontSize: 12, color: AppColors.text, fontWeight: '700' },
  addressRow: {
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: AppColors.borderLight,
  },
  addressName: { fontSize: 12, fontWeight: '700', color: AppColors.text },
  addressText: { fontSize: 12, color: AppColors.textSecondary, marginTop: 2 },
  shipRow: {
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: AppColors.borderLight,
  },
  shipId: { fontSize: 12, fontWeight: '700', color: AppColors.text },
  shipMeta: { fontSize: 12, color: AppColors.textSecondary, marginTop: 2 },
  shipFail: { fontSize: 12, color: AppColors.error, marginTop: 2 },
});
