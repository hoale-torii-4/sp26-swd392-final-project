import React from 'react';
import {
  View, Text, ScrollView, StyleSheet, TouchableOpacity,
  Dimensions, FlatList, Platform,
} from 'react-native';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { AppColors, Spacing, BorderRadius } from '../../constants/theme';
import ProductCard from '../../components/ProductCard';

const { width } = Dimensions.get('window');

/* ───── Static Data (matching web FE) ───── */
const collections = [
  { name: 'Xuân Đoàn Viên', desc: 'Ấm áp tình thân, sum vầy bên tách trà thơm.' },
  { name: 'Cát Tường Phú Quý', desc: 'Lời chúc thịnh vượng và may mắn hanh thông.' },
  { name: 'Lộc Xuân Doanh Nghiệp', desc: 'Nâng tầm thương hiệu qua quà tặng đẳng cấp.' },
  { name: 'An Nhiên Tân Xuân', desc: 'Thư thái tâm hồn, khởi đầu năm mới bình an.' },
];

const products = [
  { id: '1', name: 'Hộp Quà Sum Họp', price: 1250000, badge: 'BIẾU GIA ĐÌNH', badgeColor: '#C0A062' },
  { id: '2', name: 'Hộp Quà Trường Thọ', price: 1850000, badge: 'BIẾU ÔNG BÀ', badgeColor: '#C0A062' },
  { id: '3', name: 'Hộp Quà Doanh Gia', price: 2450000, badge: 'BIẾU ĐỐI TÁC', badgeColor: '#8B1A1A' },
  { id: '4', name: 'Hộp Quà Gia Ấm', price: 1550000, badge: 'BIẾU NGƯỜI THÂN', badgeColor: '#C0A062' },
];

const formatPrice = (p: number) => p.toLocaleString('vi-VN') + 'đ';

