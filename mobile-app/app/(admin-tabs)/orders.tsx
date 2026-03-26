import React, { useEffect, useMemo, useState } from 'react';
import {
    View,
    Text,
    StyleSheet,
    FlatList,
    TouchableOpacity,
    RefreshControl,
    Alert,
    Image,
    Modal,
    TextInput,
    ScrollView,
    Linking,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { AppColors, BorderRadius, Spacing } from '../../constants/theme';
import { adminService } from '../../services/adminService';
import { useAuth } from '../../contexts/AuthContext';
import { orderService, type OrderDto } from '../../services/orderService';

const STATUS_LABELS: Record<string, string> = {
    PAYMENT_CONFIRMING: 'Chờ thanh toán',
    PREPARING: 'Đang chuẩn bị',
    SHIPPING: 'Đang giao',
    PARTIAL_DELIVERY: 'Giao một phần',
    DELIVERY_FAILED: 'Giao thất bại',
    COMPLETED: 'Hoàn tất',
    CANCELLED: 'Đã hủy',
    REFUNDING: 'Đang hoàn tiền',
    REFUNDED: 'Đã hoàn tiền',
};

const STATUS_COLORS: Record<string, { bg: string; text: string }> = {
    PAYMENT_CONFIRMING: { bg: '#FEF3C7', text: '#92400E' },
    PREPARING: { bg: '#DBEAFE', text: '#1E40AF' },
    SHIPPING: { bg: '#E0E7FF', text: '#3730A3' },
    PARTIAL_DELIVERY: { bg: '#FFEDD5', text: '#9A3412' },
    DELIVERY_FAILED: { bg: '#FEE2E2', text: '#991B1B' },
    COMPLETED: { bg: '#D1FAE5', text: '#065F46' },
    CANCELLED: { bg: '#F3F4F6', text: '#374151' },
    REFUNDING: { bg: '#FEE2E2', text: '#991B1B' },
    REFUNDED: { bg: '#EDE9FE', text: '#5B21B6' },
};

// Backend transition map (mirrors IsValidStatusTransition in OrderService.cs)
const VALID_TRANSITIONS: Record<string, { value: string; label: string }[]> = {
    PAYMENT_CONFIRMING: [
        { value: 'PREPARING', label: 'Đang chuẩn bị' },
        { value: 'CANCELLED', label: 'Đã hủy' },
    ],
    PREPARING: [
        { value: 'SHIPPING', label: 'Đang giao' },
        { value: 'CANCELLED', label: 'Đã hủy' },
    ],
    SHIPPING: [
        { value: 'COMPLETED', label: 'Hoàn tất' },
        { value: 'PARTIAL_DELIVERY', label: 'Giao một phần' },
        { value: 'DELIVERY_FAILED', label: 'Giao thất bại' },
        { value: 'CANCELLED', label: 'Đã hủy' },
    ],
    DELIVERY_FAILED: [
        { value: 'SHIPPING', label: 'Giao lại' },
        { value: 'CANCELLED', label: 'Đã hủy' },
    ],
    PARTIAL_DELIVERY: [
        { value: 'SHIPPING', label: 'Giao lại phần còn lại' },
        { value: 'COMPLETED', label: 'Hoàn tất' },
        { value: 'CANCELLED', label: 'Đã hủy' },
    ],
    REFUNDING: [
        { value: 'REFUNDED', label: 'Đã hoàn tiền' },
    ],
};

export default function AdminOrdersScreen() {
    const { user } = useAuth();
    const isAdmin = user ? String(user.Role).toUpperCase() === 'ADMIN' || Number(user.Role) === 2 : false;
    const isStaff = user ? String(user.Role).toUpperCase() === 'STAFF' || Number(user.Role) === 1 : false;

    const [loading, setLoading] = useState(false);
    const [statusFilter, setStatusFilter] = useState<string | undefined>(undefined);
    const [orders, setOrders] = useState<any[]>([]);

    // Modal state
    const [modalVisible, setModalVisible] = useState(false);
    const [selectedOrder, setSelectedOrder] = useState<any>(null);
    const [newStatus, setNewStatus] = useState('PREPARING');
    const [statusNote, setStatusNote] = useState('');
    const [updating, setUpdating] = useState(false);

    // Detail modal state
    const [detailVisible, setDetailVisible] = useState(false);
    const [detailLoading, setDetailLoading] = useState(false);
    const [detailOrder, setDetailOrder] = useState<OrderDto | null>(null);

    const openDetailModal = async (orderId: string) => {
        setDetailVisible(true);
        setDetailLoading(true);
        setDetailOrder(null);
        try {
            const data = await orderService.getOrderDetailById(orderId);
            setDetailOrder(data);
        } catch {
            // ignore
        } finally {
            setDetailLoading(false);
        }
    };

    const loadOrders = async () => {
        setLoading(true);
        try {
            const res = await adminService.getOrders({ status: statusFilter, page: 1, pageSize: 20 });

            if (Array.isArray(res)) {
                setOrders(res);
            } else if (Array.isArray(res?.items)) {
                setOrders(res.items);
            } else if (Array.isArray(res?.Items)) {
                setOrders(res.Items);
            } else if (Array.isArray(res?.data)) {
                setOrders(res.data);
            } else if (Array.isArray(res?.Data)) {
                setOrders(res.Data);
            } else {
                setOrders([]);
            }
        } catch {
            setOrders([]);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadOrders();
    }, [statusFilter]);

    const statuses = useMemo(() => {
        if (isStaff) {
            return ['PREPARING', 'SHIPPING', 'PARTIAL_DELIVERY', 'DELIVERY_FAILED', 'REFUNDING', 'REFUNDED'];
        }
        return ['PREPARING', 'SHIPPING', 'PARTIAL_DELIVERY', 'COMPLETED', 'CANCELLED', 'DELIVERY_FAILED', 'REFUNDING', 'REFUNDED'];
    }, [isStaff]);

    const openModal = (order: any) => {
        const currentStatus = String(order?.status ?? order?.Status ?? '');
        const options = VALID_TRANSITIONS[currentStatus] ?? [];
        setSelectedOrder(order);
        setNewStatus(options.length > 0 ? options[0].value : '');
        setStatusNote('');
        setModalVisible(true);
    };

    const handleUpdateStatus = async () => {
        if (!selectedOrder) return;
        const orderId = String(selectedOrder?.id ?? selectedOrder?.Id ?? '');
        setUpdating(true);
        try {
            await adminService.updateOrderStatus(orderId, newStatus, statusNote || undefined);
            Alert.alert('Thành công', 'Đã cập nhật trạng thái đơn hàng!');
            setModalVisible(false);
            loadOrders();
        } catch (error: any) {
            Alert.alert('Lỗi', error?.response?.data?.message || error?.message || 'Cập nhật thất bại.');
        } finally {
            setUpdating(false);
        }
    };

    const getStatusLabel = (s: string) => STATUS_LABELS[s] ?? s;
    const getStatusColor = (s: string) => STATUS_COLORS[s] ?? { bg: '#F3F4F6', text: '#374151' };

    return (
        <View style={styles.screen}>
            <View style={styles.header}>
                <Text style={styles.title}>Quản lý đơn hàng</Text>
                <Text style={styles.subtitle}>
                    {isStaff
                        ? 'Staff: xử lý đơn cần giao, xác nhận đã giao.'
                        : 'Admin: theo dõi tổng quan trạng thái đơn hàng.'}
                </Text>
            </View>

            <FlatList
                data={orders}
                keyExtractor={(item, idx) => String(item?.id ?? item?.Id ?? idx)}
                contentContainerStyle={styles.listContent}
                refreshControl={<RefreshControl refreshing={loading} onRefresh={loadOrders} />}
                ListHeaderComponent={
                    <View>
                        <View style={styles.filterRow}>
                            <TouchableOpacity
                                style={[styles.filterChip, !statusFilter && styles.filterChipActive]}
                                onPress={() => setStatusFilter(undefined)}
                            >
                                <Text style={[styles.filterText, !statusFilter && styles.filterTextActive]}>Tất cả</Text>
                            </TouchableOpacity>

                            {statuses.map((s) => (
                                <TouchableOpacity
                                    key={s}
                                    style={[styles.filterChip, statusFilter === s && styles.filterChipActive]}
                                    onPress={() => setStatusFilter(s)}
                                >
                                    <Text style={[styles.filterText, statusFilter === s && styles.filterTextActive]}>
                                        {getStatusLabel(s)}
                                    </Text>
                                </TouchableOpacity>
                            ))}
                        </View>
                    </View>
                }
                renderItem={({ item }) => {
                    const orderId = String(item?.id ?? item?.Id ?? '');
                    const code = (item?.orderCode ?? item?.OrderCode ?? orderId) || 'N/A';
                    const customer = item?.customerName ?? item?.CustomerName ?? 'Khách hàng';
                    const status = String(item?.status ?? item?.Status ?? 'N/A');
                    const total = item?.totalAmount ?? item?.TotalAmount ?? 0;
                    const statusColor = getStatusColor(status);

                    return (
                        <View
                            style={[
                                styles.orderCard,
                                status === 'REFUNDING' && { backgroundColor: '#FEF2F2', borderColor: '#FECACA' }
                            ]}
                        >
                            <View style={styles.orderHeader}>
                                <Text style={styles.orderCode}>#{String(code)}</Text>
                                <View style={[styles.statusBadge, { backgroundColor: statusColor.bg }]}>
                                    <Text style={[styles.statusBadgeText, { color: statusColor.text }]}>
                                        {getStatusLabel(status)}
                                    </Text>
                                </View>
                            </View>
                            <Text style={styles.orderText}>Khách: {String(customer)}</Text>
                            <Text style={styles.orderTotal}>{Number(total).toLocaleString('vi-VN')}đ</Text>

                            {/* Google Maps button for shipping orders */}
                            {['SHIPPING', 'DELIVERY_FAILED', 'PARTIAL_DELIVERY'].includes(status) && (() => {
                                const addr = String(item?.deliveryAddress ?? item?.DeliveryAddress ?? '');
                                if (!addr) return null;
                                return (
                                    <TouchableOpacity
                                        style={styles.mapBtn}
                                        onPress={(e) => {
                                            e.stopPropagation();
                                            const url = `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(addr)}`;
                                            Linking.openURL(url);
                                        }}
                                    >
                                        <Ionicons name="navigate-outline" size={16} color="#1D4ED8" />
                                        <Text style={styles.mapBtnText}>Chỉ đường giao hàng</Text>
                                    </TouchableOpacity>
                                );
                            })()}

                            <View style={{ flexDirection: 'row', gap: 10, marginTop: 12 }}>
                                <TouchableOpacity style={[styles.cancelBtn, { paddingVertical: 8 }]} onPress={() => openDetailModal(orderId)}>
                                    <Text style={styles.cancelBtnText}>Chi tiết</Text>
                                </TouchableOpacity>
                                <TouchableOpacity style={[styles.updateBtn, { paddingVertical: 8 }]} onPress={() => openModal(item)}>
                                    <Text style={styles.updateBtnText}>Cập nhật</Text>
                                </TouchableOpacity>
                            </View>
                        </View>
                    );
                }}
                ListEmptyComponent={!loading ? <Text style={styles.emptyText}>Không có đơn hàng.</Text> : null}
            />

            {/* ─── Detail Modal ─── */}
            <Modal
                visible={detailVisible}
                animationType="slide"
                transparent
                onRequestClose={() => setDetailVisible(false)}
            >
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <View style={styles.modalHeader}>
                            <Text style={styles.modalTitle}>Chi tiết đơn hàng</Text>
                            <TouchableOpacity onPress={() => setDetailVisible(false)}>
                                <Ionicons name="close" size={22} color={AppColors.textMuted} />
                            </TouchableOpacity>
                        </View>

                        <ScrollView showsVerticalScrollIndicator={false}>
                            {detailLoading ? (
                                <Text style={{ textAlign: 'center', padding: 20, color: AppColors.textMuted }}>Đang tải...</Text>
                            ) : !detailOrder ? (
                                <Text style={{ textAlign: 'center', padding: 20, color: AppColors.textMuted }}>Không thể tải thông tin</Text>
                            ) : (
                                <>
                                    <View style={styles.modalInfoBox}>
                                        <Text style={styles.modalInfoLabel}>Mã đơn hàng</Text>
                                        <Text style={styles.modalInfoValue}>{detailOrder.OrderCode}</Text>

                                        <Text style={styles.modalInfoLabel}>Khách hàng</Text>
                                        <Text style={styles.modalInfoValue}>{detailOrder.Email}</Text>

                                        <Text style={styles.modalInfoLabel}>Trạng thái</Text>
                                        <Text style={styles.modalInfoValue}>{getStatusLabel(String(detailOrder.Status))}</Text>
                                        
                                        <Text style={styles.modalInfoLabel}>Ngày đặt</Text>
                                        <Text style={styles.modalInfoValue}>{detailOrder.CreatedAt ? new Date(detailOrder.CreatedAt).toLocaleString('vi-VN') : ''}</Text>
                                        
                                        {(detailOrder.CustomerBankName || detailOrder.CustomerBankAccount) && (
                                            <>
                                                <Text style={styles.modalInfoLabel}>Ngân hàng</Text>
                                                <Text style={styles.modalInfoValue}>{detailOrder.CustomerBankName} - STK: {detailOrder.CustomerBankAccount}</Text>
                                            </>
                                        )}
                                        {detailOrder.GreetingMessage && (
                                            <>
                                                <Text style={styles.modalInfoLabel}>Lời chúc</Text>
                                                <Text style={styles.modalInfoValue}>{detailOrder.GreetingMessage}</Text>
                                            </>
                                        )}
                                    </View>

                                    <Text style={styles.sectionLabel}>Sản phẩm ({detailOrder.Items.length})</Text>
                                    <View style={styles.modalInfoBox}>
                                        {detailOrder.Items.map((item, idx) => (
                                            <View key={idx} style={{ flexDirection: 'row', gap: 10, paddingVertical: 8, borderBottomWidth: idx === detailOrder.Items.length - 1 ? 0 : 1, borderBottomColor: AppColors.borderLight }}>
                                                {item.Image ? (
                                                    <Image source={{ uri: item.Image }} style={{ width: 40, height: 40, borderRadius: 6, backgroundColor: '#eee' }} />
                                                ) : (
                                                    <View style={{ width: 40, height: 40, borderRadius: 6, backgroundColor: '#eee', alignItems: 'center', justifyContent: 'center' }}>
                                                        <Ionicons name="image-outline" size={20} color={AppColors.textMuted} />
                                                    </View>
                                                )}
                                                <View style={{ flex: 1, justifyContent: 'center' }}>
                                                    <Text style={{ fontSize: 13, fontWeight: '600', color: AppColors.text }} numberOfLines={2}>
                                                        {item.Name || 'Sản phẩm'}
                                                    </Text>
                                                    <Text style={{ fontSize: 11, color: AppColors.textSecondary }}>Loại: {item.Type}</Text>
                                                </View>
                                                <View style={{ alignItems: 'flex-end', justifyContent: 'center' }}>
                                                    <Text style={{ fontSize: 13, fontWeight: '700', color: AppColors.text }}>
                                                        {Number(item.UnitPrice ?? item.Price ?? 0).toLocaleString('vi-VN')}đ
                                                    </Text>
                                                    <Text style={{ fontSize: 11, color: AppColors.textSecondary }}>x{item.Quantity}</Text>
                                                </View>
                                            </View>
                                        ))}
                                        <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 12, paddingTop: 12, borderTopWidth: 1, borderTopColor: AppColors.borderLight }}>
                                            <Text style={{ fontSize: 14, fontWeight: '700', color: AppColors.text }}>Tổng cộng</Text>
                                            <Text style={{ fontSize: 16, fontWeight: '700', color: AppColors.primary }}>
                                                {Number(detailOrder.TotalAmount).toLocaleString('vi-VN')}đ
                                            </Text>
                                        </View>
                                    </View>

                                    {detailOrder.DeliveryAddresses && detailOrder.DeliveryAddresses.length > 0 && (
                                        <>
                                            <Text style={styles.sectionLabel}>Giao hàng</Text>
                                            <View style={styles.modalInfoBox}>
                                                {detailOrder.DeliveryAddresses.map((addr, idx) => (
                                                    <View key={addr.Id || idx} style={{ marginBottom: idx === detailOrder.DeliveryAddresses!.length - 1 ? 0 : 12 }}>
                                                        <Text style={{ fontSize: 13, fontWeight: '600', color: AppColors.text }}>{addr.ReceiverName} - {addr.ReceiverPhone}</Text>
                                                        <Text style={{ fontSize: 12, color: AppColors.textSecondary, marginTop: 4 }}>{addr.FullAddress}</Text>
                                                        {addr.GreetingMessage && (
                                                            <View style={{ marginTop: 6, backgroundColor: '#fff', padding: 6, borderRadius: 4, borderWidth: 1, borderColor: '#eee' }}>
                                                                <Text style={{ fontSize: 11, fontStyle: 'italic', color: AppColors.textSecondary }}>"{addr.GreetingMessage}"</Text>
                                                            </View>
                                                        )}
                                                    </View>
                                                ))}
                                            </View>
                                        </>
                                    )}
                                </>
                            )}
                        </ScrollView>
                    </View>
                </View>
            </Modal>

            {/* ─── Update Status Modal ─── */}
            <Modal
                visible={modalVisible}
                animationType="slide"
                transparent
                onRequestClose={() => setModalVisible(false)}
            >
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <ScrollView showsVerticalScrollIndicator={false}>
                            {/* Header */}
                            <View style={styles.modalHeader}>
                                <Text style={styles.modalTitle}>Cập nhật trạng thái</Text>
                                <TouchableOpacity onPress={() => setModalVisible(false)}>
                                    <Ionicons name="close" size={22} color={AppColors.textMuted} />
                                </TouchableOpacity>
                            </View>

                            {selectedOrder && (
                                <>
                                    {/* Order info */}
                                    <View style={styles.modalInfoBox}>
                                        <Text style={styles.modalInfoLabel}>Mã đơn hàng</Text>
                                        <Text style={styles.modalInfoValue}>
                                            {selectedOrder?.orderCode ?? selectedOrder?.OrderCode ?? 'N/A'}
                                        </Text>
                                        <Text style={styles.modalInfoLabel}>Khách hàng</Text>
                                        <Text style={styles.modalInfoValue}>
                                            {selectedOrder?.customerName ?? selectedOrder?.CustomerName ?? ''}
                                        </Text>
                                        <Text style={styles.modalInfoLabel}>Trạng thái hiện tại</Text>
                                        <View style={[styles.statusBadge, {
                                            backgroundColor: getStatusColor(String(selectedOrder?.status ?? selectedOrder?.Status)).bg,
                                            alignSelf: 'flex-start',
                                            marginTop: 4,
                                        }]}>
                                            <Text style={[styles.statusBadgeText, {
                                                color: getStatusColor(String(selectedOrder?.status ?? selectedOrder?.Status)).text,
                                            }]}>
                                                {getStatusLabel(String(selectedOrder?.status ?? selectedOrder?.Status ?? ''))}
                                            </Text>
                                        </View>
                                    </View>

                                    {/* QR code section for REFUNDING */}
                                    {String(selectedOrder?.status ?? selectedOrder?.Status) === 'REFUNDING' && (
                                        <View style={styles.refundContainer}>
                                            <Text style={styles.refundTitle}>Quét mã QR để hoàn tiền</Text>
                                            {(selectedOrder?.bankName || selectedOrder?.BankName) && (selectedOrder?.bankAccountNumber || selectedOrder?.BankAccountNumber) ? (
                                                <>
                                                    <Text style={styles.refundText}>
                                                        Ngân hàng: {selectedOrder?.bankName || selectedOrder?.BankName}
                                                    </Text>
                                                    <Text style={styles.refundText}>
                                                        STK: {selectedOrder?.bankAccountNumber || selectedOrder?.BankAccountNumber}
                                                    </Text>
                                                    <Text style={styles.refundText}>
                                                        Số tiền: {Number(selectedOrder?.totalAmount ?? selectedOrder?.TotalAmount ?? 0).toLocaleString('vi-VN')}đ
                                                    </Text>
                                                    <View style={styles.qrCodeWrapper}>
                                                        <Image
                                                            source={{
                                                                uri: `https://qr.sepay.vn/img?acc=${selectedOrder?.bankAccountNumber || selectedOrder?.BankAccountNumber}&bank=${selectedOrder?.bankName || selectedOrder?.BankName}&amount=${selectedOrder?.totalAmount ?? selectedOrder?.TotalAmount ?? 0}&des=Hoan tien don hang ${selectedOrder?.orderCode ?? selectedOrder?.OrderCode ?? ''}`,
                                                            }}
                                                            style={styles.qrCode}
                                                            resizeMode="contain"
                                                        />
                                                    </View>
                                                    <Text style={styles.refundHint}>Scan bằng App Ngân Hàng / ZaloPay / MoMo</Text>
                                                </>
                                            ) : (
                                                <Text style={styles.refundWarning}>
                                                    Khách hàng chưa cung cấp thông tin tài khoản ngân hàng trong hồ sơ cá nhân. Vui lòng liên hệ trực tiếp để hoàn tiền.
                                                </Text>
                                            )}
                                        </View>
                                    )}

                                    {/* Status picker — only valid transitions */}
                                    {(() => {
                                        const currentStatus = String(selectedOrder?.status ?? selectedOrder?.Status ?? '');
                                        const options = VALID_TRANSITIONS[currentStatus] ?? [];
                                        if (options.length === 0) {
                                            return (
                                                <View style={{ marginBottom: 16 }}>
                                                    <Text style={{ fontSize: 13, color: AppColors.textMuted, textAlign: 'center' }}>
                                                        Không có thao tác chuyển trạng thái khả dụng.
                                                    </Text>
                                                </View>
                                            );
                                        }
                                        return (
                                            <>
                                                <Text style={styles.sectionLabel}>Trạng thái mới</Text>
                                                <View style={styles.statusPicker}>
                                                    {options.map((opt) => (
                                                        <TouchableOpacity
                                                            key={opt.value}
                                                            style={[
                                                                styles.statusOption,
                                                                newStatus === opt.value && styles.statusOptionActive,
                                                            ]}
                                                            onPress={() => setNewStatus(opt.value)}
                                                        >
                                                            <Text
                                                                style={[
                                                                    styles.statusOptionText,
                                                                    newStatus === opt.value && styles.statusOptionTextActive,
                                                                ]}
                                                            >
                                                                {opt.label}
                                                            </Text>
                                                        </TouchableOpacity>
                                                    ))}
                                                </View>
                                            </>
                                        );
                                    })()}

                                    {/* Note */}
                                    <Text style={styles.sectionLabel}>Ghi chú (Tùy chọn)</Text>
                                    <TextInput
                                        style={styles.noteInput}
                                        placeholder="Nhập thêm ghi chú với khách hàng hoặc nhân viên..."
                                        value={statusNote}
                                        onChangeText={setStatusNote}
                                        multiline
                                        numberOfLines={3}
                                        textAlignVertical="top"
                                    />

                                    {/* Action buttons */}
                                    <View style={styles.modalActions}>
                                        <TouchableOpacity
                                            style={styles.cancelBtn}
                                            onPress={() => setModalVisible(false)}
                                        >
                                            <Text style={styles.cancelBtnText}>Hủy</Text>
                                        </TouchableOpacity>
                                        <TouchableOpacity
                                            style={[styles.updateBtn, updating && { opacity: 0.6 }]}
                                            onPress={handleUpdateStatus}
                                            disabled={updating}
                                        >
                                            <Text style={styles.updateBtnText}>
                                                {updating ? 'Đang cập nhật...' : 'Cập nhật'}
                                            </Text>
                                        </TouchableOpacity>
                                    </View>
                                </>
                            )}
                        </ScrollView>
                    </View>
                </View>
            </Modal>
        </View>
    );
}

