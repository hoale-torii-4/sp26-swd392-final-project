import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { authService } from "../../services/authService";

export default function AdminLoginPage() {
    const navigate = useNavigate();
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(false);

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setError("");
        setLoading(true);

        try {
            await authService.login({ email, password });
            
            // Check if the user we just logged in as is actually an admin/staff
            if (authService.isAdmin()) {
                navigate("/admin", { replace: true });
            } else {
                // If they are a normal customer, log them back out and show error
                authService.logout();
                setError("Tài khoản này không có quyền truy cập trang quản trị.");
            }
        } catch (err: any) {
            setError(err?.response?.data?.Message || err?.response?.data?.message || err?.message || "Đăng nhập thất bại. Vui lòng kiểm tra lại email/mật khẩu.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
            <div className="sm:mx-auto sm:w-full sm:max-w-md">
                <div className="flex justify-center flex-col items-center">
                    <span className="text-[#8B1A1A] text-4xl font-serif font-bold italic tracking-wider mb-2">Lộc Xuân</span>
                    <h2 className="text-center text-3xl font-extrabold text-gray-900">
                        Admin Portal
                    </h2>
                    <p className="mt-2 text-center text-sm text-gray-600">
                        Đăng nhập bằng tài khoản Quản trị hoặc Nhân viên
                    </p>
                </div>
            </div>

            <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
                <div className="bg-white py-8 px-4 shadow sm:rounded-lg sm:px-10 border border-gray-100">
                    <form className="space-y-6" onSubmit={handleLogin}>
                        {error && (
                            <div className="p-3 text-sm text-red-700 bg-red-50 rounded-lg">
                                {error}
                            </div>
                        )}

                        <div>
                            <label className="block text-sm font-medium text-gray-700">Email</label>
                            <input
                                type="email"
                                required
                                placeholder="admin@locxuan.vn"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                className="mt-1 appearance-none block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-[#8B1A1A] focus:border-[#8B1A1A] sm:text-sm"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700">Mật khẩu</label>
                            <input
                                type="password"
                                required
                                placeholder="••••••••"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                className="mt-1 appearance-none block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-[#8B1A1A] focus:border-[#8B1A1A] sm:text-sm"
                            />
                        </div>

                        <div>
                            <button 
                                type="submit" 
                                disabled={loading}
                                className="w-full justify-center flex py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-[#8B1A1A] hover:bg-[#701515] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#8B1A1A] disabled:opacity-50 cursor-pointer" 
                            >
                                {loading ? "Đang xử lý..." : "Đăng nhập Hệ thống"}
                            </button>
                        </div>
                        
                        <div className="mt-6 text-center">
                            <button
                                type="button"
                                onClick={() => navigate("/")}
                                className="text-sm font-medium text-[#8B1A1A] hover:text-[#701515] hover:underline cursor-pointer"
                            >
                                &larr; Quay lại trang khách hàng
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
}
