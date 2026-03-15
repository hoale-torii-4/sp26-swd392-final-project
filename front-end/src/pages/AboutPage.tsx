import { Link } from "react-router-dom";
import Header from "../components/Header";
import Footer from "../components/Footer";
import aboutHero from "../assets/about-hero.png";
import product1 from "../assets/product-1.png";
import product2 from "../assets/product-2.png";

/* ───── Core Values Data ───── */
const coreValues = [
    {
        title: "Tầm nhìn",
        desc: "Trở thành biểu tượng quà tặng văn hóa hàng đầu Việt Nam, đưa giá trị nghệ thuật truyền thống vươn tầm thế giới.",
        icon: (
            <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
        ),
    },
    {
        title: "Sứ mệnh",
        desc: "Kết nối các thế hệ thông qua nghệ thuật tặng quà tinh tế, gìn giữ hồn cốt dân tộc trong từng hộp quà hiện đại.",
        icon: (
            <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M11.48 3.499a.562.562 0 011.04 0l2.125 5.111a.563.563 0 00.475.345l5.518.442c.499.04.701.663.321.988l-4.204 3.602a.563.563 0 00-.182.557l1.285 5.385a.562.562 0 01-.84.61l-4.725-2.885a.563.563 0 00-.586 0L6.982 20.54a.562.562 0 01-.84-.61l1.285-5.386a.562.562 0 00-.182-.557l-4.204-3.602a.563.563 0 01.321-.988l5.518-.442a.563.563 0 00.475-.345L11.48 3.5z" />
            </svg>
        ),
    },
    {
        title: "Cam kết",
        desc: "100% nguyên liệu chọn lọc, bền vững và quản lý chất lượng nghiêm ngặt tới từng chi tiết nhỏ nhất.",
        icon: (
            <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.324.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 011.37.49l1.296 2.247a1.125 1.125 0 01-.26 1.431l-1.003.827c-.293.24-.438.613-.431.992a6.759 6.759 0 010 .255c-.007.378.138.75.43.99l1.005.828c.424.35.534.954.26 1.43l-1.298 2.247a1.125 1.125 0 01-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.57 6.57 0 01-.22.128c-.331.183-.581.495-.644.869l-.213 1.28c-.09.543-.56.941-1.11.941h-2.594c-.55 0-1.02-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 01-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 01-1.369-.49l-1.297-2.247a1.125 1.125 0 01.26-1.431l1.004-.827c.292-.24.437-.613.43-.992a6.932 6.932 0 010-.255c.007-.378-.138-.75-.43-.99l-1.004-.828a1.125 1.125 0 01-.26-1.43l1.297-2.247a1.125 1.125 0 011.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.087.22-.128.332-.183.582-.495.644-.869l.214-1.281z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
        ),
    },
];

