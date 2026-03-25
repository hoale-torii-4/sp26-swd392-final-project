import { useEffect, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import Header from "../components/Header";
import Footer from "../components/Footer";
import { authService } from "../services/authService";
import { orderService } from "../services/orderService";
import { reviewService, type UserReview } from "../services/reviewService";
import { FiUser, FiShoppingBag, FiMapPin, FiBox, FiLogOut, FiLoader, FiCheck, FiX } from "react-icons/fi";
import { FaStar } from "react-icons/fa6";

interface MyOrderItemDto {
    Name: string;
    Quantity: number;
    UnitPrice: number;
    TotalPrice: number;
    Type: string;
    GiftBoxId?: string;
    ProductId?: string;
}

interface MyOrderResponseDto {
    Id: string;
    OrderCode: string;
    OrderType: string;
    Status: string;
    TotalAmount: number;
    CreatedAt: string;
    DeliveryDate: string;
    TotalItems: number;
    Items: MyOrderItemDto[];
}

const sidebarLinks = [
    {
        label: "Thông tin tài khoản",
        to: "/account",
        icon: (
            <FiUser className="w-5 h-5" />
        ),
    },
    {
        label: "Đơn hàng của tôi",
        to: "/orders",
        icon: (
            <FiShoppingBag className="w-5 h-5" />
        ),
    },
    {
        label: "Sổ địa chỉ",
        to: "/addresses",
        icon: (
            <FiMapPin className="w-5 h-5" />
        ),
    },
    {
        label: "Giỏ quà custom",
        to: "/custom-box",
        icon: (
            <FiBox className="w-5 h-5" />
        ),
    },
];

export default function OrdersPage() {
    const location = useLocation();
    const navigate = useNavigate();
    const user = authService.getUser();
    const initials = user?.FullName?.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase() ?? "?";

    const [orders, setOrders] = useState<MyOrderResponseDto[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // Review modal state
    const [showReviewModal, setShowReviewModal] = useState(false);
    const [reviewOrderId, setReviewOrderId] = useState("");
    const [reviewGiftBoxId, setReviewGiftBoxId] = useState("");
    const [reviewItemName, setReviewItemName] = useState("");
    const [reviewRating, setReviewRating] = useState(5);
    const [reviewContent, setReviewContent] = useState("");
    const [submittingReview, setSubmittingReview] = useState(false);

    // Track which items have already been reviewed (to disable the button)
    const [userReviews, setUserReviews] = useState<UserReview[]>([]);

    useEffect(() => {
        if (!authService.isAuthenticated()) {
            navigate("/login");
            return;
        }

        const loadData = async () => {
            setLoading(true);
            setError(null);
            try {
                const [ordersRes, reviewsRes] = await Promise.all([
                    orderService.getMyOrders(),
                    reviewService.getUserReviews().catch(() => []) // fail gracefully
                ]);
                const payload = ordersRes?.Data ?? ordersRes?.data ?? [];
                setOrders(payload);
                setUserReviews(reviewsRes || []);
            } catch (err: any) {
                setError(err?.message ?? "Không thể tải dữ liệu.");
            } finally {
                setLoading(false);
            }
        };

        loadData();
    }, [navigate]);

    const handleLogout = () => {
        authService.logout();
        navigate("/login");
    };

    const openReviewModal = (orderId: string, item: MyOrderItemDto) => {
        setReviewOrderId(orderId);
        setReviewGiftBoxId(item.GiftBoxId || item.ProductId || "");
        setReviewItemName(item.Name);
        setReviewRating(5);
        setReviewContent("");
        setShowReviewModal(true);
    };

    const handleSubmitReview = async () => {
        if (!reviewOrderId) return;
        if (!reviewGiftBoxId) {
            toast.error("Không tìm thấy mã sản phẩm. Vui lòng thử lại sau.");
            return;
        }
        setSubmittingReview(true);
        try {
            await reviewService.createReview({
                OrderId: reviewOrderId,
                GiftBoxId: reviewGiftBoxId,
                Rating: reviewRating,
                Content: reviewContent,
            });
            toast.success("Đánh giá đã được gửi thành công!");
            setShowReviewModal(false);
            
            // Refresh reviews to hide the button immediately
            reviewService.getUserReviews().then(res => setUserReviews(res)).catch(() => {});
        } catch (err: any) {
            toast.error(err.message || "Không thể gửi đánh giá.");
        } finally {
            setSubmittingReview(false);
        }
    };

    const formatDate = (value: string) => {
        if (!value) return "--";
        return new Date(value).toLocaleDateString("vi-VN");
    };

    return (
        <div className="font-sans bg-[#F5F5F5] min-h-screen flex flex-col">
            <Header />

            <main className="flex-1 max-w-6xl w-full mx-auto px-6 py-10 lg:py-14">
                <div className="grid grid-cols-1 lg:grid-cols-[260px_1fr] gap-8">
                    <aside className="bg-white rounded-2xl p-6 h-fit shadow-sm">
                        <div className="text-center mb-6">
                            <div className="w-20 h-20 mx-auto bg-[#1B3022] rounded-full flex items-center justify-center text-white text-2xl font-bold mb-3">
                                {initials}
                            </div>
                            <p className="font-serif font-bold text-gray-900">{user?.FullName}</p>
                        </div>
                        <nav className="space-y-1">
                            {sidebarLinks.map((link) => {
                                const isActive = location.pathname === link.to;
                                return (
                                    <Link
                                        key={link.to}
                                        to={link.to}
                                        className={`flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm transition-colors ${isActive
                                            ? "bg-[#8B1A1A]/10 text-[#8B1A1A] font-semibold"
                                            : "text-gray-600 hover:bg-gray-50"
                                            }`}
                                    >
                                        <span className={isActive ? "text-[#8B1A1A]" : "text-gray-400"}>{link.icon}</span>
                                        {link.label}
                                    </Link>
                                );
                            })}
                            <div className="border-t border-gray-100 !my-3" />
                            <button
                                onClick={handleLogout}
                                className="flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm text-gray-500 hover:bg-red-50 hover:text-[#8B1A1A] transition-colors w-full cursor-pointer"
                            >
                                <FiLogOut className="w-5 h-5" />
                                Đăng xuất
                            </button>
                        </nav>
                    </aside>

                    <div className="space-y-6">
                        <div>
                            <h1 className="text-2xl font-serif font-bold italic text-[#8B1A1A]">Đơn hàng của tôi</h1>
                            <p className="text-sm text-gray-500 mt-1">Theo dõi các đơn hàng bạn đã đặt.</p>
                        </div>

                        {loading ? (
                            <div className="flex items-center justify-center py-20">
                                <FiLoader className="w-8 h-8 text-[#8B1A1A] animate-spin" />
                            </div>
                        ) : error ? (
                            <div className="bg-white rounded-2xl p-8 shadow-sm">
                                <p className="text-sm text-red-600">{error}</p>
                            </div>
                        ) : orders.length === 0 ? (
                            <div className="bg-white rounded-2xl p-12 shadow-sm text-center">
                                <FiShoppingBag className="w-16 h-16 mx-auto text-gray-200 mb-4" />
                                <p className="text-gray-400 text-sm">Bạn chưa có đơn hàng nào.</p>
                            </div>
                        ) : (
                            <div className="space-y-4">
                                {orders.map((order) => (
                                    <Link key={order.Id} to={`/orders/${order.Id}`} className="block bg-white rounded-2xl p-6 shadow-sm border border-gray-100 hover:border-[#8B1A1A]/30 transition-colors">
                                        <div className="flex flex-wrap items-start justify-between gap-4">
                                            <div>
                                                <p className="text-xs uppercase tracking-wider text-gray-400">Mã đơn</p>
                                                <p className="text-sm font-semibold text-gray-900">{order.OrderCode}</p>
                                            </div>
                                            <div>
                                                <p className="text-xs uppercase tracking-wider text-gray-400">Trạng thái</p>
                                                <p className="text-sm font-semibold text-[#8B1A1A]">{order.Status}</p>
                                            </div>
                                            <div>
                                                <p className="text-xs uppercase tracking-wider text-gray-400">Ngày đặt</p>
                                                <p className="text-sm text-gray-700">{formatDate(order.CreatedAt)}</p>
                                            </div>
                                            <div>
                                                <p className="text-xs uppercase tracking-wider text-gray-400">Tổng tiền</p>
                                                <p className="text-sm font-semibold text-gray-900">
                                                    {order.TotalAmount.toLocaleString("vi-VN")}₫
                                                </p>
                                            </div>
                                        </div>

                                        <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-3">
                                            {order.Items.map((item, idx) => {
                                                const extractedGiftBoxId = item.GiftBoxId || (item as any).giftBoxId || item.ProductId || (item as any).Id || (item as any).id || "";
                                                // Check if there is already a review by this user for this specific order + giftbox
                                                // The backend doesn't return OrderId in UserReviewDto right now, but since a user
                                                // generally only reviews a giftbox once, checking by GiftBoxId is a good proxy.
                                                // To be perfectly accurate we'd need OrderId in the user reviews response.
                                                // For now, if they've reviewed this gift box id AT ALL, they can't review it again here.
                                                // Or if the backend UserReviewDTO has OrderId (it doesn't currently), we'd check that.
                                                const hasReviewed = userReviews.some(r => r.GiftBoxId === extractedGiftBoxId);

                                                return (
                                                    <div key={`${order.Id}-${idx}`} className="rounded-xl border border-gray-100 p-4 bg-gray-50">
                                                        <p className="text-sm font-semibold text-gray-900 mb-1">{item.Name}</p>
                                                        <p className="text-xs text-gray-500">Số lượng: {item.Quantity}</p>
                                                        <p className="text-xs text-gray-500">Đơn giá: {item.UnitPrice.toLocaleString("vi-VN")}₫</p>
                                                        <div className="flex items-center justify-between mt-2">
                                                            <p className="text-sm font-semibold text-[#8B1A1A]">
                                                                {item.TotalPrice.toLocaleString("vi-VN")}₫
                                                            </p>
                                                            {(order.Status === "COMPLETED" || order.Status === "Completed" || order.Status === "Hoàn thành") && (
                                                                hasReviewed ? (
                                                                    <span className="px-3 py-1.5 text-xs font-semibold text-gray-400 bg-gray-100 rounded-lg flex items-center gap-1">
                                                                        <FiCheck className="w-3.5 h-3.5" />
                                                                        Đã đánh giá
                                                                    </span>
                                                                ) : (
                                                                    <button
                                                                        onClick={(e) => { e.preventDefault(); e.stopPropagation(); openReviewModal(order.Id, item); }}
                                                                        className="px-3 py-1.5 text-xs font-bold text-[#8B1A1A] bg-[#8B1A1A]/10 rounded-lg hover:bg-[#8B1A1A]/20 transition-colors cursor-pointer flex items-center gap-1"
                                                                    >
                                                                        <FaStar className="w-3.5 h-3.5" />
                                                                        Đánh giá
                                                                    </button>
                                                                )
                                                            )}
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </Link>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            </main>

            {/* ════════ REVIEW MODAL ════════ */}
            {showReviewModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setShowReviewModal(false)} />
                    <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 z-10">
                        <button
                            onClick={() => setShowReviewModal(false)}
                            className="absolute top-4 right-4 text-gray-400 hover:text-gray-700 cursor-pointer"
                        >
                            <FiX className="w-5 h-5" />
                        </button>

                        <h3 className="font-serif text-xl font-bold text-[#8B1A1A] italic mb-2">Đánh giá sản phẩm</h3>
                        <p className="text-sm text-gray-500 mb-5 truncate">{reviewItemName}</p>

                        {/* Star rating */}
                        <div className="mb-4">
                            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">Chấm điểm</label>
                            <div className="flex gap-1">
                                {[1,2,3,4,5].map(s => (
                                    <button
                                        key={s}
                                        onClick={() => setReviewRating(s)}
                                        className="cursor-pointer transition-transform hover:scale-110"
                                    >
                                        <FaStar className={`w-8 h-8 ${s <= reviewRating ? 'text-amber-400' : 'text-gray-200'}`} />
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Comment */}
                        <div className="mb-5">
                            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">Nhận xét</label>
                            <textarea
                                value={reviewContent}
                                onChange={(e) => setReviewContent(e.target.value)}
                                placeholder="Chia sẻ trải nghiệm của bạn về sản phẩm..."
                                rows={4}
                                className="w-full px-4 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#8B1A1A]/20 focus:border-[#8B1A1A] resize-none"
                            />
                        </div>

                        <button
                            disabled={submittingReview}
                            onClick={handleSubmitReview}
                            className="w-full py-3 bg-[#8B1A1A] text-white text-sm font-bold uppercase tracking-wider rounded-lg hover:bg-[#701515] transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {submittingReview ? "Đang gửi..." : "Gửi đánh giá"}
                        </button>
                    </div>
                </div>
            )}

            <Footer />
        </div>
    );
}