const styles = StyleSheet.create({
    screen: { flex: 1, backgroundColor: AppColors.background },
    header: {
        paddingTop: 56,
        paddingHorizontal: Spacing.lg,
        paddingBottom: Spacing.md,
    },
    title: { fontSize: 22, fontWeight: '800', color: AppColors.text },
    subtitle: { marginTop: 2, fontSize: 12, color: AppColors.textSecondary },
    listContent: { paddingHorizontal: Spacing.lg, paddingBottom: 24 },
    filterRow: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 8,
        marginBottom: Spacing.md,
    },
    filterChip: {
        borderWidth: 1,
        borderColor: AppColors.border,
        borderRadius: 16,
        paddingHorizontal: 10,
        paddingVertical: 6,
        backgroundColor: '#FFF',
    },
    filterChipActive: {
        backgroundColor: AppColors.primary,
        borderColor: AppColors.primary,
    },
    filterText: {
        color: AppColors.textSecondary,
        fontSize: 12,
        fontWeight: '600',
    },
    filterTextActive: {
        color: '#FFF',
    },
    orderCard: {
        backgroundColor: '#FFF',
        borderRadius: BorderRadius.md,
        padding: Spacing.md,
        marginBottom: 10,
        borderWidth: 1,
        borderColor: AppColors.borderLight,
    },
    orderHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 6,
    },
    orderCode: {
        fontSize: 14,
        fontWeight: '700',
        color: AppColors.primary,
    },
    statusBadge: {
        paddingHorizontal: 8,
        paddingVertical: 3,
        borderRadius: 12,
    },
    statusBadgeText: {
        fontSize: 11,
        fontWeight: '700',
    },
    orderText: {
        fontSize: 13,
        color: AppColors.textSecondary,
        marginBottom: 2,
    },
    orderTotal: {
        fontSize: 15,
        fontWeight: '700',
        color: AppColors.text,
        marginTop: 6,
    },
    emptyText: {
        color: AppColors.textMuted,
        fontSize: 13,
        marginTop: 20,
    },

    /* ─── Modal ─── */
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'flex-end',
    },
    modalContent: {
        backgroundColor: '#FFF',
        borderTopLeftRadius: 20,
        borderTopRightRadius: 20,
        padding: 20,
        maxHeight: '85%',
    },
    modalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 16,
    },
    modalTitle: {
        fontSize: 18,
        fontWeight: '800',
        color: AppColors.text,
    },
    modalClose: {
        fontSize: 20,
        color: AppColors.textMuted,
        padding: 4,
    },
    modalInfoBox: {
        backgroundColor: '#F9FAFB',
        borderRadius: BorderRadius.md,
        padding: 12,
        marginBottom: 16,
    },
    modalInfoLabel: {
        fontSize: 11,
        color: AppColors.textMuted,
        fontWeight: '600',
        textTransform: 'uppercase',
        marginTop: 8,
    },
    modalInfoValue: {
        fontSize: 14,
        color: AppColors.text,
        fontWeight: '600',
        marginTop: 2,
    },

    /* Status picker */
    sectionLabel: {
        fontSize: 13,
        fontWeight: '700',
        color: AppColors.text,
        marginBottom: 8,
        marginTop: 4,
    },
    statusPicker: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 8,
        marginBottom: 16,
    },
    statusOption: {
        borderWidth: 1.5,
        borderColor: AppColors.border,
        borderRadius: 20,
        paddingHorizontal: 14,
        paddingVertical: 8,
        backgroundColor: '#FFF',
    },
    statusOptionActive: {
        backgroundColor: AppColors.primary,
        borderColor: AppColors.primary,
    },
    statusOptionText: {
        fontSize: 12,
        fontWeight: '600',
        color: AppColors.textSecondary,
    },
    statusOptionTextActive: {
        color: '#FFF',
    },

    /* Note input */
    noteInput: {
        borderWidth: 1,
        borderColor: AppColors.border,
        borderRadius: BorderRadius.md,
        padding: 12,
        fontSize: 13,
        color: AppColors.text,
        minHeight: 70,
        marginBottom: 20,
        backgroundColor: '#F9FAFB',
    },

    /* Action buttons */
    modalActions: {
        flexDirection: 'row',
        gap: 10,
    },
    cancelBtn: {
        flex: 1,
        borderWidth: 1,
        borderColor: AppColors.border,
        borderRadius: BorderRadius.md,
        paddingVertical: 12,
        alignItems: 'center',
    },
    cancelBtnText: {
        fontSize: 14,
        fontWeight: '600',
        color: AppColors.textSecondary,
    },
    updateBtn: {
        flex: 1,
        backgroundColor: AppColors.primary,
        borderRadius: BorderRadius.md,
        paddingVertical: 12,
        alignItems: 'center',
    },
    updateBtnText: {
        fontSize: 14,
        fontWeight: '700',
        color: '#FFF',
    },

    /* Refund */
    refundContainer: {
        marginBottom: 16,
        padding: 12,
        backgroundColor: '#FEF2F2',
        borderRadius: BorderRadius.md,
        borderWidth: 1,
        borderColor: '#FECACA',
        alignItems: 'center',
    },
    refundTitle: {
        fontSize: 14,
        fontWeight: 'bold',
        color: '#991B1B',
        marginBottom: 8,
    },
    refundText: {
        fontSize: 12,
        color: '#B91C1C',
        textAlign: 'center',
    },
    refundHint: {
        fontSize: 11,
        color: '#DC2626',
        textAlign: 'center',
        marginTop: 4,
    },
    qrCodeWrapper: {
        backgroundColor: '#FFF',
        padding: 4,
        borderRadius: 8,
        marginVertical: 10,
    },
    qrCode: {
        width: 180,
        height: 180,
    },
    refundWarning: {
        fontSize: 13,
        color: '#B91C1C',
        textAlign: 'center',
        marginTop: 4,
    },
    mapBtn: {
        marginTop: 8,
        backgroundColor: '#EEF7FF',
        borderWidth: 1,
        borderColor: '#93C5FD',
        borderRadius: 8,
        paddingVertical: 8,
        paddingHorizontal: 12,
        alignItems: 'center',
    },
    mapBtnText: {
        fontSize: 13,
        fontWeight: '700',
        color: '#1D4ED8',
    },
});
