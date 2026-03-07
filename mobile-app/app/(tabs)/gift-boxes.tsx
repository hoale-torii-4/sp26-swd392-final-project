import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
    View, Text, FlatList, TouchableOpacity, StyleSheet,
    RefreshControl, Modal, Platform, Dimensions,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { productService, type GiftBoxListDto } from '../../services/productService';
import { AppColors, Spacing, BorderRadius } from '../../constants/theme';
import LoadingSpinner from '../../components/LoadingSpinner';

const { width } = Dimensions.get('window');
const CARD_WIDTH = (width - Spacing.lg * 2 - Spacing.md) / 2;

const PRICE_RANGES = [
    { label: 'Dưới 1.000.000₫', min: 0, max: 1_000_000 },
    { label: '1.000.000₫ – 2.000.000₫', min: 1_000_000, max: 2_000_000 },
    { label: '2.000.000₫ – 3.000.000₫', min: 2_000_000, max: 3_000_000 },
    { label: 'Trên 3.000.000₫', min: 3_000_000, max: Infinity },
];

const SORT_OPTIONS = [
    { value: 'popular', label: 'Phổ biến' },
    { value: 'newest', label: 'Mới nhất' },
    { value: 'price-asc', label: 'Giá: Thấp → Cao' },
    { value: 'price-desc', label: 'Giá: Cao → Thấp' },
];

function formatPrice(v: number | undefined) {
    if (v == null) return '0₫';
    return v.toLocaleString('vi-VN') + '₫';
}

