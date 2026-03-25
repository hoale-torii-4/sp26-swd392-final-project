import React, { useState, useEffect, useRef } from 'react';
import {
    View, Text, ScrollView, TouchableOpacity, StyleSheet,
    Dimensions, Platform, FlatList,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { productService, type GiftBoxDetailDto } from '../../services/productService';
import { cartService, cartEvents } from '../../services/cartService';
import { AppColors, Spacing, BorderRadius } from '../../constants/theme';
import LoadingSpinner from '../../components/LoadingSpinner';

const { width } = Dimensions.get('window');

function formatPrice(v: number) {
    return v.toLocaleString('vi-VN') + '₫';
}

export default function ProductDetailScreen() {
    const { id, type } = useLocalSearchParams<{ id: string; type?: string }>();
    const router = useRouter();

    const [product, setProduct] = useState<GiftBoxDetailDto | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [selectedImage, setSelectedImage] = useState(0);
    const [quantity, setQuantity] = useState(1);
    const [cartQuantity, setCartQuantity] = useState(0);
    const [addingToCart, setAddingToCart] = useState(false);
    const [cartMsg, setCartMsg] = useState<string | null>(null);
    const [cartMsgSuccess, setCartMsgSuccess] = useState(false);

    const scrollRef = useRef<FlatList>(null);

    useEffect(() => {
        if (!id) return;
        setLoading(true);
        const fetcher = type === 'item' ? productService.getItemByIdAsProduct : productService.getGiftBoxById;
        fetcher(id)
            .then((data) => { setProduct(data); setSelectedImage(0); })
            .catch(() => setError('Không tìm thấy sản phẩm.'))
            .finally(() => setLoading(false));
    }, [id, type]);

    useEffect(() => {
        if (!id || type === 'item') return;

        const syncCartQuantity = async () => {
            try {
                const cart = await cartService.getCart();
                const matched = cart.Items.find((item) =>
                    item.Type === 0 && (item.GiftBoxId === id || item.ProductId === id || item.Id === id)
                );
                if (matched) {
                    setCartQuantity(matched.Quantity);
                    setQuantity(matched.Quantity);
                } else {
                    setCartQuantity(0);
                    setQuantity(1);
                }
            } catch {
                // ignore cart sync errors
            }
        };

        syncCartQuantity();
        const stop = cartEvents.subscribe(() => {
            syncCartQuantity();
        });

        return () => {
            stop();
        };
    }, [id, type]);

    const stock = product?.StockQuantity;
    const isOutOfStock = stock !== undefined && stock <= 0;
    const isLowStock = stock !== undefined && stock > 0 && stock <= 5;

    const handleAddToCart = async () => {
        if (!product || addingToCart || isOutOfStock) return;
        setAddingToCart(true);
        setCartMsg(null);
        try {
            await cartService.addToCart({
                Type: 0,
                GiftBoxId: product.Id,
                Quantity: quantity,
            });
            setCartMsgSuccess(true);
            setCartMsg('Đã thêm vào giỏ hàng!');
            setTimeout(() => setCartMsg(null), 3000);
        } catch {
            setCartMsgSuccess(false);
            setCartMsg('Không thể thêm vào giỏ. Vui lòng thử lại.');
        } finally {
            setAddingToCart(false);
        }
    };

    if (loading) return <LoadingSpinner />;

    if (error || !product) {
        return (
            <View style={styles.centerContainer}>
                <Ionicons name="gift-outline" size={64} color={AppColors.border} />
                <Text style={styles.errorTitle}>Không tìm thấy sản phẩm</Text>
                <Text style={styles.errorDesc}>{error || 'Sản phẩm này không tồn tại hoặc đã ngưng bán.'}</Text>
                <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
                    <Text style={styles.backBtnText}>Quay lại bộ sưu tập</Text>
                </TouchableOpacity>
            </View>
        );
    }

    const images = product.Images && product.Images.length > 0
        ? product.Images
        : product.Image
            ? [product.Image]
            : [];

    return (
        <View style={styles.screen}>
            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 100 }}>
                {/* Back button */}
                <TouchableOpacity style={styles.backArrow} onPress={() => router.back()}>
                    <Ionicons name="arrow-back" size={24} color={AppColors.text} />
                </TouchableOpacity>

                {/* Image Gallery */}
                {images.length > 0 ? (
                    <View>
                        <FlatList
                            ref={scrollRef}
                            horizontal
                            pagingEnabled
                            showsHorizontalScrollIndicator={false}
                            data={images}
                            keyExtractor={(_, i) => i.toString()}
                            onMomentumScrollEnd={(e) => {
                                const idx = Math.round(e.nativeEvent.contentOffset.x / width);
                                setSelectedImage(idx);
                            }}
                            renderItem={({ item }) => (
                                <View style={styles.galleryImageWrap}>
                                    <Image source={{ uri: item }} style={styles.galleryImage} contentFit="cover" />
                                </View>
                            )}
                        />
                        {images.length > 1 && (
                            <View style={styles.dots}>
                                {images.map((_, i) => (
                                    <View
                                        key={i}
                                        style={[styles.dot, i === selectedImage && styles.dotActive]}
                                    />
                                ))}
                            </View>
                        )}
                    </View>
                ) : (
                    <View style={styles.noImagePlaceholder}>
                        <Ionicons name="gift-outline" size={64} color={AppColors.primary} />
                    </View>
                )}

                {/* Product Info */}
                <View style={styles.infoSection}>
                    {product.Collection && (
                        <Text style={styles.collectionTag}>{product.Collection}</Text>
                    )}
                    <Text style={styles.productName}>{product.Name}</Text>

                    {product.Tags && product.Tags.length > 0 && (
                        <View style={styles.tagsRow}>
                            {product.Tags.map((tag, idx) => (
                                <View key={idx} style={styles.tag}>
                                    <Text style={styles.tagText}>{tag}</Text>
                                </View>
                            ))}
                        </View>
                    )}

                    <Text style={styles.price}>{formatPrice(product.Price)}</Text>
                    {stock !== undefined && (
                        <View style={[styles.stockBadge, isOutOfStock ? styles.stockBadgeOut : isLowStock ? styles.stockBadgeLow : styles.stockBadgeOk]}>
                            <Ionicons name={isOutOfStock ? 'cube-outline' : 'cube'} size={14} color={isOutOfStock ? AppColors.error : isLowStock ? '#E67E22' : AppColors.success} />
                            <Text style={[styles.stockBadgeText, isOutOfStock && { color: AppColors.error }, isLowStock && { color: '#E67E22' }]}>
                                {isOutOfStock ? 'Hết hàng' : `Kho: ${stock} sản phẩm`}
                            </Text>
                        </View>
                    )}
                    <Text style={styles.description}>{product.Description}</Text>

                    <View style={styles.divider} />

                    {/* Quantity */}
                    {type !== 'item' && (
                        <View>
                            <View style={styles.qtyHeaderRow}>
                                <Text style={styles.qtyLabel}>Số lượng</Text>
                                {cartQuantity > 0 && (
                                    <Text style={styles.qtyInCart}>Đã có {cartQuantity} trong giỏ hàng</Text>
                                )}
                            </View>
                            <View style={styles.qtyControl}>
                                <TouchableOpacity
                                    style={[styles.qtyBtn, quantity <= 1 && styles.qtyBtnDisabled]}
                                    onPress={() => setQuantity((q) => Math.max(1, q - 1))}
                                    disabled={quantity <= 1}
                                >
                                    <Ionicons name="remove" size={18} color={quantity <= 1 ? AppColors.textMuted : AppColors.text} />
                                </TouchableOpacity>
                                <Text style={styles.qtyText}>{quantity}</Text>
                                <TouchableOpacity
                                    style={[styles.qtyBtn, (stock !== undefined && quantity >= stock) && styles.qtyBtnDisabled]}
                                    onPress={() => setQuantity((q) => stock !== undefined ? Math.min(stock, q + 1) : q + 1)}
                                    disabled={stock !== undefined && quantity >= stock}
                                >
                                    <Ionicons name="add" size={18} color={(stock !== undefined && quantity >= stock) ? AppColors.textMuted : AppColors.text} />
                                </TouchableOpacity>
                            </View>
                        </View>
                    )}

                    {/* Cart message */}
                    {cartMsg && (
                        <View style={[styles.cartMsgBanner, {
                            backgroundColor: cartMsgSuccess ? '#F0FDF4' : '#FEF2F2',
                            borderColor: cartMsgSuccess ? '#BBF7D0' : '#FECACA',
                        }]}>
                            <Text style={{ color: cartMsgSuccess ? AppColors.success : AppColors.error, fontSize: 13 }}>
                                {cartMsg}
                            </Text>
                        </View>
                    )}

                    {/* Trust badges */}
                    <View style={styles.trustGrid}>
                        <TrustBadge icon="checkmark-circle" text="Cam kết chính hãng" />
                        <TrustBadge icon="car" text="Giao hàng tận nơi" />
                        <TrustBadge icon="gift" text="Đóng gói cao cấp" />
                        <TrustBadge icon="shield-checkmark" text="Đổi trả dễ dàng" />
                    </View>
                </View>

                {/* Product Details Cards */}
                <View style={styles.detailCards}>
                    {/* Info card */}
                    <View style={styles.detailCard}>
                        <Text style={styles.detailCardTitle}>ℹ️ Thông tin sản phẩm</Text>
                        <InfoRow label="Tên sản phẩm" value={product.Name} />
                        <InfoRow label="Giá niêm yết" value={formatPrice(product.Price)} />
                        {product.Collection && <InfoRow label="Bộ sưu tập" value={product.Collection} />}
                        <InfoRow label="Số lượng món" value={`${product.Items.length} món`} />
                        <InfoRow label="Tồn kho" value={stock !== undefined ? `${stock} sản phẩm` : 'N/A'} />
                        <InfoRow label="Tình trạng" value={isOutOfStock ? 'Hết hàng' : 'Còn hàng'} />
                    </View>

                    {/* Items card */}
                    {product.Items.length > 0 && (
                        <View style={styles.detailCard}>
                            <Text style={styles.detailCardTitle}>🎁 Thành phần giỏ quà</Text>
                            {product.Items.map((item, idx) => (
                                <View key={idx} style={styles.giftItem}>
                                    <View style={styles.giftItemImage}>
                                        {item.Image ? (
                                            <Image source={{ uri: item.Image }} style={{ width: '100%', height: '100%' }} contentFit="cover" />
                                        ) : (
                                            <Ionicons name="cube-outline" size={16} color={AppColors.textMuted} />
                                        )}
                                    </View>
                                    <View style={{ flex: 1 }}>
                                        <Text style={styles.giftItemName} numberOfLines={1}>{item.Name}</Text>
                                        <Text style={styles.giftItemDetail}>SL: {item.Quantity} · {formatPrice(item.Price)}</Text>
                                    </View>
                                </View>
                            ))}
                        </View>
                    )}
                </View>
            </ScrollView>

            {/* Sticky info & add to cart */}
            {type !== 'item' && (
                <View style={[styles.stickyFooter, { paddingBottom: Platform.OS === 'ios' ? 34 : 16 }]}>
                    <TouchableOpacity
                        style={[styles.addToCartBtn, (addingToCart || isOutOfStock) && styles.btnDisabled]}
                        disabled={addingToCart || isOutOfStock}
                        onPress={handleAddToCart}
                    >
                        {addingToCart ? (
                            <LoadingSpinner />
                        ) : isOutOfStock ? (
                            <Text style={styles.addToCartText}>Hết hàng</Text>
                        ) : (
                            <>
                                <Ionicons name="cart-outline" size={20} color="#FFF" />
                                <Text style={styles.addToCartText}>Thêm vào giỏ hàng • {formatPrice(product.Price * quantity)}</Text>
                            </>
                        )}
                    </TouchableOpacity>
                </View>
            )}
        </View>
    );
}

