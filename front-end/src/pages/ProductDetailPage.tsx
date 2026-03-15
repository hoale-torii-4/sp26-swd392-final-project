import { useState, useEffect } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import Header from "../components/Header";
import Footer from "../components/Footer";
import { productService, type GiftBoxDetailDto } from "../services/productService";
import { cartService } from "../services/cartService";

/* ═══════════════════ HELPERS ═══════════════════ */

function formatPrice(v: number) {
    return v.toLocaleString("vi-VN") + "₫";
}

/* ═══════════════════ PAGE ═══════════════════ */

export default function ProductDetailPage() {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const [product, setProduct] = useState<GiftBoxDetailDto | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [selectedImage, setSelectedImage] = useState(0);
    const [quantity, setQuantity] = useState(1);
    const [addingToCart, setAddingToCart] = useState(false);
    const [cartMsg, setCartMsg] = useState<string | null>(null);
    const [cartMsgSuccess, setCartMsgSuccess] = useState(false);
    const [buyNowError, setBuyNowError] = useState<string | null>(null);

    useEffect(() => {
        if (!id) return;
        setLoading(true);
        productService
            .getGiftBoxById(id)
            .then((data) => {
                setProduct(data);
                setSelectedImage(0);
            })
            .catch(() => setError("Không tìm thấy sản phẩm."))
            .finally(() => setLoading(false));
    }, [id]);

    const handleAddToCart = async () => {
        if (!product || addingToCart) return;
        setAddingToCart(true);
        setCartMsg(null);
        setBuyNowError(null);
        try {
            await cartService.addToCart({
                Type: 0, // READY_MADE
                GiftBoxId: product.Id,
                Quantity: quantity,
            });
            setCartMsgSuccess(true);
            setCartMsg("Đã thêm vào giỏ hàng!");
            toast.success("Đã thêm vào giỏ hàng!");
            setTimeout(() => setCartMsg(null), 3000);
        } catch {
            setCartMsgSuccess(false);
            setCartMsg("Không thể thêm vào giỏ. Vui lòng thử lại.");
            toast.error("Không thể thêm vào giỏ. Vui lòng thử lại.");
        } finally {
            setAddingToCart(false);
        }
    };

    const handleBuyNow = async () => {
        if (!product || addingToCart) return;
        setAddingToCart(true);
        setCartMsg(null);
        setBuyNowError(null);

        try {
            const buyNowItem = {
                Id: `buynow-${product.Id}`,
                Type: 0, // READY_MADE
                ProductId: product.Id,
                Quantity: quantity,
                UnitPrice: product.Price,
                Name: product.Name,
            };

            navigate("/checkout", {
                state: {
                    buyNow: true,
                    items: [buyNowItem],
                    totalItems: quantity,
                    totalAmount: product.Price * quantity,
                },
            });
        } catch {
            setBuyNowError("Không thể xử lý mua ngay. Vui lòng thử lại.");
            toast.error("Không thể xử lý mua ngay. Vui lòng thử lại.");
        } finally {
            setAddingToCart(false);
        }
    };

    /* ═══════════════════ LOADING / ERROR ═══════════════════ */
    if (loading) {
        return (
            <div className="font-sans bg-[#F5F5F0] min-h-screen flex flex-col">
                <Header />
                <div className="flex-1 flex items-center justify-center">
                    <div className="text-center">
                        <svg className="w-10 h-10 mx-auto text-[#8B1A1A] animate-spin mb-4" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                        </svg>
                        <p className="text-gray-500 text-sm">Đang tải sản phẩm...</p>
                    </div>
                </div>
                <Footer />
            </div>
        );
    }

    if (error || !product) {
        return (
            <div className="font-sans bg-[#F5F5F0] min-h-screen flex flex-col">
                <Header />
                <div className="flex-1 flex items-center justify-center px-4">
                    <div className="text-center">
                        <svg className="w-20 h-20 mx-auto text-gray-300 mb-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.2} d="M20.25 7.5l-.625 10.632a2.25 2.25 0 01-2.247 2.118H6.622a2.25 2.25 0 01-2.247-2.118L3.75 7.5M10 11.25h4M3.375 7.5h17.25c.621 0 1.125-.504 1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125H3.375c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125z" />
                        </svg>
                        <h2 className="text-xl font-bold text-gray-900 mb-2">Không tìm thấy sản phẩm</h2>
                        <p className="text-sm text-gray-500 mb-6">{error || "Sản phẩm này không tồn tại hoặc đã ngưng bán."}</p>
                        <Link to="/gift-boxes" className="px-6 py-3 bg-[#8B1A1A] text-white text-sm font-semibold rounded-lg hover:bg-[#701515] transition-colors">
                            Quay lại bộ sưu tập
                        </Link>
                    </div>
                </div>
                <Footer />
            </div>
        );
    }

    const images = product.Images.length > 0 ? product.Images : [];
    const mainImage = images[selectedImage] || null;

    /* ═══════════════════ RENDER ═══════════════════ */
    return (
        <div className="font-sans bg-[#F5F5F0] min-h-screen flex flex-col">
            <Header />

            {/* ════════ BREADCRUMBS ════════ */}
            <nav className="max-w-7xl w-full mx-auto px-4 lg:px-8 pt-6 pb-2">
                <ol className="flex items-center gap-2 text-xs text-gray-400">
                    <li><Link to="/" className="hover:text-[#8B1A1A] transition-colors">TRANG CHỦ</Link></li>
                    <li>/</li>
                    <li><Link to="/gift-boxes" className="hover:text-[#8B1A1A] transition-colors">GIỎ QUÀ TẾT</Link></li>
                    <li>/</li>
                    <li className="text-[#8B1A1A] font-medium uppercase">{product.Name}</li>
                </ol>
            </nav>

            {/* ════════ MAIN PRODUCT SECTION ════════ */}
            <section className="max-w-7xl w-full mx-auto px-4 lg:px-8 py-8">
                <div className="flex flex-col lg:flex-row gap-10">
                    {/* ──── IMAGE GALLERY (LEFT) ──── */}
                    <div className="w-full lg:w-1/2">
                        {/* Main image */}
                        <div className="aspect-square rounded-2xl overflow-hidden bg-white shadow-sm mb-4">
                            {mainImage ? (
                                <img
                                    src={mainImage}
                                    alt={product.Name}
                                    className="w-full h-full object-cover"
                                />
                            ) : (
                                <div className="w-full h-full flex items-center justify-center text-gray-300">
                                    <svg className="w-24 h-24" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909M3.75 21h16.5A2.25 2.25 0 0022.5 18.75V5.25A2.25 2.25 0 0020.25 3H3.75A2.25 2.25 0 001.5 5.25v13.5A2.25 2.25 0 003.75 21z" />
                                    </svg>
                                </div>
                            )}
                        </div>

                        {/* Thumbnails */}
                        {images.length > 1 && (
                            <div className="flex gap-3">
                                {images.map((img, idx) => (
                                    <button
                                        key={idx}
                                        onClick={() => setSelectedImage(idx)}
                                        className={`w-20 h-20 rounded-xl overflow-hidden border-2 transition-all cursor-pointer ${idx === selectedImage
                                            ? "border-[#8B1A1A] shadow-md"
                                            : "border-transparent opacity-60 hover:opacity-100"
                                            }`}
                                    >
                                        <img src={img} alt={`${product.Name} ${idx + 1}`} className="w-full h-full object-cover" />
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* ──── PRODUCT INFO (RIGHT) ──── */}
                    <div className="w-full lg:w-1/2">
                        {/* Collection tag */}
                        {product.Collection && (
                            <p className="text-xs font-semibold text-[#8B1A1A] uppercase tracking-wider mb-2">
                                {product.Collection}
                            </p>
                        )}

                        {/* Product name */}
                        <h1 className="font-serif text-3xl lg:text-4xl text-[#8B1A1A] font-bold italic mb-4">
                            {product.Name}
                        </h1>

                        {/* Tags */}
                        {product.Tags.length > 0 && (
                            <div className="flex flex-wrap gap-2 mb-5">
                                {product.Tags.map((tag, idx) => (
                                    <span
                                        key={idx}
                                        className="px-2.5 py-1 text-[10px] font-bold tracking-wider uppercase text-white rounded-md bg-amber-600"
                                    >
                                        {tag}
                                    </span>
                                ))}
                            </div>
                        )}

                        {/* Price */}
                        <p className="text-3xl font-bold text-[#8B1A1A] mb-5">
                            {formatPrice(product.Price)}
                        </p>

                        {/* Description */}
                        <p className="text-sm text-gray-600 leading-relaxed mb-8">
                            {product.Description}
                        </p>

                        {/* Divider */}
                        <div className="border-t border-gray-200 mb-6" />

                        {/* Quantity selector */}
                        <div className="mb-6">
                            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
                                Số lượng
                            </label>
                            <div className="flex items-center border border-gray-200 rounded-lg w-fit">
                                <button
                                    onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                                    disabled={quantity <= 1}
                                    className="w-10 h-10 flex items-center justify-center text-gray-500 hover:text-gray-900 disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer transition-colors"
                                >
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4" />
                                    </svg>
                                </button>
                                <span className="w-12 text-center text-base font-semibold text-gray-900">
                                    {quantity}
                                </span>
                                <button
                                    onClick={() => setQuantity((q) => q + 1)}
                                    className="w-10 h-10 flex items-center justify-center text-gray-500 hover:text-gray-900 cursor-pointer transition-colors"
                                >
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                                    </svg>
                                </button>
                            </div>
                        </div>

                        {/* Action buttons */}
                        <div className="flex flex-col sm:flex-row gap-3 mb-5">
                            <button
                                onClick={handleAddToCart}
                                disabled={addingToCart}
                                className="flex-1 py-3.5 bg-[#8B1A1A] text-white text-sm font-bold uppercase tracking-wider rounded-lg hover:bg-[#701515] transition-colors cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                            >
                                {addingToCart ? (
                                    <>
                                        <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                                        </svg>
                                        Đang thêm...
                                    </>
                                ) : (
                                    <>
                                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M2.25 3h1.386c.51 0 .955.343 1.087.835l.383 1.437M7.5 14.25a3 3 0 00-3 3h15.75m-12.75-3h11.218c1.121-2.3 2.1-4.684 2.924-7.138a60.114 60.114 0 00-16.536-1.84M7.5 14.25L5.106 5.272M6 20.25a.75.75 0 11-1.5 0 .75.75 0 011.5 0zm12.75 0a.75.75 0 11-1.5 0 .75.75 0 011.5 0z" />
                                        </svg>
                                        Thêm vào giỏ
                                    </>
                                )}
                            </button>
                            <button
                                onClick={handleBuyNow}
                                disabled={addingToCart}
                                className="flex-1 py-3.5 border-2 border-[#8B1A1A] text-[#8B1A1A] text-sm font-bold uppercase tracking-wider rounded-lg hover:bg-[#8B1A1A]/5 transition-colors text-center flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
                            >
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 6v6h4.5" />
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 22.5a10.5 10.5 0 100-21 10.5 10.5 0 000 21z" />
                                </svg>
                                Mua ngay
                            </button>
                        </div>

                        {/* Cart success/error message */}
                        {cartMsg && (
                            <div className={`rounded-lg px-4 py-3 text-sm flex items-center gap-2 ${cartMsgSuccess
                                ? "bg-green-50 border border-green-200 text-green-700"
                                : "bg-red-50 border border-red-200 text-red-700"
                                }`}>
                                {cartMsg}
                            </div>
                        )}

                        {buyNowError && (
                            <div className="rounded-lg px-4 py-3 text-sm flex items-center gap-2 bg-red-50 border border-red-200 text-red-700">
                                {buyNowError}
                            </div>
                        )}

                        {/* Trust badges */}
                        <div className="mt-8 pt-6 border-t border-gray-100 grid grid-cols-2 gap-3">
                            <TrustBadge icon="check" text="Cam kết chính hãng" />
                            <TrustBadge icon="truck" text="Giao hàng tận nơi" />
                            <TrustBadge icon="gift" text="Đóng gói cao cấp" />
                            <TrustBadge icon="shield" text="Đổi trả dễ dàng" />
                        </div>
                    </div>
                </div>
            </section>

            {/* ════════ PRODUCT DETAILS TABS ════════ */}
            <section className="max-w-7xl w-full mx-auto px-4 lg:px-8 pb-14">
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* ── Product Info ── */}
                    <div className="bg-white rounded-2xl p-6 shadow-sm">
                        <h3 className="font-serif text-lg font-bold text-[#8B1A1A] italic mb-4 flex items-center gap-2">
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M11.25 11.25l.041-.02a.75.75 0 011.063.852l-.708 2.836a.75.75 0 001.063.853l.041-.021M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9-3.75h.008v.008H12V8.25z" />
                            </svg>
                            Thông tin sản phẩm
                        </h3>
                        <div className="space-y-3 text-sm text-gray-600">
                            <InfoRow label="Tên sản phẩm" value={product.Name} />
                            <InfoRow label="Giá niêm yết" value={formatPrice(product.Price)} />
                            {product.Collection && (
                                <InfoRow label="Bộ sưu tập" value={product.Collection} />
                            )}
                            <InfoRow label="Số lượng sản phẩm" value={`${product.Items.length} món`} />
                            <InfoRow label="Tình trạng" value={product.IsActive ? "Còn hàng" : "Hết hàng"} />
                        </div>
                    </div>

                    {/* ── Gift Box Components ── */}
                    <div className="bg-white rounded-2xl p-6 shadow-sm">
                        <h3 className="font-serif text-lg font-bold text-[#8B1A1A] italic mb-4 flex items-center gap-2">
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 11.25v8.25a1.5 1.5 0 01-1.5 1.5H5.25a1.5 1.5 0 01-1.5-1.5v-8.25M12 4.875A2.625 2.625 0 1014.625 7.5H12m0-2.625V7.5m0-2.625A2.625 2.625 0 009.375 7.5H12m-8.25 3.75h16.5" />
                            </svg>
                            Thành phần giỏ quà
                        </h3>
                        <div className="space-y-3">
                            {product.Items.map((item, idx) => (
                                <div key={idx} className="flex items-start gap-3 p-3 rounded-xl bg-gray-50 hover:bg-gray-100 transition-colors">
                                    {/* Item image */}
                                    <div className="w-12 h-12 rounded-lg overflow-hidden bg-white shrink-0 border border-gray-200">
                                        {item.Image ? (
                                            <img src={item.Image} alt={item.Name} className="w-full h-full object-cover" />
                                        ) : (
                                            <div className="w-full h-full flex items-center justify-center text-gray-300">
                                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20.25 7.5l-.625 10.632a2.25 2.25 0 01-2.247 2.118H6.622a2.25 2.25 0 01-2.247-2.118L3.75 7.5m8.25 3v6.75m0 0l-3-3m3 3l3-3M3.375 7.5h17.25c.621 0 1.125-.504 1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125H3.375c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125z" />
                                                </svg>
                                            </div>
                                        )}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="text-sm font-semibold text-gray-900 truncate">{item.Name}</p>
                                        <p className="text-xs text-gray-500">
                                            SL: {item.Quantity} &middot; {formatPrice(item.Price)}
                                        </p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* ── Meaning ── */}
                    <div className="bg-white rounded-2xl p-6 shadow-sm">
                        <h3 className="font-serif text-lg font-bold text-[#8B1A1A] italic mb-4 flex items-center gap-2">
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12z" />
                            </svg>
                            Ý nghĩa hộp quà
                        </h3>
                        <div className="text-sm text-gray-600 leading-relaxed space-y-3">
                            <p>
                                Hộp quà <span className="font-semibold text-[#8B1A1A]">{product.Name}</span> là
                                sự kết hợp tinh tế giữa những sản phẩm chất lượng, gửi gắm lời chúc an khang
                                thịnh vượng đến người nhận.
                            </p>
                            <p>
                                Mỗi món quà trong hộp đều được chọn lọc kỹ lưỡng, không chỉ mang giá trị vật
                                chất mà còn chứa đựng tình cảm trân quý và những lời chúc tốt đẹp nhất cho
                                năm mới.
                            </p>
                            <p>
                                Sắc đỏ truyền thống tượng trưng cho may mắn, trong khi chất lượng cao cấp
                                thể hiện sự sung túc và phú quý – đúng như tên gọi của bộ sưu tập.
                            </p>
                        </div>
                    </div>
                </div>
            </section>

            <Footer />
        </div>
    );
}

/* ═══════════════════ SUB-COMPONENTS ═══════════════════ */

function InfoRow({ label, value }: { label: string; value: string }) {
    return (
        <div className="flex justify-between items-center py-1.5 border-b border-gray-50 last:border-0">
            <span className="text-gray-500">{label}</span>
            <span className="text-gray-900 font-medium text-right">{value}</span>
        </div>
    );
}

function TrustBadge({ icon, text }: { icon: string; text: string }) {
    const icons: Record<string, React.ReactNode> = {
        check: (
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
        ),
        truck: (
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.25 18.75a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m3 0h6m-9 0H3.375a1.125 1.125 0 01-1.125-1.125V14.25m17.25 4.5a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m3 0h1.125c.621 0 1.125-.504 1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125H18.75M7.5 14.25v-5.625m0 0H2.25m5.25 0h8.25m0 0v5.625m0-5.625h5.25" />
            </svg>
        ),
        gift: (
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 11.25v8.25a1.5 1.5 0 01-1.5 1.5H5.25a1.5 1.5 0 01-1.5-1.5v-8.25M12 4.875A2.625 2.625 0 1014.625 7.5H12m0-2.625V7.5m0-2.625A2.625 2.625 0 009.375 7.5H12m-8.25 3.75h16.5" />
            </svg>
        ),
        shield: (
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" />
            </svg>
        ),
    };

    return (
        <div className="flex items-center gap-2 text-xs text-gray-500">
            <span className="text-green-600">{icons[icon]}</span>
            {text}
        </div>
    );
}
