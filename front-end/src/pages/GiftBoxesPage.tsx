import { useState, useEffect, useMemo } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { toast } from "react-toastify";
import Header from "../components/Header";
import Footer from "../components/Footer";
import { productService, type GiftBoxListDto } from "../services/productService";
import heroBg from "../assets/giftbox-hero.png";

/* ═══════════════════ CONSTANTS ═══════════════════ */

const ITEMS_PER_PAGE = 9;

const PRICE_RANGES = [
    { label: "Dưới 1.000.000₫", min: 0, max: 1_000_000 },
    { label: "1.000.000₫ – 2.000.000₫", min: 1_000_000, max: 2_000_000 },
    { label: "2.000.000₫ – 3.000.000₫", min: 2_000_000, max: 3_000_000 },
    { label: "Trên 3.000.000₫", min: 3_000_000, max: Infinity },
];

const SORT_OPTIONS = [
    { value: "popular", label: "Phổ biến" },
    { value: "newest", label: "Mới nhất" },
    { value: "price-asc", label: "Giá: Thấp → Cao" },
    { value: "price-desc", label: "Giá: Cao → Thấp" },
];

/* ═══════════════════ HELPER ═══════════════════ */

function formatPrice(v: number | undefined) {
    if (v == null) return "0₫";
    return v.toLocaleString("vi-VN") + "₫";
}

/* ═══════════════════ COMPONENT ═══════════════════ */

