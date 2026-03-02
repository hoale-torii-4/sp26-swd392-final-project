import { Link } from "react-router-dom";
import Header from "../components/Header";
import Footer from "../components/Footer";
import heroBasket from "../assets/hero-basket.png";
import personalizationBasket from "../assets/personalization-basket.png";
import product1 from "../assets/product-1.png";
import product2 from "../assets/product-2.png";
import product3 from "../assets/product-3.png";
import product4 from "../assets/product-4.png";

/* ───── Static Data ───── */
const collections = [
    { name: "Xuân Đoàn Viên", desc: "Ấm áp tình thân, sum vầy bên tách trà thơm.", img: product1 },
    { name: "Cát Tường Phú Quý", desc: "Lời chúc thịnh vượng và may mắn hanh thông.", img: product2 },
    { name: "Lộc Xuân Doanh Nghiệp", desc: "Nâng tầm thương hiệu qua quà tặng đẳng cấp.", img: product3 },
    { name: "An Nhiên Tân Xuân", desc: "Thư thái tâm hồn, khởi đầu năm mới bình an.", img: product4 },
];

const products = [
    { name: "Hộp Quà Sum Họp", price: 1250000, badge: "BIẾU GIA ĐÌNH", badgeColor: "bg-[#C0A062]", img: product1 },
    { name: "Hộp Quà Trường Thọ", price: 1850000, badge: "BIẾU ÔNG BÀ", badgeColor: "bg-[#C0A062]", img: product2 },
    { name: "Hộp Quà Doanh Gia", price: 2450000, badge: "BIẾU ĐỐI TÁC", badgeColor: "bg-[#8B1A1A]", img: product3 },
    { name: "Hộp Quà Gia Ấm", price: 1550000, badge: "BIẾU NGƯỜI THÂN", badgeColor: "bg-[#C0A062]", img: product4 },
];

const formatPrice = (p: number) =>
    p.toLocaleString("vi-VN") + "đ";

