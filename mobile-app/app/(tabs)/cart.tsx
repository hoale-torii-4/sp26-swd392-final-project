import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
    View, Text, FlatList, TouchableOpacity, StyleSheet,
    RefreshControl, Alert, Platform,
} from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Swipeable } from 'react-native-gesture-handler';
import { cartService, cartEvents, type CartDto, type CartItemDto } from '../../services/cartService';
import { mixMatchService } from '../../services/mixMatchService';
import { AppColors, Spacing, BorderRadius } from '../../constants/theme';
import LoadingSpinner from '../../components/LoadingSpinner';

const EMPTY_ITEMS: CartItemDto[] = [];

function formatPrice(v: number) {
    return v.toLocaleString('vi-VN') + '₫';
}

function getTypeLabel(type: number) {
    return type === 0 ? 'GIỎ QUÀ CÓ SẴN' : 'TỰ CHỈNH RIÊNG';
}

export default function CartScreen() {
    const router = useRouter();
    const [cart, setCart] = useState<CartDto | null>(null);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
    const [selectionTouched, setSelectionTouched] = useState(false);
    const [activeCustomBoxIds, setActiveCustomBoxIds] = useState<Set<string>>(new Set());

    const fetchCart = useCallback(async () => {
        try {
            setError(null);
            const [data, boxes] = await Promise.all([
                cartService.getCart(),
                mixMatchService.getMyCustomBoxes().catch(() => [])
            ]);
            setCart(data);
            
            const boxData = Array.isArray(boxes) ? boxes : (boxes as any)?.Data ?? [];
            const ids = new Set<string>(boxData.map((b: any) => b.Id));
            setActiveCustomBoxIds(ids);
        } catch {
            setError('Không thể tải giỏ hàng.');
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, []);

    useFocusEffect(
        useCallback(() => {
            fetchCart();
            const unsub = cartEvents.subscribe(fetchCart);
            return unsub;
        }, [fetchCart])
    );

    const onRefresh = useCallback(() => {
        setRefreshing(true);
        fetchCart();
    }, [fetchCart]);

    const handleQuantityChange = async (itemId: string, currentQty: number, delta: number) => {
        const newQty = currentQty + delta;
        if (newQty < 1) return;
        try {
            const updated = await cartService.updateQuantity(itemId, newQty);
            setCart(updated);
        } catch { /* silently fail */ }
    };

    const handleRemove = (itemId: string) => {
        Alert.alert(
            'Xóa sản phẩm',
            'Bạn có chắc muốn xóa sản phẩm này khỏi giỏ hàng?',
            [
                { text: 'Hủy', style: 'cancel' },
                {
                    text: 'Xóa', style: 'destructive',
                    onPress: async () => {
                        try {
                            await cartService.removeItem(itemId);
                            await fetchCart();
                        } catch { /* silently fail */ }
                    },
                },
            ],
        );
    };

    const items = useMemo(() => cart?.Items ?? EMPTY_ITEMS, [cart?.Items]);

    const selectableItems = useMemo(() => {
        return items.filter(i => !(i.Type === 1 && i.CustomBoxId && !activeCustomBoxIds.has(i.CustomBoxId)));
    }, [items, activeCustomBoxIds]);

    useEffect(() => {
        setSelectedIds((prev) => {
            const itemIds = selectableItems.map((item) => item.Id);
            if (!selectionTouched) {
                return new Set(itemIds);
            }
            const itemIdSet = new Set(itemIds);
            const next = new Set<string>();
            prev.forEach((id) => {
                if (itemIdSet.has(id)) next.add(id);
            });
            return next;
        });
    }, [selectableItems, selectionTouched]);

    const selectedItems = useMemo(
        () => items.filter((item) => selectedIds.has(item.Id)),
        [items, selectedIds],
    );
    const selectedTotalAmount = useMemo(
        () => selectedItems.reduce((sum, item) => sum + item.UnitPrice * item.Quantity, 0),
        [selectedItems],
    );
    const selectedCount = selectedItems.length;
    const isAllSelected = selectableItems.length > 0 && selectedCount === selectableItems.length;

    const toggleSelectItem = (itemId: string) => {
        setSelectionTouched(true);
        setSelectedIds((prev) => {
            const next = new Set(prev);
            if (next.has(itemId)) next.delete(itemId);
            else next.add(itemId);
            return next;
        });
    };

    const toggleSelectAll = () => {
        setSelectionTouched(true);
        setSelectedIds(isAllSelected ? new Set() : new Set(selectableItems.map((item) => item.Id)));
    };

    const renderRightActions = (itemId: string) => (
        <View style={styles.swipeActions}>
            <TouchableOpacity onPress={() => handleRemove(itemId)} style={styles.swipeDeleteBtn}>
                <Ionicons name="trash-outline" size={20} color="#FFF" />
                <Text style={styles.swipeDeleteText}>Xóa</Text>
            </TouchableOpacity>
        </View>
    );

    if (loading) return <LoadingSpinner />;

    const renderCartItem = ({ item }: { item: CartItemDto }) => {
        const isCustomBox = item.Type === 1;
        const isDisabledCustomBox = Boolean(isCustomBox && item.CustomBoxId && !activeCustomBoxIds.has(item.CustomBoxId));

        return (
        <Swipeable renderRightActions={() => renderRightActions(item.Id)} overshootRight={false}>
            <View style={[styles.cartItem, isDisabledCustomBox && { opacity: 0.5 }]}>
                <TouchableOpacity 
                    onPress={() => !isDisabledCustomBox && toggleSelectItem(item.Id)} 
                    style={styles.selectBox}
                    disabled={isDisabledCustomBox}
                >
                    <Ionicons
                        name={selectedIds.has(item.Id) ? 'checkbox-outline' : 'square-outline'}
                        size={22}
                        color={isDisabledCustomBox ? AppColors.border : (selectedIds.has(item.Id) ? AppColors.primary : AppColors.textMuted)}
                    />
                </TouchableOpacity>
                <View style={styles.cartItemLeft}>
                    <View style={styles.itemImagePlaceholder}>
                        <Ionicons name="gift-outline" size={28} color={AppColors.primary} />
                    </View>
                </View>
                <TouchableOpacity 
                    style={styles.cartItemRight}
                    activeOpacity={isCustomBox && !isDisabledCustomBox ? 0.7 : 1}
                    disabled={isDisabledCustomBox}
                    onPress={() => {
                        if (isCustomBox && !isDisabledCustomBox) {
                            // The user asked to be able to view details, we can navigate to custom-boxes
                            router.push('/custom-boxes' as any);
                        }
                    }}
                >
                    <View style={styles.itemHeader}>
                        <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center' }}>
                            <View style={{ flex: 1 }}>
                                <Text style={styles.itemName} numberOfLines={2}>
                                    {item.Name || 'Sản phẩm'} {isDisabledCustomBox && '(Đã Xoá)'}
                                </Text>
                                <View style={[styles.typeBadge, { backgroundColor: item.Type === 0 ? '#0F766E' : '#D97706' }]}>
                                    <Text style={styles.typeBadgeText}>{getTypeLabel(item.Type)}</Text>
                                </View>
                            </View>
                            {item.Type === 1 && (
                                <Ionicons name="chevron-forward" size={16} color={AppColors.textMuted} />
                            )}
                        </View>
                    </View>
                    <Text style={styles.unitPrice}>Đơn giá: {formatPrice(item.UnitPrice)}</Text>
                    <View style={styles.itemFooter}>
                        <View style={styles.qtyControl}>
                            <TouchableOpacity
                                style={[styles.qtyBtn, item.Quantity <= 1 && styles.qtyBtnDisabled]}
                                onPress={() => handleQuantityChange(item.Id, item.Quantity, -1)}
                                disabled={item.Quantity <= 1}
                            >
                                <Ionicons name="remove" size={16} color={item.Quantity <= 1 ? AppColors.textMuted : AppColors.text} />
                            </TouchableOpacity>
                            <Text style={styles.qtyText}>{item.Quantity}</Text>
                            <TouchableOpacity
                                style={styles.qtyBtn}
                                onPress={() => handleQuantityChange(item.Id, item.Quantity, 1)}
                            >
                                <Ionicons name="add" size={16} color={AppColors.text} />
                            </TouchableOpacity>
                        </View>
                        <Text style={styles.itemTotal}>{formatPrice(item.UnitPrice * item.Quantity)}</Text>
                    </View>
                </TouchableOpacity>
            </View>
        </Swipeable>
        );
    };

    return (
        <View style={styles.screen}>
            {/* Header */}
            <View style={styles.header}>
                <Text style={styles.headerTitle}>Giỏ hàng</Text>
                <Text style={styles.headerDesc}>
                    Gói trọn chân tình qua từng thức quà trân quý.
                </Text>
            </View>

            {error ? (
                <View style={styles.centerContainer}>
                    <Ionicons name="alert-circle-outline" size={48} color={AppColors.error} style={{ marginBottom: 10 }} />
                    <Text style={styles.errorText}>{error}</Text>
                    <TouchableOpacity onPress={() => { setLoading(true); fetchCart(); }} style={styles.retryBtn}>
                        <Text style={styles.retryText}>Thử lại</Text>
                    </TouchableOpacity>
                </View>
            ) : items.length === 0 ? (
                <View style={styles.centerContainer}>
                    <Ionicons name="cart-outline" size={64} color={AppColors.border} style={{ marginBottom: 12 }} />
                    <Text style={styles.emptyTitle}>Giỏ hàng trống</Text>
                    <Text style={styles.emptyDesc}>Hãy khám phá bộ sưu tập quà Tết sang trọng!</Text>
                    <TouchableOpacity
                        style={styles.exploreBtnContainer}
                        onPress={() => router.push('/(tabs)/gift-boxes' as any)}
                    >
                        <Text style={styles.exploreBtnText}>Khám phá giỏ quà →</Text>
                    </TouchableOpacity>
                </View>
            ) : (
                <>
                    <FlatList
                        data={items}
                        renderItem={renderCartItem}
                        keyExtractor={(item) => item.Id}
                        contentContainerStyle={styles.listContent}
                        showsVerticalScrollIndicator={false}
                        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={AppColors.primary} />}
                        ListHeaderComponent={(
                            <View style={styles.selectAllRow}>
                                <TouchableOpacity onPress={toggleSelectAll} style={styles.selectAllLeft}>
                                    <Ionicons
                                        name={isAllSelected ? 'checkbox-outline' : 'square-outline'}
                                        size={22}
                                        color={isAllSelected ? AppColors.primary : AppColors.textMuted}
                                    />
                                    <Text style={styles.selectAllText}>Chọn tất cả</Text>
                                </TouchableOpacity>
                                <Text style={styles.selectedCountText}>Đã chọn {selectedCount}/{items.length}</Text>
                            </View>
                        )}
                    />

                    {/* Sticky Footer */}
                    <View style={styles.footer}>
                        <View style={styles.footerRow}>
                            <Text style={styles.footerLabel}>Giá trị quà tặng ({selectedCount})</Text>
                            <Text style={styles.footerValue}>{formatPrice(selectedTotalAmount)}</Text>
                        </View>
                        <View style={styles.footerRow}>
                            <Text style={styles.footerLabel}>Phí đóng gói & Trang trí</Text>
                            <Text style={[styles.footerValue, { color: AppColors.success }]}>Miễn phí</Text>
                        </View>
                        <View style={styles.footerDivider} />
                        <View style={styles.footerRow}>
                            <Text style={styles.footerTotalLabel}>Tổng giá trị</Text>
                            <Text style={styles.footerTotalValue}>{formatPrice(selectedTotalAmount)}</Text>
                        </View>
                        <TouchableOpacity
                            style={[styles.checkoutBtn, selectedCount === 0 && styles.checkoutBtnDisabled]}
                            onPress={() => {
                                if (selectedCount === 0) return;
                                router.push({
                                    pathname: '/checkout' as any,
                                    params: {
                                        selectedItems: JSON.stringify(selectedItems),
                                    },
                                });
                            }}
                            disabled={selectedCount === 0}
                        >
                            <Text style={styles.checkoutBtnText}>Thanh toán</Text>
                            <Ionicons name="arrow-forward" size={16} color="#FFF" />
                        </TouchableOpacity>
                    </View>
                </>
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    screen: { flex: 1, backgroundColor: AppColors.background },
    header: {
        paddingTop: Platform.OS === 'ios' ? 56 : 40,
        paddingBottom: 16,
        paddingHorizontal: Spacing.lg,
    },
    headerTitle: {
        fontSize: 26,
        fontWeight: '800',
        fontStyle: 'italic',
        color: AppColors.primary,
        fontFamily: Platform.OS === 'ios' ? 'Georgia' : 'serif',
        marginBottom: 4,
    },
    headerDesc: {
        fontSize: 13,
        color: AppColors.textSecondary,
        lineHeight: 19,
    },
    listContent: { paddingHorizontal: Spacing.lg, paddingBottom: 10 },
    selectAllRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingVertical: 8,
        marginBottom: 6,
    },
    selectAllLeft: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    selectAllText: { fontSize: 13, color: AppColors.text, fontWeight: '600' },
    selectedCountText: { fontSize: 12, color: AppColors.textMuted },

    cartItem: {
        flexDirection: 'row',
        backgroundColor: AppColors.surface,
        borderRadius: BorderRadius.lg,
        padding: Spacing.md,
        marginBottom: Spacing.md,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.04,
        shadowRadius: 3,
        elevation: 1,
    },
    selectBox: { paddingRight: 10, justifyContent: 'center' },
    cartItemLeft: { marginRight: 12 },
    itemImagePlaceholder: {
        width: 70, height: 70, borderRadius: BorderRadius.md,
        backgroundColor: '#F3F4F6', justifyContent: 'center', alignItems: 'center',
    },
    cartItemRight: { flex: 1 },
    itemHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 },
    itemName: { fontSize: 14, fontWeight: '700', color: AppColors.text, marginBottom: 4 },
    typeBadge: { alignSelf: 'flex-start', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 3 },
    typeBadgeText: { fontSize: 8, fontWeight: '800', color: '#FFF', letterSpacing: 0.5 },
    unitPrice: { fontSize: 11, color: AppColors.textMuted, marginTop: 4, marginBottom: 8 },
    itemFooter: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
    qtyControl: {
        flexDirection: 'row', alignItems: 'center',
        borderWidth: 1, borderColor: AppColors.border, borderRadius: BorderRadius.sm,
    },
    qtyBtn: { width: 32, height: 32, justifyContent: 'center', alignItems: 'center' },
    qtyBtnDisabled: { opacity: 0.3 },
    qtyText: { width: 30, textAlign: 'center', fontSize: 14, fontWeight: '600', color: AppColors.text },
    itemTotal: { fontSize: 16, fontWeight: '800', color: AppColors.primary },
    swipeActions: {
        justifyContent: 'center',
        alignItems: 'flex-end',
        paddingRight: Spacing.lg,
    },
    swipeDeleteBtn: {
        backgroundColor: AppColors.error,
        borderRadius: BorderRadius.sm,
        paddingHorizontal: 16,
        paddingVertical: 10,
        alignItems: 'center',
        justifyContent: 'center',
        gap: 4,
    },
    swipeDeleteText: { color: '#FFF', fontSize: 12, fontWeight: '700' },

    centerContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 40 },
    errorText: { fontSize: 14, color: AppColors.error, textAlign: 'center', marginBottom: 8 },
    retryBtn: { marginTop: 4 },
    retryText: { fontSize: 13, fontWeight: '600', color: AppColors.primary },
    emptyTitle: { fontSize: 18, fontWeight: '700', color: AppColors.text, marginBottom: 6 },
    emptyDesc: { fontSize: 13, color: AppColors.textSecondary, textAlign: 'center', marginBottom: 20 },
    exploreBtnContainer: {
        backgroundColor: AppColors.primary, borderRadius: BorderRadius.sm,
        paddingHorizontal: 20, paddingVertical: 12,
    },
    exploreBtnText: { color: '#FFF', fontSize: 13, fontWeight: '700' },

    footer: {
        backgroundColor: AppColors.surface,
        borderTopWidth: 1, borderTopColor: AppColors.borderLight,
        paddingHorizontal: Spacing.xl, paddingTop: Spacing.lg,
        paddingBottom: Platform.OS === 'ios' ? 34 : 20,
    },
    footerRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 },
    footerLabel: { fontSize: 13, color: AppColors.textSecondary },
    footerValue: { fontSize: 13, fontWeight: '600', color: AppColors.text },
    footerDivider: { height: 1, backgroundColor: AppColors.border, marginVertical: 10 },
    footerTotalLabel: { fontSize: 11, fontWeight: '700', color: AppColors.primary, textTransform: 'uppercase', letterSpacing: 1 },
    footerTotalValue: { fontSize: 20, fontWeight: '800', color: AppColors.primary },
    checkoutBtn: {
        backgroundColor: AppColors.primary, borderRadius: BorderRadius.sm,
        paddingVertical: 14, flexDirection: 'row',
        justifyContent: 'center', alignItems: 'center', gap: 6, marginTop: 14,
    },
    checkoutBtnDisabled: { opacity: 0.6 },
    checkoutBtnText: { color: '#FFF', fontSize: 14, fontWeight: '700' },
});





