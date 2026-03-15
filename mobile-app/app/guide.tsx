import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import { AppColors, Spacing, BorderRadius } from '../constants/theme';

const collectionSteps = [
  { num: '01', title: 'Chọn Bộ Sưu Tập', desc: 'Duyệt qua các bộ sưu tập quà Tết được phân loại theo chủ đề và đối tượng nhận quà.' },
  { num: '02', title: 'Chọn Sản Phẩm', desc: 'Xem chi tiết từng hộp quà trong bộ sưu tập, so sánh giá và lựa chọn phù hợp nhất.' },
  { num: '03', title: 'Thêm Vào Giỏ Hàng', desc: 'Thêm sản phẩm vào giỏ hàng, điền thông tin giao hàng và thanh toán nhanh chóng.' },
];

const customSteps = [
  { num: '01', title: 'Chọn Giỏ / Hộp Quà', desc: 'Lựa chọn kiểu giỏ hoặc hộp làm nền tảng cho món quà cá nhân hóa của bạn.' },
  { num: '02', title: 'Chọn Sản Phẩm Lẻ', desc: 'Tự do chọn từng món trong hơn 200+ đặc sản tuyển chọn để tạo nên giỏ quà riêng.' },
  { num: '03', title: 'Kiểm Tra & Thanh Toán', desc: 'Xem lại giỏ quà, điều chỉnh nếu cần và tiến hành thanh toán đơn giản.' },
];

export default function GuideScreen() {
  const router = useRouter();
  return (
    <ScrollView style={styles.screen}>
      <View style={styles.hero}>
        <Text style={styles.heroTag}>Hỗ trợ khách hàng</Text>
        <Text style={styles.heroTitle}>Hướng Dẫn Mua</Text>
        <Text style={styles.heroDesc}>
          Lộc Xuân mang đến nhiều cách để bạn lựa chọn món quà phù hợp nhất.
        </Text>
      </View>

      <Section title="Mua Quà Theo Bộ Sưu Tập" tag="Cách 1">
        {collectionSteps.map((step) => (
          <StepCard key={step.num} step={step} />
        ))}
        <TouchableOpacity
          style={[styles.primaryBtn, { marginTop: 16 }]}
          onPress={() => router.push('/(tabs)/gift-boxes' as any)}
        >
          <Text style={styles.primaryBtnText}>Xem bộ sưu tập</Text>
        </TouchableOpacity>
      </Section>

      <Section title="Tự Tạo Giỏ Quà Riêng" tag="Cách 2" dark>
        {customSteps.map((step) => (
          <StepCard key={step.num} step={step} dark />
        ))}
        <TouchableOpacity
          style={[styles.accentBtn, { marginTop: 16 }]}
          onPress={() => router.push('/(tabs)/gift-boxes' as any)}
        >
          <Text style={styles.accentBtnText}>Bắt đầu tạo giỏ quà</Text>
        </TouchableOpacity>
      </Section>

      <Section title="Thanh Toán & Giao Hàng" tag="Thông tin">
        <View style={styles.infoCard}>
          <Text style={styles.infoTitle}>Thanh toán an toàn</Text>
          <Text style={styles.infoDesc}>
            Hỗ trợ thanh toán QR Code, chuyển khoản ngân hàng và COD.
          </Text>
        </View>
        <View style={styles.infoCard}>
          <Text style={styles.infoTitle}>Giao hàng nhanh chóng</Text>
          <Text style={styles.infoDesc}>
            Đóng gói cẩn thận, giao tận nơi với đội ngũ chuyên nghiệp.
          </Text>
        </View>
      </Section>

      <Section title="Theo Dõi Đơn Hàng" tag="Đơn hàng" dark>
        <Text style={styles.sectionDesc}>
          Tra cứu đơn hàng bằng email và mã đơn hoặc đăng nhập để xem lịch sử mua hàng.
        </Text>
        <TouchableOpacity
          style={styles.primaryBtn}
          onPress={() => router.push('/order-tracking' as any)}
        >
          <Text style={styles.primaryBtnText}>Tra cứu đơn hàng</Text>
        </TouchableOpacity>
      </Section>

      <View style={{ height: 30 }} />
    </ScrollView>
  );
}

function Section({ title, tag, children, dark }: { title: string; tag: string; children: React.ReactNode; dark?: boolean }) {
  return (
    <View style={[styles.section, dark && styles.sectionDark]}>
      <Text style={[styles.sectionTag, dark && { color: AppColors.accent }]}> {tag} </Text>
      <Text style={[styles.sectionTitle, dark && { color: '#FFF' }]}>{title}</Text>
      {children}
    </View>
  );
}

function StepCard({ step, dark }: { step: { num: string; title: string; desc: string }; dark?: boolean }) {
  return (
    <View style={[styles.stepCard, dark && styles.stepCardDark]}>
      <Text style={styles.stepNum}>Bước {step.num}</Text>
      <Text style={[styles.stepTitle, dark && { color: '#FFF' }]}>{step.title}</Text>
      <Text style={[styles.stepDesc, dark && { color: 'rgba(255,255,255,0.7)' }]}>{step.desc}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: AppColors.background },
  hero: {
    paddingTop: Platform.OS === 'ios' ? 60 : 40,
    paddingBottom: 30,
    paddingHorizontal: Spacing.xl,
    backgroundColor: '#F9F7F2',
  },
  heroTag: { fontSize: 10, fontWeight: '700', color: AppColors.primary, letterSpacing: 2, textTransform: 'uppercase' },
  heroTitle: { fontSize: 26, fontWeight: '800', color: AppColors.text, marginTop: 6 },
  heroDesc: { fontSize: 13, color: AppColors.textSecondary, marginTop: 8, lineHeight: 20 },

  section: { padding: Spacing.xl, gap: 12 },
  sectionDark: { backgroundColor: AppColors.dark },
  sectionTag: { fontSize: 10, fontWeight: '700', color: AppColors.primary, letterSpacing: 2, textTransform: 'uppercase' },
  sectionTitle: { fontSize: 20, fontWeight: '800', color: AppColors.text },
  sectionDesc: { fontSize: 13, color: AppColors.textSecondary },

  stepCard: {
    backgroundColor: AppColors.surface,
    borderRadius: BorderRadius.lg,
    padding: Spacing.lg,
  },
  stepCardDark: { backgroundColor: 'rgba(255,255,255,0.08)' },
  stepNum: { fontSize: 10, fontWeight: '700', color: AppColors.accent, letterSpacing: 1.5 },
  stepTitle: { fontSize: 16, fontWeight: '700', color: AppColors.text, marginTop: 6 },
  stepDesc: { fontSize: 12, color: AppColors.textSecondary, marginTop: 6, lineHeight: 18 },

  infoCard: { backgroundColor: AppColors.surface, borderRadius: BorderRadius.lg, padding: Spacing.lg },
  infoTitle: { fontSize: 15, fontWeight: '700', color: AppColors.text, marginBottom: 6 },
  infoDesc: { fontSize: 12, color: AppColors.textSecondary, lineHeight: 18 },

  primaryBtn: {
    backgroundColor: AppColors.primary,
    paddingVertical: 12,
    borderRadius: BorderRadius.sm,
    alignItems: 'center',
  },
  primaryBtnText: { color: '#FFF', fontSize: 13, fontWeight: '700' },

  accentBtn: {
    backgroundColor: AppColors.accent,
    paddingVertical: 12,
    borderRadius: BorderRadius.sm,
    alignItems: 'center',
  },
  accentBtnText: { color: AppColors.dark, fontSize: 13, fontWeight: '700' },
});