function InfoRow({ label, value }: { label: string; value: string }) {
    return (
        <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>{label}</Text>
            <Text style={styles.infoValue}>{value}</Text>
        </View>
    );
}

function TrustBadge({ icon, text }: { icon: string; text: string }) {
    return (
        <View style={styles.trustBadge}>
            <Ionicons name={icon as any} size={16} color={AppColors.success} />
            <Text style={styles.trustText}>{text}</Text>
        </View>
    );
}

const styles = StyleSheet.create({
    screen: { flex: 1, backgroundColor: AppColors.background },
    centerContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 40, backgroundColor: AppColors.background },
    errorTitle: { fontSize: 18, fontWeight: '700', color: AppColors.text, marginTop: 16, marginBottom: 6 },
    errorDesc: { fontSize: 13, color: AppColors.textSecondary, textAlign: 'center', marginBottom: 20 },
    backBtn: { backgroundColor: AppColors.primary, borderRadius: BorderRadius.sm, paddingHorizontal: 20, paddingVertical: 12 },
    backBtnText: { color: '#FFF', fontSize: 13, fontWeight: '700' },

    backArrow: {
        position: 'absolute', top: Platform.OS === 'ios' ? 50 : 30, left: 16, zIndex: 10,
        width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.9)',
        justifyContent: 'center', alignItems: 'center',
        shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.1, shadowRadius: 3, elevation: 3,
    },

    galleryImageWrap: { width, aspectRatio: 1, backgroundColor: AppColors.surface },
    galleryImage: { width: '100%', height: '100%' },
    noImagePlaceholder: {
        width, aspectRatio: 1, backgroundColor: '#E8E8E4',
        justifyContent: 'center', alignItems: 'center',
    },
    dots: {
        flexDirection: 'row', justifyContent: 'center', gap: 6,
        position: 'absolute', bottom: 16, left: 0, right: 0,
    },
    dot: {
        width: 8, height: 8, borderRadius: 4, backgroundColor: 'rgba(0,0,0,0.2)',
    },
    dotActive: { backgroundColor: AppColors.primary, width: 20 },

    infoSection: { paddingHorizontal: Spacing.xl, paddingTop: Spacing.xl },
    collectionTag: {
        fontSize: 11, fontWeight: '700', color: AppColors.primary,
        textTransform: 'uppercase', letterSpacing: 1.5, marginBottom: 4,
    },
    productName: {
        fontSize: 24, fontWeight: '800', fontStyle: 'italic', color: AppColors.primary,
        fontFamily: Platform.OS === 'ios' ? 'Georgia' : 'serif', marginBottom: 10,
    },
    tagsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 12 },
    tag: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 4, backgroundColor: '#6B7280' },
    tagText: { color: '#FFF', fontSize: 9, fontWeight: '800', letterSpacing: 0.5, textTransform: 'uppercase' },
    price: { fontSize: 26, fontWeight: '800', color: AppColors.primary, marginBottom: 8 },
    stockBadge: {
        flexDirection: 'row', alignItems: 'center', gap: 6,
        paddingHorizontal: 10, paddingVertical: 6, borderRadius: 6,
        alignSelf: 'flex-start', marginBottom: 12,
    },
    stockBadgeOk: { backgroundColor: '#F0FDF4' },
    stockBadgeLow: { backgroundColor: '#FFF7ED' },
    stockBadgeOut: { backgroundColor: '#FEF2F2' },
    stockBadgeText: { fontSize: 12, fontWeight: '600', color: AppColors.success },
    description: { fontSize: 14, color: AppColors.textSecondary, lineHeight: 22, marginBottom: 16 },
    divider: { height: 1, backgroundColor: AppColors.border, marginVertical: 16 },

    qtyHeaderRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 8,
    },
    qtyLabel: {
        fontSize: 11, fontWeight: '700', color: AppColors.textMuted,
        textTransform: 'uppercase', letterSpacing: 1,
    },
    qtyInCart: {
        fontSize: 11,
        color: AppColors.primary,
        fontWeight: '600',
    },
    qtyControl: {
        flexDirection: 'row', alignItems: 'center', borderWidth: 1,
        borderColor: AppColors.border, borderRadius: BorderRadius.sm, alignSelf: 'flex-start', marginBottom: 16,
    },
    qtyBtn: { width: 40, height: 40, justifyContent: 'center', alignItems: 'center' },
    qtyBtnDisabled: { opacity: 0.3 },
    qtyText: { width: 44, textAlign: 'center', fontSize: 16, fontWeight: '700', color: AppColors.text },

    cartMsgBanner: {
        borderWidth: 1, borderRadius: BorderRadius.sm, padding: Spacing.md, marginBottom: 16,
    },

    trustGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginTop: 16, marginBottom: 8 },
    trustBadge: { flexDirection: 'row', alignItems: 'center', gap: 6, width: '48%' },
    trustText: { fontSize: 12, color: AppColors.textSecondary },

    detailCards: { paddingHorizontal: Spacing.lg, paddingTop: 16, gap: 12 },
    detailCard: {
        backgroundColor: AppColors.surface, borderRadius: BorderRadius.lg, padding: Spacing.lg,
        shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.04, shadowRadius: 3, elevation: 1,
    },
    detailCardTitle: {
        fontSize: 15, fontWeight: '700', fontStyle: 'italic', color: AppColors.primary,
        fontFamily: Platform.OS === 'ios' ? 'Georgia' : 'serif', marginBottom: 12,
    },
    infoRow: {
        flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 6,
        borderBottomWidth: 1, borderBottomColor: AppColors.borderLight,
    },
    infoLabel: { fontSize: 13, color: AppColors.textSecondary },
    infoValue: { fontSize: 13, fontWeight: '600', color: AppColors.text, textAlign: 'right', flex: 1, marginLeft: 12 },

    giftItem: {
        flexDirection: 'row', alignItems: 'center', gap: 10,
        padding: 10, backgroundColor: '#F9FAFB', borderRadius: BorderRadius.sm, marginBottom: 6,
    },
    giftItemImage: {
        width: 40, height: 40, borderRadius: 8, backgroundColor: AppColors.surface,
        justifyContent: 'center', alignItems: 'center', overflow: 'hidden',
        borderWidth: 1, borderColor: AppColors.border,
    },
    giftItemName: { fontSize: 13, fontWeight: '600', color: AppColors.text },
    giftItemDetail: { fontSize: 11, color: AppColors.textMuted, marginTop: 2 },

    stickyFooter: {
        position: 'absolute', bottom: 0, left: 0, right: 0,
        backgroundColor: AppColors.surface, borderTopWidth: 1, borderTopColor: AppColors.borderLight,
        paddingHorizontal: Spacing.xl, paddingTop: 12,
        paddingBottom: Platform.OS === 'ios' ? 34 : 16,
    },
    addToCartBtn: {
        backgroundColor: AppColors.primary, borderRadius: BorderRadius.sm,
        paddingVertical: 14, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 8,
    },
    addToCartText: { color: '#FFF', fontSize: 14, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5 },
    btnDisabled: { opacity: 0.6 },
});
