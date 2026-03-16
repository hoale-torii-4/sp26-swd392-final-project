import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Platform,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { paymentService } from '../services/paymentService';
import { Ionicons } from '@expo/vector-icons';
import { AppColors, Spacing, BorderRadius } from '../constants/theme';

function formatPrice(v: number) {
  return v.toLocaleString('vi-VN') + '₫';
}

const TIMELINE_STEPS = [
  { label: 'Chờ xác nhận\nthanh toán', icon: 'card-outline' },
  { label: 'Chuẩn bị\nhàng', icon: 'cube-outline' },
  { label: 'Đang\ngiao', icon: 'car-outline' },
  { label: 'Hoàn\ntất', icon: 'checkmark-circle-outline' },
];

export default function OrderSuccessScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ code?: string }>();
  const orderCode = (params.code ?? '').toString().toUpperCase();
  const [isPaid, setIsPaid] = useState(false);
  const [totalAmount, setTotalAmount] = useState(0);

  useEffect(() => {
    if (!orderCode) return;
    const fetchInitial = async () => {
      try {
        const status = await paymentService.checkPaymentStatus(orderCode);
        setTotalAmount(status.TotalAmount);
        setIsPaid(status.IsPaid);
      } catch {
        // ignore
      }
    };
    fetchInitial();
  }, [orderCode]);

  useEffect(() => {
    if (isPaid || !orderCode) return;
    const poll = async () => {
      try {
        const status = await paymentService.checkPaymentStatus(orderCode);
        setTotalAmount(status.TotalAmount);
        if (status.IsPaid) setIsPaid(true);
      } catch {
        // ignore
      }
    };
    poll();
    const interval = setInterval(poll, 5000);
    return () => clearInterval(interval);
  }, [orderCode, isPaid]);

  const activeStep = isPaid ? 1 : 0;

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.container}>
      <View style={styles.heroCard}>
        <View style={styles.giftIcon}>
          <Ionicons name="gift-outline" size={36} color={AppColors.primary} />
        </View>
        <Text style={styles.title}>Đặt hàng thành công!</Text>
        <Text style={styles.subtitle}>
          Cảm ơn bạn đã gửi trao thành ý cùng chúng tôi.
        </Text>
      </View>

      {orderCode ? (
        <>
          <View style={styles.infoCard}>
            <View style={styles.orderRow}>
              <View>
                <Text style={styles.orderLabel}>Mã đơn hàng</Text>
                <Text style={styles.orderCode}>#{orderCode}</Text>
              </View>
              <View
                style={[
                  styles.statusPill,
                  { backgroundColor: isPaid ? '#DCFCE7' : '#FFEDD5' },
                ]}
              >
                <Text style={[styles.statusPillText, { color: isPaid ? '#15803D' : '#C2410C' }]}>
                  {isPaid ? 'Đã xác nhận thanh toán' : 'Chờ xác nhận thanh toán'}
                </Text>
              </View>
            </View>

            {totalAmount > 0 && (
              <Text style={styles.totalAmount}>
                Tổng thanh toán: {formatPrice(totalAmount)}
              </Text>
            )}
          </View>

          <View style={styles.infoCard}>
            <Text style={styles.sectionTitle}>Hành trình đơn hàng</Text>
            <View style={styles.timelineRow}>
              {TIMELINE_STEPS.map((step, idx) => (
                <View key={step.label} style={styles.timelineItem}>
                  <View
                    style={[
                      styles.timelineCircle,
                      idx <= activeStep && styles.timelineCircleActive,
                    ]}
                  >
                    <Ionicons
                      name={step.icon as any}
                      size={18}
                      color={idx <= activeStep ? '#FFF' : AppColors.textMuted}
                    />
                  </View>
                  <Text style={[styles.timelineLabel, idx <= activeStep && styles.timelineLabelActive]}>
                    {step.label}
                  </Text>
                </View>
              ))}
            </View>
          </View>

          <View style={styles.actionGroup}>
            <TouchableOpacity
              style={styles.primaryBtn}
              onPress={() => router.replace('/(tabs)/gift-boxes' as any)}
            >
              <Text style={styles.primaryBtnText}>Tiếp tục mua sắm</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.secondaryBtn}
              onPress={() => router.push('/order-my' as any)}
            >
              <Text style={styles.secondaryBtnText}>Theo dõi đơn hàng</Text>
            </TouchableOpacity>
          </View>
        </>
      ) : (
        <View style={styles.infoCard}>
          <Text style={styles.subtitle}>Không tìm thấy mã đơn hàng.</Text>
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: AppColors.background },
  container: { padding: Spacing.lg, paddingBottom: 40 },
  heroCard: {
    backgroundColor: AppColors.surface,
    borderRadius: BorderRadius.lg,
    padding: Spacing.xl,
    alignItems: 'center',
    marginTop: Platform.OS === 'ios' ? 30 : 16,
    marginBottom: Spacing.md,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 1,
  },
  giftIcon: {
    width: 80,
    height: 80,
    borderRadius: 20,
    backgroundColor: '#F1EBDD',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  giftEmoji: { fontSize: 36 },
  title: { fontSize: 20, fontWeight: '800', color: AppColors.primary, marginBottom: 6 },
  subtitle: { fontSize: 13, color: AppColors.textSecondary, textAlign: 'center' },

  infoCard: {
    backgroundColor: AppColors.surface,
    borderRadius: BorderRadius.lg,
    padding: Spacing.lg,
    marginBottom: Spacing.md,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 3,
    elevation: 1,
  },
  orderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 12 },
  orderLabel: { fontSize: 11, color: AppColors.textMuted, textTransform: 'uppercase', letterSpacing: 1 },
  orderCode: { fontSize: 18, fontWeight: '800', color: AppColors.text },
  statusPill: { borderRadius: 999, paddingHorizontal: 10, paddingVertical: 6 },
  statusPillText: { fontSize: 10, fontWeight: '700', textTransform: 'uppercase' },
  totalAmount: { fontSize: 14, fontWeight: '700', color: AppColors.primary, marginTop: 10 },

  sectionTitle: { fontSize: 14, fontWeight: '700', color: AppColors.text, marginBottom: 12 },
  timelineRow: { flexDirection: 'row', justifyContent: 'space-between' },
  timelineItem: { flex: 1, alignItems: 'center', gap: 8 },
  timelineCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 2,
    borderColor: AppColors.border,
    justifyContent: 'center',
    alignItems: 'center',
  },
  timelineCircleActive: { backgroundColor: AppColors.primary, borderColor: AppColors.primary },
  timelineIcon: { fontSize: 16, color: AppColors.textMuted },
  timelineIconActive: { color: '#FFF' },
  timelineLabel: { fontSize: 10, color: AppColors.textMuted, textAlign: 'center' },
  timelineLabelActive: { color: AppColors.primary, fontWeight: '700' },

  actionGroup: { gap: 10 },
  primaryBtn: {
    backgroundColor: AppColors.primary,
    borderRadius: BorderRadius.sm,
    paddingVertical: 14,
    alignItems: 'center',
  },
  primaryBtnText: { color: '#FFF', fontSize: 14, fontWeight: '700' },
  secondaryBtn: {
    borderWidth: 1,
    borderColor: AppColors.primary,
    borderRadius: BorderRadius.sm,
    paddingVertical: 14,
    alignItems: 'center',
  },
  secondaryBtnText: { color: AppColors.primary, fontSize: 13, fontWeight: '700' },
});
