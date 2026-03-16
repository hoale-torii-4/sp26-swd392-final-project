import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Modal,
  Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import Toast from 'react-native-toast-message';
import apiClient from '../services/apiClient';
import { useAuth } from '../contexts/AuthContext';
import { AppColors, Spacing, BorderRadius } from '../constants/theme';
import ConfirmModal from '../components/ConfirmModal';

interface Address {
  Id: string;
  ReceiverName: string;
  ReceiverPhone: string;
  FullAddress: string;
  IsDefault: boolean;
}

interface AddressForm {
  ReceiverName: string;
  ReceiverPhone: string;
  FullAddress: string;
  IsDefault: boolean;
}

const emptyForm: AddressForm = {
  ReceiverName: '',
  ReceiverPhone: '',
  FullAddress: '',
  IsDefault: false,
};

export default function AddressesScreen() {
  const router = useRouter();
  const { isAuthenticated } = useAuth();
  const [addresses, setAddresses] = useState<Address[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<AddressForm>(emptyForm);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState('');
  const [addressToDelete, setAddressToDelete] = useState<string | null>(null);

  useEffect(() => {
    if (!isAuthenticated) {
      router.replace('/login' as any);
      return;
    }
    fetchAddresses();
  }, [isAuthenticated, router]);

  const fetchAddresses = () => {
    setLoading(true);
    apiClient
      .get('/Address')
      .then((r) => setAddresses(r.data?.Data ?? r.data ?? []))
      .catch(() => setAddresses([]))
      .finally(() => setLoading(false));
  };

  const openAdd = () => {
    setEditingId(null);
    setForm(emptyForm);
    setFormError('');
    setShowForm(true);
  };

  const openEdit = (addr: Address) => {
    setEditingId(addr.Id);
    setForm({
      ReceiverName: addr.ReceiverName,
      ReceiverPhone: addr.ReceiverPhone,
      FullAddress: addr.FullAddress,
      IsDefault: addr.IsDefault,
    });
    setFormError('');
    setShowForm(true);
  };

  const handleSave = async () => {
    if (!form.ReceiverName.trim() || !form.FullAddress.trim()) {
      setFormError('Tên người nhận và địa chỉ không được để trống.');
      return;
    }
    setSaving(true);
    setFormError('');
    try {
      if (editingId) {
        await apiClient.put(`/Address/${editingId}`, form);
      } else {
        await apiClient.post('/Address', form);
      }
      setShowForm(false);
      fetchAddresses();
      Toast.show({ type: 'success', text1: 'Thành công', text2: 'Đã lưu địa chỉ thành công.' });
    } catch {
      setFormError('Có lỗi xảy ra. Vui lòng thử lại.');
    } finally {
      setSaving(false);
    }
  };

  const confirmDelete = async () => {
    if (!addressToDelete) return;
    try {
      await apiClient.delete(`/Address/${addressToDelete}`);
      fetchAddresses();
      Toast.show({ type: 'success', text1: 'Thành công', text2: 'Đã xoá địa chỉ.' });
    } catch {
      Toast.show({ type: 'error', text1: 'Lỗi', text2: 'Không thể xoá địa chỉ.' });
    } finally {
      setAddressToDelete(null);
    }
  };

  const handleDelete = (id: string) => {
    setAddressToDelete(id);
  };

  const handleSetDefault = async (id: string) => {
    try {
      await apiClient.patch(`/Address/${id}/set-default`);
      fetchAddresses();
      Toast.show({ type: 'success', text1: 'Thành công', text2: 'Đã cập nhật địa chỉ mặc định.' });
    } catch {
      Toast.show({ type: 'error', text1: 'Lỗi', text2: 'Không thể đặt mặc định.' });
    }
  };

  return (
    <ScrollView style={styles.screen} showsVerticalScrollIndicator={false}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Text style={styles.backText}>← Quay lại</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Sổ địa chỉ</Text>
      </View>

      <View style={styles.actionRow}>
        <Text style={styles.subTitle}>Quản lý địa chỉ giao hàng</Text>
        <TouchableOpacity style={styles.addBtn} onPress={openAdd}>
          <Text style={styles.addBtnText}>+ Thêm địa chỉ</Text>
        </TouchableOpacity>
      </View>

      {loading ? (
        <Text style={styles.loadingText}>Đang tải...</Text>
      ) : addresses.length === 0 ? (
        <View style={styles.emptyBox}>
          <Text style={styles.emptyText}>Chưa có địa chỉ nào.</Text>
          <TouchableOpacity style={styles.addBtn} onPress={openAdd}>
            <Text style={styles.addBtnText}>Thêm địa chỉ đầu tiên</Text>
          </TouchableOpacity>
        </View>
      ) : (
        addresses.map((addr) => (
          <View key={addr.Id} style={styles.addressCard}>
            <View style={styles.addressHeader}>
              <Text style={styles.addressName}>{addr.ReceiverName}</Text>
              {addr.IsDefault && (
                <Text style={styles.defaultBadge}>Mặc định</Text>
              )}
            </View>
            <Text style={styles.addressPhone}>{addr.ReceiverPhone}</Text>
            <Text style={styles.addressDetail}>{addr.FullAddress}</Text>

            <View style={styles.addressActions}>
              {!addr.IsDefault && (
                <TouchableOpacity onPress={() => handleSetDefault(addr.Id)}>
                  <Text style={styles.actionText}>Đặt mặc định</Text>
                </TouchableOpacity>
              )}
              <TouchableOpacity onPress={() => openEdit(addr)}>
                <Text style={styles.actionText}>Chỉnh sửa</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => handleDelete(addr.Id)}>
                <Text style={[styles.actionText, { color: AppColors.error }]}>Xoá</Text>
              </TouchableOpacity>
            </View>
          </View>
        ))
      )}

      <Modal visible={showForm} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>
              {editingId ? 'Chỉnh sửa địa chỉ' : 'Thêm địa chỉ mới'}
            </Text>
            <TextInput
              style={styles.input}
              placeholder="Tên người nhận"
              placeholderTextColor={AppColors.textMuted}
              value={form.ReceiverName}
              onChangeText={(t) => setForm((f) => ({ ...f, ReceiverName: t }))}
            />
            <TextInput
              style={styles.input}
              placeholder="Số điện thoại"
              placeholderTextColor={AppColors.textMuted}
              value={form.ReceiverPhone}
              onChangeText={(t) => setForm((f) => ({ ...f, ReceiverPhone: t }))}
            />
            <TextInput
              style={[styles.input, { height: 80 }]}
              placeholder="Địa chỉ đầy đủ"
              placeholderTextColor={AppColors.textMuted}
              value={form.FullAddress}
              onChangeText={(t) => setForm((f) => ({ ...f, FullAddress: t }))}
              multiline
            />
            <TouchableOpacity
              style={styles.checkboxRow}
              onPress={() => setForm((f) => ({ ...f, IsDefault: !f.IsDefault }))}
            >
              <View style={[styles.checkbox, form.IsDefault && styles.checkboxChecked]} />
              <Text style={styles.checkboxLabel}>Đặt làm địa chỉ mặc định</Text>
            </TouchableOpacity>
            {formError ? <Text style={styles.formError}>{formError}</Text> : null}
            <View style={styles.modalActions}>
              <TouchableOpacity
                style={[styles.primaryBtn, saving && styles.btnDisabled]}
                onPress={handleSave}
                disabled={saving}
              >
                <Text style={styles.primaryBtnText}>
                  {saving ? 'Đang lưu...' : editingId ? 'Cập nhật' : 'Lưu địa chỉ'}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.secondaryBtn} onPress={() => setShowForm(false)}>
                <Text style={styles.secondaryBtnText}>Huỷ</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <View style={{ height: 40 }} />
      <ConfirmModal
        visible={!!addressToDelete}
        title="Xác nhận xóa"
        message="Bạn có chắc chắn muốn xóa địa chỉ này không?"
        confirmText="Xóa"
        cancelText="Hủy"
        onConfirm={confirmDelete}
        onCancel={() => setAddressToDelete(null)}
        isDestructive={true}
      />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: AppColors.background },
  header: {
    paddingTop: Platform.OS === 'ios' ? 56 : 40,
    paddingBottom: 12,
    paddingHorizontal: Spacing.lg,
  },
  backBtn: { marginBottom: 8 },
  backText: { fontSize: 14, color: AppColors.primary, fontWeight: '600' },
  headerTitle: { fontSize: 20, fontWeight: '700', color: AppColors.text },
  actionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    marginBottom: Spacing.md,
  },
  subTitle: { fontSize: 12, color: AppColors.textSecondary },
  addBtn: {
    backgroundColor: AppColors.primary,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: BorderRadius.sm,
  },
  addBtnText: { color: '#FFF', fontSize: 12, fontWeight: '700' },

  loadingText: { textAlign: 'center', color: AppColors.textMuted, marginTop: 20 },
  emptyBox: {
    backgroundColor: AppColors.surface,
    marginHorizontal: Spacing.lg,
    borderRadius: BorderRadius.lg,
    padding: Spacing.lg,
    alignItems: 'center',
  },
  emptyText: { fontSize: 13, color: AppColors.textSecondary, marginBottom: 10 },

  addressCard: {
    backgroundColor: AppColors.surface,
    marginHorizontal: Spacing.lg,
    borderRadius: BorderRadius.lg,
    padding: Spacing.lg,
    marginBottom: Spacing.md,
  },
  addressHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 },
  addressName: { fontSize: 14, fontWeight: '700', color: AppColors.text },
  defaultBadge: {
    backgroundColor: AppColors.primary,
    color: '#FFF',
    fontSize: 9,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    overflow: 'hidden',
  },
  addressPhone: { fontSize: 12, color: AppColors.textSecondary, marginBottom: 4 },
  addressDetail: { fontSize: 12, color: AppColors.textSecondary },
  addressActions: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 10,
  },
  actionText: { fontSize: 12, color: AppColors.primary, fontWeight: '600' },

  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', padding: 20 },
  modalCard: { backgroundColor: '#FFF', borderRadius: BorderRadius.lg, padding: Spacing.lg, gap: 10 },
  modalTitle: { fontSize: 16, fontWeight: '700', color: AppColors.text, marginBottom: 4 },
  input: {
    borderWidth: 1,
    borderColor: AppColors.border,
    borderRadius: BorderRadius.sm,
    paddingHorizontal: Spacing.md,
    paddingVertical: 10,
    fontSize: 14,
    color: AppColors.text,
  },
  checkboxRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  checkbox: {
    width: 18,
    height: 18,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: AppColors.border,
  },
  checkboxChecked: { backgroundColor: AppColors.primary, borderColor: AppColors.primary },
  checkboxLabel: { fontSize: 12, color: AppColors.textSecondary },
  formError: { fontSize: 12, color: AppColors.error },
  modalActions: { flexDirection: 'row', gap: 10, marginTop: 6 },
  primaryBtn: {
    flex: 1,
    backgroundColor: AppColors.primary,
    borderRadius: BorderRadius.sm,
    paddingVertical: 12,
    alignItems: 'center',
  },
  primaryBtnText: { color: '#FFF', fontSize: 12, fontWeight: '700' },
  secondaryBtn: {
    paddingHorizontal: 16,
    borderRadius: BorderRadius.sm,
    borderWidth: 1,
    borderColor: AppColors.border,
    justifyContent: 'center',
  },
  secondaryBtnText: { fontSize: 12, color: AppColors.textSecondary },
  btnDisabled: { opacity: 0.6 },
});
