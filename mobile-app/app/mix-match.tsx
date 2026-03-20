import React, { useState, useEffect, useMemo } from 'react';
import {
    View, Text, FlatList, TouchableOpacity, StyleSheet,
    Platform, Dimensions, ScrollView, ActivityIndicator, Alert,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { mixMatchService, type MixMatchItem, type CustomBoxItemResponse } from '../services/mixMatchService';
import { cartService } from '../services/cartService';
import { AppColors, Spacing, BorderRadius } from '../constants/theme';
import LoadingSpinner from '../components/LoadingSpinner';

const { width } = Dimensions.get('window');
const ITEM_CARD_WIDTH = (width - Spacing.lg * 2 - Spacing.md) / 2;
const EMPTY_SLOTS = Array.from({ length: 6 }, () => null as string | null);

function formatPrice(v: number) {
    return v.toLocaleString('vi-VN') + '₫';
}

export default function MixMatchScreen() {
    const router = useRouter();
    const params = useLocalSearchParams<{ editBoxId?: string; items?: string }>();
    const isEditMode = !!params.editBoxId;

    const [items, setItems] = useState<MixMatchItem[]>([]);
    const [categories, setCategories] = useState<any[]>([]);
    const [selectedCategory, setSelectedCategory] = useState('all');
    
    // Initialize slots based on edit mode params if available
    const initialSlots = useMemo(() => {
        if (!isEditMode || !params.items) return [...EMPTY_SLOTS];
        try {
            const parsedItems: CustomBoxItemResponse[] = JSON.parse(params.items);
            const loadedSlots = [...EMPTY_SLOTS];
            let slotIdx = 0;
            parsedItems.forEach((it) => {
                for (let i = 0; i < it.Quantity; i++) {
                    if (slotIdx < 6) {
                        loadedSlots[slotIdx] = it.ItemId;
                        slotIdx++;
                    }
                }
            });
            return loadedSlots;
        } catch {
            return [...EMPTY_SLOTS];
        }
    }, [isEditMode, params.items]);

    const [slots, setSlots] = useState<Array<string | null>>(initialSlots);
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState('');

    useEffect(() => {
        const load = async () => {
            try {
                const [itemsRes, categoriesRes] = await Promise.all([
                    mixMatchService.getItems({ page: 1, pageSize: 50, isActive: true }),
                    mixMatchService.getCategories(),
                ]);
                setItems(Array.isArray(itemsRes) ? itemsRes : itemsRes?.Data || itemsRes?.items || []);
                setCategories(Array.isArray(categoriesRes) ? categoriesRes : categoriesRes?.Data || categoriesRes?.items || []);
            } catch (err: any) {
                setError(err.message || 'Không thể tải dữ liệu Mix & Match.');
            } finally {
                setLoading(false);
            }
        };
        load();
    }, []);

    const filteredItems = useMemo(() => {
        if (selectedCategory === 'all') return items;
        return items.filter((item) => item.Category === selectedCategory);
    }, [items, selectedCategory]);

    const slotItems = useMemo(() => {
        return slots.map((id) => items.find((entry) => entry.Id === id) ?? null);
    }, [slots, items]);

    const totals = useMemo(() => {
        const totalItems = slots.filter(Boolean).length;
        const totalPrice = slotItems.reduce((sum: number, item: MixMatchItem | null) => sum + (item?.Price ?? 0), 0);
        const isValid = totalItems >= 4 && totalItems <= 6;
        return { totalItems, totalPrice, isValid };
    }, [slots, slotItems]);

    const handleAddItem = (itemId: string) => {
        const firstEmptyIndex = slots.findIndex((s) => s === null);
        if (firstEmptyIndex === -1) {
            Alert.alert('Thông báo', 'Hộp quà đã đầy (tối đa 6 sản phẩm).');
            return;
        }
        setSlots((prev) => {
            const next = [...prev];
            next[firstEmptyIndex] = itemId;
            return next;
        });
    };

    const handleRemoveItem = (index: number) => {
        setSlots((prev) => {
            const next = [...prev];
            next[index] = null;
            return next;
        });
    };

    const buildItemsPayload = () => {
        const payload = slots
            .filter(Boolean)
            .reduce<Record<string, number>>((acc, id) => {
                if (!id) return acc;
                acc[id] = (acc[id] ?? 0) + 1;
                return acc;
            }, {});
        return Object.entries(payload).map(([ItemId, Quantity]) => ({ ItemId, Quantity }));
    };

    const handleAddToCart = async () => {
        if (totals.totalItems < 4) {
            Alert.alert('Thông báo', 'Hộp quà cần tối thiểu 4 sản phẩm.');
            return;
        }
        setSubmitting(true);
        try {
            const itemsPayload = buildItemsPayload();
            if (isEditMode && params.editBoxId) {
                await mixMatchService.updateCustomBox(params.editBoxId, itemsPayload);
                Alert.alert('Thành công', 'Đã cập nhật giỏ quà custom.', [
                    { text: 'Quay lại', onPress: () => router.back() }
                ]);
            } else {
                const customBoxId = await mixMatchService.createCustomBox(itemsPayload);
                await cartService.addToCart({ Type: 1, CustomBoxId: customBoxId, Quantity: 1 });
                Alert.alert('Thành công', 'Đã thêm giỏ quà vào giỏ hàng.', [
                    { text: 'Tiếp tục', style: 'cancel' },
                    { text: 'Tới giỏ hàng', onPress: () => router.push('/(tabs)/cart' as any) }
                ]);
            }
        } catch (err: any) {
            Alert.alert('Lỗi', err.message || 'Không thể lưu giỏ quà.');
        } finally {
            setSubmitting(false);
        }
    };

    const handleBuyNow = async () => {
        if (totals.totalItems < 4) {
            Alert.alert('Thông báo', 'Hộp quà cần tối thiểu 4 sản phẩm.');
            return;
        }
        setSubmitting(true);
        try {
            const itemsPayload = buildItemsPayload();
            let customBoxId = params.editBoxId;
            
            if (isEditMode && customBoxId) {
                await mixMatchService.updateCustomBox(customBoxId, itemsPayload);
            } else {
                customBoxId = await mixMatchService.createCustomBox(itemsPayload);
            }
            
            // Go to checkout-payment directly, passing the custom box details 
            // instead of adding it to cart and dumping the user in checkout
            router.push({
                pathname: '/checkout',
                params: {
                    buyNowItems: JSON.stringify([{
                        Id: `TEMP-${Date.now()}`, // Temporary cart-item like ID
                        Quantity: 1,
                        UnitPrice: totals.totalPrice, // We pass the subtotal here
                        Type: 1, // MIX_MATCH
                        CustomBoxId: customBoxId,
                        Name: 'Giỏ quà tự chọn'
                    }])
                }
            });
        } catch (err: any) {
            Alert.alert('Lỗi', err.message || 'Không thể tiến hành thanh toán.');
        } finally {
            setSubmitting(false);
        }
    };

    const renderItemCard = ({ item }: { item: MixMatchItem }) => (
        <TouchableOpacity 
            style={styles.itemCard}
            onPress={() => handleAddItem(item.Id)}
        >
            <View style={styles.itemImageWrap}>
                {item.Image ? (
                    <Image source={{ uri: item.Image }} style={styles.itemImage} contentFit="cover" />
                ) : (
                    <View style={styles.itemPlaceholder}><Text>🎁</Text></View>
                )}
            </View>
            <View style={styles.itemInfo}>
                <Text style={styles.itemName} numberOfLines={1}>{item.Name}</Text>
                <Text style={styles.itemPrice}>{item.Price ? formatPrice(item.Price) : '--'}</Text>
            </View>
            <TouchableOpacity style={styles.addIcon} onPress={() => handleAddItem(item.Id)}>
                <Ionicons name="add-circle" size={24} color={AppColors.primary} />
            </TouchableOpacity>
        </TouchableOpacity>
    );

    if (loading) return <LoadingSpinner />;

    return (
        <View style={styles.screen}>
            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
                    <Ionicons name="arrow-back" size={24} color="#FFF" />
                </TouchableOpacity>
                <View style={styles.headerText}>
                    <Text style={styles.headerTitle}>Mix & Match</Text>
                    <Text style={styles.headerSubtitle}>Tự tạo giỏ quà riêng (4 - 6 món)</Text>
                </View>
            </View>

            {/* Custom Box Slots (Fixed) */}
            <View style={styles.slotsSection}>
                <Text style={styles.sectionTitle}>Hộp quà của bạn ({totals.totalItems}/6)</Text>
                <View style={styles.slotsGrid}>
                    {slotItems.map((slotItem, index) => (
                        <TouchableOpacity 
                            key={`slot-${index}`}
                            style={[styles.slot, slotItem && styles.slotFilled]}
                            onPress={() => slotItem && handleRemoveItem(index)}
                        >
                            {slotItem ? (
                                <>
                                    <Image source={{ uri: slotItem.Image }} style={styles.slotImage} contentFit="cover" />
                                    <View style={styles.removeIcon}>
                                        <Ionicons name="close-circle" size={18} color={AppColors.error} />
                                    </View>
                                </>
                            ) : (
                                <Ionicons name="add" size={24} color={AppColors.textMuted} />
                            )}
                        </TouchableOpacity>
                    ))}
                </View>
            </View>

            <ScrollView stickyHeaderIndices={[0]} showsVerticalScrollIndicator={false}>
                {/* Categories Tab */}
                <View style={styles.categoriesBar}>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.categoriesContent}>
                        <TouchableOpacity
                            style={[styles.categoryTab, selectedCategory === 'all' && styles.categoryTabActive]}
                            onPress={() => setSelectedCategory('all')}
                        >
                            <Text style={[styles.categoryText, selectedCategory === 'all' && styles.categoryTextActive]}>Tất cả</Text>
                        </TouchableOpacity>
                        {categories.map((cat) => {
                            const val = cat.Value ?? cat.value;
                            const lbl = cat.Label ?? cat.label;
                            return (
                                <TouchableOpacity
                                    key={val}
                                    style={[styles.categoryTab, selectedCategory === val && styles.categoryTabActive]}
                                    onPress={() => setSelectedCategory(val)}
                                >
                                    <Text style={[styles.categoryText, selectedCategory === val && styles.categoryTextActive]}>{lbl}</Text>
                                </TouchableOpacity>
                            );
                        })}
                    </ScrollView>
                </View>

                {/* Items Grid */}
                <View style={styles.itemsSection}>
                    <View style={styles.itemsGridWrapper}>
                        {filteredItems.map((item) => (
                            <View key={item.Id} style={styles.itemCardContainer}>
                                {renderItemCard({ item })}
                            </View>
                        ))}
                    </View>
                </View>
            </ScrollView>

            {/* Bottom Actions */}
            <View style={styles.footer}>
                <View style={styles.totalRow}>
                    <View>
                        <Text style={styles.totalLabel}>Tổng tiền</Text>
                        <Text style={styles.totalValue}>{formatPrice(totals.totalPrice)}</Text>
                    </View>
                    <Text style={[styles.itemCount, { color: totals.totalItems >= 4 ? AppColors.success : AppColors.error }]}>
                        {totals.totalItems}/6 món
                    </Text>
                </View>

                <View style={styles.actionBtns}>
                    <TouchableOpacity 
                        style={[styles.cartBtn, (totals.totalItems < 4 || submitting) && styles.btnDisabled]}
                        disabled={totals.totalItems < 4 || submitting}
                        onPress={handleAddToCart}
                    >
                        {submitting ? <ActivityIndicator color={AppColors.primary} /> : <Text style={styles.cartBtnText}>Thêm vào giỏ</Text>}
                    </TouchableOpacity>
                    <TouchableOpacity 
                        style={[styles.buyBtn, (totals.totalItems < 4 || submitting) && styles.btnDisabled]}
                        disabled={totals.totalItems < 4 || submitting}
                        onPress={handleBuyNow}
                    >
                        {submitting ? <ActivityIndicator color="#FFF" /> : <Text style={styles.buyBtnText}>Mua ngay</Text>}
                    </TouchableOpacity>
                </View>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    screen: { flex: 1, backgroundColor: AppColors.background },
    header: {
        backgroundColor: AppColors.primary,
        paddingTop: Platform.OS === 'ios' ? 56 : 40,
        paddingBottom: 20,
        paddingHorizontal: Spacing.lg,
        flexDirection: 'row',
        alignItems: 'center',
    },
    backBtn: { marginRight: 15 },
    headerText: { flex: 1 },
    headerTitle: { fontSize: 20, fontWeight: '800', color: '#FFF' },
    headerSubtitle: { fontSize: 13, color: 'rgba(255,255,255,0.7)' },

    slotsSection: { padding: Spacing.lg, backgroundColor: AppColors.surface },
    sectionTitle: { fontSize: 14, fontWeight: '700', color: AppColors.text, marginBottom: 12 },
    slotsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, justifyContent: 'center' },
    slot: {
        width: 50, height: 50, borderRadius: BorderRadius.sm,
        borderWidth: 1, borderStyle: 'dashed', borderColor: AppColors.border,
        backgroundColor: AppColors.background, justifyContent: 'center', alignItems: 'center',
    },
    slotFilled: { borderStyle: 'solid', borderColor: AppColors.primary + '40', backgroundColor: '#FFF' },
    slotImage: { width: '100%', height: '100%', borderRadius: BorderRadius.sm },
    removeIcon: { position: 'absolute', top: -5, right: -5, backgroundColor: '#FFF', borderRadius: 9 },

    categoriesBar: { backgroundColor: AppColors.surface, borderBottomWidth: 1, borderBottomColor: AppColors.borderLight },
    categoriesContent: { paddingHorizontal: Spacing.lg, paddingVertical: 12, gap: 10 },
    categoryTab: {
        paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20,
        borderWidth: 1, borderColor: AppColors.border,
    },
    categoryTabActive: { backgroundColor: AppColors.primary, borderColor: AppColors.primary },
    categoryText: { fontSize: 13, color: AppColors.textSecondary, fontWeight: '600' },
    categoryTextActive: { color: '#FFF' },

    itemsSection: { padding: Spacing.lg, paddingBottom: 150 },
    itemsGridWrapper: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' },
    itemCardContainer: { width: '48%', marginBottom: Spacing.md },
    itemCard: {
        width: '100%', backgroundColor: AppColors.surface,
        borderRadius: BorderRadius.md,
        shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05, shadowRadius: 3, elevation: 2,
    },
    itemImageWrap: { width: '100%', aspectRatio: 1, backgroundColor: '#F3F4F6', borderTopLeftRadius: BorderRadius.md, borderTopRightRadius: BorderRadius.md },
    itemImage: { width: '100%', height: '100%', borderTopLeftRadius: BorderRadius.md, borderTopRightRadius: BorderRadius.md },
    itemPlaceholder: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    itemInfo: { padding: 8 },
    itemName: { fontSize: 12, fontWeight: '700', color: AppColors.text, marginBottom: 4 },
    itemPrice: { fontSize: 13, fontWeight: '800', color: AppColors.primary },
    addIcon: { position: 'absolute', bottom: 5, right: 5 },

    footer: {
        position: 'absolute', bottom: 0, left: 0, right: 0,
        backgroundColor: AppColors.surface, paddingHorizontal: Spacing.lg,
        paddingTop: 12, paddingBottom: Platform.OS === 'ios' ? 34 : 16,
        borderTopWidth: 1, borderTopColor: AppColors.borderLight,
        shadowColor: '#000', shadowOffset: { width: 0, height: -3 },
        shadowOpacity: 0.05, shadowRadius: 5, elevation: 10,
    },
    totalRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 15 },
    totalLabel: { fontSize: 12, color: AppColors.textSecondary, marginBottom: 2 },
    totalValue: { fontSize: 20, fontWeight: '900', color: AppColors.primary },
    itemCount: { fontSize: 13, fontWeight: '700' },
    actionBtns: { flexDirection: 'row', gap: 10 },
    cartBtn: {
        flex: 1, paddingVertical: 14, borderRadius: BorderRadius.md,
        borderWidth: 1.5, borderColor: AppColors.primary, alignItems: 'center',
    },
    cartBtnText: { color: AppColors.primary, fontWeight: '800', fontSize: 14 },
    buyBtn: {
        flex: 1.5, paddingVertical: 14, borderRadius: BorderRadius.md,
        backgroundColor: AppColors.primary, alignItems: 'center',
    },
    buyBtnText: { color: '#FFF', fontWeight: '800', fontSize: 14 },
    btnDisabled: { opacity: 0.5, backgroundColor: AppColors.textMuted, borderColor: AppColors.textMuted },
});
