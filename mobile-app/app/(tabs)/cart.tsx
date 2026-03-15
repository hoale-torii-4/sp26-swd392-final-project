import React, { useState, useEffect, useCallback } from 'react';
import {
    View, Text, FlatList, TouchableOpacity, StyleSheet,
    RefreshControl, Alert, Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { cartService, cartEvents, type CartDto, type CartItemDto } from '../../services/cartService';
import { AppColors, Spacing, BorderRadius } from '../../constants/theme';
import LoadingSpinner from '../../components/LoadingSpinner';

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

    const fetchCart = useCallback(async () => {
        try {
            setError(null);
            const data = await cartService.getCart();
            setCart(data);
        } catch {
            setError('Không thể tải giỏ hàng.');
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, []);

    useEffect(() => {
        fetchCart();
        const unsub = cartEvents.subscribe(fetchCart);
        return unsub;
    }, [fetchCart]);

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

    const items = cart?.Items ?? [];
    const totalAmount = cart?.TotalAmount ?? 0;
    const totalItems = cart?.TotalItems ?? 0;

    if (loading) return <LoadingSpinner />;

    const renderCartItem = ({ item }: { item: CartItemDto }) => (
        <View style={styles.cartItem}>
            <View style={styles.cartItemLeft}>
                <View style={styles.itemImagePlaceholder}>
                    <Ionicons name="gift-outline" size={28} color={AppColors.primary} />
                </View>
            </View>
            <View style={styles.cartItemRight}>
                <View style={styles.itemHeader}>
                    <View style={{ flex: 1 }}>
                        <Text style={styles.itemName} numberOfLines={2}>
                            {item.Name || 'Sản phẩm'}
                        </Text>
                        <View style={[styles.typeBadge, { backgroundColor: item.Type === 0 ? '#0F766E' : '#D97706' }]}>
                            <Text style={styles.typeBadgeText}>{getTypeLabel(item.Type)}</Text>
                        </View>
                    </View>
                    <TouchableOpacity onPress={() => handleRemove(item.Id)} style={styles.deleteBtn}>
                        <Ionicons name="trash-outline" size={18} color={AppColors.textMuted} />
                    </TouchableOpacity>
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
            </View>
        </View>
    );

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
                    />

                    {/* Sticky Footer */}
                    <View style={styles.footer}>
                        <View style={styles.footerRow}>
                            <Text style={styles.footerLabel}>Giá trị quà tặng ({totalItems})</Text>
                            <Text style={styles.footerValue}>{formatPrice(totalAmount)}</Text>
                        </View>
                        <View style={styles.footerRow}>
                            <Text style={styles.footerLabel}>Phí đóng gói & Trang trí</Text>
                            <Text style={[styles.footerValue, { color: AppColors.success }]}>Miễn phí</Text>
                        </View>
                        <View style={styles.footerDivider} />
                        <View style={styles.footerRow}>
                            <Text style={styles.footerTotalLabel}>Tổng giá trị</Text>
                            <Text style={styles.footerTotalValue}>{formatPrice(totalAmount)}</Text>
                        </View>
                        <TouchableOpacity
                            style={styles.checkoutBtn}
                            onPress={() => router.push('/checkout' as any)}
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
    deleteBtn: { padding: 4 },
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
    checkoutBtnText: { color: '#FFF', fontSize: 14, fontWeight: '700' },
});