export default function GiftBoxesPage() {
    /* ── data ── */
    const [giftBoxes, setGiftBoxes] = useState<GiftBoxListDto[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");

    /* ── filters ── */
    const [searchParams, setSearchParams] = useSearchParams();
    const collectionIdParam = searchParams.get("collectionId");

    const [collections, setCollections] = useState<any[]>([]);
    const [selectedCollectionId, setSelectedCollectionId] = useState<string>("all");
    const [selectedCollectionName, setSelectedCollectionName] = useState<string>("");

    const [selectedPriceRanges, setSelectedPriceRanges] = useState<number[]>([]);
    const [sortBy, setSortBy] = useState("popular");
    const [currentPage, setCurrentPage] = useState(1);
    const [sortOpen, setSortOpen] = useState(false);
    const [mobileFilterOpen, setMobileFilterOpen] = useState(false);

    /* ── fetch data ── */
    useEffect(() => {
        (async () => {
            try {
                setLoading(true);
                setError("");
                const [giftBoxesRes, collectionsRes] = await Promise.all([
                    productService.getGiftBoxes(),
                    productService.getCollections(),
                ]);
                const finalBoxes = (giftBoxesRes as any)?.data || giftBoxesRes || [];
                const finalCols = (collectionsRes as any)?.data || collectionsRes || [];
                setGiftBoxes(Array.isArray(finalBoxes) ? finalBoxes : []);
                setCollections(Array.isArray(finalCols) ? finalCols : []);
            } catch (err: any) {
                console.error("GiftBoxes fetch error:", err);
                const message = err?.message || "Không thể tải danh sách giỏ quà. Vui lòng thử lại.";
                setError(message);
                toast.error(message, {
                    position: "top-center",
                    autoClose: 3000,
                    hideProgressBar: false,
                    closeOnClick: true,
                    pauseOnHover: true,
                    draggable: true,
                });
            } finally {
                setLoading(false);
            }
        })();
    }, []);

    useEffect(() => {
        if (collectionIdParam) {
            const match = collections.find((col: any) => {
                const id = col?.Id || col?.id;
                return id === collectionIdParam;
            });
            if (match) {
                setSelectedCollectionId(collectionIdParam);
                setSelectedCollectionName(match?.Name || match?.name || "");
            } else {
                setSelectedCollectionId("all");
                setSelectedCollectionName("");
            }
        } else {
            setSelectedCollectionId("all");
            setSelectedCollectionName("");
        }
    }, [collectionIdParam, collections]);

    /* ── filter + sort ── */
    const filtered = useMemo(() => {
        let items = [...(giftBoxes || [])];

        // Collection filter
        if (selectedCollectionId !== "all") {
            items = items.filter((gb) => {
                const gbColId = gb.CollectionId || (gb as any).collectionId;
                const gbColName = (gb as any).Collection || (gb as any).CollectionName;
                
                if (gbColId && gbColId === selectedCollectionId) return true;
                if (gbColName && selectedCollectionName && gbColName === selectedCollectionName) return true;
                return false;
            });
        }

        // Price filter
        if (selectedPriceRanges.length > 0) {
            items = items.filter((gb) =>
                selectedPriceRanges.some((idx) => {
                    const r = PRICE_RANGES[idx];
                    return (gb.Price || 0) >= r.min && (gb.Price || 0) < r.max;
                }),
            );
        }

        // Sort
        switch (sortBy) {
            case "newest":
                items.sort((a, b) => new Date(b.CreatedAt || 0).getTime() - new Date(a.CreatedAt || 0).getTime());
                break;
            case "price-asc":
                items.sort((a, b) => (a.Price || 0) - (b.Price || 0));
                break;
            case "price-desc":
                items.sort((a, b) => (b.Price || 0) - (a.Price || 0));
                break;
        }

        return items;
    }, [giftBoxes, selectedCollectionId, selectedCollectionName, selectedPriceRanges, sortBy]);

    /* ── pagination ── */
    const totalPages = Math.max(1, Math.ceil(filtered.length / ITEMS_PER_PAGE));
    const paged = filtered.slice(
        (currentPage - 1) * ITEMS_PER_PAGE,
        currentPage * ITEMS_PER_PAGE,
    );

    // Reset page on filter change
    useEffect(() => {
        setCurrentPage(1);
    }, [selectedPriceRanges, sortBy]);

    const togglePriceRange = (idx: number) => {
        setSelectedPriceRanges((prev) =>
            prev.includes(idx) ? prev.filter((i) => i !== idx) : [...prev, idx],
        );
    };

    const clearFilters = () => {
        setSelectedPriceRanges([]);
        setSortBy("popular");
    };

    const onSelectCollection = (id: string) => {
        if (id === "all") {
            searchParams.delete("collectionId");
        } else {
            searchParams.set("collectionId", id);
        }
        setSearchParams(searchParams);
        // Note: the useEffect will auto-sync `selectedCollectionName` when `collections` and `collectionIdParam` change.
    };

    /* ═══════════════════ RENDER ═══════════════════ */
    return (
        <div className="font-sans bg-[#F5F5F0] min-h-screen flex flex-col">
            <Header />

            {/* ════════ HERO BANNER ════════ */}
            <section className="relative h-52 lg:h-64 overflow-hidden">
                <img
                    src={heroBg}
                    alt="Giỏ Quà Tết"
                    className="absolute inset-0 w-full h-full object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-r from-[#8B1A1A]/80 to-[#8B1A1A]/50" />
                <div className="relative z-10 h-full flex flex-col items-center justify-center text-center px-4">
                    <h1 className="font-serif text-3xl lg:text-5xl text-white font-bold italic tracking-wide mb-3">
                        Giỏ Quà Tết
                    </h1>
                    <p className="text-white/80 text-sm lg:text-base max-w-xl leading-relaxed">
                        Trao gửi chân tình — Đón xuân rạng rỡ. Bộ sưu tập giỏ quà Tết tinh tế, sang trọng,
                        thay lời chúc bình an và thịnh vượng.
                    </p>
                </div>
            </section>

            {/* ════════ BREADCRUMB ════════ */}
            <div className="max-w-7xl w-full mx-auto px-4 lg:px-8 py-4">
                <nav className="text-xs text-gray-500 flex items-center gap-1.5">
                    <Link to="/" className="hover:text-[#8B1A1A] transition-colors">Trang chủ</Link>
                    <span>/</span>
                    <span className="text-[#8B1A1A] font-medium">Giỏ Quà Tết</span>
                </nav>
            </div>

            {/* ════════ MAIN LAYOUT ════════ */}
            <main className="flex-1 max-w-7xl w-full mx-auto px-4 lg:px-8 pb-14">
                <div className="flex flex-col lg:flex-row gap-8">
                    {/* ──────── SIDEBAR ──────── */}
                    {/* Mobile filter toggle */}
                    <button
                        onClick={() => setMobileFilterOpen(!mobileFilterOpen)}
                        className="lg:hidden flex items-center gap-2 px-4 py-2.5 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-white transition-colors cursor-pointer"
                    >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
                        </svg>
                        Bộ lọc
                    </button>

                    <aside className={`w-full lg:w-64 shrink-0 ${mobileFilterOpen ? "block" : "hidden lg:block"}`}>
                        <div className="bg-white rounded-2xl p-6 shadow-sm sticky top-24">
                            <div className="flex items-center justify-between mb-5">
                                <h3 className="font-bold text-gray-900 uppercase tracking-wider text-sm">Bộ lọc</h3>
                                {selectedPriceRanges.length > 0 && (
                                    <button onClick={clearFilters} className="text-xs text-[#8B1A1A] hover:underline cursor-pointer">
                                        Xóa tất cả
                                    </button>
                                )}
                            </div>

                            {/* Price filter */}
                            <div>
                                <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">
                                    Khoảng giá
                                </h4>
                                <div className="space-y-2.5">
                                    {PRICE_RANGES.map((range, idx) => (
                                        <label key={idx} className="flex items-center gap-2.5 cursor-pointer group">
                                            <input
                                                type="checkbox"
                                                checked={selectedPriceRanges.includes(idx)}
                                                onChange={() => togglePriceRange(idx)}
                                                className="w-4 h-4 rounded border-gray-300 text-[#8B1A1A] focus:ring-[#8B1A1A] accent-[#8B1A1A]"
                                            />
                                            <span className="text-sm text-gray-600 group-hover:text-gray-900 transition-colors">
                                                {range.label}
                                            </span>
                                        </label>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </aside>

                    {/* ──────── PRODUCT AREA ──────── */}
                    <div className="flex-1 min-w-0">
                        {/* Collection Filter Tabs */}
                        <div className="mb-6 flex overflow-x-auto gap-2.5 pb-2 hide-scrollbar">
                            <button
                                onClick={() => onSelectCollection("all")}
                                className={`shrink-0 px-5 py-2 rounded-full border text-sm font-medium transition-colors ${selectedCollectionId === "all" ? "bg-[#8B1A1A] border-[#8B1A1A] text-white" : "border-gray-300 text-gray-600 bg-white hover:border-[#8B1A1A]"}`}
                            >
                                Tất cả
                            </button>
                            {collections.map((col: any) => {
                                const id = col?.Id || col?.id;
                                const name = col?.Name || col?.name || "Collection";
                                return (
                                    <button
                                        key={id || name}
                                        onClick={() => onSelectCollection(id)}
                                        className={`shrink-0 px-5 py-2 rounded-full border text-sm font-medium transition-colors ${selectedCollectionId === id ? "bg-[#8B1A1A] border-[#8B1A1A] text-white" : "border-gray-300 text-gray-600 bg-white hover:border-[#8B1A1A]"}`}
                                    >
                                        {name}
                                    </button>
                                );
                            })}
                        </div>

                        {/* Control bar */}
                        <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
                            <p className="text-sm text-gray-500">
                                Hiển thị{" "}
                                <strong className="text-gray-700">
                                    {Math.min(paged.length, ITEMS_PER_PAGE)}
                                </strong>{" "}
                                trên{" "}
                                <strong className="text-gray-700">{filtered.length}</strong>{" "}
                                sản phẩm
                            </p>

                            {/* Sort dropdown */}
                            <div className="relative">
                                <button
                                    onClick={() => setSortOpen(!sortOpen)}
                                    className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg text-sm text-gray-700 hover:bg-white transition-colors cursor-pointer bg-white"
                                >
                                    Sắp xếp:{" "}
                                    <span className="font-medium">
                                        {SORT_OPTIONS.find((s) => s.value === sortBy)?.label}
                                    </span>
                                    <svg className={`w-4 h-4 transition-transform ${sortOpen ? "rotate-180" : ""}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                    </svg>
                                </button>
                                {sortOpen && (
                                    <div className="absolute right-0 mt-1 w-52 bg-white border border-gray-200 rounded-lg shadow-lg z-20 py-1">
                                        {SORT_OPTIONS.map((opt) => (
                                            <button
                                                key={opt.value}
                                                onClick={() => {
                                                    setSortBy(opt.value);
                                                    setSortOpen(false);
                                                }}
                                                className={`w-full text-left px-4 py-2 text-sm transition-colors cursor-pointer ${sortBy === opt.value
                                                    ? "bg-[#8B1A1A]/10 text-[#8B1A1A] font-medium"
                                                    : "text-gray-600 hover:bg-gray-50"
                                                    }`}
                                            >
                                                {opt.label}
                                            </button>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* States */}
                        {loading && (
                            <div className="flex items-center justify-center py-20">
                                <svg className="w-8 h-8 animate-spin text-[#8B1A1A]" viewBox="0 0 24 24" fill="none">
                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                                </svg>
                            </div>
                        )}

                        {error && (
                            <div className="bg-red-50 border border-red-200 rounded-xl p-6 text-center">
                                <p className="text-red-600 text-sm">{error}</p>
                                <button
                                    onClick={() => window.location.reload()}
                                    className="mt-3 text-sm text-[#8B1A1A] font-medium hover:underline cursor-pointer"
                                >
                                    Thử lại
                                </button>
                            </div>
                        )}

                        {!loading && !error && filtered.length === 0 && (
                            <div className="text-center py-20">
                                <p className="text-gray-500">Không tìm thấy sản phẩm phù hợp.</p>
                                <button
                                    onClick={clearFilters}
                                    className="mt-3 text-sm text-[#8B1A1A] font-medium hover:underline cursor-pointer"
                                >
                                    Xóa bộ lọc
                                </button>
                            </div>
                        )}

                        {/* ──────── 3-COL PRODUCT GRID ──────── */}
                        {!loading && !error && paged && paged.length > 0 && (
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                                {paged.map((box) => (
                                    <ProductCard key={box?.Id} box={box} />
                                ))}
                            </div>
                        )}

                        {/* ──────── PAGINATION ──────── */}
                        {totalPages > 1 && (
                            <nav className="flex items-center justify-center gap-1.5 mt-10">
                                <button
                                    onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                                    disabled={currentPage === 1}
                                    className="w-9 h-9 flex items-center justify-center rounded-lg border border-gray-300 text-gray-500 hover:bg-white disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer transition-colors"
                                >
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                                    </svg>
                                </button>

                                {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                                    <button
                                        key={page}
                                        onClick={() => setCurrentPage(page)}
                                        className={`w-9 h-9 flex items-center justify-center rounded-lg text-sm font-medium transition-colors cursor-pointer ${page === currentPage
                                            ? "bg-[#8B1A1A] text-white"
                                            : "border border-gray-300 text-gray-600 hover:bg-white"
                                            }`}
                                    >
                                        {page}
                                    </button>
                                ))}

                                <button
                                    onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                                    disabled={currentPage === totalPages}
                                    className="w-9 h-9 flex items-center justify-center rounded-lg border border-gray-300 text-gray-500 hover:bg-white disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer transition-colors"
                                >
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                                    </svg>
                                </button>
                            </nav>
                        )}
                    </div>
                </div>
            </main>

            <Footer />
        </div>
    );
}

/* ══════════════════════════════════════════════════
   PRODUCT CARD — extracted for clarity
   ══════════════════════════════════════════════════ */

function ProductCard({ box }: { box: GiftBoxListDto }) {
    const mainImage = box.Image || "";
    const hasImage = mainImage.length > 0;
    const isOutOfStock = (box.StockQuantity ?? 0) <= 0;
    const isLowStock = !isOutOfStock && (box.StockQuantity ?? 0) <= 10;

    return (
        <div className={`group bg-white rounded-2xl overflow-hidden shadow-sm hover:shadow-md transition-shadow ${isOutOfStock ? "opacity-75" : ""}`}>
            {/* Image */}
            <div className="relative aspect-square overflow-hidden bg-gray-100">
                {hasImage ? (
                    <img
                        src={mainImage}
                        alt={box.Name}
                        className={`w-full h-full object-cover transition-transform duration-500 ${isOutOfStock ? "grayscale" : "group-hover:scale-105"}`}
                    />
                ) : (
                    <div className="w-full h-full flex items-center justify-center text-gray-300">
                        <svg className="w-16 h-16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M20.25 7.5l-.625 10.632a2.25 2.25 0 01-2.247 2.118H6.622a2.25 2.25 0 01-2.247-2.118L3.75 7.5m8.25 3v6.75m0 0l-3-3m3 3l3-3M3.375 7.5h17.25c.621 0 1.125-.504 1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125H3.375c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125z" />
                        </svg>
                    </div>
                )}

                {/* Out of stock overlay */}
                {isOutOfStock && (
                    <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                        <span className="px-4 py-2 bg-gray-800 text-white text-sm font-bold tracking-wider uppercase rounded-lg">
                            Hết hàng
                        </span>
                    </div>
                )}

                {/* Badge — based on price tiers for visual variety */}
                {!isOutOfStock && box.Price >= 3_000_000 && (
                    <span className="absolute top-3 left-3 px-2.5 py-1 bg-[#D4AF37] text-white text-[10px] font-bold tracking-wider uppercase rounded">
                        Premium
                    </span>
                )}
                {!isOutOfStock && box.Price < 1_000_000 && (
                    <span className="absolute top-3 left-3 px-2.5 py-1 bg-[#8B1A1A] text-white text-[10px] font-bold tracking-wider uppercase rounded">
                        Best Seller
                    </span>
                )}

                {/* Low stock warning badge */}
                {isLowStock && (
                    <span className="absolute top-3 right-3 px-2.5 py-1 bg-amber-500 text-white text-[10px] font-bold tracking-wider rounded">
                        Còn {box.StockQuantity} sp
                    </span>
                )}
            </div>

            {/* Info */}
            <div className="p-5">
                <h3 className="font-bold text-gray-900 uppercase text-sm tracking-wide mb-2 line-clamp-2 min-h-[2.5rem]">
                    {box.Name}
                </h3>
                <div className="flex items-center justify-between mb-4">
                    <p className="text-[#8B1A1A] font-bold text-lg">
                        {formatPrice(box.Price)}
                    </p>
                    {!isOutOfStock && (
                        <p className={`text-xs font-medium ${isLowStock ? "text-amber-600" : "text-green-600"}`}>
                            Kho: {box.StockQuantity}
                        </p>
                    )}
                </div>
                <Link
                    to={`/gift-boxes/${box.Id}`}
                    className="inline-flex items-center justify-center w-full py-2.5 border-2 border-[#8B1A1A] text-[#8B1A1A] text-xs font-bold tracking-[0.15em] uppercase rounded-lg hover:bg-[#8B1A1A] hover:text-white transition-colors"
                >
                    Chi tiết
                </Link>
            </div>
        </div>
    );
}