export default function AboutPage() {
    return (
        <div className="font-sans">
            <Header />

            {/* ════════ HERO ════════ */}
            <section className="relative bg-[#1B3022] overflow-hidden min-h-[70vh] flex items-end">
                {/* Background image collage */}
                <div className="absolute inset-0">
                    <img
                        src={aboutHero}
                        alt="Sản phẩm Lộc Xuân"
                        className="w-full h-full object-cover opacity-60"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-[#1B3022] via-[#1B3022]/40 to-transparent" />
                </div>
                <div className="relative max-w-5xl mx-auto px-6 pb-20 pt-40 text-center">
                    <h1 className="text-4xl sm:text-5xl lg:text-6xl font-serif font-bold italic text-white leading-tight mb-6">
                        Gói trọn phong vị Tết xưa
                        <br />
                        trong thức quà hiện đại
                    </h1>
                    <div className="flex items-center justify-center gap-4 mb-2">
                        <span className="h-px w-16 bg-[#C0A062]" />
                        <span className="h-px w-16 bg-[#C0A062]" />
                    </div>
                    <p className="text-xs font-semibold tracking-[0.2em] text-[#C0A062] uppercase">
                        Hành trình gìn giữ những giá trị văn hóa truyền thống
                    </p>
                </div>
            </section>

            {/* ════════ CÂU CHUYỆN ════════ */}
            <section className="bg-[#F9F7F2] py-20 lg:py-28">
                <div className="max-w-3xl mx-auto px-6 text-center">
                    <h2 className="text-3xl lg:text-4xl font-serif font-bold italic text-[#8B1A1A] mb-6">
                        Câu Chuyện Của Chúng Tôi
                    </h2>
                    <div className="flex items-center justify-center gap-1 mb-8 text-[#C0A062]">
                        {[0, 1, 2].map((i) => (
                            <svg key={i} className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                                <path d="M11.48 3.499a.562.562 0 011.04 0l2.125 5.111a.563.563 0 00.475.345l5.518.442c.499.04.701.663.321.988l-4.204 3.602a.563.563 0 00-.182.557l1.285 5.385a.562.562 0 01-.84.61l-4.725-2.885a.563.563 0 00-.586 0L6.982 20.54a.562.562 0 01-.84-.61l1.285-5.386a.562.562 0 00-.182-.557l-4.204-3.602a.563.563 0 01.321-.988l5.518-.442a.563.563 0 00.475-.345L11.48 3.5z" />
                            </svg>
                        ))}
                    </div>
                    <blockquote className="text-lg lg:text-xl text-gray-600 leading-relaxed italic mb-4">
                        "Lộc Xuân ra đời từ niềm đam mê với những nét đẹp cổ truyền, mong muốn mang
                        hơi thở của quá khứ vào nhịp sống hiện đại."
                    </blockquote>
                    <p className="text-gray-500 leading-relaxed mt-6">
                        Chúng tôi tin rằng mỗi dịp Tết đến là cơ hội để thắt chặt tình thân,
                        tri ân đối tác và gửi gắm yêu thương qua những món quà được chọn lựa tỉ mỉ.
                        Từ những nguyên liệu truyền thống đến thiết kế bao bì hiện đại, Lộc Xuân
                        kết hợp tinh hoa để tạo nên những thức quà xứng tầm.
                    </p>
                </div>
            </section>

            {/* ════════ NGUỒN CỘI & TÂM HUYẾT ════════ */}
            <section className="bg-white py-20 lg:py-28">
                <div className="max-w-6xl mx-auto px-6">
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
                        {/* Image */}
                        <div className="rounded-2xl overflow-hidden">
                            <img
                                src={product2}
                                alt="Sản phẩm Lộc Xuân"
                                className="w-full h-[400px] lg:h-[500px] object-cover"
                            />
                        </div>
                        {/* Text */}
                        <div>
                            <div className="flex items-start gap-4 mb-6">
                                <div className="w-1 h-16 bg-[#C0A062] rounded-full shrink-0" />
                                <h2 className="text-3xl lg:text-4xl font-serif font-bold italic text-gray-900">
                                    Nguồn Cội & Tâm Huyết
                                </h2>
                            </div>
                            <p className="text-gray-600 leading-relaxed mb-6">
                                Giữa nhịp sống hối hả, chúng tôi nhận ra những giá trị truyền thống
                                xưa đang dần phai nhat. Từ hương vị bánh chưng đến nét chữ trên
                                thiệp chúc Tết viết tay, tất cả đều chứa đựng linh hồn của ngày Tết cổ truyền.
                            </p>
                            <p className="text-gray-600 leading-relaxed">
                                Lộc Xuân không chỉ bán quà tặng, chúng tôi kiến tạo những giá trị bằng
                                lòng trân trọng. Mỗi hộp quà là một tác phẩm được chăm chút tỉ mỉ từ
                                khâu chọn nguyên liệu đến bao bì, mang đậm dấu ấn mỹ thuật Việt Nam.
                            </p>
                        </div>
                    </div>
                </div>
            </section>

            {/* ════════ TINH HOA HỘI TỤ ════════ */}
            <section className="bg-[#F9F7F2] py-20 lg:py-28">
                <div className="max-w-6xl mx-auto px-6">
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
                        {/* Text */}
                        <div className="order-2 lg:order-1">
                            <div className="flex items-start gap-4 mb-6">
                                <div className="w-1 h-16 bg-[#C0A062] rounded-full shrink-0" />
                                <h2 className="text-3xl lg:text-4xl font-serif font-bold italic text-gray-900">
                                    Tinh Hoa Hội Tụ
                                </h2>
                            </div>
                            <p className="text-gray-600 leading-relaxed mb-6">
                                Mỗi sản phẩm trong bộ sưu tập Lộc Xuân đều được tuyển chọn kỹ lưỡng
                                từ những làng nghề truyền thống và nhà sản xuất uy tín trên khắp Việt Nam.
                            </p>
                            <p className="text-gray-600 leading-relaxed">
                                Từ trà Thái Nguyên thượng hạng, bánh kẹo thủ công, đến rượu nếp cẩm
                                truyền thống — tất cả được gói ghém trong thiết kế sang trọng, tạo nên
                                những bộ quà Tết hoàn hảo cho mọi đối tượng.
                            </p>
                        </div>
                        {/* Image */}
                        <div className="order-1 lg:order-2 rounded-2xl overflow-hidden">
                            <img
                                src={product1}
                                alt="Tinh hoa hội tụ"
                                className="w-full h-[400px] lg:h-[500px] object-cover"
                            />
                        </div>
                    </div>
                </div>
            </section>

            {/* ════════ GIÁ TRỊ CỐT LÕI ════════ */}
            <section className="bg-[#5A0A0A] py-20 lg:py-28">
                <div className="max-w-6xl mx-auto px-6">
                    <div className="mb-14">
                        <h2 className="text-3xl lg:text-4xl font-serif font-bold italic text-white mb-4">
                            Giá Trị Cốt Lõi
                        </h2>
                        <p className="text-gray-300 max-w-xl leading-relaxed">
                            Chúng tôi tin rằng mỗi món quà là một sợi dây kết nối tình thần và lòng tri ân
                            sâu sắc nhất.
                        </p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        {coreValues.map((v) => (
                            <div key={v.title} className="bg-[#7A1717] rounded-2xl p-8">
                                <div className="w-14 h-14 bg-[#C0A062] rounded-full flex items-center justify-center text-[#5A0A0A] mb-6">
                                    {v.icon}
                                </div>
                                <h3 className="text-xl font-serif font-bold text-white mb-3">{v.title}</h3>
                                <p className="text-sm text-gray-200 leading-relaxed">{v.desc}</p>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* ════════ CTA QUOTE ════════ */}
            <section className="bg-[#F9F7F2] py-20 lg:py-28">
                <div className="max-w-3xl mx-auto px-6 text-center">
                    <span className="text-5xl font-serif text-[#C0A062] leading-none">❝</span>
                    <blockquote className="text-2xl lg:text-3xl font-serif italic text-[#5A0A0A] leading-relaxed mt-4 mb-10">
                        "Hãy để Lộc Xuân giúp bạn viết tiếp những câu chuyện tri ân nghĩa
                        trong mùa Tết này."
                    </blockquote>
                    <Link
                        to="/gift-boxes"
                        className="inline-block px-10 py-4 bg-[#5A0A0A] text-white text-xs font-bold tracking-[0.2em] uppercase rounded hover:bg-[#4A0808] transition-colors"
                    >
                        Khám phá các bộ sưu tập
                    </Link>
                </div>
            </section>

            <Footer />
        </div>
    );
}
