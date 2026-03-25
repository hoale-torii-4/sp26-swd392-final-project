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
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import Toast from 'react-native-toast-message';
import apiClient from '../services/apiClient';
import { useAuth } from '../contexts/AuthContext';
import { AppColors, Spacing, BorderRadius } from '../constants/theme';
import ConfirmModal from '../components/ConfirmModal';
import { fetchProvinces, fetchWardsByProvinceCode, type ProvinceOption, type WardOption } from '../services/locationService';
import { hasMinLength, isValidPhone, sanitizeDigits } from '../services/validationService';

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
  AddressDetail: string;
  ProvinceCode: number | null;
  ProvinceName: string;
  WardName: string;
  IsDefault: boolean;
}

const emptyForm: AddressForm = {
  ReceiverName: '',
  ReceiverPhone: '',
  AddressDetail: '',
  ProvinceCode: null,
  ProvinceName: '',
  WardName: '',
  IsDefault: false,
};

function normalizeText(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();
}

function matchProvinceByName(name: string, provinceOptions: ProvinceOption[]): ProvinceOption | undefined {
  const normalizedName = normalizeText(name);
  if (!normalizedName) return undefined;

  return provinceOptions.find((option) => {
    const normalizedOption = normalizeText(option.name);
    return normalizedOption === normalizedName
      || normalizedOption.includes(normalizedName)
      || normalizedName.includes(normalizedOption);
  });
}

function parseAddressForForm(fullAddress: string, provinceOptions: ProvinceOption[]): Pick<AddressForm, 'AddressDetail' | 'ProvinceCode' | 'ProvinceName' | 'WardName'> {
  const parts = fullAddress
    .split(',')
    .map((part) => part.trim())
    .filter(Boolean);

  if (parts.length < 3) {
    return {
      AddressDetail: fullAddress.trim(),
      ProvinceCode: null,
      ProvinceName: '',
      WardName: '',
    };
  }

  const provincePart = parts[parts.length - 1];
  const wardPart = parts[parts.length - 2];
  const detailPart = parts.slice(0, -2).join(', ');
  const matchedProvince = matchProvinceByName(provincePart, provinceOptions);

  return {
    AddressDetail: detailPart,
    ProvinceCode: matchedProvince?.code ?? null,
    ProvinceName: matchedProvince?.name ?? provincePart,
    WardName: wardPart,
  };
}

