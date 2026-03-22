import React, { useState, useEffect, useRef } from 'react';
import {
  View, Text, ScrollView, StyleSheet, TouchableOpacity,
  Dimensions, FlatList, Platform, ActivityIndicator, Animated,
} from 'react-native';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { AppColors, Spacing, BorderRadius } from '../../constants/theme';
import ProductCard from '../../components/ProductCard';
import { productService, GiftBoxListDto } from '../../services/productService';

const { width } = Dimensions.get('window');

/* ───── Dynamic Data via API ───── */

const formatPrice = (p: number) => p.toLocaleString('vi-VN') + 'đ';

/* ───── Component ───── */
export default function HomeScreen() {
  const router = useRouter();
  const listRef = useRef<FlatList>(null);

  const [collections, setCollections] = useState<any[]>([]);
  const [products, setProducts] = useState<GiftBoxListDto[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    const fetchHomeData = async () => {
      try {
        const [colsRes, prodsRes] = await Promise.all([
          productService.getCollections(),
          productService.getGiftBoxes()
        ]);
        if (active) {
          // collections response might be nested or an array
          setCollections(colsRes && Array.isArray(colsRes) ? colsRes : (colsRes?.data || []));
          setProducts(prodsRes || []);
        }
      } catch (err) {
        console.error('Home fetch error:', err);
      } finally {
        if (active) setLoading(false);
      }
    };
    fetchHomeData();
    return () => { active = false; };
  }, []);

  // Continuous Auto-scroll hint for collections when data finishes loading
  const scrollAnim = useRef(new Animated.Value(0)).current;
  const currentOffset = useRef(0);
  const userInteracted = useRef(false);
  const resumeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const startAnimation = (startPos: number) => {
    scrollAnim.stopAnimation();
    scrollAnim.setValue(startPos);
    userInteracted.current = false;

    // Calculate approximate max scroll distance based on items count
    const itemWidth = 200; // width from styles.collectionCard
    const gap = 12; // gap from styles.collectionList
    const padding = 20; // estimated padding
    const maxScrollDist = Math.max(0, collections.length * (itemWidth + gap) + padding - width);

    if (maxScrollDist <= 0) return;

    // Fixed speed: ~20ms per pixel
    const speed = 20;

    const pingPong = (toEnd: boolean, startPosition: number) => {
      if (userInteracted.current) return;

      const targetPos = toEnd ? maxScrollDist : 0;
      const dist = Math.abs(targetPos - startPosition);
      const duration = dist * speed;

      Animated.timing(scrollAnim, {
        toValue: targetPos,
        duration: duration,
        useNativeDriver: false,
      }).start(({ finished }) => {
        if (finished && !userInteracted.current) {
          pingPong(!toEnd, targetPos);
        }
      });
    };

    // Begin traversing forward from where it left off
    pingPong(true, startPos);
  };

  useEffect(() => {
    if (!loading && collections.length > 2) {
      const listenerId = scrollAnim.addListener(({ value }) => {
        if (!userInteracted.current) {
          listRef.current?.scrollToOffset({ offset: value, animated: false });
          currentOffset.current = value; // Keep track of latest automated position
        }
      });

      // wait 1s before start initially
      resumeTimer.current = setTimeout(() => startAnimation(0), 1000);

      return () => {
        if (resumeTimer.current) clearTimeout(resumeTimer.current);
        scrollAnim.removeListener(listenerId);
        scrollAnim.stopAnimation();
      };
    }
  }, [loading, collections]);

  const handleInteractionStart = () => {
    userInteracted.current = true;
    if (resumeTimer.current) clearTimeout(resumeTimer.current);
    scrollAnim.stopAnimation();
  };

  const handleInteractionEnd = () => {
    if (resumeTimer.current) clearTimeout(resumeTimer.current);
    resumeTimer.current = setTimeout(() => {
      startAnimation(currentOffset.current);
    }, 5000);
  };

  const onScroll = (e: any) => {
    if (userInteracted.current) {
      currentOffset.current = e.nativeEvent.contentOffset.x;
    }
  };

  if (loading) {
    return (
      <View style={[styles.screen, { justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="large" color={AppColors.primary} />
      </View>
    );
  }

  return (
    <ScrollView style={styles.screen} showsVerticalScrollIndicator={false}>
      {/* ════════ HERO ════════ */}
      <View style={styles.hero}>
        <View style={styles.heroOverlay}>
          <View style={styles.heroBadge}>
            <Text style={styles.heroBadgeText}>Mừng Xuân Giáp Thìn 2026</Text>
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
        <Text style={styles.sectionTitle}>Bộ Sưu Tập Quà Tết 2026</Text>
        <Text style={styles.sectionDesc}>
          Mỗi bộ sưu tập là một câu chuyện về văn hóa truyền thống.
        </Text>

        <FlatList
          ref={listRef}
          horizontal
          showsHorizontalScrollIndicator={false}
          data={collections}
          keyExtractor={(item, index) => item?.Id?.toString() || item?.id?.toString() || item?.Name || item?.name || index.toString()}
          contentContainerStyle={styles.collectionList}
          onScroll={onScroll}
          scrollEventThrottle={16}
          onScrollBeginDrag={handleInteractionStart}
          onTouchStart={handleInteractionStart}
          onScrollEndDrag={handleInteractionEnd}
          onMomentumScrollEnd={handleInteractionEnd}
          onTouchEnd={handleInteractionEnd}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={styles.collectionCard}
              activeOpacity={0.8}
              onPress={() => router.push({ pathname: '/(tabs)/gift-boxes', params: { collectionId: item.Id || item.id } } as any)}
            >
              <View style={styles.collectionImagePlaceholder}>
                {item.CoverImage || item.Image || item.ImageUrl || item.image ? (
                  <Image
                    source={{ uri: item.CoverImage || item.Image || item.ImageUrl || item.image }}
                    style={{ width: '100%', height: '100%' }}
                    contentFit="cover"
                  />
                ) : (
                  <Text style={styles.collectionEmoji}>🎁</Text>
                )}
              </View>
              <View style={styles.collectionInfo}>
                <Text style={styles.collectionName}>{item.Name || item.name || 'Bộ Sưu Tập'}</Text>
                <Text style={styles.collectionDesc} numberOfLines={2}>
                  {item.Description || item.description || 'Khám phá bộ sưu tập quà Tết cao cấp'}
                </Text>
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
          {products.slice(0, 4).map((p) => (
            <ProductCard
              key={p.Id}
              id={p.Id}
              name={p.Name}
              price={p.Price}
              image={p.Image}
              badge={p.CollectionName || 'NỔI BẬT'}
              badgeColor={'#C0A062'}
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
        <TouchableOpacity 
          style={styles.ctaButton}
          onPress={() => router.push('/mix-match' as any)}
        >
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
