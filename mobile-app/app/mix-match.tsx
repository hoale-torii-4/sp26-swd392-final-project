import React, { useState, useEffect, useMemo } from 'react';
import {
    View, Text, FlatList, TouchableOpacity, StyleSheet,
    Platform, Dimensions, ScrollView, ActivityIndicator, Alert,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import Toast from 'react-native-toast-message';
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

    // --- Validation matching backend MixMatchValidationResult ---
    const validation = useMemo(() => {
        const filledSlots = slotItems.filter(Boolean) as MixMatchItem[];
        const totalItems = filledSlots.length;
        const totalPrice = filledSlots.reduce((sum, item) => sum + (item?.Price ?? 0), 0);

        // Count by category
        const drinkCount = filledSlots.filter(i => i.Category === 'DRINK').length;
        const alcoholCount = filledSlots.filter(i => i.Category === 'ALCOHOL' || i.IsAlcohol).length;
        const beverageCount = drinkCount + alcoholCount;
        const foodCount = filledSlots.filter(i => i.Category === 'FOOD').length;
        const nutCount = filledSlots.filter(i => i.Category === 'NUT').length;
        const snackCount = foodCount + nutCount;
        const savoryCount = filledSlots.filter(i => i.Category === 'SAVORY').length;

        // Chivas rules
        const hasChivas21 = filledSlots.some(i => i.Name?.toLowerCase().includes('chivas 21') || i.Name?.toLowerCase().includes('chivas21'));
        const hasChivas12 = filledSlots.some(i => i.Name?.toLowerCase().includes('chivas 12') || i.Name?.toLowerCase().includes('chivas12'));
        const maxItemsForChivas = hasChivas21 ? 4 : hasChivas12 ? 5 : 6;

        const errors: string[] = [];
        if (totalItems < 4) errors.push(`Cần tối thiểu 4 món (hiện có ${totalItems})`);
        if (totalItems > 6) errors.push(`Tối đa 6 món (hiện có ${totalItems})`);
        if (totalItems >= 4 && beverageCount < 1) errors.push('Cần ít nhất 1 đồ uống (Trà hoặc Rượu)');
        if (totalItems >= 4 && snackCount < 2) errors.push(`Cần ít nhất 2 snack/hạt (hiện có ${snackCount})`);
        if (savoryCount > 2) errors.push(`Đặc sản mặn tối đa 2 (hiện có ${savoryCount})`);
        if (hasChivas21 && totalItems > 4) errors.push('Có Chivas 21: tối đa 4 món');
        if (hasChivas12 && !hasChivas21 && totalItems > 5) errors.push('Có Chivas 12: tối đa 5 món');

        const isValid = totalItems >= 4 && totalItems <= 6 && errors.length === 0;

        return { totalItems, totalPrice, isValid, errors, beverageCount, snackCount, savoryCount, maxItemsForChivas };
    }, [slotItems]);

    const handleAddItem = (itemId: string) => {
        const firstEmptyIndex = slots.findIndex((s) => s === null);
        if (firstEmptyIndex === -1) {
            Toast.show({
                type: 'info',
                text1: 'Hộp quà đã đầy',
                text2: 'Tối đa 6 sản phẩm.'
            });
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
        if (!validation.isValid) {
            Toast.show({
                type: 'error',
                text1: 'Chưa đạt yêu cầu',
                text2: validation.errors[0], 
                visibilityTime: 4000
            });
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
            Toast.show({
                type: 'error',
                text1: 'Lỗi',
                text2: err.message || 'Không thể lưu giỏ quà.'
            });
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
                <Text style={styles.sectionTitle}>Hộp quà của bạn ({validation.totalItems}/{validation.maxItemsForChivas})</Text>
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
                        <Text style={styles.totalValue}>{formatPrice(validation.totalPrice)}</Text>
                    </View>
                    <Text style={[styles.itemCount, { color: validation.totalItems >= 4 ? AppColors.success : AppColors.error }]}>
                        {validation.totalItems}/{validation.maxItemsForChivas} món
                    </Text>
                </View>

                {/* Validation errors */}
                {validation.errors.length > 0 && validation.totalItems > 0 && (
                    <View style={styles.validationBox}>
                        {validation.errors.map((err, idx) => (
                            <View key={idx} style={styles.validationRow}>
                                <Ionicons name="alert-circle" size={14} color={AppColors.error} />
                                <Text style={styles.validationText}>{err}</Text>
                            </View>
                        ))}
                    </View>
                )}

                <TouchableOpacity 
                    style={[styles.addToCartBtn, (!validation.isValid || submitting) && styles.btnDisabled]}
                    disabled={!validation.isValid || submitting}
                    onPress={handleAddToCart}
                >
                    {submitting 
                        ? <ActivityIndicator color="#FFF" /> 
                        : <Text style={styles.addToCartBtnText}>
                            {isEditMode ? 'Cập nhật giỏ quà' : 'Thêm vào giỏ hàng'}
                          </Text>
                    }
                </TouchableOpacity>
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
    validationBox: {
        backgroundColor: '#FEF2F2', borderRadius: 8, padding: 10, marginBottom: 12, gap: 4,
    },
    validationRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
    validationText: { fontSize: 12, color: AppColors.error, flex: 1 },
    addToCartBtn: {
        paddingVertical: 14, borderRadius: BorderRadius.md,
        backgroundColor: AppColors.primary, alignItems: 'center',
    },
    addToCartBtnText: { color: '#FFF', fontWeight: '800', fontSize: 15 },
    btnDisabled: { opacity: 0.5, backgroundColor: AppColors.textMuted },
});