export default function GiftBoxesScreen() {
    const router = useRouter();
    const [giftBoxes, setGiftBoxes] = useState<GiftBoxListDto[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [error, setError] = useState('');

    const [selectedPriceRanges, setSelectedPriceRanges] = useState<number[]>([]);
    const [sortBy, setSortBy] = useState('popular');
    const [filterModalVisible, setFilterModalVisible] = useState(false);
    const [sortModalVisible, setSortModalVisible] = useState(false);

    const fetchData = async () => {
        try {
            setError('');
            const data = await productService.getGiftBoxes();
            setGiftBoxes(data);
        } catch {
            setError('Không thể tải danh sách giỏ quà.');
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    useEffect(() => { fetchData(); }, []);

    const onRefresh = useCallback(() => {
        setRefreshing(true);
        fetchData();
    }, []);

    const filtered = useMemo(() => {
        let items = [...giftBoxes];
        if (selectedPriceRanges.length > 0) {
            items = items.filter((gb) =>
                selectedPriceRanges.some((idx) => {
                    const r = PRICE_RANGES[idx];
                    return gb.Price >= r.min && gb.Price < r.max;
                }),
            );
        }
        switch (sortBy) {
            case 'newest': items.sort((a, b) => new Date(b.CreatedAt).getTime() - new Date(a.CreatedAt).getTime()); break;
            case 'price-asc': items.sort((a, b) => a.Price - b.Price); break;
            case 'price-desc': items.sort((a, b) => b.Price - a.Price); break;
        }
        return items;
    }, [giftBoxes, selectedPriceRanges, sortBy]);

    const togglePriceRange = (idx: number) => {
        setSelectedPriceRanges((prev) =>
            prev.includes(idx) ? prev.filter((i) => i !== idx) : [...prev, idx],
        );
    };

    const getBadge = (price: number) => {
        if (price >= 3_000_000) return { text: 'Premium', color: '#D4AF37' };
        if (price < 1_000_000) return { text: 'Best Seller', color: '#8B1A1A' };
        return null;
    };

    const renderProduct = ({ item }: { item: GiftBoxListDto }) => {
        const badge = getBadge(item.Price);
        return (
            <TouchableOpacity
                style={styles.productCard}
                activeOpacity={0.7}
                onPress={() => router.push(`/product/${item.Id}` as any)}
            >
                <View style={styles.productImageWrap}>
                    {item.Image ? (
                        <Image source={{ uri: item.Image }} style={styles.productImage} contentFit="cover" transition={300} />
                    ) : (
                        <View style={styles.productPlaceholder}>
                            <Text style={{ fontSize: 36 }}>🎁</Text>
                        </View>
                    )}
                    {badge && (
                        <View style={[styles.badge, { backgroundColor: badge.color }]}>
                            <Text style={styles.badgeText}>{badge.text}</Text>
                        </View>
                    )}
                </View>
                <View style={styles.productInfo}>
                    <Text style={styles.productName} numberOfLines={2}>{item.Name}</Text>
                    <Text style={styles.productPrice}>{formatPrice(item.Price)}</Text>
                    <View style={styles.detailBtn}>
                        <Text style={styles.detailBtnText}>Chi tiết</Text>
                    </View>
                </View>
            </TouchableOpacity>
        );
    };

    if (loading) return <LoadingSpinner />;

    return (
        <View style={styles.screen}>
            {/* Header */}
            <View style={styles.header}>
                <Text style={styles.headerTitle}>Giỏ Quà Tết</Text>
                <Text style={styles.headerDesc}>
                    Trao gửi chân tình — Đón xuân rạng rỡ
                </Text>
            </View>

            {/* Filter/Sort bar */}
            <View style={styles.controlBar}>
                <TouchableOpacity
                    style={styles.controlBtn}
                    onPress={() => setFilterModalVisible(true)}
                >
                    <Ionicons name="filter" size={16} color={AppColors.textSecondary} />
                    <Text style={styles.controlBtnText}>
                        Bộ lọc{selectedPriceRanges.length > 0 ? ` (${selectedPriceRanges.length})` : ''}
                    </Text>
                </TouchableOpacity>

                <TouchableOpacity
                    style={styles.controlBtn}
                    onPress={() => setSortModalVisible(true)}
                >
                    <Ionicons name="swap-vertical" size={16} color={AppColors.textSecondary} />
                    <Text style={styles.controlBtnText}>
                        {SORT_OPTIONS.find((s) => s.value === sortBy)?.label}
                    </Text>
                </TouchableOpacity>

                <Text style={styles.countText}>{filtered.length} sản phẩm</Text>
            </View>

            {/* Product list */}
            {error ? (
                <View style={styles.errorContainer}>
                    <Text style={styles.errorText}>{error}</Text>
                    <TouchableOpacity onPress={fetchData} style={styles.retryBtn}>
                        <Text style={styles.retryText}>Thử lại</Text>
                    </TouchableOpacity>
                </View>
            ) : filtered.length === 0 ? (
                <View style={styles.emptyContainer}>
                    <Text style={{ fontSize: 48, marginBottom: 12 }}>🔍</Text>
                    <Text style={styles.emptyText}>Không tìm thấy sản phẩm phù hợp.</Text>
                    <TouchableOpacity onPress={() => { setSelectedPriceRanges([]); setSortBy('popular'); }}>
                        <Text style={styles.retryText}>Xóa bộ lọc</Text>
                    </TouchableOpacity>
                </View>
            ) : (
                <FlatList
                    data={filtered}
                    renderItem={renderProduct}
                    keyExtractor={(item) => item.Id}
                    numColumns={2}
                    columnWrapperStyle={styles.row}
                    contentContainerStyle={styles.listContent}
                    showsVerticalScrollIndicator={false}
                    refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={AppColors.primary} />}
                />
            )}

            {/* Filter Bottom Sheet */}
            <Modal visible={filterModalVisible} animationType="slide" transparent>
                <TouchableOpacity
                    style={styles.modalOverlay}
                    activeOpacity={1}
                    onPress={() => setFilterModalVisible(false)}
                >
                    <View style={styles.modalSheet}>
                        <View style={styles.modalHandle} />
                        <Text style={styles.modalTitle}>Khoảng giá</Text>
                        {PRICE_RANGES.map((range, idx) => (
                            <TouchableOpacity
                                key={idx}
                                style={styles.filterOption}
                                onPress={() => togglePriceRange(idx)}
                            >
                                <View style={[styles.checkbox, selectedPriceRanges.includes(idx) && styles.checkboxChecked]}>
                                    {selectedPriceRanges.includes(idx) && (
                                        <Ionicons name="checkmark" size={14} color="#FFF" />
                                    )}
                                </View>
                                <Text style={styles.filterOptionText}>{range.label}</Text>
                            </TouchableOpacity>
                        ))}
                        <TouchableOpacity
                            style={styles.modalDoneBtn}
                            onPress={() => setFilterModalVisible(false)}
                        >
                            <Text style={styles.modalDoneBtnText}>Áp dụng</Text>
                        </TouchableOpacity>
                    </View>
                </TouchableOpacity>
            </Modal>

            {/* Sort Bottom Sheet */}
            <Modal visible={sortModalVisible} animationType="slide" transparent>
                <TouchableOpacity
                    style={styles.modalOverlay}
                    activeOpacity={1}
                    onPress={() => setSortModalVisible(false)}
                >
                    <View style={styles.modalSheet}>
                        <View style={styles.modalHandle} />
                        <Text style={styles.modalTitle}>Sắp xếp theo</Text>
                        {SORT_OPTIONS.map((opt) => (
                            <TouchableOpacity
                                key={opt.value}
                                style={styles.sortOption}
                                onPress={() => { setSortBy(opt.value); setSortModalVisible(false); }}
                            >
                                <Text style={[styles.sortOptionText, sortBy === opt.value && styles.sortOptionActive]}>
                                    {opt.label}
                                </Text>
                                {sortBy === opt.value && (
                                    <Ionicons name="checkmark-circle" size={20} color={AppColors.primary} />
                                )}
                            </TouchableOpacity>
                        ))}
                    </View>
                </TouchableOpacity>
            </Modal>
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
        alignItems: 'center',
    },
    headerTitle: {
        fontSize: 24,
        fontWeight: '800',
        color: '#FFF',
        fontStyle: 'italic',
        fontFamily: Platform.OS === 'ios' ? 'Georgia' : 'serif',
        marginBottom: 6,
    },
    headerDesc: {
        fontSize: 13,
        color: 'rgba(255,255,255,0.8)',
    },

    controlBar: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: Spacing.lg,
        paddingVertical: Spacing.md,
        gap: 8,
    },
    controlBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderWidth: 1,
        borderColor: AppColors.border,
        borderRadius: BorderRadius.sm,
        backgroundColor: AppColors.surface,
    },
    controlBtnText: {
        fontSize: 12,
        color: AppColors.textSecondary,
        fontWeight: '500',
    },
    countText: {
        flex: 1,
        textAlign: 'right',
        fontSize: 12,
        color: AppColors.textMuted,
    },

    row: { justifyContent: 'space-between' },
    listContent: { paddingHorizontal: Spacing.lg, paddingBottom: 20 },

    productCard: {
        width: CARD_WIDTH,
        backgroundColor: AppColors.surface,
        borderRadius: BorderRadius.lg,
        overflow: 'hidden',
        marginBottom: Spacing.md,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.06,
        shadowRadius: 4,
        elevation: 2,
    },
    productImageWrap: {
        width: '100%',
        aspectRatio: 1,
        backgroundColor: '#E8E8E4',
    },
    productImage: { width: '100%', height: '100%' },
    productPlaceholder: {
        flex: 1, justifyContent: 'center', alignItems: 'center',
    },
    badge: {
        position: 'absolute', top: 8, left: 8,
        paddingHorizontal: 8, paddingVertical: 3, borderRadius: 4,
    },
    badgeText: {
        color: '#FFF', fontSize: 9, fontWeight: '800', letterSpacing: 0.5, textTransform: 'uppercase',
    },
    productInfo: { padding: Spacing.md },
    productName: {
        fontSize: 12, fontWeight: '700', color: AppColors.text,
        textTransform: 'uppercase', letterSpacing: 0.3, marginBottom: 4, minHeight: 32,
    },
    productPrice: {
        fontSize: 16, fontWeight: '800', color: AppColors.primary, marginBottom: 10,
    },
    detailBtn: {
        borderWidth: 1.5, borderColor: AppColors.primary, borderRadius: BorderRadius.sm,
        paddingVertical: 8, alignItems: 'center',
    },
    detailBtnText: {
        fontSize: 11, fontWeight: '700', color: AppColors.primary,
        textTransform: 'uppercase', letterSpacing: 1,
    },

    errorContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 40 },
    errorText: { fontSize: 14, color: AppColors.error, textAlign: 'center', marginBottom: 10 },
    retryBtn: { marginTop: 8 },
    retryText: { fontSize: 13, fontWeight: '600', color: AppColors.primary },

    emptyContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 40 },
    emptyText: { fontSize: 14, color: AppColors.textSecondary, marginBottom: 10 },

    // Modals
    modalOverlay: {
        flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end',
    },
    modalSheet: {
        backgroundColor: AppColors.surface, borderTopLeftRadius: 20, borderTopRightRadius: 20,
        paddingHorizontal: Spacing.xl, paddingBottom: 40, paddingTop: 12,
    },
    modalHandle: {
        width: 36, height: 4, backgroundColor: AppColors.border,
        borderRadius: 2, alignSelf: 'center', marginBottom: 20,
    },
    modalTitle: {
        fontSize: 16, fontWeight: '700', color: AppColors.text, marginBottom: 16,
    },
    filterOption: {
        flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12,
        borderBottomWidth: 1, borderBottomColor: AppColors.borderLight,
    },
    checkbox: {
        width: 22, height: 22, borderRadius: 4, borderWidth: 1.5, borderColor: AppColors.border,
        justifyContent: 'center', alignItems: 'center',
    },
    checkboxChecked: {
        backgroundColor: AppColors.primary, borderColor: AppColors.primary,
    },
    filterOptionText: { fontSize: 14, color: AppColors.text },
    modalDoneBtn: {
        backgroundColor: AppColors.primary, borderRadius: BorderRadius.sm,
        paddingVertical: 14, alignItems: 'center', marginTop: 20,
    },
    modalDoneBtnText: { color: '#FFF', fontSize: 14, fontWeight: '700' },

    sortOption: {
        flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
        paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: AppColors.borderLight,
    },
    sortOptionText: { fontSize: 14, color: AppColors.text },
    sortOptionActive: { color: AppColors.primary, fontWeight: '700' },
});