/* ───── Component ───── */
export default function HomeScreen() {
  const router = useRouter();

  return (
    <ScrollView style={styles.screen} showsVerticalScrollIndicator={false}>
      {/* ════════ HERO ════════ */}
      <View style={styles.hero}>
        <View style={styles.heroOverlay}>
          <View style={styles.heroBadge}>
            <Text style={styles.heroBadgeText}>Mừng Xuân Giáp Thìn 2024</Text>
          </View>
          <Text style={styles.heroTitleWhite}>Trao Lộc Đầu Xuân,</Text>
          <Text style={styles.heroTitleGold}>Gói Trọn Nghĩa Tình</Text>
          <Text style={styles.heroDesc}>
            Quà Tết không chỉ là vật phẩm, mà là phong vị của sự tri ân, là lời chúc bình an
            được gói ghém tỉ mỉ.
          </Text>
          <View style={styles.heroButtons}>
            <TouchableOpacity
              style={styles.heroButtonPrimary}
              onPress={() => router.push('/(tabs)/gift-boxes' as any)}
            >
              <Text style={styles.heroButtonPrimaryText}>Khám phá bộ sưu tập</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>

      {/* ════════ COLLECTIONS ════════ */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <View style={styles.sectionLine} />
          <Text style={styles.sectionTag}>Danh mục</Text>
          <View style={styles.sectionLine} />
        </View>
        <Text style={styles.sectionTitle}>Bộ Sưu Tập Quà Tết 2024</Text>
        <Text style={styles.sectionDesc}>
          Mỗi bộ sưu tập là một câu chuyện về văn hóa truyền thống.
        </Text>

        <FlatList
          horizontal
          showsHorizontalScrollIndicator={false}
          data={collections}
          keyExtractor={(item) => item.name}
          contentContainerStyle={styles.collectionList}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={styles.collectionCard}
              activeOpacity={0.8}
              onPress={() => router.push('/(tabs)/gift-boxes' as any)}
            >
              <View style={styles.collectionImagePlaceholder}>
                <Text style={styles.collectionEmoji}>🎁</Text>
              </View>
              <View style={styles.collectionInfo}>
                <Text style={styles.collectionName}>{item.name}</Text>
                <Text style={styles.collectionDesc} numberOfLines={2}>{item.desc}</Text>
                <Text style={styles.collectionLink}>Xem bộ sưu tập →</Text>
              </View>
            </TouchableOpacity>
          )}
        />
      </View>

      {/* ════════ FEATURED PRODUCTS ════════ */}
      <View style={[styles.section, { backgroundColor: '#FAFAF8' }]}>
        <View style={styles.sectionHeader}>
          <View style={styles.sectionLine} />
          <Text style={styles.sectionTag}>Sản phẩm nổi bật</Text>
          <View style={styles.sectionLine} />
        </View>
        <Text style={styles.sectionTitle}>
          Trao <Text style={{ fontStyle: 'italic', color: AppColors.primary }}>Thịnh Vượng</Text>
        </Text>
        <Text style={styles.sectionDesc}>
          Những hộp quà được yêu thích nhất với sự kết hợp hương vị truyền thống và thiết kế hiện đại.
        </Text>

        <View style={styles.productGrid}>
          {products.map((p) => (
            <ProductCard
              key={p.id}
              id={p.id}
              name={p.name}
              price={p.price}
              image={null}
              badge={p.badge}
              badgeColor={p.badgeColor}
            />
          ))}
        </View>

        <TouchableOpacity
          style={styles.viewAllRow}
          onPress={() => router.push('/(tabs)/gift-boxes' as any)}
        >
          <Text style={styles.viewAllText}>Xem tất cả sản phẩm →</Text>
        </TouchableOpacity>
      </View>

      {/* ════════ PERSONALIZATION CTA ════════ */}
      <View style={styles.ctaSection}>
        <Text style={styles.ctaTitleWhite}>Cá nhân hóa món quà</Text>
        <Text style={styles.ctaTitleGold}>theo cách của bạn</Text>
        <View style={styles.ctaFeatures}>
          {[
            'Tự chọn món: Hơn 200+ đặc sản tuyển chọn.',
            'Tính giá tự động: Cân đối ngân sách tức thì.',
            'Phù hợp nhiều đối tượng: Từ cá nhân đến doanh nghiệp.',
          ].map((item) => (
            <View key={item} style={styles.ctaFeatureRow}>
              <Text style={styles.ctaCheckIcon}>✓</Text>
              <Text style={styles.ctaFeatureText}>{item}</Text>
            </View>
          ))}
        </View>
        <TouchableOpacity style={styles.ctaButton}>
          <Text style={styles.ctaButtonText}>Bắt đầu tạo giỏ quà →</Text>
        </TouchableOpacity>
      </View>

      {/* ════════ BRAND STORY ════════ */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <View style={styles.sectionLine} />
          <Text style={styles.sectionTag}>Thương hiệu</Text>
          <View style={styles.sectionLine} />
        </View>
        <Text style={styles.sectionTitle}>
          Câu Chuyện <Text style={{ fontStyle: 'italic', color: AppColors.primary }}>Lộc Xuân</Text>
        </Text>
        <Text style={styles.brandStoryText}>
          Lộc Xuân không chỉ là một thương hiệu quà Tết — đó là câu chuyện về sự trân trọng
          những giá trị truyền thống trong thời đại hiện đại. Mỗi chiếc hộp quà được chúng
          tôi chăm chút tỉ mỉ, mang theo lời chúc an khang và thịnh vượng.
        </Text>
        <TouchableOpacity style={styles.learnMoreRow}>
          <Text style={styles.learnMoreText}>Tìm hiểu thêm →</Text>
        </TouchableOpacity>
      </View>

      <View style={{ height: 20 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: AppColors.background },

  // Hero
  hero: {
    backgroundColor: AppColors.dark,
    paddingTop: Platform.OS === 'ios' ? 60 : 40,
    paddingBottom: 40,
    paddingHorizontal: Spacing.xl,
  },
  heroOverlay: {},
  heroBadge: {
    alignSelf: 'flex-start',
    borderWidth: 1,
    borderColor: 'rgba(192, 160, 98, 0.4)',
    borderRadius: BorderRadius.full,
    paddingHorizontal: 14,
    paddingVertical: 6,
    marginBottom: 20,
  },
  heroBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 1.5,
    color: AppColors.accent,
    textTransform: 'uppercase',
  },
  heroTitleWhite: {
    fontSize: 28,
    fontWeight: '800',
    color: '#FFF',
    fontFamily: Platform.OS === 'ios' ? 'Georgia' : 'serif',
  },
  heroTitleGold: {
    fontSize: 28,
    fontWeight: '800',
    fontStyle: 'italic',
    color: AppColors.accent,
    fontFamily: Platform.OS === 'ios' ? 'Georgia' : 'serif',
    marginBottom: 16,
  },
  heroDesc: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.7)',
    lineHeight: 22,
    marginBottom: 24,
  },
  heroButtons: { flexDirection: 'row', gap: 12 },
  heroButtonPrimary: {
    backgroundColor: AppColors.primary,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 6,
  },
  heroButtonPrimaryText: {
    color: '#FFF',
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1,
    textTransform: 'uppercase',
  },

  // Sections
  section: {
    paddingVertical: 32,
    paddingHorizontal: Spacing.lg,
    backgroundColor: '#F9F7F2',
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    marginBottom: 10,
  },
  sectionLine: {
    height: 1,
    width: 30,
    backgroundColor: AppColors.accent,
  },
  sectionTag: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 2,
    color: AppColors.primary,
    textTransform: 'uppercase',
  },
  sectionTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: AppColors.text,
    textAlign: 'center',
    marginBottom: 8,
    fontFamily: Platform.OS === 'ios' ? 'Georgia' : 'serif',
  },
  sectionDesc: {
    fontSize: 13,
    color: AppColors.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 20,
    paddingHorizontal: 10,
  },

  // Collections
  collectionList: { paddingLeft: 4, gap: 12 },
  collectionCard: {
    width: 200,
    backgroundColor: AppColors.surface,
    borderRadius: BorderRadius.lg,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 1,
  },
  collectionImagePlaceholder: {
    height: 120,
    backgroundColor: '#D9E8DE',
    justifyContent: 'center',
    alignItems: 'center',
  },
  collectionEmoji: { fontSize: 40 },
  collectionInfo: { padding: 14, alignItems: 'center' },
  collectionName: {
    fontSize: 14,
    fontWeight: '700',
    color: AppColors.text,
    marginBottom: 4,
    fontFamily: Platform.OS === 'ios' ? 'Georgia' : 'serif',
  },
  collectionDesc: {
    fontSize: 12,
    color: AppColors.textSecondary,
    textAlign: 'center',
    lineHeight: 18,
    marginBottom: 10,
  },
  collectionLink: {
    fontSize: 10,
    fontWeight: '700',
    color: AppColors.primary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },

  // Products
  productGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    paddingHorizontal: 0,
  },
  viewAllRow: { alignItems: 'center', marginTop: 10 },
  viewAllText: {
    fontSize: 12,
    fontWeight: '700',
    color: AppColors.primary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },

  // CTA Section
  ctaSection: {
    backgroundColor: AppColors.dark,
    paddingVertical: 36,
    paddingHorizontal: Spacing.xl,
  },
  ctaTitleWhite: {
    fontSize: 22,
    fontWeight: '800',
    color: '#FFF',
    fontFamily: Platform.OS === 'ios' ? 'Georgia' : 'serif',
  },
  ctaTitleGold: {
    fontSize: 22,
    fontWeight: '800',
    fontStyle: 'italic',
    color: AppColors.accent,
    fontFamily: Platform.OS === 'ios' ? 'Georgia' : 'serif',
    marginBottom: 20,
  },
  ctaFeatures: { gap: 14, marginBottom: 24 },
  ctaFeatureRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  ctaCheckIcon: { color: AppColors.accent, fontSize: 16, marginTop: 1 },
  ctaFeatureText: {
    flex: 1,
    fontSize: 13,
    color: 'rgba(255,255,255,0.85)',
    lineHeight: 20,
  },
  ctaButton: {
    backgroundColor: AppColors.accent,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 6,
    alignSelf: 'flex-start',
  },
  ctaButtonText: {
    color: AppColors.dark,
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1,
    textTransform: 'uppercase',
  },

  // Brand story
  brandStoryText: {
    fontSize: 14,
    color: AppColors.textSecondary,
    lineHeight: 22,
    marginBottom: 16,
  },
  learnMoreRow: { alignSelf: 'flex-start' },
  learnMoreText: {
    fontSize: 12,
    fontWeight: '700',
    color: AppColors.primary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
});