/* ───── Component ───── */
export default function HomePage() {
    return (
        <div className="font-sans">
            <Header />

            {/* ════════ HERO ════════ */}
            <section className="relative bg-[#1B3022] overflow-hidden">
                <div className="max-w-7xl mx-auto flex flex-col lg:flex-row items-center min-h-[85vh]">
                    {/* Text */}
                    <div className="flex-1 px-8 lg:px-16 py-20 lg:py-0 z-10">
                        <span className="inline-block px-5 py-2 rounded-full border border-[#C0A062]/40 text-xs font-semibold tracking-[0.15em] text-[#C0A062] uppercase mb-8">
                            Mừng Xuân Giáp Thìn 2024
                        </span>
                        <h1 className="text-4xl sm:text-5xl lg:text-6xl font-serif font-bold text-white leading-tight mb-2">
                            Trao Lộc Đầu Xuân,
                        </h1>
                        <h1 className="text-4xl sm:text-5xl lg:text-6xl font-serif font-bold italic text-[#C0A062] leading-tight mb-8">
                            Gói Trọn Nghĩa Tình
                        </h1>
                        <p className="text-gray-300 text-base lg:text-lg leading-relaxed max-w-lg mb-10">
                            Quà Tết không chỉ là vật phẩm, mà là phong vị của sự tri ân, là lời
                            chúc bình an được gói ghém tỉ mỉ trong từng nếp lụa, trao gửi chân
                            tình đến những người trân quý.
                        </p>
                        <div className="flex flex-wrap gap-4">
                            <Link
                                to="/products"
                                className="px-8 py-3.5 bg-[#8B1A1A] text-white text-xs font-bold tracking-[0.15em] uppercase rounded hover:bg-[#7A1717] transition-colors"
                            >
                                Khám phá bộ sưu tập
                            </Link>
                            <Link
                                to="/custom"
                                className="px-8 py-3.5 border border-gray-400 text-white text-xs font-bold tracking-[0.15em] uppercase rounded hover:bg-white/10 transition-colors"
                            >
                                Tự tạo giỏ quà
                            </Link>
                        </div>
                    </div>
                    {/* Image */}
                    <div className="flex-1 relative flex items-center justify-center lg:justify-end p-8">
                        <img
                            src={heroBasket}
                            alt="Giỏ quà Tết cao cấp"
                            className="w-full max-w-xl lg:max-w-2xl object-contain drop-shadow-2xl"
                        />
                    </div>
                </div>
            </section>

            {/* ════════ COLLECTIONS ════════ */}
            <section className="bg-[#F9F7F2] py-20 lg:py-28">
                <div className="max-w-7xl mx-auto px-6">
                    {/* Section header */}
                    <div className="text-center mb-14">
                        <div className="flex items-center justify-center gap-4 mb-4">
                            <span className="h-px w-12 bg-[#C0A062]" />
                            <span className="text-xs font-semibold tracking-[0.2em] text-[#8B1A1A] uppercase">Danh mục</span>
                            <span className="h-px w-12 bg-[#C0A062]" />
                        </div>
                        <h2 className="text-3xl lg:text-4xl font-serif font-bold text-gray-900 mb-4">
                            Bộ Sưu Tập Quà Tết 2024
                        </h2>
                        <p className="text-gray-500 max-w-2xl mx-auto leading-relaxed">
                            Mỗi bộ sưu tập là một câu chuyện về văn hóa truyền thống, nơi những thức
                            quà tinh túy được kết tinh từ lòng hiếu khách và mong ước về một năm mới
                            an khang, thịnh vượng.
                        </p>
                    </div>

                    {/* Collection grid */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                        {collections.map((c) => (
                            <div
                                key={c.name}
                                className="group bg-white rounded-xl overflow-hidden shadow-sm hover:shadow-lg transition-shadow"
                            >
                                <div className="aspect-[4/3] overflow-hidden bg-[#D9E8DE]">
                                    <img
                                        src={c.img}
                                        alt={c.name}
                                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                                    />
                                </div>
                                <div className="p-5 text-center">
                                    <h3 className="text-lg font-serif font-bold text-gray-900 mb-1.5">{c.name}</h3>
                                    <p className="text-sm text-gray-500 mb-4 leading-relaxed">{c.desc}</p>
                                    <Link
                                        to="/products"
                                        className="text-xs font-semibold tracking-[0.1em] text-[#8B1A1A] uppercase border-b border-[#8B1A1A] pb-0.5 hover:text-[#6B1414] transition-colors"
                                    >
                                        Xem bộ sưu tập
                                    </Link>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* ════════ PRODUCTS ════════ */}
            <section className="bg-[#FAFAF8] py-20 lg:py-28">
                <div className="max-w-7xl mx-auto px-6">
                    {/* Section header */}
                    <div className="text-center mb-14">
                        <div className="flex items-center justify-center gap-4 mb-4">
                            <span className="h-px w-12 bg-[#C0A062]" />
                            <span className="text-xs font-semibold tracking-[0.2em] text-[#8B1A1A] uppercase">Sản phẩm nổi bật</span>
                            <span className="h-px w-12 bg-[#C0A062]" />
                        </div>
                        <h2 className="text-3xl lg:text-4xl font-serif font-bold text-gray-900 mb-1">
                            Trao{" "}
                            <span className="italic text-[#8B1A1A]">Thịnh Vượng</span>
                        </h2>
                        <p className="text-gray-500 max-w-2xl mx-auto mt-4 leading-relaxed">
                            Những hộp quà được yêu thích nhất với sự kết hợp hài hòa giữa hương vị
                            truyền thống và thiết kế hiện đại, mang đến sự sang trọng và trọn vẹn.
                        </p>
                    </div>

                    {/* Product grid */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                        {products.map((p) => (
                            <div key={p.name} className="group">
                                <div className="relative aspect-square rounded-xl overflow-hidden bg-[#2A4A35] mb-4">
                                    <span className={`absolute top-4 left-4 z-10 px-3 py-1 text-[10px] font-bold tracking-wider text-white uppercase rounded ${p.badgeColor}`}>
                                        {p.badge}
                                    </span>
                                    <img
                                        src={p.img}
                                        alt={p.name}
                                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                                    />
                                </div>
                                <h3 className="text-base font-serif font-semibold text-gray-900 mb-1">{p.name}</h3>
                                <p className="text-lg font-bold text-[#8B1A1A] mb-3">{formatPrice(p.price)}</p>
                                <button className="w-full py-2.5 border border-gray-300 rounded-lg text-xs font-bold tracking-[0.1em] uppercase text-gray-700 hover:bg-[#8B1A1A] hover:text-white hover:border-[#8B1A1A] transition-colors">
                                    Thêm vào giỏ
                                </button>
                            </div>
                        ))}
                    </div>

                    {/* View all */}
                    <div className="text-center mt-10">
                        <Link
                            to="/products"
                            className="inline-flex items-center gap-2 text-sm font-bold tracking-[0.1em] uppercase text-[#8B1A1A] hover:text-[#6B1414] transition-colors"
                        >
                            Xem tất cả sản phẩm
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.25 8.25L21 12m0 0l-3.75 3.75M21 12H3" />
                            </svg>
                        </Link>
                    </div>
                </div>
            </section>

            {/* ════════ PERSONALIZATION ════════ */}
            <section className="relative bg-[#1B3022] overflow-hidden">
                <div className="max-w-7xl mx-auto flex flex-col lg:flex-row items-center">
                    {/* Image */}
                    <div className="lg:w-1/2">
                        <img
                            src={personalizationBasket}
                            alt="Tự tạo giỏ quà"
                            className="w-full h-full object-cover min-h-[400px] lg:min-h-[550px]"
                        />
                    </div>
                    {/* Content */}
                    <div className="lg:w-1/2 px-8 lg:px-16 py-16">
                        <h2 className="text-3xl lg:text-4xl font-serif font-bold text-white leading-tight mb-2">
                            Cá nhân hóa món quà
                        </h2>
                        <h2 className="text-3xl lg:text-4xl font-serif font-bold italic text-[#C0A062] mb-8">
                            theo cách của bạn
                        </h2>
                        <ul className="space-y-5 mb-10">
                            {[
                                "Tự chọn món: Hơn 200+ đặc sản tuyển chọn.",
                                "Tính giá tự động: Cân đối ngân sách tức thì.",
                                "Phù hợp nhiều đối tượng: Từ cá nhân đến doanh nghiệp.",
                            ].map((item) => (
                                <li key={item} className="flex items-start gap-3 text-gray-200">
                                    <svg className="w-5 h-5 text-[#C0A062] mt-0.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                    </svg>
                                    <span className="text-sm lg:text-base leading-relaxed">{item}</span>
                                </li>
                            ))}
                        </ul>
                        <Link
                            to="/custom"
                            className="inline-flex items-center gap-3 px-8 py-3.5 bg-[#C0A062] text-[#1B3022] text-xs font-bold tracking-[0.15em] uppercase rounded hover:bg-[#D4B876] transition-colors"
                        >
                            Bắt đầu tạo giỏ quà
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.25 8.25L21 12m0 0l-3.75 3.75M21 12H3" />
                            </svg>
                        </Link>
                    </div>
                </div>
            </section>

            {/* ════════ BRAND STORY ════════ */}
            <section className="bg-[#F9F7F2] py-20 lg:py-28">
                <div className="max-w-7xl mx-auto px-6">
                    <div className="text-center mb-14">
                        <div className="flex items-center justify-center gap-4 mb-4">
                            <span className="h-px w-12 bg-[#C0A062]" />
                            <span className="text-xs font-semibold tracking-[0.2em] text-[#8B1A1A] uppercase">Thương hiệu</span>
                            <span className="h-px w-12 bg-[#C0A062]" />
                        </div>
                        <h2 className="text-3xl lg:text-4xl font-serif font-bold text-gray-900 mb-4">
                            Câu Chuyện <span className="italic text-[#8B1A1A]">Lộc Xuân</span>
                        </h2>
                    </div>
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
                        <div>
                            <p className="text-gray-600 leading-relaxed mb-6">
                                Lộc Xuân không chỉ là một thương hiệu quà Tết — đó là câu chuyện về sự trân
                                trọng những giá trị truyền thống trong thời đại hiện đại. Mỗi chiếc hộp quà
                                được chúng tôi chăm chút tỉ mỉ, từ việc tuyển chọn nguyên liệu đến thiết kế
                                bao bì, đều mang theo lời chúc an khang và thịnh vượng.
                            </p>
                            <p className="text-gray-600 leading-relaxed mb-8">
                                Chúng tôi tin rằng mỗi món quà Tết đều kể một câu chuyện — câu chuyện về
                                tình cảm gia đình, về lòng biết ơn với đối tác, và về ước vọng cho một năm
                                mới trọn vẹn.
                            </p>
                            <Link
                                to="/about"
                                className="inline-flex items-center gap-2 text-sm font-bold tracking-[0.1em] uppercase text-[#8B1A1A] hover:text-[#6B1414] transition-colors"
                            >
                                Tìm hiểu thêm
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.25 8.25L21 12m0 0l-3.75 3.75M21 12H3" />
                                </svg>
                            </Link>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <img src={product1} alt="Sản phẩm Lộc Xuân" className="rounded-xl object-cover w-full h-48 lg:h-56" />
                            <img src={product2} alt="Sản phẩm Lộc Xuân" className="rounded-xl object-cover w-full h-48 lg:h-56 mt-8" />
                            <img src={product3} alt="Sản phẩm Lộc Xuân" className="rounded-xl object-cover w-full h-48 lg:h-56" />
                            <img src={product4} alt="Sản phẩm Lộc Xuân" className="rounded-xl object-cover w-full h-48 lg:h-56 mt-8" />
                        </div>
                    </div>
                </div>
            </section>

            <Footer />
        </div>
    );
}
