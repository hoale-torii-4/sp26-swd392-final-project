import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { orderService } from '../services/orderService';
import { useAuth } from '../contexts/AuthContext';
import { AppColors, Spacing, BorderRadius } from '../constants/theme';
import { isValidEmail, isValidOrderCode, sanitizeOrderCode } from '../services/validationService';

function formatPrice(v: number) {
  return v.toLocaleString('vi-VN') + '₫';
}

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleString('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

const STATUS_META: Record<string, { label: string; color: string; icon: string }> = {
  PAYMENT_CONFIRMING: { label: 'Chờ thanh toán', color: '#FACC15', icon: '⏳' },
  PREPARING: { label: 'Đang chuẩn bị', color: '#2563EB', icon: '📦' },
  SHIPPING: { label: 'Đang giao hàng', color: '#4F46E5', icon: '🚚' },
  COMPLETED: { label: 'Giao thành công', color: '#16A34A', icon: '✅' },
  CANCELLED: { label: 'Đã huỷ', color: '#DC2626', icon: '❌' },
  DELIVERY_FAILED: { label: 'Giao thất bại', color: '#F97316', icon: '⚠️' },
};

const STATUS_STEPS = [
  'PAYMENT_CONFIRMING',
  'PREPARING',
  'SHIPPING',
  'COMPLETED',
];

export default function OrderTrackingScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const [orderCode, setOrderCode] = useState('');
  const [email, setEmail] = useState(user?.Email ?? '');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<any>(null);
  const [orderCodeError, setOrderCodeError] = useState('');
  const [emailError, setEmailError] = useState('');

  const handleSearch = async () => {
    const nextOrderCode = orderCode.trim().toUpperCase();
    const nextEmail = email.trim();

    let valid = true;
    setOrderCodeError('');
    setEmailError('');

    if (!nextOrderCode) {
      setOrderCodeError('Vui lòng nhập mã đơn hàng');
      valid = false;
    } else if (!isValidOrderCode(nextOrderCode)) {
      setOrderCodeError('Mã đơn hàng không hợp lệ');
      valid = false;
    }

    if (!nextEmail) {
      setEmailError('Vui lòng nhập email đặt hàng');
      valid = false;
    } else if (!isValidEmail(nextEmail)) {
      setEmailError('Email không hợp lệ');
      valid = false;
    }

    if (!valid) return;

    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const data = await orderService.trackOrder(nextOrderCode, nextEmail);
      setResult(data);
    } catch (err: any) {
      const msg = err?.message ?? 'Không tìm thấy đơn hàng. Vui lòng kiểm tra lại.';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  const statusMeta = result
    ? STATUS_META[result.Status] ?? { label: result.Status, color: '#6B7280', icon: '📋' }
    : null;
  const currentStep = result ? STATUS_STEPS.indexOf(result.Status) : -1;

  return (
    <ScrollView style={styles.screen} showsVerticalScrollIndicator={false}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={22} color={AppColors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Theo dõi đơn hàng</Text>
        <View style={{ width: 22 }} />
      </View>

      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Tra cứu đơn hàng</Text>
        <View style={styles.fieldGroup}>
          <Text style={styles.label}>Mã đơn hàng</Text>
          <TextInput
            style={[styles.input, orderCodeError ? styles.inputError : null]}
            placeholder="VD: SHT2603123002"
            placeholderTextColor={AppColors.textMuted}
            value={orderCode}
            onChangeText={(text) => {
              setOrderCode(sanitizeOrderCode(text));
              setOrderCodeError('');
            }}
            autoCapitalize="characters"
            maxLength={30}
          />
          {orderCodeError ? <Text style={styles.fieldError}>{orderCodeError}</Text> : null}
        </View>
        <View style={styles.fieldGroup}>
          <Text style={styles.label}>Email đặt hàng</Text>
          <TextInput
            style={[styles.input, emailError ? styles.inputError : null]}
            placeholder="email@example.com"
            placeholderTextColor={AppColors.textMuted}
            value={email}
            onChangeText={(text) => {
              setEmail(text);
              setEmailError('');
            }}
            keyboardType="email-address"
            autoCapitalize="none"
          />
          {emailError ? <Text style={styles.fieldError}>{emailError}</Text> : null}
        </View>
        <TouchableOpacity
          style={[styles.primaryBtn, loading && styles.btnDisabled]}
          onPress={handleSearch}
          disabled={loading}
        >
          <Text style={styles.primaryBtnText}>{loading ? 'Đang tìm...' : 'Tra cứu'}</Text>
        </TouchableOpacity>
      </View>

      {error && (
        <View style={styles.errorBanner}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      )}

      {result && statusMeta && (
        <>
          <View style={[styles.statusBanner, { borderColor: statusMeta.color }]}> 
            <Text style={styles.statusIcon}>{statusMeta.icon}</Text>
            <View style={{ flex: 1 }}>
              <Text style={styles.statusLabel}>Trạng thái đơn hàng</Text>
              <Text style={styles.statusTitle}>{statusMeta.label}</Text>
              <Text style={styles.statusCode}>{result.OrderCode}</Text>
            </View>
          </View>

          {result.Status !== 'CANCELLED' && result.Status !== 'DELIVERY_FAILED' && (
            <View style={styles.card}>
              <Text style={styles.sectionTitle}>Tiến trình đơn hàng</Text>
              <View style={styles.progressRow}>
                {STATUS_STEPS.map((step, idx) => {
                  const done = idx <= currentStep;
                  const meta = STATUS_META[step];
                  return (
                    <View key={step} style={styles.progressItem}>
                      <View
                        style={[
                          styles.progressCircle,
                          done && { backgroundColor: AppColors.primary, borderColor: AppColors.primary },
                        ]}
                      >
                        <Text style={[styles.progressIcon, done && { color: '#FFF' }]}>{meta.icon}</Text>
                      </View>
                      <Text style={[styles.progressText, done && styles.progressTextActive]}>
                        {meta.label}
                      </Text>
                    </View>
                  );
                })}
              </View>
            </View>
          )}

          <View style={styles.card}>
            <Text style={styles.sectionTitle}>Thông tin đơn hàng</Text>
            <InfoRow label="Người đặt" value={result.CustomerName} />
            <InfoRow label="Người nhận" value={result.ReceiverName} />
            <InfoRow label="Điện thoại" value={result.ReceiverPhone} />
            <InfoRow label="Địa chỉ" value={result.DeliveryAddress} />
            <InfoRow label="Ngày giao" value={result.DeliveryDate ? formatDate(result.DeliveryDate) : ''} />
            <InfoRow label="Ngày đặt" value={result.CreatedAt ? formatDate(result.CreatedAt) : ''} />

            {result.TotalAmount != null && (
              <View style={styles.totalRow}>
                <Text style={styles.totalLabel}>Tổng thanh toán</Text>
                <Text style={styles.totalValue}>{formatPrice(result.TotalAmount)}</Text>
              </View>
            )}
          </View>

          {Array.isArray(result.Items) && result.Items.length > 0 && (
            <View style={styles.card}>
              <Text style={styles.sectionTitle}>Sản phẩm ({result.Items.length})</Text>
              {result.Items.map((item: any, idx: number) => (
                <View key={idx} style={styles.itemRow}>
                  <View style={styles.itemInfo}>
                    <Text style={styles.itemName} numberOfLines={1}>
                      {item.Name ?? item.ItemName ?? `Sản phẩm ${idx + 1}`}
                    </Text>
                    <Text style={styles.itemQty}>x{item.Quantity ?? 1}</Text>
                  </View>
                  {item.Price != null && (
                    <Text style={styles.itemPrice}>
                      {formatPrice(item.Price * (item.Quantity ?? 1))}
                    </Text>
                  )}
                </View>
              ))}
            </View>
          )}

          {result.GreetingMessage && (
            <View style={styles.greetingBanner}>
              <Text style={styles.greetingTitle}>Lời chúc gửi kèm 💌</Text>
              <Text style={styles.greetingText}>{`“${result.GreetingMessage}”`}</Text>
            </View>
          )}
        </>
      )}

      <View style={{ height: 30 }} />
    </ScrollView>
  );
}

function InfoRow({ label, value }: { label: string; value?: string }) {
  if (!value) return null;
  return (
    <View style={styles.infoRow}>
      <Text style={styles.infoLabel}>{label}</Text>
      <Text style={styles.infoValue}>{value}</Text>
    </View>
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

  card: {
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
  sectionTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: AppColors.text,
    marginBottom: 12,
  },
  fieldGroup: { marginBottom: Spacing.md },
  label: {
    fontSize: 11,
    fontWeight: '700',
    color: AppColors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 6,
  },
  input: {
    borderWidth: 1,
    borderColor: AppColors.border,
    borderRadius: BorderRadius.sm,
    paddingHorizontal: Spacing.md,
    paddingVertical: 12,
    fontSize: 14,
    color: AppColors.text,
  },
  inputError: {
    borderColor: AppColors.error,
  },
  fieldError: {
    fontSize: 12,
    color: AppColors.error,
    marginTop: 4,
  },
  primaryBtn: {
    backgroundColor: AppColors.primary,
    borderRadius: BorderRadius.sm,
    paddingVertical: 12,
    alignItems: 'center',
  },
  primaryBtnText: { color: '#FFF', fontSize: 14, fontWeight: '700' },
  btnDisabled: { opacity: 0.6 },

  errorBanner: {
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#FECACA',
    borderRadius: BorderRadius.sm,
    padding: Spacing.md,
    marginHorizontal: Spacing.lg,
    marginBottom: Spacing.md,
  },
  errorText: { color: AppColors.error, fontSize: 13 },

  statusBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderWidth: 1.5,
    borderRadius: BorderRadius.lg,
    marginHorizontal: Spacing.lg,
    padding: Spacing.lg,
    backgroundColor: '#FFF',
    marginBottom: Spacing.md,
  },
  statusIcon: { fontSize: 26 },
  statusLabel: { fontSize: 11, color: AppColors.textMuted, textTransform: 'uppercase', letterSpacing: 1 },
  statusTitle: { fontSize: 18, fontWeight: '800', color: AppColors.text },
  statusCode: { fontSize: 12, color: AppColors.textSecondary },

  progressRow: { flexDirection: 'row', justifyContent: 'space-between' },
  progressItem: { alignItems: 'center', flex: 1 },
  progressCircle: {
    width: 38,
    height: 38,
    borderRadius: 19,
    borderWidth: 2,
    borderColor: AppColors.border,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  progressIcon: { fontSize: 16, color: AppColors.textMuted },
  progressText: {
    fontSize: 10,
    color: AppColors.textMuted,
    textAlign: 'center',
  },
  progressTextActive: { color: AppColors.primary, fontWeight: '700' },

  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: AppColors.borderLight,
  },
  infoLabel: { fontSize: 12, color: AppColors.textSecondary },
  infoValue: { fontSize: 12, fontWeight: '600', color: AppColors.text, flex: 1, textAlign: 'right', marginLeft: 12 },

  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 10,
  },
  totalLabel: { fontSize: 13, fontWeight: '700', color: AppColors.primary, textTransform: 'uppercase', letterSpacing: 1 },
  totalValue: { fontSize: 18, fontWeight: '800', color: AppColors.primary },

  itemRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: AppColors.borderLight,
  },
  itemInfo: { flex: 1, paddingRight: 12 },
  itemName: { fontSize: 13, fontWeight: '600', color: AppColors.text },
  itemQty: { fontSize: 11, color: AppColors.textMuted },
  itemPrice: { fontSize: 13, fontWeight: '700', color: AppColors.text },

  greetingBanner: {
    backgroundColor: '#FFFBEB',
    borderWidth: 1,
    borderColor: '#FDE68A',
    borderRadius: BorderRadius.lg,
    marginHorizontal: Spacing.lg,
    padding: Spacing.lg,
    marginBottom: Spacing.md,
  },
  greetingTitle: { fontSize: 12, fontWeight: '700', color: '#92400E', marginBottom: 6 },
  greetingText: { fontSize: 13, color: '#92400E', fontStyle: 'italic' },
});
