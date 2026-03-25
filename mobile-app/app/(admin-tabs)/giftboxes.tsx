import React, { useCallback, useEffect, useState } from 'react';
import { useFocusEffect } from 'expo-router';
import {
    View, Text, StyleSheet, FlatList, TouchableOpacity,
    RefreshControl, Alert, Image, Modal, TextInput, ScrollView, Switch,
} from 'react-native';
import { AppColors, BorderRadius, Spacing } from '../../constants/theme';
import { adminService } from '../../services/adminService';

function formatPrice(v: number) { return v.toLocaleString('vi-VN') + 'đ'; }

interface FormItem { ItemId: string; ItemName: string; Quantity: number; ItemPrice: number; }

export default function AdminGiftBoxesScreen() {
    const [items, setItems] = useState<any[]>([]);
    const [total, setTotal] = useState(0);
    const [page, setPage] = useState(1);
    const [loading, setLoading] = useState(false);
    const [collections, setCollections] = useState<any[]>([]);
    const [collectionFilter, setCollectionFilter] = useState('');

    // Form modal
    const [modalVisible, setModalVisible] = useState(false);
    const [editDetail, setEditDetail] = useState<any>(null);
    const [allItems, setAllItems] = useState<any[]>([]);
    const [allTags, setAllTags] = useState<any[]>([]);

    // Form fields
    const [name, setName] = useState('');
    const [description, setDescription] = useState('');
    const [priceOverride, setPriceOverride] = useState('');
    const [collectionId, setCollectionId] = useState('');
    const [selectedTags, setSelectedTags] = useState<string[]>([]);
    const [formItems, setFormItems] = useState<FormItem[]>([]);
    const [imageUrls, setImageUrls] = useState('');
    const [isActive, setIsActive] = useState(true);
    const [saving, setSaving] = useState(false);
    const [formError, setFormError] = useState('');

    // Item picker
    const [showItemPicker, setShowItemPicker] = useState(false);

    const pageSize = 20;

    const fetchData = async () => {
        setLoading(true);
        try {
            const res = await adminService.getGiftBoxes({
                collectionId: collectionFilter || undefined,
                page, pageSize,
            });
            setItems(res?.Data ?? []);
            setTotal(res?.TotalItems ?? 0);
        } catch { setItems([]); }
        finally { setLoading(false); }
    };

    const fetchFormOptions = async () => {
        try {
            const [cols, its, tgs] = await Promise.all([
                adminService.getGiftBoxCollections(),
                adminService.getGiftBoxItems(),
                adminService.getGiftBoxTags(),
            ]);
            setCollections(Array.isArray(cols) ? cols : []);
            setAllItems(Array.isArray(its) ? its : []);
            setAllTags(Array.isArray(tgs) ? tgs : []);
        } catch { /* ignore */ }
    };

    // Re-fetch collections/items/tags every time this tab gains focus
    useFocusEffect(
        useCallback(() => {
            fetchFormOptions();
            fetchData();
        }, [page, collectionFilter])
    );

    const openCreate = () => {
        setEditDetail(null);
        setName(''); setDescription(''); setPriceOverride('');
        setCollectionId(collections[0]?.Id ?? '');
        setSelectedTags([]); setFormItems([]); setImageUrls('');
        setIsActive(true); setFormError('');
        setModalVisible(true);
    };

    const openEdit = async (id: string) => {
        try {
            const detail = await adminService.getGiftBoxById(id);
            setEditDetail(detail);
            setName(detail.Name ?? '');
            setDescription(detail.Description ?? '');
            setPriceOverride(detail.Price?.toString() ?? '');
            setCollectionId(detail.CollectionId ?? '');
            setSelectedTags(detail.Tags?.map((t: any) => t.Id) ?? []);
            setFormItems(detail.Items?.map((i: any) => ({
                ItemId: i.ItemId, ItemName: i.ItemName, Quantity: i.Quantity, ItemPrice: i.Price,
            })) ?? []);
            setImageUrls(detail.Images?.join('\n') ?? '');
            setIsActive(detail.IsActive ?? true);
            setFormError('');
            setModalVisible(true);
        } catch { Alert.alert('Lỗi', 'Không thể tải chi tiết giỏ quà'); }
    };

    const addItem = (item: any) => {
        if (formItems.find(i => i.ItemId === item.Id)) return;
        setFormItems(prev => [...prev, { ItemId: item.Id, ItemName: item.Name, Quantity: 1, ItemPrice: item.Price }]);
        setShowItemPicker(false);
    };

    const removeItem = (itemId: string) => {
        setFormItems(prev => prev.filter(i => i.ItemId !== itemId));
    };

    const updateItemQty = (itemId: string, qty: number) => {
        setFormItems(prev => prev.map(i => i.ItemId === itemId ? { ...i, Quantity: Math.max(1, qty) } : i));
    };

    const toggleTag = (id: string) => {
        setSelectedTags(prev => prev.includes(id) ? prev.filter(t => t !== id) : [...prev, id]);
    };

    const handleSave = async () => {
        if (!name.trim()) { setFormError('Vui lòng nhập tên giỏ quà'); return; }
        if (!collectionId) { setFormError('Vui lòng chọn bộ sưu tập'); return; }
        setSaving(true); setFormError('');

        const images = imageUrls.split('\n').map(s => s.trim()).filter(Boolean);
        const calcPrice = formItems.reduce((sum, item) => sum + item.ItemPrice * item.Quantity, 0);
        const finalPrice = priceOverride ? Number(priceOverride) : calcPrice;

        const dto = {
            Name: name.trim(),
            Description: description.trim(),
            Price: finalPrice,
            CollectionId: collectionId,
            TagIds: selectedTags,
            Items: formItems.map(i => ({ ItemId: i.ItemId, ItemName: i.ItemName, Quantity: i.Quantity, ItemPrice: i.ItemPrice })),
            Images: images,
            IsActive: isActive,
        };

        try {
            if (editDetail) { await adminService.updateGiftBox(editDetail.Id, dto); }
            else { await adminService.createGiftBox(dto); }
            setModalVisible(false);
            fetchData();
        } catch (e: any) { setFormError(e?.message || e?.response?.data?.Message || 'Đã xảy ra lỗi.'); }
        finally { setSaving(false); }
    };

    const handleToggle = async (item: any) => {
        try { await adminService.toggleGiftBoxStatus(item.Id, !item.Status); fetchData(); }
        catch { /* ignore */ }
    };

    const handleDelete = (item: any) => {
        Alert.alert('Xác nhận', `Xóa giỏ quà "${item.Name}"?`, [
            { text: 'Hủy', style: 'cancel' },
            {
                text: 'Xóa', style: 'destructive', onPress: async () => {
                    try { await adminService.deleteGiftBox(item.Id); fetchData(); }
                    catch (e: any) { Alert.alert('Lỗi', e?.response?.data?.Message || 'Không thể xóa'); }
                }
            },
        ]);
    };

    const totalPages = Math.ceil(total / pageSize);

    return (
        <View style={styles.screen}>
            <View style={styles.header}>
                <View>
                    <Text style={styles.title}>Giỏ quà</Text>
                    <Text style={styles.subtitle}>{total} giỏ quà</Text>
                </View>
                <TouchableOpacity style={styles.addBtn} onPress={openCreate}>
                    <Text style={styles.addBtnText}>+ Thêm mới</Text>
                </TouchableOpacity>
            </View>

            <FlatList
                data={items}
                keyExtractor={(item) => item.Id}
                refreshControl={<RefreshControl refreshing={loading} onRefresh={fetchData} />}
                contentContainerStyle={styles.listContent}
                ListHeaderComponent={
                    <View style={styles.filterRow}>
                        <TouchableOpacity
                            style={[styles.filterChip, !collectionFilter && styles.filterChipActive]}
                            onPress={() => { setCollectionFilter(''); setPage(1); }}
                        >
                            <Text style={[styles.filterText, !collectionFilter && styles.filterTextActive]}>Tất cả</Text>
                        </TouchableOpacity>
                        {collections.map(c => (
                            <TouchableOpacity
                                key={c.Id}
                                style={[styles.filterChip, collectionFilter === c.Id && styles.filterChipActive]}
                                onPress={() => { setCollectionFilter(c.Id); setPage(1); }}
                            >
                                <Text style={[styles.filterText, collectionFilter === c.Id && styles.filterTextActive]}>{c.Name}</Text>
                            </TouchableOpacity>
                        ))}
                    </View>
                }
                renderItem={({ item }) => (
                    <View style={styles.card}>
                        <View style={styles.cardRow}>
                            {item.Thumbnail ? <Image source={{ uri: item.Thumbnail }} style={styles.thumb} /> : null}
                            <View style={{ flex: 1 }}>
                                <Text style={styles.cardTitle}>{item.Name}</Text>
                                <Text style={styles.cardCollection}>{item.CollectionName}</Text>
                                <Text style={styles.cardPrice}>{formatPrice(item.Price)}</Text>
                            </View>
                            <View style={[styles.badge, { backgroundColor: item.Status ? '#D1FAE5' : '#F3F4F6' }]}>
                                <Text style={[styles.badgeText, { color: item.Status ? '#065F46' : '#6B7280' }]}>
                                    {item.Status ? 'Đang bán' : 'Tạm ẩn'}
                                </Text>
                            </View>
                        </View>

                        <View style={styles.metaRow}>
                            <Text style={styles.metaText}>{item.ItemCount} sản phẩm</Text>
                            {item.TagNames?.length > 0 && (
                                <Text style={styles.metaText}>Tags: {item.TagNames.slice(0, 2).join(', ')}</Text>
                            )}
                        </View>

                        <View style={styles.cardActions}>
                            <TouchableOpacity style={styles.editBtn} onPress={() => openEdit(item.Id)}>
                                <Text style={styles.editBtnText}>Sửa</Text>
                            </TouchableOpacity>
                            <TouchableOpacity onPress={() => handleToggle(item)}>
                                <Text style={[styles.actionText, { color: item.Status ? '#DC2626' : '#059669' }]}>
                                    {item.Status ? 'Ẩn' : 'Bật bán'}
                                </Text>
                            </TouchableOpacity>
                            <TouchableOpacity onPress={() => handleDelete(item)}>
                                <Text style={[styles.actionText, { color: '#DC2626' }]}>Xóa</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                )}
                ListEmptyComponent={!loading ? <Text style={styles.empty}>Không có giỏ quà nào.</Text> : null}
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

            {/* ─── Create/Edit Modal ─── */}
            <Modal visible={modalVisible} animationType="slide" transparent onRequestClose={() => setModalVisible(false)}>
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <ScrollView showsVerticalScrollIndicator={false}>
                            <View style={styles.modalHeader}>
                                <Text style={styles.modalTitle}>{editDetail ? 'Chỉnh sửa giỏ quà' : 'Thêm giỏ quà mới'}</Text>
                                <TouchableOpacity onPress={() => setModalVisible(false)}>
                                    <Text style={styles.closeBtn}>✕</Text>
                                </TouchableOpacity>
                            </View>

                            {/* Name */}
                            <Text style={styles.label}>Tên giỏ quà *</Text>
                            <TextInput style={styles.input} value={name} onChangeText={setName} placeholder="VD: Hộp quà Tết An Khang" />

                            {/* Collection picker */}
                            <Text style={styles.label}>Bộ sưu tập *</Text>
                            <View style={styles.collectionPicker}>
                                {collections.map(c => (
                                    <TouchableOpacity
                                        key={c.Id}
                                        style={[styles.collChip, collectionId === c.Id && styles.collChipActive]}
                                        onPress={() => setCollectionId(c.Id)}
                                    >
                                        <Text style={[styles.collChipText, collectionId === c.Id && styles.collChipTextActive]}>{c.Name}</Text>
                                    </TouchableOpacity>
                                ))}
                            </View>

                            {/* Description */}
                            <Text style={styles.label}>Mô tả</Text>
                            <TextInput style={[styles.input, { minHeight: 70 }]} value={description} onChangeText={setDescription} placeholder="Mô tả giỏ quà..." multiline textAlignVertical="top" />

                            {/* Price Override */}
                            <Text style={styles.label}>Giá tùy chỉnh (để trống = tính tự động)</Text>
                            <TextInput style={styles.input} value={priceOverride} onChangeText={setPriceOverride} keyboardType="numeric" placeholder="VD: 500000" />

                            {/* Tags */}
                            <Text style={styles.label}>Tags</Text>
                            <View style={styles.tagRow}>
                                {allTags.map(tag => (
                                    <TouchableOpacity
                                        key={tag.Id}
                                        style={[styles.tagChip, selectedTags.includes(tag.Id) && styles.tagChipActive]}
                                        onPress={() => toggleTag(tag.Id)}
                                    >
                                        <Text style={[styles.tagChipText, selectedTags.includes(tag.Id) && styles.tagChipTextActive]}>{tag.Name}</Text>
                                    </TouchableOpacity>
                                ))}
                                {allTags.length === 0 && <Text style={styles.muted}>Không có tags nào</Text>}
                            </View>

                            {/* Items */}
                            <Text style={styles.label}>Sản phẩm trong giỏ</Text>
                            <TouchableOpacity style={styles.addItemBtn} onPress={() => setShowItemPicker(true)}>
                                <Text style={styles.addItemBtnText}>+ Thêm sản phẩm</Text>
                            </TouchableOpacity>

                            {formItems.map(fi => (
                                <View key={fi.ItemId} style={styles.formItemRow}>
                                    <View style={{ flex: 1 }}>
                                        <Text style={styles.formItemName}>{fi.ItemName}</Text>
                                        <Text style={styles.formItemPrice}>{formatPrice(fi.ItemPrice)}</Text>
                                    </View>
                                    <View style={styles.qtyControl}>
                                        <TouchableOpacity onPress={() => updateItemQty(fi.ItemId, fi.Quantity - 1)} style={styles.qtyBtn}>
                                            <Text style={styles.qtyBtnText}>−</Text>
                                        </TouchableOpacity>
                                        <Text style={styles.qtyValue}>{fi.Quantity}</Text>
                                        <TouchableOpacity onPress={() => updateItemQty(fi.ItemId, fi.Quantity + 1)} style={styles.qtyBtn}>
                                            <Text style={styles.qtyBtnText}>+</Text>
                                        </TouchableOpacity>
                                    </View>
                                    <TouchableOpacity onPress={() => removeItem(fi.ItemId)}>
                                        <Text style={{ color: '#DC2626', fontSize: 16 }}>✕</Text>
                                    </TouchableOpacity>
                                </View>
                            ))}
                            {formItems.length === 0 && <Text style={styles.muted}>Chưa có sản phẩm nào được thêm.</Text>}

                            {formItems.length > 0 && (
                                <Text style={styles.calcPrice}>
                                    Tổng tính tự động: {formatPrice(formItems.reduce((s, i) => s + i.ItemPrice * i.Quantity, 0))}
                                </Text>
                            )}

                            {/* Images */}
                            <Text style={styles.label}>URL ảnh (mỗi dòng 1 URL)</Text>
                            <TextInput
                                style={[styles.input, { minHeight: 70, fontFamily: 'monospace', fontSize: 11 }]}
                                value={imageUrls}
                                onChangeText={setImageUrls}
                                placeholder={'https://example.com/image1.jpg\nhttps://example.com/image2.jpg'}
                                multiline
                                textAlignVertical="top"
                            />

                            {/* IsActive */}
                            <View style={styles.switchRow}>
                                <Text style={styles.switchLabel}>Hiển thị (Đang bán)</Text>
                                <Switch value={isActive} onValueChange={setIsActive} trackColor={{ true: AppColors.primary }} />
                            </View>

                            {/* Error */}
                            {formError ? <Text style={styles.errorText}>{formError}</Text> : null}

                            {/* Action buttons */}
                            <View style={styles.modalActions}>
                                <TouchableOpacity style={styles.cancelActionBtn} onPress={() => setModalVisible(false)}>
                                    <Text style={styles.cancelActionText}>Hủy</Text>
                                </TouchableOpacity>
                                <TouchableOpacity style={[styles.saveActionBtn, saving && { opacity: 0.6 }]} onPress={handleSave} disabled={saving}>
                                    <Text style={styles.saveActionText}>{saving ? 'Đang lưu...' : (editDetail ? 'Cập nhật' : 'Tạo mới')}</Text>
                                </TouchableOpacity>
                            </View>
                        </ScrollView>
                    </View>
                </View>
            </Modal>

            {/* ─── Item Picker Modal ─── */}
            <Modal visible={showItemPicker} animationType="fade" transparent onRequestClose={() => setShowItemPicker(false)}>
                <View style={styles.modalOverlay}>
                    <View style={[styles.modalContent, { maxHeight: '70%' }]}>
                        <View style={styles.modalHeader}>
                            <Text style={styles.modalTitle}>Chọn sản phẩm</Text>
                            <TouchableOpacity onPress={() => setShowItemPicker(false)}>
                                <Text style={styles.closeBtn}>✕</Text>
                            </TouchableOpacity>
                        </View>
                        <FlatList
                            data={allItems.filter(ai => !formItems.find(fi => fi.ItemId === ai.Id))}
                            keyExtractor={item => item.Id}
                            renderItem={({ item }) => (
                                <TouchableOpacity style={styles.pickerItem} onPress={() => addItem(item)}>
                                    <Text style={styles.pickerItemName}>{item.Name}</Text>
                                    <Text style={styles.pickerItemPrice}>{formatPrice(item.Price)}</Text>
                                </TouchableOpacity>
                            )}
                            ListEmptyComponent={<Text style={styles.muted}>Không có sản phẩm nào để thêm.</Text>}
                        />
                    </View>
                </View>
            </Modal>
        </View>
    );
}

