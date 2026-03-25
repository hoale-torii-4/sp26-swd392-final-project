import React, { useEffect, useState } from 'react';
import {
    View, Text, StyleSheet, FlatList, TouchableOpacity,
    RefreshControl, Alert, Modal, TextInput, ScrollView, Image,
} from 'react-native';
import { AppColors, BorderRadius, Spacing } from '../../constants/theme';
import { adminService } from '../../services/adminService';

const STOCK_STATUS_LABEL: Record<string, string> = {
    IN_STOCK: 'Còn hàng',
    LOW_STOCK: 'Sắp hết',
    OUT_OF_STOCK: 'Hết hàng',
};

const STOCK_STATUS_COLOR: Record<string, { bg: string; text: string }> = {
    IN_STOCK: { bg: '#D1FAE5', text: '#065F46' },
    LOW_STOCK: { bg: '#FEF3C7', text: '#92400E' },
    OUT_OF_STOCK: { bg: '#FEE2E2', text: '#991B1B' },
};

export default function AdminInventoryScreen() {
    const [items, setItems] = useState<any[]>([]);
    const [summary, setSummary] = useState<any>(null);
    const [total, setTotal] = useState(0);
    const [page, setPage] = useState(1);
    const [search, setSearch] = useState('');
    const [stockFilter, setStockFilter] = useState('');
    const [loading, setLoading] = useState(false);

    // Adjust modal
    const [adjustItem, setAdjustItem] = useState<any>(null);
    const [adjustQty, setAdjustQty] = useState('');
    const [adjustNote, setAdjustNote] = useState('');
    const [adjusting, setAdjusting] = useState(false);

    const pageSize = 20;

    const fetchItems = async () => {
        setLoading(true);
        try {
            const res = await adminService.getInventory({
                search: search || undefined,
                stockStatus: stockFilter || undefined,
                page, pageSize,
            });
            setItems(res?.Data ?? []);
            setTotal(res?.TotalItems ?? 0);
        } catch { setItems([]); }
        finally { setLoading(false); }
    };

    const fetchSummary = async () => {
        try { const s = await adminService.getInventorySummary(); setSummary(s); }
        catch { /* ignore */ }
    };

    useEffect(() => { fetchSummary(); }, []);
    useEffect(() => { fetchItems(); }, [page, search, stockFilter]);

    const handleAdjust = async () => {
        const qty = parseInt(adjustQty);
        if (!adjustItem || !qty) return;
        setAdjusting(true);
        try {
            await adminService.adjustInventory({
                ItemId: adjustItem.Id,
                AdjustType: qty > 0 ? 'INCREASE' : 'DECREASE',
                Quantity: Math.abs(qty),
                Reason: adjustNote || undefined,
            });
            setAdjustItem(null); setAdjustQty(''); setAdjustNote('');
            fetchItems(); fetchSummary();
        } catch (e: any) { Alert.alert('Lỗi', e?.message || 'Không thể điều chỉnh'); }
        finally { setAdjusting(false); }
    };

    const totalPages = Math.ceil(total / pageSize);
    const stockFilters = ['', 'IN_STOCK', 'LOW_STOCK', 'OUT_OF_STOCK'];

    return (
        <View style={styles.screen}>
            <View style={styles.header}>
                <Text style={styles.title}>Kho hàng</Text>
                <Text style={styles.subtitle}>{total} sản phẩm</Text>
            </View>

            <FlatList
                data={items}
                keyExtractor={(item) => item.Id}
                refreshControl={<RefreshControl refreshing={loading} onRefresh={() => { fetchItems(); fetchSummary(); }} />}
                contentContainerStyle={styles.listContent}
                ListHeaderComponent={
                    <View>
                        {/* Summary cards */}
                        {summary && (
                            <View style={styles.summaryRow}>
                                <SummaryCard label="Tổng" value={summary.TotalItems} color="#3B82F6" />
                                <SummaryCard label="Còn hàng" value={summary.InStock} color="#059669" />
                                <SummaryCard label="Sắp hết" value={summary.LowStock} color="#D97706" />
                                <SummaryCard label="Hết hàng" value={summary.OutOfStock} color="#DC2626" />
                            </View>
                        )}

                        {/* Search */}
                        <TextInput
                            style={styles.searchInput}
                            placeholder="Tìm sản phẩm..."
                            value={search}
                            onChangeText={v => { setSearch(v); setPage(1); }}
                        />

                        {/* Stock filter */}
                        <View style={styles.filterRow}>
                            {stockFilters.map(f => (
                                <TouchableOpacity
                                    key={f}
                                    style={[styles.filterChip, stockFilter === f && styles.filterChipActive]}
                                    onPress={() => { setStockFilter(f); setPage(1); }}
                                >
                                    <Text style={[styles.filterText, stockFilter === f && styles.filterTextActive]}>
                                        {f ? STOCK_STATUS_LABEL[f] : 'Tất cả'}
                                    </Text>
                                </TouchableOpacity>
                            ))}
                        </View>
                    </View>
                }
                renderItem={({ item }) => {
                    const statusColor = STOCK_STATUS_COLOR[item.StockStatus] ?? { bg: '#F3F4F6', text: '#6B7280' };
                    return (
                        <View style={styles.card}>
                            <View style={styles.cardRow}>
                                {item.Image ? <Image source={{ uri: item.Image }} style={styles.thumb} /> : null}
                                <View style={{ flex: 1 }}>
                                    <Text style={styles.cardTitle}>{item.Name}</Text>
                                    <Text style={styles.cardCategory}>{item.CategoryLabel || item.Category}</Text>
                                </View>
                                <View style={{ alignItems: 'flex-end' }}>
                                    <Text style={[
                                        styles.stockQty,
                                        { color: item.StockQuantity <= 0 ? '#DC2626' : item.StockQuantity <= 10 ? '#D97706' : AppColors.text }
                                    ]}>
                                        {item.StockQuantity}
                                    </Text>
                                    <View style={[styles.badge, { backgroundColor: statusColor.bg }]}>
                                        <Text style={[styles.badgeText, { color: statusColor.text }]}>
                                            {item.StockStatusLabel || STOCK_STATUS_LABEL[item.StockStatus] || item.StockStatus}
                                        </Text>
                                    </View>
                                </View>
                            </View>
                            <TouchableOpacity
                                style={styles.adjustBtn}
                                onPress={() => { setAdjustItem(item); setAdjustQty(''); setAdjustNote(''); }}
                            >
                                <Text style={styles.adjustBtnText}>Điều chỉnh số lượng</Text>
                            </TouchableOpacity>
                        </View>
                    );
                }}
                ListEmptyComponent={!loading ? <Text style={styles.empty}>Không có sản phẩm nào.</Text> : null}
                ListFooterComponent={
                    totalPages > 1 ? (
                        <View style={styles.pagination}>
                            <TouchableOpacity disabled={page <= 1} onPress={() => setPage(p => p - 1)}>
                                <Text style={[styles.pageBtn, page <= 1 && { opacity: 0.3 }]}>← Trước</Text>
                            </TouchableOpacity>
                            <Text style={styles.pageInfo}>Trang {page}/{totalPages}</Text>
                            <TouchableOpacity disabled={page >= totalPages} onPress={() => setPage(p => p + 1)}>
                                <Text style={[styles.pageBtn, page >= totalPages && { opacity: 0.3 }]}>Sau →</Text>
                            </TouchableOpacity>
                        </View>
                    ) : null
                }
            />

            {/* Adjust Modal */}
            <Modal visible={!!adjustItem} animationType="slide" transparent onRequestClose={() => setAdjustItem(null)}>
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <Text style={styles.modalTitle}>Điều chỉnh tồn kho</Text>
                        {adjustItem && (
                            <>
                                <Text style={styles.adjustItemName}>{adjustItem.Name}</Text>
                                <Text style={styles.adjustItemStock}>Tồn kho hiện tại: <Text style={{ fontWeight: '800' }}>{adjustItem.StockQuantity}</Text></Text>

                                <Text style={styles.label}>Số lượng thay đổi (+/-)</Text>
                                <TextInput
                                    style={styles.input}
                                    value={adjustQty}
                                    onChangeText={setAdjustQty}
                                    keyboardType="numeric"
                                    placeholder="VD: +10 hoặc -5"
                                />

                                <Text style={styles.label}>Ghi chú</Text>
                                <TextInput
                                    style={styles.input}
                                    value={adjustNote}
                                    onChangeText={setAdjustNote}
                                    placeholder="Lý do điều chỉnh..."
                                />

                                <View style={styles.modalActions}>
                                    <TouchableOpacity style={styles.cancelBtn} onPress={() => setAdjustItem(null)}>
                                        <Text style={styles.cancelBtnText}>Hủy</Text>
                                    </TouchableOpacity>
                                    <TouchableOpacity
                                        style={[styles.saveBtn, (adjusting || !adjustQty) && { opacity: 0.6 }]}
                                        onPress={handleAdjust}
                                        disabled={adjusting || !adjustQty}
                                    >
                                        <Text style={styles.saveBtnText}>{adjusting ? 'Đang lưu...' : 'Xác nhận'}</Text>
                                    </TouchableOpacity>
                                </View>
                            </>
                        )}
                    </View>
                </View>
            </Modal>
        </View>
    );
}

