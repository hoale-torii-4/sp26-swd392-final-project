import { useState, useEffect } from "react";
import { adminService, type ReviewListItem } from "../../services/adminService";
import { FaStar } from "react-icons/fa6";

export default function AdminReviewsPage() {
    const [reviews, setReviews] = useState<ReviewListItem[]>([]);
    const [total, setTotal] = useState(0);
    const [page, setPage] = useState(1);
    const [statusFilter, setStatusFilter] = useState("");
    const [ratingFilter, setRatingFilter] = useState<string>("");
    const [loading, setLoading] = useState(true);

    const pageSize = 20;

    const fetchReviews = async () => {
        setLoading(true);
        try {
            const res = await adminService.getReviews({
                status: statusFilter || undefined,
                rating: ratingFilter ? parseInt(ratingFilter) : undefined,
                page, pageSize,
            });
            setReviews(res.Items); setTotal(res.TotalItems);
        } catch { setReviews([]); }
        finally { setLoading(false); }
    };

    useEffect(() => { fetchReviews(); }, [page, statusFilter, ratingFilter]);

    const handleApprove = async (id: string) => { try { await adminService.approveReview(id); fetchReviews(); } catch { /* ignore */ } };
    const handleHide = async (id: string) => { try { await adminService.hideReview(id); fetchReviews(); } catch { /* ignore */ } };

    const totalPages = Math.ceil(total / pageSize);

    const renderStars = (rating: number) => (
        <div className="flex gap-0.5">
            {[1, 2, 3, 4, 5].map(i => (
                <FaStar key={i} className={`w-3.5 h-3.5 ${i <= rating ? "text-amber-400" : "text-gray-200"}`} />
            ))}
        </div>
    );

    return (
        <div className="p-6 space-y-6">
            <div>
                <h1 className="text-2xl font-bold text-gray-900">Đánh giá</h1>
                <p className="text-sm text-gray-500">Phê duyệt và quản lý đánh giá của khách hàng</p>
            </div>

            {/* Filters */}
            <div className="flex flex-wrap gap-2">
                {["", "PENDING", "APPROVED", "HIDDEN"].map(s => (
                    <button key={s} onClick={() => { setStatusFilter(s); setPage(1); }} className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors cursor-pointer ${statusFilter === s ? "bg-[#8B1A1A] text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"}`}>
                        {s === "" ? "Tất cả" : s === "PENDING" ? "Chờ duyệt" : s === "APPROVED" ? "Đã duyệt" : "Đã ẩn"}
                    </button>
                ))}
                <select value={ratingFilter} onChange={e => { setRatingFilter(e.target.value); setPage(1); }} className="px-3 py-1.5 border border-gray-200 rounded-lg text-xs cursor-pointer">
                    <option value="">Tất cả sao</option>
                    {[5, 4, 3, 2, 1].map(r => <option key={r} value={r}>{r} sao</option>)}
                </select>
            </div>

            {/* Reviews list */}
            <div className="space-y-3">
                {loading ? (
                    <div className="bg-white rounded-xl p-8 text-center text-gray-400">Đang tải...</div>
                ) : reviews.length === 0 ? (
                    <div className="bg-white rounded-xl p-8 text-center text-gray-400">Chưa có đánh giá nào</div>
                ) : reviews.map(review => (
                    <div key={review.Id} className="bg-white rounded-xl p-5 shadow-sm">
                        <div className="flex items-start gap-4">
                            {/* Reviewer avatar */}
                            <div className="w-10 h-10 rounded-full bg-[#8B1A1A]/10 flex items-center justify-center text-[#8B1A1A] font-bold text-sm shrink-0">
                                {review.ReviewerName.charAt(0).toUpperCase()}
                            </div>

                            <div className="flex-1 min-w-0">
                                <div className="flex items-center justify-between mb-1">
                                    <div>
                                        <p className="font-medium text-gray-900 text-sm">{review.ReviewerName}</p>
                                        <p className="text-xs text-gray-400">{review.ReviewerEmail}</p>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${review.Status === "PENDING" ? "bg-amber-100 text-amber-700" : review.Status === "APPROVED" ? "bg-emerald-100 text-emerald-700" : "bg-gray-100 text-gray-600"}`}>
                                            {review.StatusLabel || review.Status}
                                        </span>
                                    </div>
                                </div>

                                <div className="flex items-center gap-2 mb-2">
                                    {renderStars(review.Rating)}
                                    <span className="text-xs text-gray-400">{new Date(review.CreatedAt).toLocaleDateString("vi-VN")}</span>
                                </div>

                                {/* Product info */}
                                <div className="flex items-center gap-2 mb-2">
                                    {review.GiftBoxImage && <img src={review.GiftBoxImage} alt="" className="w-6 h-6 rounded object-cover" />}
                                    <span className="text-xs text-gray-500">{review.GiftBoxName}</span>
                                </div>

                                <p className="text-sm text-gray-700 mb-3">{review.Content}</p>

                                {/* Actions */}
                                <div className="flex gap-2">
                                    {review.Status !== "APPROVED" && (
                                        <button onClick={() => handleApprove(review.Id)} className="px-3 py-1 bg-emerald-50 text-emerald-700 text-xs font-medium rounded-md hover:bg-emerald-100 transition-colors cursor-pointer">
                                            Phê duyệt
                                        </button>
                                    )}
                                    {review.Status !== "HIDDEN" && (
                                        <button onClick={() => handleHide(review.Id)} className="px-3 py-1 bg-gray-100 text-gray-600 text-xs font-medium rounded-md hover:bg-gray-200 transition-colors cursor-pointer">
                                            Ẩn
                                        </button>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            {totalPages > 1 && (
                <div className="flex items-center justify-between">
                    <span className="text-xs text-gray-400">Trang {page} / {totalPages} ({total} đánh giá)</span>
                    <div className="flex gap-1">
                        <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page <= 1} className="px-3 py-1 rounded border text-xs disabled:opacity-30 cursor-pointer">Trước</button>
                        <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page >= totalPages} className="px-3 py-1 rounded border text-xs disabled:opacity-30 cursor-pointer">Sau</button>
                    </div>
                </div>
            )}
        </div>
    );
}