const styles = StyleSheet.create({
    screen: { flex: 1, backgroundColor: AppColors.background },
    header: { paddingTop: 56, paddingHorizontal: Spacing.lg, paddingBottom: Spacing.md, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    title: { fontSize: 22, fontWeight: '800', color: AppColors.text },
    subtitle: { fontSize: 12, color: AppColors.textSecondary, marginTop: 2 },
    addBtn: { backgroundColor: AppColors.primary, paddingHorizontal: 14, paddingVertical: 8, borderRadius: 8 },
    addBtnText: { color: '#FFF', fontSize: 13, fontWeight: '700' },
    listContent: { paddingHorizontal: Spacing.lg, paddingBottom: 24 },
    filterRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: Spacing.md },
    filterChip: { borderWidth: 1, borderColor: AppColors.border, borderRadius: 16, paddingHorizontal: 10, paddingVertical: 6, backgroundColor: '#FFF' },
    filterChipActive: { backgroundColor: AppColors.primary, borderColor: AppColors.primary },
    filterText: { color: AppColors.textSecondary, fontSize: 12, fontWeight: '600' },
    filterTextActive: { color: '#FFF' },
    card: { backgroundColor: '#FFF', borderRadius: BorderRadius.md, padding: Spacing.md, marginBottom: 10, borderWidth: 1, borderColor: AppColors.borderLight },
    cardRow: { flexDirection: 'row', gap: 12 },
    thumb: { width: 56, height: 56, borderRadius: 8 },
    cardTitle: { fontSize: 14, fontWeight: '700', color: AppColors.text },
    cardCollection: { fontSize: 12, color: AppColors.textSecondary, marginTop: 2 },
    cardPrice: { fontSize: 15, fontWeight: '800', color: AppColors.primary, marginTop: 4 },
    badge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 12, alignSelf: 'flex-start' },
    badgeText: { fontSize: 10, fontWeight: '700' },
    metaRow: { flexDirection: 'row', gap: 12, marginTop: 8 },
    metaText: { fontSize: 11, color: AppColors.textMuted },
    cardActions: { flexDirection: 'row', gap: 16, marginTop: 10, paddingTop: 10, borderTopWidth: 1, borderTopColor: AppColors.borderLight },
    editBtn: { backgroundColor: '#EEF2FF', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 6 },
    editBtnText: { fontSize: 12, color: '#4338CA', fontWeight: '600' },
    actionText: { fontSize: 12, fontWeight: '600', paddingVertical: 6 },
    empty: { color: AppColors.textMuted, fontSize: 13, textAlign: 'center', marginTop: 40 },
    pagination: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 16, paddingVertical: 12 },
    pageBtn: { fontSize: 13, color: AppColors.primary, fontWeight: '600' },
    pageInfo: { fontSize: 12, color: AppColors.textMuted },

    /* Modal */
    modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
    modalContent: { backgroundColor: '#FFF', borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 20, maxHeight: '90%' },
    modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
    modalTitle: { fontSize: 18, fontWeight: '800', color: AppColors.text },
    closeBtn: { fontSize: 20, color: AppColors.textMuted, padding: 4 },
    label: { fontSize: 12, fontWeight: '600', color: AppColors.textMuted, marginBottom: 4, marginTop: 14 },
    input: { borderWidth: 1, borderColor: AppColors.border, borderRadius: 8, paddingHorizontal: 12, paddingVertical: 10, fontSize: 13, color: AppColors.text, backgroundColor: '#F9FAFB' },

    /* Collection picker */
    collectionPicker: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
    collChip: { borderWidth: 1.5, borderColor: AppColors.border, borderRadius: 16, paddingHorizontal: 12, paddingVertical: 6 },
    collChipActive: { backgroundColor: AppColors.primary, borderColor: AppColors.primary },
    collChipText: { fontSize: 12, color: AppColors.textSecondary, fontWeight: '600' },
    collChipTextActive: { color: '#FFF' },

    /* Tags */
    tagRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
    tagChip: { borderWidth: 1, borderColor: AppColors.border, borderRadius: 16, paddingHorizontal: 10, paddingVertical: 5 },
    tagChipActive: { backgroundColor: AppColors.primary, borderColor: AppColors.primary },
    tagChipText: { fontSize: 11, color: AppColors.textSecondary, fontWeight: '600' },
    tagChipTextActive: { color: '#FFF' },

    /* Items */
    addItemBtn: { borderWidth: 1, borderColor: AppColors.primary, borderRadius: 8, paddingVertical: 10, alignItems: 'center', marginBottom: 8, borderStyle: 'dashed' },
    addItemBtnText: { fontSize: 13, color: AppColors.primary, fontWeight: '600' },
    formItemRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: AppColors.borderLight },
    formItemName: { fontSize: 13, fontWeight: '600', color: AppColors.text },
    formItemPrice: { fontSize: 11, color: AppColors.textMuted },
    qtyControl: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    qtyBtn: { width: 28, height: 28, borderRadius: 14, backgroundColor: '#F3F4F6', alignItems: 'center', justifyContent: 'center' },
    qtyBtnText: { fontSize: 16, fontWeight: '700', color: AppColors.text },
    qtyValue: { fontSize: 14, fontWeight: '700', minWidth: 20, textAlign: 'center' },
    calcPrice: { fontSize: 12, color: AppColors.primary, fontWeight: '700', marginTop: 8 },
    muted: { fontSize: 12, color: AppColors.textMuted, fontStyle: 'italic', marginTop: 4 },

    /* Switch */
    switchRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 16 },
    switchLabel: { fontSize: 14, color: AppColors.text },

    /* Error */
    errorText: { color: '#DC2626', fontSize: 13, fontWeight: '600', marginTop: 8 },

    /* Actions */
    modalActions: { flexDirection: 'row', gap: 10, marginTop: 20, marginBottom: 10 },
    cancelActionBtn: { flex: 1, borderWidth: 1, borderColor: AppColors.border, borderRadius: 8, paddingVertical: 12, alignItems: 'center' },
    cancelActionText: { fontSize: 14, fontWeight: '600', color: AppColors.textSecondary },
    saveActionBtn: { flex: 1, backgroundColor: AppColors.primary, borderRadius: 8, paddingVertical: 12, alignItems: 'center' },
    saveActionText: { fontSize: 14, fontWeight: '700', color: '#FFF' },

    /* Item picker */
    pickerItem: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: AppColors.borderLight },
    pickerItemName: { fontSize: 14, color: AppColors.text, fontWeight: '500' },
    pickerItemPrice: { fontSize: 13, color: AppColors.textMuted },
});
