import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Platform,
  Alert,
} from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { Image } from 'expo-image';
import { useRouter, useLocalSearchParams } from 'expo-router';
import Toast from 'react-native-toast-message';
import * as FileSystem from 'expo-file-system';
import * as MediaLibrary from 'expo-media-library';
import * as Sharing from 'expo-sharing';
import { Ionicons } from '@expo/vector-icons';
import { cartService, type CartItemDto } from '../services/cartService';
import { orderService, OrderItemType } from '../services/orderService';
import { paymentService } from '../services/paymentService';
import apiClient from '../services/apiClient';
import { fetchProvinces, fetchWardsByProvinceCode, type ProvinceOption, type WardOption } from '../services/locationService';
import { useAuth } from '../contexts/AuthContext';
import { AppColors, Spacing, BorderRadius } from '../constants/theme';
import { hasMinLength, isValidDeliveryDate, isValidEmail, isValidPhone, sanitizeDigits } from '../services/validationService';

function formatPrice(v: number) {
  return v.toLocaleString('vi-VN') + '₫';
}

function formatDate(date: Date) {
  return date.toISOString().slice(0, 10);
}

interface Address {
  Id: string;
  ReceiverName: string;
  ReceiverPhone: string;
  FullAddress: string;
  IsDefault: boolean;
}

