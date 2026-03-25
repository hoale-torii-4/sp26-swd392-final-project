import React, { useEffect, useState } from 'react';
import {
    View, Text, StyleSheet, FlatList, TouchableOpacity,
    RefreshControl, Alert, Modal, TextInput, Switch, ScrollView,
} from 'react-native';
import { AppColors, BorderRadius, Spacing } from '../../constants/theme';
import { adminService } from '../../services/adminService';

export default function AdminCollectionsScreen() {
    const [collections, setCollections] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);
    const [modalVisible, setModalVisible] = useState(false);
    const [editing, setEditing] = useState<any>(null);
    const [form, setForm] = useState({ Name: '', Description: '', DisplayOrder: 0, IsActive: true });
    const [saving, setSaving] = useState(false);

    const fetchData = async () => {
        setLoading(true);
        try {
            const res = await adminService.getCollections();
            setCollections(Array.isArray(res) ? res : []);
        } catch { setCollections([]); }
        finally { setLoading(false); }
    };

    useEffect(() => { fetchData(); }, []);

    const openCreate = () => {
        setEditing(null);
        setForm({ Name: '', Description: '', DisplayOrder: collections.length, IsActive: true });
        setModalVisible(true);
    };

    const openEdit = (c: any) => {
        setEditing(c);
        setForm({ Name: c.Name, Description: c.Description, DisplayOrder: c.DisplayOrder, IsActive: c.IsActive });
        setModalVisible(true);
    };

    const handleSave = async () => {
        if (!form.Name.trim()) { Alert.alert('Lỗi', 'Vui lòng nhập tên bộ sưu tập'); return; }
        setSaving(true);
        try {
            if (editing) { await adminService.updateCollection(editing.Id, form); }
            else { await adminService.createCollection(form); }
            setModalVisible(false);
            fetchData();
        } catch (e: any) { Alert.alert('Lỗi', e?.message || 'Không thể lưu'); }
        finally { setSaving(false); }
    };

    const handleToggle = async (c: any) => {
        try { await adminService.toggleCollectionStatus(c.Id, !c.IsActive); fetchData(); }
        catch { /* ignore */ }
    };

    const handleDelete = (c: any) => {
        Alert.alert('Xác nhận', `Xóa bộ sưu tập "${c.Name}"?`, [
            { text: 'Hủy', style: 'cancel' },
            {
                text: 'Xóa', style: 'destructive', onPress: async () => {
                    try { await adminService.deleteCollection(c.Id); fetchData(); }
                    catch (e: any) { Alert.alert('Lỗi', e?.response?.data?.Message || 'Không thể xóa'); }
                }
            },
        ]);
    };

    return (
        <View style={styles.screen}>
            <View style={styles.header}>
                <Text style={styles.title}>Bộ sưu tập</Text>
                <TouchableOpacity style={styles.addBtn} onPress={openCreate}>
                    <Text style={styles.addBtnText}>+ Tạo mới</Text>
                </TouchableOpacity>
            </View>

            <FlatList
                data={collections}
                keyExtractor={(item) => item.Id}
                refreshControl={<RefreshControl refreshing={loading} onRefresh={fetchData} />}
                contentContainerStyle={styles.listContent}
                renderItem={({ item }) => (
                    <View style={styles.card}>
                        <View style={styles.cardHeader}>
                            <Text style={styles.cardTitle}>{item.Name}</Text>
                            <View style={[styles.badge, { backgroundColor: item.IsActive ? '#D1FAE5' : '#F3F4F6' }]}>
                                <Text style={[styles.badgeText, { color: item.IsActive ? '#065F46' : '#6B7280' }]}>
                                    {item.IsActive ? 'Đang hoạt động' : 'Tạm ẩn'}
                                </Text>
                            </View>
                        </View>
                        {item.Description ? <Text style={styles.cardDesc} numberOfLines={2}>{item.Description}</Text> : null}
                        <Text style={styles.cardMeta}>{item.GiftBoxCount ?? 0} giỏ quà • Thứ tự: {item.DisplayOrder}</Text>

                        <View style={styles.cardActions}>
                            <TouchableOpacity style={styles.editBtn} onPress={() => openEdit(item)}>
                                <Text style={styles.editBtnText}>Sửa</Text>
                            </TouchableOpacity>
                            <TouchableOpacity onPress={() => handleToggle(item)}>
                                <Text style={[styles.toggleText, { color: item.IsActive ? '#DC2626' : '#059669' }]}>
                                    {item.IsActive ? 'Ẩn' : 'Bật'}
                                </Text>
                            </TouchableOpacity>
                            <TouchableOpacity onPress={() => handleDelete(item)}>
                                <Text style={styles.deleteText}>Xóa</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                )}
                ListEmptyComponent={!loading ? <Text style={styles.empty}>Chưa có bộ sưu tập nào.</Text> : null}
            />

            {/* Create/Edit Modal */}
            <Modal visible={modalVisible} animationType="slide" transparent onRequestClose={() => setModalVisible(false)}>
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <ScrollView showsVerticalScrollIndicator={false}>
                            <Text style={styles.modalTitle}>{editing ? 'Chỉnh sửa' : 'Tạo mới'} bộ sưu tập</Text>

                            <Text style={styles.label}>Tên *</Text>
                            <TextInput style={styles.input} value={form.Name} onChangeText={v => setForm({ ...form, Name: v })} placeholder="Nhập tên bộ sưu tập" />

                            <Text style={styles.label}>Mô tả</Text>
                            <TextInput style={[styles.input, { minHeight: 80 }]} value={form.Description} onChangeText={v => setForm({ ...form, Description: v })} placeholder="Nhập mô tả" multiline textAlignVertical="top" />

                            <Text style={styles.label}>Thứ tự hiển thị</Text>
                            <TextInput style={styles.input} value={String(form.DisplayOrder)} onChangeText={v => setForm({ ...form, DisplayOrder: parseInt(v) || 0 })} keyboardType="numeric" />

                            <View style={styles.switchRow}>
                                <Text style={styles.switchLabel}>Kích hoạt</Text>
                                <Switch value={form.IsActive} onValueChange={v => setForm({ ...form, IsActive: v })} trackColor={{ true: AppColors.primary }} />
                            </View>

                            <View style={styles.modalActions}>
                                <TouchableOpacity style={styles.cancelBtn} onPress={() => setModalVisible(false)}>
                                    <Text style={styles.cancelBtnText}>Hủy</Text>
                                </TouchableOpacity>
                                <TouchableOpacity style={[styles.saveBtn, saving && { opacity: 0.6 }]} onPress={handleSave} disabled={saving}>
                                    <Text style={styles.saveBtnText}>{saving ? 'Đang lưu...' : 'Lưu'}</Text>
                                </TouchableOpacity>
                            </View>
                        </ScrollView>
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
    addBtn: { backgroundColor: AppColors.primary, paddingHorizontal: 14, paddingVertical: 8, borderRadius: 8 },
    addBtnText: { color: '#FFF', fontSize: 13, fontWeight: '700' },
    listContent: { paddingHorizontal: Spacing.lg, paddingBottom: 24 },
    card: { backgroundColor: '#FFF', borderRadius: BorderRadius.md, padding: Spacing.md, marginBottom: 10, borderWidth: 1, borderColor: AppColors.borderLight },
    cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
    cardTitle: { fontSize: 15, fontWeight: '700', color: AppColors.text, flex: 1 },
    badge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 12 },
    badgeText: { fontSize: 10, fontWeight: '700' },
    cardDesc: { fontSize: 12, color: AppColors.textSecondary, marginBottom: 4 },
    cardMeta: { fontSize: 11, color: AppColors.textMuted },
    cardActions: { flexDirection: 'row', gap: 16, marginTop: 10, paddingTop: 10, borderTopWidth: 1, borderTopColor: AppColors.borderLight },
    editBtn: { backgroundColor: '#EEF2FF', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 6 },
    editBtnText: { fontSize: 12, color: '#4338CA', fontWeight: '600' },
    toggleText: { fontSize: 12, fontWeight: '600', paddingVertical: 6 },
    deleteText: { fontSize: 12, color: '#DC2626', fontWeight: '600', paddingVertical: 6 },
    empty: { color: AppColors.textMuted, fontSize: 13, textAlign: 'center', marginTop: 40 },
    modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
    modalContent: { backgroundColor: '#FFF', borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 20, maxHeight: '80%' },
    modalTitle: { fontSize: 18, fontWeight: '800', color: AppColors.text, marginBottom: 16 },
    label: { fontSize: 12, fontWeight: '600', color: AppColors.textMuted, marginBottom: 4, marginTop: 12 },
    input: { borderWidth: 1, borderColor: AppColors.border, borderRadius: 8, paddingHorizontal: 12, paddingVertical: 10, fontSize: 14, color: AppColors.text, backgroundColor: '#F9FAFB' },
    switchRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 16 },
    switchLabel: { fontSize: 14, color: AppColors.text },
    modalActions: { flexDirection: 'row', gap: 10, marginTop: 20 },
    cancelBtn: { flex: 1, borderWidth: 1, borderColor: AppColors.border, borderRadius: 8, paddingVertical: 12, alignItems: 'center' },
    cancelBtnText: { fontSize: 14, fontWeight: '600', color: AppColors.textSecondary },
    saveBtn: { flex: 1, backgroundColor: AppColors.primary, borderRadius: 8, paddingVertical: 12, alignItems: 'center' },
    saveBtnText: { fontSize: 14, fontWeight: '700', color: '#FFF' },
});
