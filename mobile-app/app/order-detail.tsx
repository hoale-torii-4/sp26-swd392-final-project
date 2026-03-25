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
import { reviewService, type UserReview } from '../services/reviewService';
import ReviewModal from '../components/ReviewModal';
import { Ionicons } from '@expo/vector-icons';
import { Image } from 'react-native';

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

  // Reviews state
  const [userReviews, setUserReviews] = useState<Record<string, boolean>>({});
  const [reviewModalVisible, setReviewModalVisible] = useState(false);
  const [reviewItemObj, setReviewItemObj] = useState<{ id: string, name: string } | null>(null);
  const [submittingReview, setSubmittingReview] = useState(false);

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
          
          if (data.Status === 'COMPLETED' && user) {
            try {
              const reviews = await reviewService.getUserReviews();
              const reviewMap: Record<string, boolean> = {};
              reviews.forEach(r => {
                if (r.GiftBoxId) reviewMap[r.GiftBoxId] = true;
              });
              setUserReviews(reviewMap);
            } catch (err) {
              console.log('Failed to fetch user reviews:', err);
            }
          }
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
    loadOrderDetail();
  }, [orderCode, orderId, queryEmail, user]);

  const handleOpenReview = (itemId: string, itemName: string) => {
    setReviewItemObj({ id: itemId, name: itemName });
    setReviewModalVisible(true);
  };

  const handleSubmitReview = async (rating: number, content: string) => {
    if (!reviewItemObj || !order) return;
    setSubmittingReview(true);
    try {
      await reviewService.createReview({
        OrderId: order.Id,
        GiftBoxId: reviewItemObj.id,
        Rating: rating,
        Content: content
      });
      setUserReviews(prev => ({ ...prev, [reviewItemObj.id]: true }));
      setReviewModalVisible(false);
    } catch (err: any) {
      alert(err?.message || 'Có lỗi xảy ra khi gửi đánh giá.');
    } finally {
        setSubmittingReview(false);
    }
  };

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
              <Text style={styles.rowLabel}>Ngày giao dự kiến</Text>
              <Text style={styles.rowValue}>{formatDate(order.DeliveryDate)}</Text>
            </View>
            <View style={[styles.row, { marginTop: 12, borderTopWidth: 1, borderTopColor: AppColors.borderLight, paddingTop: 12 }]}>
              <Text style={styles.rowLabel}>Tổng thanh toán</Text>
              <Text style={styles.totalValue}>{formatMoney(order.TotalAmount)}</Text>
            </View>

            {order.CustomerBankName && order.CustomerBankAccount && (
               <View style={styles.bankInfoBox}>
                 <Text style={styles.bankInfoLabel}>Thông tin thanh toán</Text>
                 <Text style={styles.bankInfoValue}>{order.CustomerBankName} - {order.CustomerBankAccount}</Text>
               </View>
            )}
          </View>

          {(order.GreetingMessage || order.GreetingCardUrl) && (
            <View style={styles.card}>
              <Text style={styles.sectionTitle}>Lời chúc & Thiệp</Text>
              {order.GreetingMessage && (
                <View style={styles.greetingBox}>
                  <Text style={styles.greetingText}>"{order.GreetingMessage}"</Text>
                </View>
              )}
              {order.GreetingCardUrl && (
                <View style={styles.cardBox}>
                  <Text style={styles.cardLabel}>Mẫu thiệp đã chọn:</Text>
                  <Image source={{ uri: order.GreetingCardUrl }} style={styles.cardImage} resizeMode="contain" />
                </View>
              )}
            </View>
          )}

          <View style={styles.card}>
            <Text style={styles.sectionTitle}>Sản phẩm ({order.Items?.length ?? 0})</Text>
            {(order.Items ?? []).map((item, idx) => {
              const lineTotal =
                item.TotalPrice ??
                (item.UnitPrice != null ? item.UnitPrice * item.Quantity : item.Price != null ? item.Price * item.Quantity : undefined);

              const isMixMatch = item.Type === "MIX_MATCH" || item.Type === 1 || item.CustomBoxId;
              const typeString = String(item.Type).toUpperCase();
              const isMixMatchFromStr = typeString === "1" || typeString === "MIX_MATCH";
              
              const isCombo = isMixMatch || isMixMatchFromStr;
              const targetPath = isCombo ? '/mix-match' : `/product/${item.GiftBoxId || item.Id}`;
              const imageUrl = item.Image || (item as any).image || (item as any).IMAGE;

              const validItemId = item.GiftBoxId || item.Id || '';
              const alreadyReviewed = userReviews[validItemId] === true;

              return (
                <View key={`${item.Id}-${idx}`} style={styles.itemContainer}>
                  <TouchableOpacity 
                    style={styles.itemRow}
                    activeOpacity={0.7}
                    onPress={() => router.push(targetPath as any)}
                  >
                    {imageUrl ? (
                      <Image source={{ uri: imageUrl }} style={styles.itemImage} />
                    ) : (
                      <View style={styles.itemImagePlaceholder}>
                        <Ionicons name="image-outline" size={24} color="#9CA3AF" />
                      </View>
                    )}
                    
                    <View style={styles.itemContent}>
                      <Text style={styles.itemName} numberOfLines={2}>{item.Name ?? `Sản phẩm #${idx + 1}`}</Text>
                      <Text style={styles.itemMeta}>Phân loại: {isCombo ? 'Hộp tùy chọn' : 'Set quà sẵn'}</Text>
                      <View style={styles.itemPriceRow}>
                        <Text style={styles.itemPrice}>{formatMoney(lineTotal)}</Text>
                        <Text style={styles.itemQuantity}>x{item.Quantity}</Text>
                      </View>
                    </View>
                    
                    <Ionicons name="chevron-forward" size={16} color={AppColors.textMuted} />
                  </TouchableOpacity>

                  {order.Status === 'COMPLETED' && !isCombo && (
                    <View style={styles.reviewBtnContainer}>
                      <TouchableOpacity 
                         style={[styles.reviewBtn, alreadyReviewed && styles.reviewBtnDisabled]}
                         disabled={alreadyReviewed}
                         onPress={() => handleOpenReview(validItemId, item.Name || 'Sản phẩm')}
                      >
                         <Text style={[styles.reviewBtnText, alreadyReviewed && styles.reviewBtnTextDisabled]}>
                           {alreadyReviewed ? '✓ Đã đánh giá' : 'Đánh giá'}
                         </Text>
                      </TouchableOpacity>
                    </View>
                  )}
                </View>
              );
            })}
          </View>

          {order.DeliveryAddresses?.length ? (
            <View style={styles.card}>
              <Text style={styles.sectionTitle}>Địa chỉ giao ({order.DeliveryAddresses.length})</Text>
              {order.DeliveryAddresses.map((addr) => (
                <View key={addr.Id} style={styles.addressContainer}>
                  <View style={styles.addressHeader}>
                    <Text style={styles.addressName}>{addr.ReceiverName} <Text style={{ fontWeight: '400', color: AppColors.textSecondary }}>• {addr.ReceiverPhone}</Text></Text>
                    <View style={styles.qtyBadge}>
                       <Text style={styles.qtyBadgeText}>{addr.Quantity} Hộp</Text>
                    </View>
                  </View>
                  <Text style={styles.addressText}>{addr.FullAddress}</Text>
                  {addr.HideInvoice && (
                     <Text style={styles.hideInvoiceText}>
                        <Ionicons name="eye-off-outline" size={12} /> Đã ẩn hóa đơn
                     </Text>
                  )}
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

      <ReviewModal 
        visible={reviewModalVisible} 
        onClose={() => setReviewModalVisible(false)} 
        onSubmit={handleSubmitReview}
        productName={reviewItemObj?.name || ''}
        loading={submittingReview}
      />
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
  bankInfoBox: {
    marginTop: 12,
    backgroundColor: '#F9FAFB',
    padding: 12,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: AppColors.borderLight,
  },
  bankInfoLabel: { fontSize: 11, color: AppColors.textSecondary, marginBottom: 4 },
  bankInfoValue: { fontSize: 13, color: AppColors.text, fontWeight: '600' },
  greetingBox: {
    backgroundColor: '#FFFBEB',
    padding: 12,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: '#FEF3C7',
    marginBottom: 8,
  },
  greetingText: { fontSize: 13, color: '#92400E', fontStyle: 'italic', lineHeight: 20 },
  cardBox: { marginTop: 8 },
  cardLabel: { fontSize: 11, color: AppColors.textSecondary, marginBottom: 6 },
  cardImage: { width: '100%', height: 120, borderRadius: BorderRadius.sm, borderWidth: 1, borderColor: AppColors.borderLight },
  
  itemContainer: {
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: AppColors.borderLight,
  },
  itemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  itemImage: {
    width: 60,
    height: 60,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: AppColors.borderLight,
  },
  itemImagePlaceholder: {
    width: 60,
    height: 60,
    backgroundColor: '#F3F4F6',
    borderRadius: BorderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  itemContent: {
    flex: 1,
  },
  itemName: { fontSize: 13, color: AppColors.text, fontWeight: '600', marginBottom: 2 },
  itemMeta: { fontSize: 11, color: AppColors.textSecondary, marginBottom: 4 },
  itemPriceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  itemPrice: { fontSize: 13, color: AppColors.primary, fontWeight: '700' },
  itemQuantity: { fontSize: 12, color: AppColors.text },
  
  reviewBtnContainer: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: 10,
  },
  reviewBtn: {
    borderWidth: 1,
    borderColor: AppColors.primary,
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: BorderRadius.full,
  },
  reviewBtnDisabled: {
    borderColor: AppColors.borderLight,
    backgroundColor: '#F9FAFB',
  },
  reviewBtnText: {
    color: AppColors.primary,
    fontSize: 12,
    fontWeight: '700',
  },
  reviewBtnTextDisabled: {
    color: AppColors.textMuted,
  },

  addressContainer: {
    backgroundColor: '#F9FAFB',
    padding: 12,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: AppColors.borderLight,
    marginBottom: 12,
  },
  addressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  addressName: { fontSize: 13, fontWeight: '700', color: AppColors.text },
  qtyBadge: {
    backgroundColor: '#DCFCE7',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: BorderRadius.full,
  },
  qtyBadgeText: { fontSize: 10, color: '#166534', fontWeight: '600' },
  addressText: { fontSize: 12, color: AppColors.text, lineHeight: 18 },
  hideInvoiceText: { fontSize: 11, color: AppColors.primary, marginTop: 8, fontWeight: '500' },
  
  shipRow: {
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: AppColors.borderLight,
  },
  shipId: { fontSize: 12, fontWeight: '700', color: AppColors.text },
  shipMeta: { fontSize: 12, color: AppColors.textSecondary, marginTop: 2 },
  shipFail: { fontSize: 12, color: AppColors.error, marginTop: 2 },
});
