import { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import Header from "../components/Header";
import Footer from "../components/Footer";
import { mixMatchService, type MixMatchItem } from "../services/mixMatchService";
import { cartService } from "../services/cartService";

const formatPrice = (value: number) => value.toLocaleString("vi-VN") + "₫";

const toArray = (value: any) => {
    if (Array.isArray(value)) return value;
    if (Array.isArray(value?.Data)) return value.Data;
    if (Array.isArray(value?.data)) return value.data;
    if (Array.isArray(value?.Items)) return value.Items;
    if (Array.isArray(value?.items)) return value.items;
    return [];
};

const EMPTY_SLOTS = Array.from({ length: 6 }, () => null as string | null);

type DragSource = {
    id: string;
    fromSlot: number | null;
};

export default function MixMatchPage() {
    const location = useLocation();
    const navigate = useNavigate();
    const editBoxId = location.state?.editBoxId;
    const initialItems = location.state?.items; // Array of items from custom box

    const [items, setItems] = useState<MixMatchItem[]>([]);
    const [categories, setCategories] = useState<any[]>([]);
    const [selectedCategory, setSelectedCategory] = useState("all");
    const [slots, setSlots] = useState<Array<string | null>>(EMPTY_SLOTS);
    const [dragSource, setDragSource] = useState<DragSource | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Load initial slots if editing
    useEffect(() => {
        if (initialItems && Array.isArray(initialItems)) {
            const newSlots = Array.from({ length: 6 }, () => null as string | null);
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
        const load = async () => {
            try {
                const [itemsRes, categoriesRes] = await Promise.all([
                    mixMatchService.getItems({ page: 1, pageSize: 50, isActive: true }),
                    mixMatchService.getCategories(),
                ]);
                setItems(toArray(itemsRes));
                setCategories(toArray(categoriesRes));
            } catch (err: unknown) {
                const errMsg = err && typeof err === "object" && "message" in err ? String((err as { message: string }).message) : "Không thể tải dữ liệu Mix & Match.";
                toast.error(errMsg);
            }
        };
        load();
    }, []);

    const filteredItems = useMemo(() => {
        if (selectedCategory === "all") return items;
        return items.filter((item) => item.Category === selectedCategory);
    }, [items, selectedCategory]);

    const slotItems = useMemo(() => {
        return slots.map((id) => items.find((entry) => entry.Id === id) ?? null);
    }, [slots, items]);

    const totals = useMemo(() => {
        const totalItems = slots.filter(Boolean).length;
        const totalPrice = slotItems.reduce((sum, item) => sum + (item?.Price ?? 0), 0);
        return { totalItems, totalPrice };
    }, [slots, slotItems]);

    const handleDropToSlot = (slotIndex: number) => {
        if (!dragSource) return;
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

                <section className="max-w-7xl w-full mx-auto px-4 lg:px-8 pt-8 pb-4">
                    <h1 className="font-serif text-3xl lg:text-4xl font-bold italic mb-2">
                        <span className="relative">
                            <span className="relative z-10 text-[#8B1A1A]">Mix & Match</span>
                            <span className="absolute bottom-1 left-0 right-0 h-3 bg-yellow-300/50 -z-0" />
                        </span>
                        <span className="text-[#8B1A1A]"> giỏ quà</span>
                    </h1>
                    <p className="text-sm text-gray-500">Kéo thả món quà vào từng ngăn để sắp xếp hộp quà (4 - 6 sản phẩm).</p>
                </section>

                <main className="flex-1 max-w-7xl w-full mx-auto px-4 lg:px-8 pb-14">
                    <div className="grid grid-cols-1 lg:grid-cols-[1fr_420px] gap-8">
                        <div>
                            <div className="bg-white rounded-2xl p-4 shadow-sm mb-6 flex flex-wrap gap-3">
                                <button
                                    className={`px-4 py-2 text-sm rounded-full border ${selectedCategory === "all" ? "bg-[#8B1A1A] text-white border-[#8B1A1A]" : "border-gray-200 text-gray-500"}`}
                                    onClick={() => setSelectedCategory("all")}
                                >
                                    Tất cả
                                </button>
                                {categories.map((category) => (
                                    <button
                                        key={category.value ?? category.Value}
                                        className={`px-4 py-2 text-sm rounded-full border ${selectedCategory === (category.value ?? category.Value)
                                            ? "bg-[#8B1A1A] text-white border-[#8B1A1A]"
                                            : "border-gray-200 text-gray-500"}`}
                                        onClick={() => setSelectedCategory(category.value ?? category.Value)}
                                    >
                                        {category.label ?? category.Label}
                                    </button>
                                ))}
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                                {filteredItems.map((item) => (
                                    <div
                                        key={item.Id}
                                        draggable
                                        onDragStart={() => setDragSource({ id: item.Id, fromSlot: null })}
                                        className="bg-white rounded-2xl p-4 shadow-sm border border-transparent hover:border-[#8B1A1A]/40 transition-all cursor-grab"
                                    >
                                        <div className="w-full h-40 rounded-xl bg-[#F5F5F0] flex items-center justify-center overflow-hidden mb-4">
                                            {item.Image ? (
                                                <img src={item.Image} alt={item.Name} className="w-full h-full object-cover" />
                                            ) : (
                                                <span className="text-xs text-gray-400">No image</span>
                                            )}
                                        </div>
                                        <p className="text-sm font-semibold text-gray-900 mb-1">{item.Name}</p>
                                        <p className="text-xs text-gray-500 mb-3">{item.CategoryLabel ?? item.Category}</p>
                                        <div className="flex items-center justify-between">
                                            <span className="text-sm font-bold text-[#8B1A1A]">{item.Price ? formatPrice(item.Price) : "--"}</span>
                                            <span className="text-xs text-gray-400">Kéo để đặt</span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        <div>
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
                                        <span className={`font-semibold ${totals.totalItems >= 4 && totals.totalItems <= 6 ? "text-green-600" : "text-orange-500"}`}>{totals.totalItems}</span>
                                    </div>
                                    <div className="flex items-center justify-between">
                                        <span className="text-gray-500">Tổng tiền</span>
                                        <span className="font-semibold text-[#8B1A1A]">{formatPrice(totals.totalPrice)}</span>
                                    </div>
                                </div>

                                <div className="mt-5 space-y-3">
                                    <button
                                        className="w-full py-3 bg-[#8B1A1A] text-white text-sm font-bold uppercase tracking-wider rounded-lg hover:bg-[#701515] transition-colors disabled:bg-gray-400"
                                        disabled={totals.totalItems < 4 || totals.totalItems > 6 || isSubmitting}
                                        onClick={handleCreateCustomBox}
                                    >
                                        {isSubmitting ? "Đang xử lý..." : editBoxId ? "Lưu thay đổi giỏ quà" : "Tạo giỏ quà Mix & Match"}
                                    </button>
                                    <button
                                        className="w-full py-3 border border-[#8B1A1A] text-[#8B1A1A] text-sm font-bold uppercase tracking-wider rounded-lg hover:bg-[#8B1A1A]/10 transition-colors disabled:bg-gray-100 disabled:text-gray-400 disabled:border-gray-200"
                                        disabled={totals.totalItems < 4 || totals.totalItems > 6 || isSubmitting}
                                        onClick={handleAddToCart}
                                    >
                                        Thêm vào giỏ hàng
                                    </button>
                                    <button
                                        className="w-full py-3 bg-[#1B3022] text-white text-sm font-bold uppercase tracking-wider rounded-lg hover:bg-[#142318] transition-colors disabled:bg-gray-400"
                                        disabled={totals.totalItems < 4 || totals.totalItems > 6 || isSubmitting}
                                        onClick={handleBuyNow}
                                    >
                                        Mua ngay
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                </main>

                <Footer />
            </div>
        );
    }
