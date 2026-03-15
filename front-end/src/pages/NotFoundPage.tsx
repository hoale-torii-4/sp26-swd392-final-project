import { Link } from "react-router-dom";
import Header from "../components/Header";
import Footer from "../components/Footer";

export default function NotFoundPage() {
    return (
        <div className="min-h-screen flex flex-col font-sans bg-[#F5F5F0]">
            <Header />
            <main className="flex-1 flex items-center justify-center px-6 py-16">
                <div className="max-w-xl text-center">
                    <p className="text-xs font-semibold tracking-[0.3em] text-[#C0A062] uppercase mb-4">
                        404
                    </p>
                    <h1 className="text-3xl sm:text-4xl font-serif font-bold text-[#1B3022] mb-4">
                        Không tìm thấy trang
                    </h1>
                    <p className="text-base text-gray-600 leading-relaxed mb-8">
                        Link bạn truy cập không tồn tại hoặc đã bị thay đổi. Vui lòng quay về
                        trang chủ hoặc khám phá bộ sưu tập quà tặng.
                    </p>
                    <div className="flex flex-wrap gap-4 justify-center">
                        <Link
                            to="/"
                            className="px-8 py-3.5 bg-[#8B1A1A] text-white text-xs font-bold tracking-[0.15em] uppercase rounded hover:bg-[#7A1717] transition-colors"
                        >
                            Về trang chủ
                        </Link>
                        <Link
                            to="/gift-boxes"
                            className="px-8 py-3.5 border border-[#1B3022]/40 text-[#1B3022] text-xs font-bold tracking-[0.15em] uppercase rounded hover:bg-[#1B3022]/10 transition-colors"
                        >
                            Xem bộ sưu tập
                        </Link>
                    </div>
                </div>
            </main>
            <Footer />
        </div>
    );
}
