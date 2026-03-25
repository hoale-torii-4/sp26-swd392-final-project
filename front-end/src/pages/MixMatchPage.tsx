import { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate, Link } from "react-router-dom";
import { toast } from "react-toastify";
import Header from "../components/Header";
import Footer from "../components/Footer";
import { mixMatchService, type MixMatchItem, type MixMatchRule } from "../services/mixMatchService";
import { cartService } from "../services/cartService";
import { authService } from "../services/authService";

const formatPrice = (value: number) => value.toLocaleString("vi-VN") + "₫";

const toArray = (value: any) => {
    if (Array.isArray(value)) return value;
    if (Array.isArray(value?.Data)) return value.Data;
    if (Array.isArray(value?.data)) return value.data;
    if (Array.isArray(value?.Items)) return value.Items;
    if (Array.isArray(value?.items)) return value.items;
    return [];
};

type DragSource = {
    id: string;
    fromSlot: number | null;
};

export default function MixMatchPage() {
    const location = useLocation();
    const navigate = useNavigate();
    const isLoggedIn = authService.isAuthenticated();
    const editBoxId = location.state?.editBoxId;
    const initialItems = location.state?.items; // Array of items from custom box

    const [items, setItems] = useState<MixMatchItem[]>([]);
    const [categories, setCategories] = useState<any[]>([]);
    const [selectedCategory, setSelectedCategory] = useState("all");
    const [slots, setSlots] = useState<Array<string | null>>(Array(6).fill(null));
    const [dragSource, setDragSource] = useState<DragSource | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [rules, setRules] = useState<MixMatchRule | null>(null);
    const [searchQuery, setSearchQuery] = useState("");

    // Load initial slots if editing
    useEffect(() => {
        if (initialItems && Array.isArray(initialItems)) {
            const newSlots = Array<string | null>(6).fill(null);
            let slotIdx = 0;
            initialItems.forEach((it: any) => {
                const qty = it.Quantity ?? it.quantity ?? 1;
                const itemId = it.ItemId ?? it.itemId;
                for (let i = 0; i < qty && slotIdx < 6; i++) {
                    newSlots[slotIdx++] = itemId;
                }
            });
            setSlots(newSlots);
        }
    }, [initialItems]);

    useEffect(() => {
        if (rules && slots.length !== rules.MaxItems) {
            setSlots((prev) => {
                if (prev.length < rules.MaxItems) {
                    return [...prev, ...Array(rules.MaxItems - prev.length).fill(null)];
                } else if (prev.length > rules.MaxItems) {
                    return prev.slice(0, rules.MaxItems);
                }
                return prev;
            });
        }
    }, [rules?.MaxItems]);

    useEffect(() => {
        const load = async () => {
            try {
                const [itemsRes, categoriesRes, rulesRes] = await Promise.all([
                    mixMatchService.getItems({ page: 1, pageSize: 50, isActive: true }),
                    mixMatchService.getCategories(),
                    mixMatchService.getRules().catch(() => null),
                ]);
                setItems(toArray(itemsRes));
                setCategories(toArray(categoriesRes));
                if (rulesRes) setRules(rulesRes);
            } catch (err: unknown) {
                const errMsg = err && typeof err === "object" && "message" in err ? String((err as { message: string }).message) : "Không thể tải dữ liệu Mix & Match.";
                toast.error(errMsg);
            }
        };
        load();
    }, []);

    const filteredItems = useMemo(() => {
        let result = items;
        if (selectedCategory !== "all") {
            result = result.filter((item) => item.Category === selectedCategory);
        }
        if (searchQuery.trim() !== "") {
            result = result.filter((item) => item.Name.toLowerCase().includes(searchQuery.toLowerCase()));
        }
        return result;
    }, [items, selectedCategory, searchQuery]);

    const slotItems = useMemo(() => {
        return slots.map((id) => items.find((entry) => entry.Id === id) ?? null);
    }, [slots, items]);

    const validation = useMemo(() => {
        const validItems = slotItems.filter(Boolean);
        const totalItems = validItems.length;
        const totalPrice = validItems.reduce((sum, item) => sum + (item?.Price ?? 0), 0);

        const minItems = rules?.MinItems ?? 3;
        const maxItems = rules?.MaxItems ?? 6;
        const minDrink = rules?.MinDrink ?? 1;
        const minSnack = rules?.MinSnack ?? 2;
        const maxSavory = rules?.MaxSavory ?? 2;

        let drinkCount = 0;
        let alcoholCount = 0;
        let nutCount = 0;
        let foodCount = 0;
        let savoryCount = 0;

        const savoryNames = ["Khô gà lá chanh", "Khô bò", "Chà bông cá hồi", "Lạp xưởng tươi"];

        validItems.forEach(item => {
            if (!item) return;

            if (item.Category === "DRINK") drinkCount++;
            if (item.Category === "ALCOHOL") alcoholCount++;
            if (item.Category === "NUT") nutCount++;
            if (item.Category === "FOOD") foodCount++;
            if (item.Category === "SAVORY") savoryCount++;

            if (savoryNames.includes(item.Name) && item.Category !== "SAVORY") savoryCount++;
        });

        const beverageCount = drinkCount + alcoholCount;
        const snackCount = nutCount + foodCount;

        const errors: string[] = [];
        if (totalItems < minItems) errors.push(`Cần tối thiểu ${minItems} món (hiện có ${totalItems})`);
        if (totalItems > maxItems) errors.push(`Tối đa ${maxItems} món (hiện có ${totalItems})`);
        if (totalItems >= minItems && beverageCount < minDrink) errors.push(`Cần ít nhất ${minDrink} đồ uống (Trà/Rượu)`);
        if (totalItems >= minItems && snackCount < minSnack) errors.push(`Cần ít nhất ${minSnack} snack (Hạt/Bánh/Kẹo)`);
        if (savoryCount > maxSavory) errors.push(`Tối đa ${maxSavory} món đặc sản mặn (hiện có ${savoryCount})`);

        const isValid = totalItems >= minItems && totalItems <= maxItems && errors.length === 0;

        return { totalItems, totalPrice, isValid, errors, minItems, maxItems };
    }, [slotItems, rules]);

    const handleDropToSlot = (slotIndex: number) => {
        if (!dragSource) return;

        if (dragSource.fromSlot === null) {
            const itemId = dragSource.id;
            const item = items.find((i) => i.Id === itemId);
            if (item && item.StockQuantity !== undefined) {
                const currentCount = slots.filter((id) => id === itemId).length;
                if (currentCount >= item.StockQuantity) {
                    toast.error(`Sản phẩm "${item.Name}" chỉ còn ${item.StockQuantity} cái.`);
                    setDragSource(null);
                    return;
                }
            }
        }

        setSlots((prev) => {
            const next = [...prev];
            if (dragSource.fromSlot === null) {
                next[slotIndex] = dragSource.id;
                return next;
            }
            const fromIndex = dragSource.fromSlot;
            if (fromIndex === slotIndex) return prev;
            const temp = next[slotIndex];
            next[slotIndex] = next[fromIndex];
            next[fromIndex] = temp;
            return next;
        });
        setDragSource(null);
    };

    const handleClearSlot = (slotIndex: number) => {
        setSlots((prev) => {
            const next = [...prev];
            next[slotIndex] = null;
            return next;
        });
    };



    const buildItemsPayload = () => {
        const payload = slots
            .filter(Boolean)
            .reduce<Record<string, number>>((acc, id) => {
                if (!id) return acc;
                acc[id] = (acc[id] ?? 0) + 1;
                return acc;
            }, {});
        return Object.entries(payload).map(([ItemId, Quantity]) => ({ ItemId, Quantity }));
    };

    const handleCreateCustomBox = async () => {
        if (!validation.isValid) {
            toast.error(validation.errors[0] || "Giỏ quà chưa hợp lệ");
            return;
        }

        setIsSubmitting(true);
        const itemsPayload = buildItemsPayload();
        try {
            if (editBoxId) {
                await cartService.updateCustomBox(editBoxId, itemsPayload);
                toast.success("Đã cập nhật giỏ quà custom thành công.");
                navigate("/custom-box");
            } else {
                await mixMatchService.createCustomBox(itemsPayload);
                toast.success("Đã tạo giỏ quà custom thành công.");
                navigate("/custom-box");
            }
        } catch (err: unknown) {
            const errMsg = err && typeof err === "object" && "message" in err ? String((err as { message: string }).message) : "Không thể tải cấu hình giỏ quà.";
            toast.error(errMsg);
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleAddToCart = async () => {
        if (!validation.isValid) {
            toast.error(validation.errors[0] || "Giỏ quà chưa hợp lệ");
            return;
        }

        setIsSubmitting(true);
        const itemsPayload = buildItemsPayload();
        try {
            let id = editBoxId;
            if (editBoxId) {
                await cartService.updateCustomBox(editBoxId, itemsPayload);
            } else {
                id = await mixMatchService.createCustomBox(itemsPayload);
            }
            if (id) {
                 await cartService.addToCart({ Type: 1, CustomBoxId: id, Quantity: 1 });
                 toast.success(editBoxId ? "Đã cập nhật và thêm vào giỏ hàng." : "Đã thêm giỏ quà vào giỏ hàng.");
            }
        } catch (err: unknown) {
            const errMsg = err && typeof err === "object" && "message" in err ? String((err as { message: string }).message) : "Không thể thêm vào giỏ hàng.";
            toast.error(errMsg);
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleBuyNow = async () => {
        if (!validation.isValid) {
            toast.error(validation.errors[0] || "Giỏ quà chưa hợp lệ");
            return;
        }

        setIsSubmitting(true);
        const itemsPayload = buildItemsPayload();
        try {
            let id = editBoxId;
            if (editBoxId) {
                 await cartService.updateCustomBox(editBoxId, itemsPayload);
            } else {
                 id = await mixMatchService.createCustomBox(itemsPayload);
            }
            if (id) {
                const cart = await cartService.addToCart({ Type: 1, CustomBoxId: id, Quantity: 1 });
                const addedItem = cart.Items.find((entry) => entry.ProductId === id || entry.Id === id);
                if (addedItem) {
                    navigate("/checkout", {
                        state: {
                            selectedItems: [addedItem],
                            totalItems: addedItem.Quantity,
                            totalAmount: addedItem.Quantity * addedItem.UnitPrice,
                        },
                    });
                } else {
                    navigate("/cart");
                }
            }
        } catch (err: unknown) {
            const errMsg = err && typeof err === "object" && "message" in err ? String((err as { message: string }).message) : "Không thể mua ngay.";
            toast.error(errMsg);
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
            <div className="font-sans bg-[#F5F5F0] min-h-screen flex flex-col">
                <Header />

                {/* ══ Login guard ══ */}
                {!isLoggedIn ? (
                    <main className="flex-1 flex items-center justify-center px-4 py-20">
                        <div className="bg-white rounded-2xl shadow-sm p-8 max-w-md w-full text-center">
                            <div className="w-16 h-16 mx-auto mb-5 rounded-full bg-[#8B1A1A]/10 flex items-center justify-center">
                                <svg className="w-8 h-8 text-[#8B1A1A]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" />
                                </svg>
                            </div>
                            <h2 className="text-xl font-bold text-gray-900 mb-2">Đăng nhập để tiếp tục</h2>
                            <p className="text-sm text-gray-500 mb-6">
                                Bạn cần đăng nhập để sử dụng tính năng tạo giỏ quà Mix &amp; Match.
                            </p>
                            <Link
                                to="/login"
                                state={{ from: "/mix-match" }}
                                className="inline-block w-full py-3 bg-[#8B1A1A] text-white text-sm font-bold uppercase tracking-wider rounded-lg hover:bg-[#701515] transition-colors"
                            >
                                Đăng nhập
                            </Link>
                            <p className="text-xs text-gray-400 mt-4">
                                Chưa có tài khoản?{" "}
                                <Link to="/register" className="text-[#8B1A1A] hover:underline font-medium">
                                    Đăng ký ngay
                                </Link>
                            </p>
                        </div>
                    </main>
                ) : (
                <>
                <section className="max-w-7xl w-full mx-auto px-4 lg:px-8 pt-8 pb-4">
                    <h1 className="font-serif text-3xl lg:text-4xl font-bold italic mb-2">
                        <span className="relative">
                            <span className="relative z-10 text-[#8B1A1A]">Mix & Match</span>
                            <span className="absolute bottom-1 left-0 right-0 h-3 bg-yellow-300/50 -z-0" />
                        </span>
                        <span className="text-[#8B1A1A]"> giỏ quà</span>
                    </h1>
                    <p className="text-sm text-gray-500">Kéo thả món quà vào từng ngăn để sắp xếp hộp quà ({rules?.MinItems ?? 3} - {rules?.MaxItems ?? 6} sản phẩm).</p>
                </section>

                <main className="flex-1 max-w-7xl w-full mx-auto px-4 lg:px-8 pb-14">
                    <div className="flex flex-col xl:flex-row gap-6 items-start">
                        
                        {/* LEFT SIDEBAR: Search & Filters */}
                        <aside className="w-full xl:w-[240px] shrink-0 xl:sticky xl:top-6 z-10">
                            <div className="bg-white rounded-2xl p-5 shadow-sm">
                                <h3 className="text-sm font-bold uppercase tracking-wider text-gray-700 mb-4">Tìm kiếm & Lọc</h3>
                                
                                <div className="relative mb-5">
                                    <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                                    </svg>
                                    <input 
                                        type="text" 
                                        placeholder="Nhập tên sản phẩm..." 
                                        className="w-full pl-9 pr-4 py-2 bg-[#F5F5F0] border-transparent rounded-lg text-sm focus:ring-[#8B1A1A] focus:border-[#8B1A1A] outline-none"
                                        value={searchQuery}
                                        onChange={(e) => setSearchQuery(e.target.value)}
                                    />
                                </div>

                                <div className="flex xl:flex-col gap-2 overflow-x-auto pb-2 xl:pb-0 hide-scrollbar">
                                    <button
                                        className={`shrink-0 xl:w-full text-left px-4 py-2.5 text-sm rounded-lg transition-all ${selectedCategory === "all" ? "bg-[#8B1A1A] text-white font-medium shadow-sm" : "bg-gray-50 text-gray-600 hover:bg-gray-100"}`}
                                        onClick={() => setSelectedCategory("all")}
                                    >
                                        Tất cả danh mục
                                    </button>
                                    {categories.map((category) => (
                                        <button
                                            key={category.value ?? category.Value}
                                            className={`shrink-0 xl:w-full text-left px-4 py-2.5 text-sm rounded-lg transition-all ${selectedCategory === (category.value ?? category.Value)
                                                ? "bg-[#8B1A1A] text-white font-medium shadow-sm"
                                                : "bg-gray-50 text-gray-600 hover:bg-gray-100"}`}
                                            onClick={() => setSelectedCategory(category.value ?? category.Value)}
                                        >
                                            {category.label ?? category.Label}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </aside>

                        {/* RIGHT WRAPPER: Products & Custom Box Container */}
                        <div className="flex-1 w-full min-w-0 grid grid-cols-1 lg:grid-cols-[1fr_420px] xl:grid-cols-[1fr_360px] gap-6">
                            
                            {/* PRODUCTS LIST */}
                            <div>
                                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3 gap-5">
                                {filteredItems.map((item) => {
                                    const isOutOfStock = (item.StockQuantity ?? 0) <= 0;
                                    const isLowStock = !isOutOfStock && (item.StockQuantity ?? 0) <= 10;
                                    
                                    return (
                                        <div
                                            key={item.Id}
                                            draggable={!isOutOfStock}
                                            onDragStart={() => !isOutOfStock && setDragSource({ id: item.Id, fromSlot: null })}
                                            className={`bg-white rounded-2xl p-4 shadow-sm border border-transparent hover:border-[#8B1A1A]/40 transition-all ${isOutOfStock ? "opacity-75 cursor-not-allowed" : "cursor-grab"}`}
                                        >
                                            <div className="relative w-full h-40 rounded-xl bg-[#F5F5F0] flex items-center justify-center overflow-hidden mb-4">
                                                {item.Image ? (
                                                    <img src={item.Image} alt={item.Name} className={`w-full h-full object-cover ${isOutOfStock ? "grayscale" : ""}`} />
                                                ) : (
                                                    <span className="text-xs text-gray-400">No image</span>
                                                )}

                                                {/* Out of stock overlay */}
                                                {isOutOfStock && (
                                                    <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                                                        <span className="px-3 py-1.5 bg-gray-800 text-white text-xs font-bold tracking-wider uppercase rounded-lg">
                                                            Hết hàng
                                                        </span>
                                                    </div>
                                                )}

                                                {/* Low stock warning badge */}
                                                {isLowStock && (
                                                    <span className="absolute top-2 right-2 px-2 py-1 bg-amber-500 text-white text-[10px] font-bold tracking-wider rounded">
                                                        Còn {item.StockQuantity} sp
                                                    </span>
                                                )}
                                            </div>
                                            <p className="text-sm font-semibold text-gray-900 mb-1">{item.Name}</p>
                                            <p className="text-xs text-gray-500 mb-3">{item.CategoryLabel ?? item.Category}</p>
                                            <div className="flex flex-wrap items-center justify-between gap-1 mt-1">
                                                <div className="flex flex-col">
                                                    <span className="text-sm font-bold text-[#8B1A1A]">{item.Price ? formatPrice(item.Price) : "--"}</span>
                                                </div>
                                                <div className="flex flex-col items-end gap-1">
                                                    {!isOutOfStock ? (
                                                        <>
                                                            <span className={`text-[11px] font-bold px-1.5 py-0.5 rounded-md ${isLowStock ? "bg-amber-100 text-amber-700" : "bg-green-100 text-green-700"}`}>
                                                                Kho: {item.StockQuantity ?? 0}
                                                            </span>
                                                            <span className="text-[10px] text-gray-400">Kéo để đặt</span>
                                                        </>
                                                    ) : (
                                                        <span className="text-xs text-gray-400 mt-0.5">Không thể chọn</span>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                            </div>

                            {/* CUSTOM BOX PANEL */}
                            <div className="max-lg:w-full">
                                <div className="bg-white rounded-2xl p-6 shadow-sm lg:sticky lg:top-6 lg:max-h-[calc(100vh-96px)] lg:overflow-y-auto">
                                <h3 className="text-sm font-bold uppercase tracking-wider text-gray-700 mb-4">Hộp quà của bạn</h3>
                                <p className="text-xs text-gray-500 mb-5">Kéo thả để lấp đầy từng ngăn hoặc đổi vị trí.</p>

                                <div className="grid grid-cols-2 gap-4">
                                    {slotItems.map((slotItem, index) => (
                                        <div
                                            key={`slot-${index}`}
                                            className={`relative h-36 rounded-2xl border-2 ${slotItem ? "border-[#8B1A1A]/40 bg-[#FFF8F0]" : "border-dashed border-gray-300 bg-[#F5F5F0]"} flex items-center justify-center`}
                                            onDragOver={(event) => event.preventDefault()}
                                            onDrop={() => handleDropToSlot(index)}
                                            draggable={!!slotItem}
                                            onDragStart={() => slotItem && setDragSource({ id: slotItem.Id, fromSlot: index })}
                                        >
                                            {slotItem ? (
                                                <div className="text-center px-2">
                                                    <div className="w-16 h-16 mx-auto rounded-xl bg-white overflow-hidden mb-2">
                                                        {slotItem.Image ? (
                                                            <img src={slotItem.Image} alt={slotItem.Name} className="w-full h-full object-cover" />
                                                        ) : (
                                                            <div className="w-full h-full flex items-center justify-center text-[10px] text-gray-400">No image</div>
                                                        )}
                                                    </div>
                                                    <p className="text-xs font-semibold text-gray-900 line-clamp-2">{slotItem.Name}</p>
                                                    <p className="text-[10px] text-gray-500">{slotItem.CategoryLabel ?? slotItem.Category}</p>
                                                </div>
                                            ) : (
                                                <span className="text-xs text-gray-400">Ngăn trống</span>
                                            )}

                                            {slotItem && (
                                                <button
                                                    type="button"
                                                    className="absolute top-2 right-2 w-6 h-6 rounded-full bg-white border border-gray-200 text-gray-400 hover:text-[#8B1A1A]"
                                                    onClick={() => handleClearSlot(index)}
                                                >
                                                    ×
                                                </button>
                                            )}
                                        </div>
                                    ))}
                                </div>

                                <div className="border-t border-gray-200 mt-5 pt-4 space-y-2 text-sm">
                                    <div className="flex items-center justify-between">
                                        <span className="text-gray-500">Tổng sản phẩm</span>
                                        <span className={`font-semibold ${validation.totalItems >= validation.minItems && validation.totalItems <= validation.maxItems && validation.errors.length === 0 ? "text-green-600" : "text-orange-500"}`}>{validation.totalItems}</span>
                                    </div>
                                    <div className="flex items-center justify-between">
                                        <span className="text-gray-500">Tổng tiền</span>
                                        <span className="font-semibold text-[#8B1A1A]">{formatPrice(validation.totalPrice)}</span>
                                    </div>
                                </div>

                                {validation.errors.length > 0 && validation.totalItems > 0 && (
                                    <div className="bg-red-50 border border-red-100 rounded-lg p-3 mt-4 space-y-1.5">
                                        {validation.errors.map((err, idx) => (
                                            <div key={idx} className="flex items-start text-red-600 text-xs gap-1.5">
                                                <svg className="w-4 h-4 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                                                </svg>
                                                <span>{err}</span>
                                            </div>
                                        ))}
                                    </div>
                                )}

                                <div className="mt-5 space-y-3">
                                    <button
                                        className="w-full py-3 bg-[#8B1A1A] text-white text-sm font-bold uppercase tracking-wider rounded-lg hover:bg-[#701515] transition-colors disabled:bg-gray-400"
                                        disabled={!validation.isValid || isSubmitting}
                                        onClick={handleCreateCustomBox}
                                    >
                                        {isSubmitting ? "Đang xử lý..." : editBoxId ? "Lưu thay đổi giỏ quà" : "Tạo giỏ quà Mix & Match"}
                                    </button>
                                    <button
                                        className="w-full py-3 border border-[#8B1A1A] text-[#8B1A1A] text-sm font-bold uppercase tracking-wider rounded-lg hover:bg-[#8B1A1A]/10 transition-colors disabled:bg-gray-100 disabled:text-gray-400 disabled:border-gray-200"
                                        disabled={!validation.isValid || isSubmitting}
                                        onClick={handleAddToCart}
                                    >
                                        Thêm vào giỏ hàng
                                    </button>
                                    <button
                                        className="w-full py-3 bg-[#1B3022] text-white text-sm font-bold uppercase tracking-wider rounded-lg hover:bg-[#142318] transition-colors disabled:bg-gray-400"
                                        disabled={!validation.isValid || isSubmitting}
                                        onClick={handleBuyNow}
                                    >
                                        Mua ngay
                                    </button>
                                </div>
                            </div>
                            </div>
                        </div>
                    </div>
                </main>
                </>
                )}

                <Footer />
            </div>
        );
    }