function validateAddressForm(form: AddressForm): string | null {
  if (!form.ReceiverName.trim()) return 'Tên người nhận không được để trống.';
  if (!hasMinLength(form.ReceiverName, 2)) return 'Tên người nhận phải có ít nhất 2 ký tự.';
  if (!form.ReceiverPhone.trim()) return 'Vui lòng nhập số điện thoại người nhận.';
  if (!isValidPhone(form.ReceiverPhone)) return 'Số điện thoại không hợp lệ (10-11 chữ số, bắt đầu bằng 0).';
  if (!form.AddressDetail.trim()) return 'Địa chỉ chi tiết không được để trống.';
  if (!hasMinLength(form.AddressDetail, 5)) return 'Địa chỉ chi tiết quá ngắn, vui lòng nhập cụ thể hơn.';
  if (!form.ProvinceCode || !form.ProvinceName || !form.WardName) return 'Vui lòng chọn đầy đủ tỉnh/thành phố và xã/phường.';
  const fullAddress = [form.AddressDetail, form.WardName, form.ProvinceName].filter(Boolean).join(', ').trim();
  if (!hasMinLength(fullAddress, 10)) return 'Địa chỉ quá ngắn, vui lòng nhập chi tiết hơn.';
  return null;
}

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
  const [provinceOptions, setProvinceOptions] = useState<ProvinceOption[]>([]);
  const [wardOptions, setWardOptions] = useState<WardOption[]>([]);
  const [locationsLoading, setLocationsLoading] = useState(false);
  const [locationsError, setLocationsError] = useState('');
  const [showProvincePicker, setShowProvincePicker] = useState(false);
  const [showWardPicker, setShowWardPicker] = useState(false);

  useEffect(() => {
    if (!isAuthenticated) {
      router.replace('/login' as any);
      return;
    }
    fetchAddresses();
  }, [isAuthenticated, router]);

  useEffect(() => {
    let mounted = true;
    setLocationsLoading(true);
    fetchProvinces()
      .then((list) => {
        if (!mounted) return;
        setProvinceOptions(list);
        setLocationsError('');
      })
      .catch(() => {
        if (!mounted) return;
        setLocationsError('Không thể tải danh sách tỉnh/thành phố.');
      })
      .finally(() => {
        if (mounted) setLocationsLoading(false);
      });

    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    if (!showForm || !form.ProvinceCode) {
      setWardOptions([]);
      return;
    }

    setLocationsLoading(true);
    fetchWardsByProvinceCode(form.ProvinceCode)
      .then((list) => {
        if (form.WardName && !list.some((item) => item.name === form.WardName)) {
          setWardOptions([{ code: -1, name: form.WardName }, ...list]);
        } else {
          setWardOptions(list);
        }
        setLocationsError('');
      })
      .catch(() => {
        setWardOptions([]);
        setLocationsError('Không thể tải danh sách xã/phường.');
      })
      .finally(() => setLocationsLoading(false));
  }, [form.ProvinceCode, form.WardName, showForm]);

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
    setShowProvincePicker(false);
    setShowWardPicker(false);
    setShowForm(true);
  };

  const openEdit = (addr: Address) => {
    const parsedAddress = parseAddressForForm(addr.FullAddress, provinceOptions);
    setEditingId(addr.Id);
    setForm({
      ReceiverName: addr.ReceiverName,
      ReceiverPhone: addr.ReceiverPhone,
      AddressDetail: parsedAddress.AddressDetail,
      ProvinceCode: parsedAddress.ProvinceCode,
      ProvinceName: parsedAddress.ProvinceName,
      WardName: parsedAddress.WardName,
      IsDefault: addr.IsDefault,
    });
    setFormError('');
    setShowProvincePicker(false);
    setShowWardPicker(false);
    setShowForm(true);
  };

  const handleSelectProvince = async (province: ProvinceOption) => {
    setForm((f) => ({
      ...f,
      ProvinceCode: province.code,
      ProvinceName: province.name,
      WardName: '',
    }));
    setWardOptions([]);
    setShowProvincePicker(false);
  };

  const handleSave = async () => {
    const validationError = validateAddressForm(form);
    if (validationError) {
      setFormError(validationError);
      return;
    }
    setSaving(true);
    setFormError('');
    const payload = {
      ReceiverName: form.ReceiverName.trim(),
      ReceiverPhone: form.ReceiverPhone.trim(),
      FullAddress: [form.AddressDetail.trim(), form.WardName.trim(), form.ProvinceName.trim()].filter(Boolean).join(', '),
      IsDefault: form.IsDefault,
    };
    try {
      if (editingId) {
        await apiClient.put(`/Address/${editingId}`, payload);
      } else {
        await apiClient.post('/Address', payload);
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
              onChangeText={(t) => setForm((f) => ({ ...f, ReceiverPhone: sanitizeDigits(t) }))}
              keyboardType="phone-pad"
              maxLength={11}
            />
            <TextInput
              style={[styles.input, { height: 80 }]}
              placeholder="Số nhà, tên đường"
              placeholderTextColor={AppColors.textMuted}
              value={form.AddressDetail}
              onChangeText={(t) => setForm((f) => ({ ...f, AddressDetail: t }))}
              multiline
            />
            <TouchableOpacity
              style={styles.selectorInput}
              onPress={() => setShowProvincePicker(true)}
              activeOpacity={0.8}
              disabled={locationsLoading}
            >
              <Text style={[styles.selectorText, !form.ProvinceCode && styles.selectorPlaceholder]}>
                {form.ProvinceName || (locationsLoading ? 'Đang tải tỉnh/thành phố...' : 'Chọn Tỉnh / Thành phố')}
              </Text>
              <Ionicons name="chevron-down" size={16} color={AppColors.textMuted} />
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.selectorInput, !form.ProvinceCode && styles.selectorDisabled]}
              onPress={() => form.ProvinceCode && setShowWardPicker(true)}
              activeOpacity={0.8}
              disabled={!form.ProvinceCode || locationsLoading}
            >
              <Text style={[styles.selectorText, !form.WardName && styles.selectorPlaceholder]}>
                {form.WardName || (!form.ProvinceCode ? 'Chọn Tỉnh / Thành phố trước' : locationsLoading ? 'Đang tải xã/phường...' : 'Chọn Xã / Phường')}
              </Text>
              <Ionicons name="chevron-down" size={16} color={AppColors.textMuted} />
            </TouchableOpacity>
            {locationsError ? <Text style={styles.formError}>{locationsError}</Text> : null}
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

      <Modal visible={showProvincePicker} animationType="slide" transparent>
        <View style={styles.pickerOverlay}>
          <View style={styles.pickerCard}>
            <View style={styles.pickerHeader}>
              <Text style={styles.pickerTitle}>Chọn tỉnh/thành phố</Text>
              <TouchableOpacity onPress={() => setShowProvincePicker(false)}>
                <Ionicons name="close" size={20} color={AppColors.textMuted} />
              </TouchableOpacity>
            </View>
            <ScrollView style={styles.pickerList}>
              {provinceOptions.map((item) => (
                <TouchableOpacity
                  key={item.code}
                  style={[styles.pickerItem, form.ProvinceCode === item.code && styles.pickerItemActive]}
                  onPress={() => handleSelectProvince(item)}
                >
                  <Text style={[styles.pickerItemText, form.ProvinceCode === item.code && styles.pickerItemTextActive]}>
                    {item.name}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </View>
      </Modal>

      <Modal visible={showWardPicker} animationType="slide" transparent>
        <View style={styles.pickerOverlay}>
          <View style={styles.pickerCard}>
            <View style={styles.pickerHeader}>
              <Text style={styles.pickerTitle}>Chọn xã/phường</Text>
              <TouchableOpacity onPress={() => setShowWardPicker(false)}>
                <Ionicons name="close" size={20} color={AppColors.textMuted} />
              </TouchableOpacity>
            </View>
            <ScrollView style={styles.pickerList}>
              {wardOptions.map((item) => (
                <TouchableOpacity
                  key={`${item.code}-${item.name}`}
                  style={[styles.pickerItem, form.WardName === item.name && styles.pickerItemActive]}
                  onPress={() => {
                    setForm((f) => ({ ...f, WardName: item.name }));
                    setShowWardPicker(false);
                  }}
                >
                  <Text style={[styles.pickerItemText, form.WardName === item.name && styles.pickerItemTextActive]}>
                    {item.name}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
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
  selectorInput: {
    borderWidth: 1,
    borderColor: AppColors.border,
    borderRadius: BorderRadius.sm,
    paddingHorizontal: Spacing.md,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FFF',
  },
  selectorDisabled: { opacity: 0.6 },
  selectorText: { fontSize: 14, color: AppColors.text },
  selectorPlaceholder: { color: AppColors.textMuted },
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
  pickerOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'flex-end',
  },
  pickerCard: {
    backgroundColor: '#FFF',
    borderTopLeftRadius: BorderRadius.lg,
    borderTopRightRadius: BorderRadius.lg,
    maxHeight: '70%',
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.md,
    paddingBottom: Platform.OS === 'ios' ? 26 : 18,
  },
  pickerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: Spacing.sm,
  },
  pickerTitle: { fontSize: 16, fontWeight: '700', color: AppColors.text },
  pickerList: { maxHeight: 360 },
  pickerItem: {
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: AppColors.borderLight,
  },
  pickerItemActive: {
    backgroundColor: 'rgba(139, 26, 26, 0.06)',
    borderRadius: BorderRadius.sm,
    paddingHorizontal: Spacing.sm,
  },
  pickerItemText: { fontSize: 14, color: AppColors.text },
  pickerItemTextActive: { color: AppColors.primary, fontWeight: '700' },
});
