import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  RefreshControl,
  ActivityIndicator,
  Platform,
  StatusBar,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import Toast from 'react-native-toast-message';
import { AppColors, Spacing, BorderRadius } from '../../constants/theme';
import { mixMatchService, type CustomBoxResponse } from '../../services/mixMatchService';
import ConfirmModal from '../../components/ConfirmModal';

const formatPrice = (value: number) => value.toLocaleString('vi-VN') + '\u20AB';

export default function CustomBoxDetailScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();

  const [box, setBox] = useState<CustomBoxResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchBox = useCallback(async () => {
    if (!id) {
      setError('Mã giỏ quà không tồn tại.');
      setLoading(false);
      return;
    }

    try {
      setError(null);
      const res = await mixMatchService.getMyCustomBoxes();
      const allBoxes: CustomBoxResponse[] = Array.isArray(res)
        ? res
        : (res as any)?.Data ?? (res as any)?.data ?? [];
      
      const foundBox = allBoxes.find((b) => b.Id === id);
      if (foundBox) {
        setBox(foundBox);
      } else {
        setError('Giỏ quà không tìm thấy hoặc đã bị xóa.');
      }
    } catch (err: any) {
      setError(err?.message ?? 'Đã xảy ra lỗi khi tải chi tiết giỏ quà.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [id]);

  useEffect(() => {
    fetchBox();
  }, [fetchBox]);

  const handleRefresh = () => {
    setRefreshing(true);
    fetchBox();
  };

  const handleEdit = () => {
    if (!box) return;
    router.push({
      pathname: '/mix-match',
      params: {
        editBoxId: box.Id,
        items: JSON.stringify(box.Items),
      },
    });
  };

  if (loading) {
    return (
      <View style={[styles.centered, styles.container]}>
        <ActivityIndicator size="large" color={AppColors.primary} />
      </View>
    );
  }

  if (error || !box) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
            <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <Ionicons name="arrow-back" size={22} color={AppColors.text} />
            </TouchableOpacity>
            <View style={{ flex: 1 }}>
                <Text style={styles.headerTitle}>Chi tiết giỏ quà</Text>
            </View>
        </View>
        <View style={styles.errorBox}>
          <Ionicons name="alert-circle-outline" size={48} color={AppColors.error} />
          <Text style={styles.errorText}>{error || 'Không tìm thấy giỏ quà'}</Text>
          <TouchableOpacity onPress={() => { setLoading(true); fetchBox(); }} style={styles.retryBtn}>
            <Text style={styles.retryText}>Quay lại</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  const itemsCount = box.Items.reduce((acc, current) => acc + current.Quantity, 0);

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={22} color={AppColors.text} />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={styles.headerTitle}>Chi tiết giỏ quà</Text>
          <Text style={styles.headerSub}>Thông tin tuỳ chỉnh cấu hình</Text>
        </View>
        <TouchableOpacity onPress={handleEdit} style={styles.editBtn}>
          <Ionicons name="create-outline" size={20} color={AppColors.primary} />
        </TouchableOpacity>
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={AppColors.primary} />}
        showsVerticalScrollIndicator={false}
      >
        {/* Banner */}
        <View style={styles.bannerCard}>
            <View style={styles.bannerIcon}>
                <Ionicons name="gift" size={40} color="#D97706" />
            </View>
            <View style={{ flex: 1 }}>
                <Text style={styles.bannerTitle}>Hộp quà tự chọn</Text>
                <Text style={styles.bannerDate}>
                  Tạo ngày: {box.CreatedAt ? new Date(box.CreatedAt).toLocaleDateString('vi-VN') : '--'}
                </Text>
            </View>
        </View>

        {/* Pricing Summary */}
        <View style={styles.summaryCard}>
            <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Tổng số vật phẩm</Text>
                <Text style={styles.summaryValue}>{itemsCount} sản phẩm</Text>
            </View>
            <View style={styles.divider} />
            <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Tổng giá trị (Tạm tính)</Text>
                <Text style={styles.summaryTotal}>{formatPrice(box.TotalPrice)}</Text>
            </View>
        </View>

        {/* Items Grid */}
        <Text style={styles.sectionTitle}>Các vật phẩm có trong giỏ quà:</Text>
        <View style={styles.itemsGrid}>
            {box.Items.map((item) => (
                <TouchableOpacity 
                  key={box.Id + '-' + item.ItemId} 
                  style={styles.itemCard}
                  activeOpacity={0.7}
                  onPress={() => router.push({ pathname: '/product/[id]', params: { id: item.ItemId, type: 'item' } })}
                >
                  <View style={styles.itemImageContainer}>
                    {item.ImageUrl ? (
                      <Image source={{ uri: item.ImageUrl }} style={styles.itemImage} contentFit="cover" />
                    ) : (
                      <Ionicons name="image-outline" size={24} color={AppColors.border} />
                    )}
                  </View>
                  <View style={{ flex: 1, justifyContent: 'center' }}>
                    <Text style={styles.itemName} numberOfLines={2}>
                        {item.Name}
                    </Text>
                    <Text style={styles.itemMeta}>
                        SL: {item.Quantity} x {formatPrice(item.Price)}
                    </Text>
                    <Text style={styles.itemSubtotal}>{formatPrice(item.Subtotal)}</Text>
                  </View>
                </TouchableOpacity>
            ))}
        </View>
        <View style={{ height: Spacing.xl }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F5F5F0' },
  centered: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop:
      Platform.OS === 'ios'
        ? 50
        : (StatusBar.currentHeight ?? 0) + 12,
    paddingBottom: 16,
    paddingHorizontal: Spacing.lg,
    backgroundColor: '#FFF',
    borderBottomWidth: 1,
    borderBottomColor: AppColors.borderLight,
  },
  backBtn: {
    marginRight: 16,
    padding: 4,
  },
  editBtn: {
    padding: 8,
    backgroundColor: 'rgba(139, 26, 26, 0.08)',
    borderRadius: 8,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: AppColors.text,
  },
  headerSub: {
    fontSize: 12,
    color: AppColors.textSecondary,
    marginTop: 2,
  },
  scrollContent: {
    padding: Spacing.lg,
  },
  bannerCard: {
    backgroundColor: '#FDF3E7',
    borderRadius: BorderRadius.lg,
    padding: Spacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.lg,
    borderWidth: 1,
    borderColor: 'rgba(217, 119, 6, 0.2)',
  },
  bannerIcon: {
      width: 64,
      height: 64,
      borderRadius: 12,
      backgroundColor: '#FFF',
      justifyContent: 'center',
      alignItems: 'center',
      marginRight: 16,
      shadowColor: '#D97706',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.1,
      shadowRadius: 8,
      elevation: 2,
  },
  bannerTitle: {
      fontSize: 18,
      fontWeight: '700',
      color: '#B45309',
      marginBottom: 4,
  },
  bannerDate: {
      fontSize: 13,
      color: '#D97706',
  },
  summaryCard: {
      backgroundColor: '#FFF',
      borderRadius: BorderRadius.lg,
      padding: Spacing.lg,
      marginBottom: Spacing.xl,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.04,
      shadowRadius: 4,
      elevation: 1,
  },
  summaryRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
  },
  summaryLabel: {
      fontSize: 14,
      color: AppColors.textSecondary,
  },
  summaryValue: {
      fontSize: 14,
      fontWeight: '600',
      color: AppColors.text,
  },
  summaryTotal: {
    fontSize: 20,
    fontWeight: '800',
    color: AppColors.primary,
  },
  divider: {
      height: 1,
      backgroundColor: AppColors.borderLight,
      marginVertical: 12,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: AppColors.text,
    marginBottom: 12,
    paddingHorizontal: 4,
  },
  itemsGrid: {
    flexDirection: 'column',
  },
  itemCard: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FAFAF9',
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    marginBottom: Spacing.md,
    borderWidth: 1,
    borderColor: AppColors.borderLight,
  },
  itemImageContainer: {
    width: 60,
    height: 60,
    borderRadius: BorderRadius.sm,
    backgroundColor: '#F3F4F6',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
    overflow: 'hidden',
  },
  itemImage: {
    width: '100%',
    height: '100%',
  },
  itemName: {
    fontSize: 13,
    fontWeight: '600',
    color: AppColors.text,
    marginBottom: 4,
  },
  itemMeta: {
    fontSize: 12,
    color: AppColors.textMuted,
    marginBottom: 4,
  },
  itemSubtotal: {
    fontSize: 14,
    fontWeight: '700',
    color: AppColors.primary,
  },
  errorBox: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  errorText: {
    fontSize: 14,
    color: AppColors.error,
    textAlign: 'center',
    marginVertical: 12,
  },
  retryBtn: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    backgroundColor: 'rgba(139, 26, 26, 0.1)',
    borderRadius: 8,
  },
  retryText: {
    fontSize: 14,
    fontWeight: '600',
    color: AppColors.primary,
  },
});