export default function CheckoutPaymentScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{
    buyNow?: string;
    items?: string;
    totalAmount?: string;
    totalItems?: string;
    selectedItems?: string;
  }>();
  const {
    buyNow,
    items: itemsParam,
    totalAmount: totalAmountParam,
    selectedItems,
  } = params;
  const { user } = useAuth();

  const [items, setItems] = useState<CartItemDto[]>([]);
  const [totalAmount, setTotalAmount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [qrUrl, setQrUrl] = useState<string | null>(null);
  const [orderCode, setOrderCode] = useState<string | null>(null);
  const [paymentDetected, setPaymentDetected] = useState(false);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const [qrRemainingSeconds, setQrRemainingSeconds] = useState<number | null>(null);
  const [qrExpired, setQrExpired] = useState(false);
  const qrCountdownRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const [addressBook, setAddressBook] = useState<Address[]>([]);
  const [selectedAddressId, setSelectedAddressId] = useState<string | null>(null);
  const [loadingAddresses, setLoadingAddresses] = useState(false);

  const handleDateChange = (_event: any, selectedDate?: Date) => {
    if (!selectedDate) {
      if (Platform.OS !== 'ios') {
        setShowDateModal(false);
      }
      return;
    }
    setDeliveryDateObj(selectedDate);
    setDeliveryDate(formatDate(selectedDate));
    if (Platform.OS !== 'ios') {
      setShowDateModal(false);
    }
  };


  const [receiverName, setReceiverName] = useState('');
  const [receiverPhone, setReceiverPhone] = useState('');
  const [provinceCode, setProvinceCode] = useState<number | null>(null);
  const [provinceName, setProvinceName] = useState('');
  const [wardName, setWardName] = useState('');
  const [provinceOptions, setProvinceOptions] = useState<ProvinceOption[]>([]);
  const [wardOptions, setWardOptions] = useState<WardOption[]>([]);
  const [locationsLoading, setLocationsLoading] = useState(false);
  const [showProvincePicker, setShowProvincePicker] = useState(false);
  const [showWardPicker, setShowWardPicker] = useState(false);
  const [addressDetail, setAddressDetail] = useState('');
  const [greetingMessage, setGreetingMessage] = useState('');
  const [deliveryDate, setDeliveryDate] = useState('');
  const [deliveryDateObj, setDeliveryDateObj] = useState<Date | null>(null);
  const [showDateModal, setShowDateModal] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<'COD' | 'BANK'>('BANK');
  const [payloadPreview, setPayloadPreview] = useState('');

  const [customerName, setCustomerName] = useState(user?.FullName ?? '');
  const [customerEmail, setCustomerEmail] = useState(user?.Email ?? '');
  const [customerPhone, setCustomerPhone] = useState(user?.Phone ?? '');

  const [qrSaved, setQrSaved] = useState(false);
  const [savingQr, setSavingQr] = useState(false);

  const handleSaveQr = async () => {
    if (!qrUrl) return;

    setSavingQr(true);
    const fileName = `qr-${orderCode ?? 'payment'}-${Date.now()}.png`;

    try {
      if (Platform.OS === 'web') {
        const res = await fetch(qrUrl);
        const blob = await res.blob();
        const reader = new FileReader();
        reader.onload = () => {
          try {
            const link = document.createElement('a');
            link.href = reader.result as string;
            link.download = fileName;
            link.click();
            setQrSaved(true);
            Toast.show({ type: 'success', text1: 'Lưu mã QR', text2: 'Đã lưu mã QR thành công.' });
          } catch {
            Toast.show({ type: 'error', text1: 'Lưu mã QR', text2: 'Không thể lưu mã QR trên thiết bị này.' });
          } finally {
            setSavingQr(false);
          }
        };
        reader.onerror = () => {
          setSavingQr(false);
          Toast.show({ type: 'error', text1: 'Lưu mã QR', text2: 'Không thể tải mã QR để lưu.' });
        };
        reader.readAsDataURL(blob);
        return;
      }

      const downloadPath = `${FileSystem.cacheDirectory}${fileName}`;
      const download = await FileSystem.downloadAsync(qrUrl, downloadPath);

      const { status } = await MediaLibrary.requestPermissionsAsync();
      if (status === 'granted') {
        await MediaLibrary.saveToLibraryAsync(download.uri);
        setQrSaved(true);
        return;
      }

      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(download.uri);
        setQrSaved(true);
      } else {
        Toast.show({ type: 'error', text1: 'Lưu mã QR', text2: 'Thiết bị không hỗ trợ lưu hoặc chia sẻ ảnh.' });
      }
    } catch {
      Toast.show({ type: 'error', text1: 'Lưu mã QR', text2: 'Không thể lưu mã QR. Vui lòng thử lại.' });
    } finally {
      setSavingQr(false);
    }
  };

  const handleCopyQr = async () => {
    if (!qrUrl) return;
    try {
      if (typeof navigator !== 'undefined' && navigator.clipboard) {
        await navigator.clipboard.writeText(qrUrl);
        Toast.show({ type: 'success', text1: 'Sao chép liên kết', text2: 'Đã sao chép link QR để bạn lưu hoặc chia sẻ.' });
      } else {
        Toast.show({ type: 'error', text1: 'Sao chép liên kết', text2: 'Thiết bị này không hỗ trợ sao chép.' });
      }
    } catch {
      Toast.show({ type: 'error', text1: 'Sao chép liên kết', text2: 'Không thể sao chép link QR.' });
    }
  };

  const handleSelectAddress = (addr: Address) => {
    setSelectedAddressId(addr.Id);
    setReceiverName(addr.ReceiverName ?? '');
    setReceiverPhone(addr.ReceiverPhone ?? '');
    setAddressDetail(addr.FullAddress ?? '');
    setProvinceCode(null);
    setProvinceName('');
    setWardName('');
    setWardOptions([]);
  };

  const handleSelectProvince = async (province: ProvinceOption) => {
    setProvinceCode(province.code);
    setProvinceName(province.name);
    setWardName('');
    setWardOptions([]);
    setShowProvincePicker(false);
    setLocationsLoading(true);
    try {
      const wards = await fetchWardsByProvinceCode(province.code);
      setWardOptions(wards);
    } catch {
      setWardOptions([]);
      Toast.show({ type: 'error', text1: 'Địa chỉ', text2: 'Không thể tải danh sách xã/phường.' });
    } finally {
      setLocationsLoading(false);
    }
  };

  useEffect(() => {
    const parseItems = (value?: string) => {
      if (!value) return [] as CartItemDto[];
      try {
        return JSON.parse(value) as CartItemDto[];
      } catch {
        return [] as CartItemDto[];
      }
    };

    const isBuyNow = buyNow === '1';
    const selected = selectedItems ? parseItems(selectedItems) : null;
    const buyNowItems = itemsParam ? parseItems(itemsParam) : null;

    if (isBuyNow && buyNowItems) {
      setItems(buyNowItems);
      setTotalAmount(Number(totalAmountParam ?? 0));
      setLoading(false);
      return;
    }

    if (selected && selected.length > 0) {
      setItems(selected);
      const total = selected.reduce((sum, item) => sum + item.UnitPrice * item.Quantity, 0);
      setTotalAmount(total);
      setLoading(false);
      return;
    }

    cartService
      .getCart()
      .then((cart) => {
        setItems(cart.Items ?? []);
        setTotalAmount(cart.TotalAmount ?? 0);
      })
      .catch(() => setError('Không thể tải giỏ hàng.'))
      .finally(() => setLoading(false));
  }, [buyNow, itemsParam, totalAmountParam, selectedItems]);

  useEffect(() => {
    if (!user?.Id) return;

    setLoadingAddresses(true);
    apiClient
      .get('/Address')
      .then((res) => {
        const list = res.data?.Data ?? res.data ?? [];
        setAddressBook(list);
        const defaultAddress = list.find((addr: Address) => addr.IsDefault);
        if (defaultAddress) {
          setSelectedAddressId(defaultAddress.Id);
          setReceiverName(defaultAddress.ReceiverName ?? '');
          setReceiverPhone(defaultAddress.ReceiverPhone ?? '');
          setAddressDetail(defaultAddress.FullAddress ?? '');
        }
      })
      .catch(() => setAddressBook([]))
      .finally(() => setLoadingAddresses(false));
  }, [user?.Id]);

  useEffect(() => {
    let mounted = true;
    setLocationsLoading(true);
    fetchProvinces()
      .then((list) => {
        if (!mounted) return;
        setProvinceOptions(list);
      })
      .catch(() => {
        if (!mounted) return;
        Toast.show({ type: 'error', text1: 'Địa chỉ', text2: 'Không thể tải danh sách tỉnh/thành phố.' });
      })
      .finally(() => {
        if (mounted) setLocationsLoading(false);
      });

    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    if (!qrUrl || !orderCode || qrExpired) return;

    const poll = async () => {
      try {
        const status = await paymentService.checkPaymentStatus(orderCode);
        if (status.IsPaid) {
          setPaymentDetected(true);
          if (pollRef.current) clearInterval(pollRef.current);
          if (qrCountdownRef.current) clearInterval(qrCountdownRef.current);
          setTimeout(() => router.replace(`/order-success?code=${orderCode}` as any), 1500);
        }
      } catch {
        // ignore polling errors
      }
    };

    pollRef.current = setInterval(poll, 3000);
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, [qrUrl, orderCode, router, qrExpired]);

  useEffect(() => {
    if (!qrUrl || !orderCode) return;

    const countdownMinutes = Number(process.env.EXPO_PUBLIC_QR_TIMEOUT_MINUTES ?? 10);
    const totalSeconds = Math.max(1, Math.round(countdownMinutes * 60));
    setQrExpired(false);
    setQrRemainingSeconds(totalSeconds);

    if (qrCountdownRef.current) clearInterval(qrCountdownRef.current);
    qrCountdownRef.current = setInterval(() => {
      setQrRemainingSeconds((prev) => {
        if (prev === null) return prev;
        if (prev <= 1) {
          if (qrCountdownRef.current) clearInterval(qrCountdownRef.current);
          if (pollRef.current) clearInterval(pollRef.current);
          setQrExpired(true);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => {
      if (qrCountdownRef.current) clearInterval(qrCountdownRef.current);
    };
  }, [qrUrl, orderCode]);

  const formatCountdown = (seconds: number | null) => {
    if (seconds === null) return '';
    const mm = Math.floor(seconds / 60);
    const ss = seconds % 60;
    return `${mm.toString().padStart(2, '0')}:${ss.toString().padStart(2, '0')}`;
  };

  const handleSubmit = async () => {
    const trimmedCustomerEmail = customerEmail.trim();
    const trimmedCustomerName = customerName.trim();
    const trimmedCustomerPhone = customerPhone.trim();
    const trimmedReceiverName = receiverName.trim();
    const trimmedReceiverPhone = receiverPhone.trim();
    const trimmedAddressDetail = addressDetail.trim();
    const trimmedProvinceName = provinceName.trim();
    const trimmedWardName = wardName.trim();
    const finalDeliveryAddress = [trimmedAddressDetail, trimmedWardName, trimmedProvinceName].filter(Boolean).join(', ');

    if (!trimmedReceiverName || !trimmedReceiverPhone || !trimmedAddressDetail || !deliveryDate) {
      setError('Vui lòng điền đầy đủ thông tin người nhận và ngày giao hàng.');
      return;
    }
    if ((!trimmedProvinceName && trimmedWardName) || (trimmedProvinceName && !trimmedWardName)) {
      setError('Vui lòng chọn đầy đủ tỉnh/thành phố và xã/phường.');
      return;
    }
    if (!hasMinLength(trimmedReceiverName, 2)) {
      setError('Tên người nhận phải có ít nhất 2 ký tự.');
      return;
    }
    if (!isValidPhone(trimmedReceiverPhone)) {
      setError('Số điện thoại người nhận không hợp lệ.');
      return;
    }
    if (!hasMinLength(trimmedAddressDetail, 10)) {
      setError('Địa chỉ giao hàng quá ngắn, vui lòng nhập chi tiết hơn.');
      return;
    }
    if (!isValidDeliveryDate(deliveryDate)) {
      setError('Ngày giao hàng phải từ hôm nay trở đi.');
      return;
    }
    if (!trimmedCustomerEmail) {
      setError('Vui lòng nhập email để nhận thông tin đơn hàng.');
      return;
    }
    if (!isValidEmail(trimmedCustomerEmail)) {
      setError('Email nhận đơn không hợp lệ.');
      return;
    }
    if (trimmedCustomerName && !hasMinLength(trimmedCustomerName, 2)) {
      setError('Tên người đặt phải có ít nhất 2 ký tự.');
      return;
    }
    if (trimmedCustomerPhone && !isValidPhone(trimmedCustomerPhone)) {
      setError('Số điện thoại người đặt không hợp lệ.');
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      const orderData = {
        UserId: user?.Id,
        CustomerEmail: trimmedCustomerEmail,
        CustomerName: trimmedCustomerName || trimmedReceiverName,
        CustomerPhone: trimmedCustomerPhone || trimmedReceiverPhone,
        Items: items.map((item) => ({
          Type: item.Type as OrderItemType,
          Id: item.ProductId
            ?? (item.Type === 0 ? item.GiftBoxId ?? undefined : item.CustomBoxId ?? undefined),
          GiftBoxId: item.GiftBoxId ?? undefined,
          CustomBoxId: item.CustomBoxId ?? undefined,
          Quantity: item.Quantity,
          Price: item.UnitPrice,
          Name: item.Name ?? undefined,
        })),
        ReceiverName: trimmedReceiverName,
        ReceiverPhone: trimmedReceiverPhone,
        DeliveryAddress: finalDeliveryAddress,
        GreetingMessage: greetingMessage || undefined,
        DeliveryDate: new Date(deliveryDate).toISOString(),
      };

      const result = await orderService.createB2COrder(orderData);
      setOrderCode(result.orderCode);
      setPaymentDetected(false);
      setQrExpired(false);
      setQrRemainingSeconds(null);

      // Clear purchased items from the cart
      if (buyNow !== '1') {
        if (selectedItems) {
          // Remove each selected item from the cart individually
          const parsedSelected: CartItemDto[] = JSON.parse(selectedItems);
          await Promise.all(
            parsedSelected.map((si) => cartService.removeItem(si.Id).catch(() => {}))
          );
        } else if (!itemsParam) {
          // Full cart checkout — clear everything
          await cartService.clearCart();
        }
      }

      if (paymentMethod === 'BANK') {
        const qr = await paymentService.createQr(result.orderCode);
        setQrUrl(qr.qrUrl || null);
        if (!qr.qrUrl) {
          router.replace(`/order-success?code=${result.orderCode}` as any);
        }
      } else {
        router.replace(`/order-success?code=${result.orderCode}` as any);
      }
    } catch (err: any) {
      const msg = err?.message ?? 'Có lỗi xảy ra khi tạo đơn hàng.';
      const details = Array.isArray(err?.errors) && err.errors.length > 0
        ? `\n${err.errors.join('\n')}`
        : '';
      setError(`${msg}${details}`);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <Text>Đang tải...</Text>
      </View>
    );
  }

  if (items.length === 0 && !orderCode) {
    return (
      <View style={styles.center}>
        <Text style={styles.emptyTitle}>Giỏ hàng trống</Text>
        <TouchableOpacity
          style={styles.primaryBtn}
          onPress={() => router.replace('/(tabs)/gift-boxes' as any)}
        >
          <Text style={styles.primaryBtnText}>Khám phá giỏ quà</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.screen}>
      <ScrollView contentContainerStyle={{ paddingBottom: 120 }}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <Ionicons name="arrow-back" size={22} color={AppColors.text} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Thanh toán</Text>
          <View style={{ width: 22 }} />
        </View>

        {!user && (
          <View style={styles.card}>
            <Text style={styles.sectionTitle}>Thông tin người đặt</Text>
            <View style={styles.fieldGroup}>
              <TextInput
                style={styles.input}
                placeholder="Họ và tên"
                placeholderTextColor={AppColors.textMuted}
                value={customerName}
                onChangeText={setCustomerName}
              />
            </View>
            <View style={styles.fieldGroup}>
              <TextInput
                style={styles.input}
                placeholder="Email nhận đơn"
                placeholderTextColor={AppColors.textMuted}
                value={customerEmail}
                onChangeText={setCustomerEmail}
                keyboardType="email-address"
              />
            </View>
            <View style={styles.fieldGroup}>
              <TextInput
                style={styles.input}
                placeholder="Số điện thoại"
                placeholderTextColor={AppColors.textMuted}
                value={customerPhone}
                onChangeText={(text) => setCustomerPhone(sanitizeDigits(text).slice(0, 11))}
                keyboardType="phone-pad"
              />
            </View>
          </View>
        )}

        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Thông tin người nhận</Text>

          {user && (
            <View style={styles.fieldGroup}>
              <View style={styles.addressHeaderRow}>
                <Text style={styles.subTitle}>Chọn từ sổ địa chỉ</Text>
                <TouchableOpacity onPress={() => router.push('/addresses' as any)}>
                  <Text style={styles.linkText}>Quản lý</Text>
                </TouchableOpacity>
              </View>

              {loadingAddresses ? (
                <Text style={styles.loadingText}>Đang tải địa chỉ...</Text>
              ) : addressBook.length === 0 ? (
                <Text style={styles.emptyHelper}>Chưa có địa chỉ nào.</Text>
              ) : (
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.addressList}>
                  {addressBook.map((addr) => {
                    const selected = selectedAddressId === addr.Id;
                    return (
                      <TouchableOpacity
                        key={addr.Id}
                        style={[styles.addressOption, selected && styles.addressOptionActive]}
                        onPress={() => handleSelectAddress(addr)}
                      >
                        <Text style={styles.addressNameText}>{addr.ReceiverName}</Text>
                        <Text style={styles.addressPhoneText}>{addr.ReceiverPhone}</Text>
                        <Text style={styles.addressDetailText} numberOfLines={2}>
                          {addr.FullAddress}
                        </Text>
                        {addr.IsDefault && <Text style={styles.defaultBadge}>Mặc định</Text>}
                      </TouchableOpacity>
                    );
                  })}
                </ScrollView>
              )}
            </View>
          )}

          <View style={styles.fieldGroup}>
            <TextInput
              style={styles.input}
              placeholder="Họ tên người nhận"
              placeholderTextColor={AppColors.textMuted}
              value={receiverName}
              onChangeText={setReceiverName}
            />
          </View>
          <View style={styles.fieldGroup}>
            <TextInput
              style={styles.input}
              placeholder="Số điện thoại"
              placeholderTextColor={AppColors.textMuted}
              value={receiverPhone}
              onChangeText={(text) => setReceiverPhone(sanitizeDigits(text).slice(0, 11))}
              keyboardType="phone-pad"
            />
          </View>
          <View style={styles.fieldGroup}>
            <TextInput
              style={[styles.input, { height: 80 }]}
              placeholder="Số nhà, tên đường"
              placeholderTextColor={AppColors.textMuted}
              value={addressDetail}
              onChangeText={setAddressDetail}
              multiline
            />
          </View>

          <View style={styles.fieldGroup}>
            <TouchableOpacity
              style={styles.selectorInput}
              onPress={() => setShowProvincePicker(true)}
              activeOpacity={0.8}
              disabled={locationsLoading}
            >
              <Text style={[styles.selectorText, !provinceName && styles.selectorPlaceholder]}>
                {provinceName || (locationsLoading ? 'Đang tải tỉnh/thành phố...' : 'Chọn Tỉnh / Thành phố')}
              </Text>
              <Ionicons name="chevron-down" size={16} color={AppColors.textMuted} />
            </TouchableOpacity>
          </View>

          <View style={styles.fieldGroup}>
            <TouchableOpacity
              style={[styles.selectorInput, !provinceCode && styles.selectorDisabled]}
              onPress={() => provinceCode && setShowWardPicker(true)}
              activeOpacity={0.8}
              disabled={!provinceCode || locationsLoading}
            >
              <Text style={[styles.selectorText, !wardName && styles.selectorPlaceholder]}>
                {wardName || (!provinceCode ? 'Chọn Tỉnh / Thành phố trước' : locationsLoading ? 'Đang tải xã/phường...' : 'Chọn Xã / Phường')}
              </Text>
              <Ionicons name="chevron-down" size={16} color={AppColors.textMuted} />
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Lời chúc gửi kèm</Text>
          <TextInput
            style={[styles.input, { height: 100 }]}
            placeholder="Nhập lời chúc..."
            placeholderTextColor={AppColors.textMuted}
            value={greetingMessage}
            onChangeText={setGreetingMessage}
            multiline
          />
        </View>

        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Ngày giao hàng</Text>
          <TouchableOpacity onPress={() => setShowDateModal(true)} activeOpacity={0.8}>
            <View style={styles.dateInput}>
              <Text style={[styles.dateText, !deliveryDate && styles.datePlaceholder]}>
                {deliveryDate || 'Chọn ngày giao'}
              </Text>
              <Ionicons name="calendar-outline" size={18} color={AppColors.textMuted} />
            </View>
          </TouchableOpacity>
        </View>

        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Phương thức thanh toán</Text>
          <TouchableOpacity
            style={[styles.paymentOption, paymentMethod === 'BANK' && styles.paymentOptionActive]}
            onPress={() => setPaymentMethod('BANK')}
          >
            <View style={[styles.radio, paymentMethod === 'BANK' && styles.radioActive]} />
            <Text style={styles.paymentText}>Chuyển khoản ngân hàng (QR)</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.paymentOption, paymentMethod === 'COD' && styles.paymentOptionActive]}
            onPress={() => setPaymentMethod('COD')}
          >
            <View style={[styles.radio, paymentMethod === 'COD' && styles.radioActive]} />
            <Text style={styles.paymentText}>Thanh toán khi nhận hàng (COD)</Text>
          </TouchableOpacity>
        </View>

        {error && (
          <View style={styles.errorBanner}>
            <Text style={styles.errorText}>{error}</Text>
          </View>
        )}

        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Tóm tắt đơn hàng</Text>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Giá trị đơn ({items.length})</Text>
            <Text style={styles.summaryValue}>{formatPrice(totalAmount)}</Text>
          </View>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Phí vận chuyển</Text>
            <Text style={styles.summaryValue}>35.000₫</Text>
          </View>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryTotalLabel}>Tổng thanh toán</Text>
            <Text style={styles.summaryTotalValue}>{formatPrice(totalAmount + 35000)}</Text>
          </View>
        </View>
      </ScrollView>

      <View style={styles.footer}>
        <TouchableOpacity
          style={[styles.primaryBtn, (submitting || !!orderCode) && styles.btnDisabled]}
          onPress={handleSubmit}
          disabled={submitting || !!orderCode}
        >
          <Text style={styles.primaryBtnText}>
            {submitting ? 'Đang xử lý...' : orderCode ? 'Đơn hàng đã tạo' : 'Xác nhận & tạo đơn'}
          </Text>
        </TouchableOpacity>
      </View>

      {orderCode && qrUrl && (
        <View style={styles.qrModal}>
          <View style={styles.qrCard}>
            {paymentDetected ? (
              <Text style={styles.successText}>Thanh toán thành công! Đang chuyển...</Text>
            ) : (
              <>
                <View style={styles.qrHeaderRow}>
                  <View style={styles.qrHeaderIcon}>
                    <Ionicons name="qr-code" size={18} color={AppColors.primary} />
                  </View>
                  <View style={styles.qrHeaderTextGroup}>
                    <Text style={styles.qrTitle}>Thanh toán QR Code</Text>
                    <Text style={styles.qrSubtitle}>Mã đơn: {orderCode}</Text>
                  </View>
                </View>

                <View style={styles.qrBoxShadow}>
                  <View style={styles.qrBox}>
                    {qrUrl ? (
                      <Image source={{ uri: qrUrl }} style={styles.qrImage} contentFit="contain" />
                    ) : (
                      <Text style={styles.qrPlaceholder}>Đang tạo mã QR...</Text>
                    )}
                  </View>
                </View>

                <View style={styles.qrInfoRow}>
                  <View style={styles.qrInfoItem}>
                    <Text style={styles.qrInfoLabel}>Tổng thanh toán</Text>
                    <Text style={styles.qrInfoValue}>{formatPrice(totalAmount + 35000)}</Text>
                  </View>
                  <View style={styles.qrInfoDivider} />
                  <View style={styles.qrInfoItem}>
                    <Text style={styles.qrInfoLabel}>Trạng thái</Text>
                    <Text style={styles.qrInfoValue}>Chờ thanh toán</Text>
                  </View>
                </View>

                <View style={styles.qrCountdownRow}>
                  <Text style={styles.qrCountdownLabel}>Hết hạn sau</Text>
                  <Text
                    style={[
                      styles.qrCountdownValue,
                      qrRemainingSeconds !== null && qrRemainingSeconds <= 30 && styles.qrCountdownUrgent,
                    ]}
                  >
                    {formatCountdown(qrRemainingSeconds)}
                  </Text>
                </View>

                {qrExpired && (
                  <View style={styles.qrExpiredBanner}>
                    <Text style={styles.qrExpiredText}>Mã QR đã hết hạn. Vui lòng tạo lại để thanh toán.</Text>
                  </View>
                )}

                <View style={styles.qrActions}>
                  <TouchableOpacity
                    style={[styles.secondaryBtn, (!qrUrl || savingQr) && styles.btnDisabled]}
                    onPress={handleSaveQr}
                    disabled={!qrUrl || savingQr}
                  >
                    <Ionicons name="download-outline" size={16} color={AppColors.primary} />
                    <Text style={styles.secondaryBtnText}>
                      {savingQr ? 'Đang lưu...' : qrSaved ? 'Đã lưu QR' : 'Lưu mã QR'}
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.secondaryBtn}
                    onPress={handleCopyQr}
                    disabled={!qrUrl}
                  >
                    <Ionicons name="link-outline" size={16} color={AppColors.primary} />
                    <Text style={styles.secondaryBtnText}>Sao chép link</Text>
                  </TouchableOpacity>
                </View>

                <TouchableOpacity
                  style={[styles.primaryBtn, qrExpired && styles.btnDisabled]}
                  onPress={() => {
                    if (!qrExpired) router.replace(`/order-success?code=${orderCode}` as any);
                  }}
                  disabled={qrExpired}
                >
                  <Text style={styles.primaryBtnText}>Đã thanh toán xong</Text>
                </TouchableOpacity>
              </>
            )}
          </View>
        </View>
      )}

      {showDateModal && (
        <View style={styles.qrModal}>
          <View style={styles.qrCard}>
            <Text style={styles.qrTitle}>Chọn ngày giao hàng</Text>
            <DateTimePicker
              value={deliveryDateObj ?? new Date()}
              mode="date"
              display={Platform.OS === 'ios' ? 'inline' : 'default'}
              onChange={handleDateChange}
              minimumDate={new Date()}
            />
            {Platform.OS === 'ios' && (
              <View style={styles.dateActions}>
                <TouchableOpacity style={styles.secondaryBtn} onPress={() => setShowDateModal(false)}>
                  <Text style={styles.secondaryBtnText}>Huỷ</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.primaryBtn} onPress={() => setShowDateModal(false)}>
                  <Text style={styles.primaryBtnText}>Xác nhận</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        </View>
      )}

      {showProvincePicker && (
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
                  style={[styles.pickerItem, provinceCode === item.code && styles.pickerItemActive]}
                  onPress={() => handleSelectProvince(item)}
                >
                  <Text style={[styles.pickerItemText, provinceCode === item.code && styles.pickerItemTextActive]}>
                    {item.name}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </View>
      )}

      {showWardPicker && (
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
                  key={item.code}
                  style={[styles.pickerItem, wardName === item.name && styles.pickerItemActive]}
                  onPress={() => {
                    setWardName(item.name);
                    setShowWardPicker(false);
                  }}
                >
                  <Text style={[styles.pickerItemText, wardName === item.name && styles.pickerItemTextActive]}>
                    {item.name}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: AppColors.background },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: Platform.OS === 'ios' ? 56 : 40,
    paddingBottom: 16,
    paddingHorizontal: Spacing.lg,
  },
  backBtn: { padding: 4 },
  headerTitle: { fontSize: 18, fontWeight: '700', color: AppColors.text },

  card: {
    backgroundColor: AppColors.surface,
    marginHorizontal: Spacing.lg,
    borderRadius: BorderRadius.lg,
    padding: Spacing.lg,
    marginBottom: Spacing.md,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 3,
    elevation: 1,
  },
  sectionTitle: { fontSize: 15, fontWeight: '700', color: AppColors.text, marginBottom: 12 },
  subTitle: { fontSize: 12, color: AppColors.textSecondary },
  fieldGroup: { marginBottom: Spacing.md },
  input: {
    borderWidth: 1,
    borderColor: AppColors.border,
    borderRadius: BorderRadius.sm,
    paddingHorizontal: Spacing.md,
    paddingVertical: 12,
    fontSize: 14,
    color: AppColors.text,
  },
  addressHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  linkText: { fontSize: 12, color: AppColors.primary, fontWeight: '600' },
  addressList: { gap: 12 },
  addressOption: {
    width: 200,
    borderWidth: 1,
    borderColor: AppColors.borderLight,
    borderRadius: BorderRadius.sm,
    padding: 10,
    backgroundColor: '#FFF',
  },
  addressOptionActive: {
    borderColor: AppColors.primary,
    backgroundColor: 'rgba(139, 26, 26, 0.06)',
  },
  addressNameText: { fontSize: 13, fontWeight: '700', color: AppColors.text },
  addressPhoneText: { fontSize: 12, color: AppColors.textSecondary, marginVertical: 2 },
  addressDetailText: { fontSize: 12, color: AppColors.textSecondary },
  emptyHelper: { fontSize: 12, color: AppColors.textMuted },
  dateInput: {
    borderWidth: 1,
    borderColor: AppColors.border,
    borderRadius: BorderRadius.sm,
    paddingHorizontal: Spacing.md,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  dateText: { fontSize: 14, color: AppColors.text },
  datePlaceholder: { color: AppColors.textMuted },
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

  paymentOption: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: AppColors.borderLight,
  },
  paymentOptionActive: {
    backgroundColor: 'rgba(139, 26, 26, 0.04)',
    borderRadius: BorderRadius.sm,
    paddingHorizontal: 12,
  },
  radio: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: AppColors.border,
  },
  radioActive: {
    borderColor: AppColors.primary,
    borderWidth: 6,
  },
  paymentText: { fontSize: 14, color: AppColors.text },

  summaryRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
  summaryLabel: { fontSize: 12, color: AppColors.textSecondary },
  summaryValue: { fontSize: 12, fontWeight: '600', color: AppColors.text },
  summaryTotalLabel: { fontSize: 13, fontWeight: '700', color: AppColors.primary },
  summaryTotalValue: { fontSize: 18, fontWeight: '800', color: AppColors.primary },
  payloadText: { fontSize: 11, color: AppColors.textSecondary, lineHeight: 16 },

  errorBanner: {
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#FECACA',
    borderRadius: BorderRadius.sm,
    padding: Spacing.md,
    marginHorizontal: Spacing.lg,
    marginBottom: Spacing.md,
  },
  errorText: { color: AppColors.error, fontSize: 13 },

  footer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: AppColors.surface,
    borderTopWidth: 1,
    borderTopColor: AppColors.borderLight,
    paddingHorizontal: Spacing.xl,
    paddingTop: 12,
    paddingBottom: Platform.OS === 'ios' ? 34 : 16,
  },
  primaryBtn: {
    backgroundColor: AppColors.primary,
    borderRadius: BorderRadius.sm,
    paddingVertical: 14,
    alignItems: 'center',
  },
  primaryBtnText: { color: '#FFF', fontSize: 14, fontWeight: '700' },
  btnDisabled: { opacity: 0.6 },

  qrModal: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(15, 23, 42, 0.55)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  qrCard: {
    backgroundColor: '#FFF',
    borderRadius: BorderRadius.lg,
    padding: Spacing.xl,
    width: '100%',
    alignItems: 'center',
    gap: 12,
    shadowColor: '#0F172A',
    shadowOpacity: 0.08,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 4,
  },
  qrHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
    gap: 12,
  },
  qrHeaderIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(139, 26, 26, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  qrHeaderTextGroup: { flex: 1 },
  qrBoxShadow: {
    backgroundColor: '#FFF',
    borderRadius: 18,
    padding: 10,
    shadowColor: '#0F172A',
    shadowOpacity: 0.08,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 6 },
    elevation: 3,
  },
  qrBox: {
    width: 220,
    height: 220,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    backgroundColor: '#F8FAFC',
    justifyContent: 'center',
    alignItems: 'center',
  },
  qrTitle: { fontSize: 16, fontWeight: '700', color: AppColors.text },
  qrSubtitle: { fontSize: 12, color: AppColors.textSecondary, marginTop: 2 },
  qrPlaceholder: { fontSize: 12, color: AppColors.textMuted, textAlign: 'center' },
  qrImage: { width: 190, height: 190 },
  qrInfoRow: {
    width: '100%',
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  qrInfoItem: { alignItems: 'center', flex: 1 },
  qrInfoLabel: { fontSize: 11, color: AppColors.textSecondary, marginBottom: 4 },
  qrInfoValue: { fontSize: 13, fontWeight: '700', color: AppColors.text },
  qrInfoDivider: {
    width: 1,
    height: 32,
    backgroundColor: '#E2E8F0',
    marginHorizontal: 8,
  },
  qrActions: {
    width: '100%',
    flexDirection: 'row',
    gap: 12,
    justifyContent: 'space-between',
  },
  qrCountdownRow: {
    width: '100%',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 12,
  },
  qrCountdownLabel: { fontSize: 12, color: AppColors.textSecondary },
  qrCountdownValue: { fontSize: 13, fontWeight: '700', color: AppColors.text },
  qrCountdownUrgent: { color: '#DC2626' },
  qrExpiredBanner: {
    width: '100%',
    backgroundColor: '#FEF2F2',
    borderRadius: BorderRadius.sm,
    borderWidth: 1,
    borderColor: '#FECACA',
    paddingVertical: 8,
    paddingHorizontal: 10,
  },
  qrExpiredText: { fontSize: 12, color: '#DC2626', fontWeight: '600', textAlign: 'center' },
  secondaryBtn: {
    flex: 1,
    borderWidth: 1,
    borderColor: AppColors.primary,
    borderRadius: BorderRadius.sm,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: '#FFF',
  },
  secondaryBtnText: { color: AppColors.primary, fontSize: 12, fontWeight: '700' },
  successText: { fontSize: 14, fontWeight: '700', color: AppColors.success },

  defaultBadge: {
    position: 'absolute', top: -8, right: -8, backgroundColor: AppColors.primary,
    color: '#FFF', fontSize: 9, fontWeight: '700', paddingHorizontal: 6, paddingVertical: 2,
    borderRadius: 8, overflow: 'hidden'
  },
  loadingText: { fontSize: 13, color: AppColors.textSecondary, fontStyle: 'italic', marginVertical: 8 },
  dateActions: {
    flexDirection: 'row',
    width: '100%',
    justifyContent: 'space-between',
    gap: 12,
    marginTop: 20
  },
  pickerOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(15, 23, 42, 0.55)',
    justifyContent: 'center',
    padding: 20,
  },
  pickerCard: {
    backgroundColor: '#FFF',
    borderRadius: BorderRadius.lg,
    maxHeight: '70%',
    paddingVertical: Spacing.md,
  },
  pickerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: AppColors.borderLight,
  },
  pickerTitle: { fontSize: 16, fontWeight: '700', color: AppColors.text },
  pickerList: { maxHeight: 420 },
  pickerItem: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: AppColors.borderLight,
  },
  pickerItemActive: { backgroundColor: 'rgba(139, 26, 26, 0.06)' },
  pickerItemText: { fontSize: 13, color: AppColors.textSecondary },
  pickerItemTextActive: { color: AppColors.primary, fontWeight: '700' },

  center: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 12 },
  emptyTitle: { fontSize: 16, fontWeight: '700', color: AppColors.text },
});
