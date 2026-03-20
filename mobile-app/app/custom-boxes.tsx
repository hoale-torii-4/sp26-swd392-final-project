import React, { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  RefreshControl,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { AppColors } from '../constants/theme';
import { mixMatchService, type CustomBoxResponse } from '../services/mixMatchService';
import { cartService, type AddToCartRequest } from '../services/cartService';

const formatPrice = (value: number) => value.toLocaleString('vi-VN') + '\u20AB';

export default function CustomBoxesScreen() {
  const router = useRouter();
  const [boxes, setBoxes] = useState<CustomBoxResponse[]>([]);
  const [selectedIds, setSelectedIds] = useState<Record<string, boolean>>({});
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchBoxes = useCallback(async () => {
    setError(null);
    try {
      const res = await mixMatchService.getMyCustomBoxes();
      const data: CustomBoxResponse[] = Array.isArray(res)
        ? res
        : (res as any)?.Data ?? (res as any)?.data ?? [];
      setBoxes(data);
      const init: Record<string, boolean> = {};
      data.forEach((b) => {
        init[b.Id] = false;
      });
      setSelectedIds(init);
    } catch (err: any) {
      if (err?.response?.status === 404) {
        setBoxes([]);
      } else {
        setError(err?.message ?? 'Không thể tải giỏ quà custom.');
      }
    }
  }, []);

  useEffect(() => {
    (async () => {
      setLoading(true);
      await fetchBoxes();
      setLoading(false);
    })();
  }, [fetchBoxes]);

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchBoxes();
    setRefreshing(false);
  };

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const handleDelete = (boxId: string) => {
    Alert.alert('Xác nhận xóa', 'Bạn có chắc chắn muốn xóa giỏ quà này không?', [
      { text: 'Hủy', style: 'cancel' },
      {
        text: 'Xóa',
        style: 'destructive',
        onPress: async () => {
          try {
            await mixMatchService.deleteCustomBox(boxId);
            setBoxes((prev) => prev.filter((b) => b.Id !== boxId));
            setSelectedIds((prev) => {
              const next = { ...prev };
              delete next[boxId];
              return next;
            });
            Alert.alert('Thành công', 'Đã xóa giỏ quà.');
          } catch (err: any) {
            Alert.alert(
              'Lỗi',
              err?.response?.data || err?.message || 'Không thể xóa giỏ quà.',
            );
          }
        },
      },
    ]);
  };

  const handleEdit = (box: CustomBoxResponse) => {
    router.push({
      pathname: '/mix-match',
      params: {
        editBoxId: box.Id,
        items: JSON.stringify(box.Items),
      },
    });
  };

  const handleAddSelectedToCart = async () => {
    const selected = Object.entries(selectedIds)
      .filter(([, v]) => v)
      .map(([id]) => id);

    if (selected.length === 0) {
      Alert.alert('Thông báo', 'Vui lòng chọn ít nhất một giỏ quà custom.');
      return;
    }

    setSubmitting(true);
    try {
      const items: AddToCartRequest[] = selected.map((id) => ({
        Type: 1, // MIX_MATCH
        CustomBoxId: id,
        Quantity: 1,
      }));
      await cartService.addToCartBatch(items);
      // Uncheck all
      setSelectedIds((prev) => {
        const next: Record<string, boolean> = {};
        Object.keys(prev).forEach((k) => {
          next[k] = false;
        });
        return next;
      });
      Alert.alert('Thành công', 'Đã thêm ' + selected.length + ' giỏ quà vào giỏ hàng.');
    } catch (err: any) {
      Alert.alert('Lỗi', err?.message ?? 'Không thể thêm vào giỏ hàng.');
    } finally {
      setSubmitting(false);
    }
  };

  const selectedCount = Object.values(selectedIds).filter(Boolean).length;

  // --- Render ---
  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={AppColors.primary} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={22} color={AppColors.text} />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={styles.headerTitle}>Giỏ quà custom</Text>
          <Text style={styles.headerSub}>Quản lý giỏ quà tùy chọn của bạn</Text>
        </View>
      </View>

      {/* Action bar */}
      <View style={styles.actionBar}>
        <TouchableOpacity
          style={[styles.actionBtn, styles.addCartBtn, submitting && styles.actionBtnDisabled]}
          onPress={handleAddSelectedToCart}
          disabled={submitting}
        >
          <Ionicons name="cart-outline" size={16} color="#FFF" />
          <Text style={styles.actionBtnText}>
            {submitting ? 'Đang thêm...' : 'Thêm vào giỏ (' + selectedCount + ')'}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.actionBtn, styles.createBtn]}
          onPress={() => router.push('/mix-match')}
        >
          <Ionicons name="add-circle-outline" size={16} color="#FFF" />
          <Text style={styles.actionBtnText}>Tạo mới</Text>
        </TouchableOpacity>
      </View>

      {error ? (
        <View style={styles.errorBox}>
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity
            onPress={() => {
              setLoading(true);
              fetchBoxes().finally(() => setLoading(false));
            }}
            style={styles.retryBtn}
          >
            <Text style={styles.retryText}>Thử lại</Text>
          </TouchableOpacity>
        </View>
      ) : boxes.length === 0 ? (
        <View style={styles.emptyBox}>
          <Ionicons name="cube-outline" size={64} color={AppColors.textMuted} />
          <Text style={styles.emptyTitle}>Chưa có giỏ quà custom</Text>
          <Text style={styles.emptySubtitle}>Tạo giỏ quà đầu tiên từ Mix & Match!</Text>
          <TouchableOpacity
            style={[styles.actionBtn, styles.createBtn, { marginTop: 16 }]}
            onPress={() => router.push('/mix-match')}
          >
            <Ionicons name="add-circle-outline" size={16} color="#FFF" />
            <Text style={styles.actionBtnText}>Tạo giỏ quà mới</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={styles.listContainer}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={handleRefresh}
              tintColor={AppColors.primary}
            />
          }
        >
          {boxes.map((box) => (
            <View key={box.Id} style={[styles.card, selectedIds[box.Id] && styles.cardSelected]}>
              {/* Card header */}
              <View style={styles.cardHeader}>
                <TouchableOpacity onPress={() => toggleSelect(box.Id)} style={styles.checkbox}>
                  <Ionicons
                    name={selectedIds[box.Id] ? 'checkbox' : 'square-outline'}
                    size={22}
                    color={selectedIds[box.Id] ? AppColors.primary : AppColors.textMuted}
                  />
                </TouchableOpacity>
                <View style={styles.badgePill}>
                  <Text style={styles.badgeText}>{box.TotalItems} sản phẩm</Text>
                </View>
                <Text style={styles.cardPrice}>{formatPrice(box.TotalPrice)}</Text>
                <View style={{ flex: 1 }} />
                <Text style={styles.cardDate}>
                  {box.CreatedAt
                    ? new Date(box.CreatedAt).toLocaleDateString('vi-VN')
                    : '--'}
                </Text>
              </View>

              {/* Items list */}
              <View style={styles.itemsGrid}>
                {box.Items.map((item) => (
                  <View key={box.Id + '-' + item.ItemId} style={styles.itemCard}>
                    <Text style={styles.itemName} numberOfLines={2}>
                      {item.Name}
                    </Text>
                    <Text style={styles.itemMeta}>
                      SL: {item.Quantity} x {formatPrice(item.Price)}
                    </Text>
                    <Text style={styles.itemSubtotal}>{formatPrice(item.Subtotal)}</Text>
                  </View>
                ))}
              </View>

              {/* Card actions */}
              <View style={styles.cardActions}>
                <TouchableOpacity onPress={() => handleEdit(box)} style={styles.editBtn}>
                  <Ionicons name="create-outline" size={14} color="#3B82F6" />
                  <Text style={styles.editBtnText}>Sửa</Text>
                </TouchableOpacity>
                <View style={styles.divider} />
                <TouchableOpacity onPress={() => handleDelete(box.Id)} style={styles.deleteBtn}>
                  <Ionicons name="trash-outline" size={14} color="#EF4444" />
                  <Text style={styles.deleteBtnText}>Xóa</Text>
                </TouchableOpacity>
              </View>
            </View>
          ))}
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F5F5F0' },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F5F5F0',
  },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 52,
    paddingBottom: 12,
    backgroundColor: '#FFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5E0',
  },
  backBtn: { marginRight: 12, padding: 4 },
  headerTitle: { fontSize: 20, fontWeight: '700', color: AppColors.primary },
  headerSub: { fontSize: 12, color: AppColors.textMuted, marginTop: 2 },

  actionBar: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 10,
  },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 10,
    gap: 6,
  },
  actionBtnDisabled: { opacity: 0.6 },
  addCartBtn: { backgroundColor: '#1B3022' },
  createBtn: { backgroundColor: AppColors.primary },
  actionBtnText: { color: '#FFF', fontSize: 12, fontWeight: '700' },

  listContainer: { paddingHorizontal: 16, paddingBottom: 32 },

  card: {
    backgroundColor: '#FFF',
    borderRadius: 16,
    padding: 16,
    marginBottom: 14,
    borderWidth: 2,
    borderColor: 'transparent',
    elevation: 2,
  },
  cardSelected: { borderColor: AppColors.primary },

  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
    flexWrap: 'wrap',
  },
  checkbox: { marginRight: 2 },
  badgePill: {
    backgroundColor: AppColors.primary + '18',
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 20,
  },
  badgeText: { fontSize: 11, color: AppColors.primary, fontWeight: '700' },
  cardPrice: { fontSize: 14, fontWeight: '700', color: AppColors.text },
  cardDate: { fontSize: 11, color: AppColors.textMuted },

  itemsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 12,
  },
  itemCard: {
    backgroundColor: '#F9F9F5',
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: '#EFEFEA',
    width: '48%' as any,
  },
  itemName: {
    fontSize: 13,
    fontWeight: '600',
    color: AppColors.text,
    marginBottom: 4,
  },
  itemMeta: { fontSize: 11, color: AppColors.textMuted },
  itemSubtotal: {
    fontSize: 13,
    fontWeight: '700',
    color: AppColors.primary,
    marginTop: 6,
  },

  cardActions: {
    flexDirection: 'row',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: '#F0F0EA',
    paddingTop: 10,
  },
  editBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 4,
    paddingRight: 12,
  },
  editBtnText: { fontSize: 12, fontWeight: '600', color: '#3B82F6' },
  divider: {
    width: 1,
    height: 16,
    backgroundColor: '#E0E0D8',
    marginHorizontal: 4,
  },
  deleteBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 4,
    paddingLeft: 12,
  },
  deleteBtnText: { fontSize: 12, fontWeight: '600', color: '#EF4444' },

  errorBox: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  errorText: {
    fontSize: 14,
    color: '#EF4444',
    textAlign: 'center',
    marginBottom: 12,
  },
  retryBtn: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
    backgroundColor: AppColors.primary,
  },
  retryText: { color: '#FFF', fontWeight: '700' },

  emptyBox: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: AppColors.text,
    marginTop: 16,
  },
  emptySubtitle: { fontSize: 13, color: AppColors.textMuted, marginTop: 4 },
});