function SummaryCard({ label, value, color }: { label: string; value: number; color: string }) {
    return (
        <View style={summaryStyles.card}>
            <Text style={summaryStyles.label}>{label}</Text>
            <Text style={[summaryStyles.value, { color }]}>{value}</Text>
        </View>
    );
}

const summaryStyles = StyleSheet.create({
    card: { flex: 1, backgroundColor: '#FFF', borderRadius: 10, padding: 10, alignItems: 'center' },
    label: { fontSize: 10, color: AppColors.textMuted, fontWeight: '600', textTransform: 'uppercase' },
    value: { fontSize: 20, fontWeight: '800', marginTop: 2 },
});

const styles = StyleSheet.create({
    screen: { flex: 1, backgroundColor: AppColors.background },
    header: { paddingTop: 56, paddingHorizontal: Spacing.lg, paddingBottom: Spacing.md },
    title: { fontSize: 22, fontWeight: '800', color: AppColors.text },
    subtitle: { fontSize: 12, color: AppColors.textSecondary, marginTop: 2 },
    listContent: { paddingHorizontal: Spacing.lg, paddingBottom: 24 },
    summaryRow: { flexDirection: 'row', gap: 8, marginBottom: Spacing.md },
    searchInput: { backgroundColor: '#FFF', borderWidth: 1, borderColor: AppColors.border, borderRadius: 8, paddingHorizontal: 12, paddingVertical: 10, fontSize: 13, marginBottom: 10 },
    filterRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: Spacing.md },
    filterChip: { borderWidth: 1, borderColor: AppColors.border, borderRadius: 16, paddingHorizontal: 10, paddingVertical: 6, backgroundColor: '#FFF' },
    filterChipActive: { backgroundColor: AppColors.primary, borderColor: AppColors.primary },
    filterText: { color: AppColors.textSecondary, fontSize: 12, fontWeight: '600' },
    filterTextActive: { color: '#FFF' },
    card: { backgroundColor: '#FFF', borderRadius: BorderRadius.md, padding: Spacing.md, marginBottom: 10, borderWidth: 1, borderColor: AppColors.borderLight },
    cardRow: { flexDirection: 'row', gap: 12, alignItems: 'center' },
    thumb: { width: 40, height: 40, borderRadius: 6 },
    cardTitle: { fontSize: 14, fontWeight: '700', color: AppColors.text },
    cardCategory: { fontSize: 12, color: AppColors.textSecondary, marginTop: 2 },
    stockQty: { fontSize: 18, fontWeight: '800' },
    badge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 10, marginTop: 4 },
    badgeText: { fontSize: 9, fontWeight: '700' },
    adjustBtn: { marginTop: 10, paddingTop: 10, borderTopWidth: 1, borderTopColor: AppColors.borderLight },
    adjustBtnText: { fontSize: 12, color: AppColors.primary, fontWeight: '600', textAlign: 'center' },
    empty: { color: AppColors.textMuted, fontSize: 13, textAlign: 'center', marginTop: 40 },
    pagination: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 16, paddingVertical: 12 },
    pageBtn: { fontSize: 13, color: AppColors.primary, fontWeight: '600' },
    pageInfo: { fontSize: 12, color: AppColors.textMuted },
    modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
    modalContent: { backgroundColor: '#FFF', borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 20 },
    modalTitle: { fontSize: 18, fontWeight: '800', color: AppColors.text, marginBottom: 8 },
    adjustItemName: { fontSize: 15, fontWeight: '600', color: AppColors.text },
    adjustItemStock: { fontSize: 13, color: AppColors.textSecondary, marginBottom: 16 },
    label: { fontSize: 12, fontWeight: '600', color: AppColors.textMuted, marginBottom: 4, marginTop: 12 },
    input: { borderWidth: 1, borderColor: AppColors.border, borderRadius: 8, paddingHorizontal: 12, paddingVertical: 10, fontSize: 14, color: AppColors.text, backgroundColor: '#F9FAFB' },
    modalActions: { flexDirection: 'row', gap: 10, marginTop: 20 },
    cancelBtn: { flex: 1, borderWidth: 1, borderColor: AppColors.border, borderRadius: 8, paddingVertical: 12, alignItems: 'center' },
    cancelBtnText: { fontSize: 14, fontWeight: '600', color: AppColors.textSecondary },
    saveBtn: { flex: 1, backgroundColor: AppColors.primary, borderRadius: 8, paddingVertical: 12, alignItems: 'center' },
    saveBtnText: { fontSize: 14, fontWeight: '700', color: '#FFF' },
});
