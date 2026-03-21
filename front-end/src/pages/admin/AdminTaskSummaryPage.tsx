const TASKS = [
    {
        id: 10,
        name: "Trang xác thực người dùng (Đăng nhập / Đăng ký)",
        createdAt: "2026-02-26",
        status: "closed",
    },
    {
        id: 11,
        name: "Tạo Backend Node.js",
        createdAt: "2026-02-28",
        status: "closed",
    },
    {
        id: 13,
        name: "Tạo trang Dashboard quản trị",
        createdAt: "2026-03-02",
        status: "closed",
    },
    {
        id: 14,
        name: "[Mobile] Xác thực đăng nhập trên ứng dụng di động",
        createdAt: "2026-03-02",
        status: "closed",
    },
    {
        id: 19,
        name: "Triển khai trang hồ sơ người dùng",
        createdAt: "2026-03-04",
        status: "closed",
    },
    {
        id: 21,
        name: "Tính năng thanh toán",
        createdAt: "2026-03-04",
        status: "closed",
    },
    {
        id: 24,
        name: "Triển khai đăng nhập bằng Google",
        createdAt: "2026-03-04",
        status: "closed",
    },
    {
        id: 28,
        name: "Chức năng giỏ hàng và thanh toán",
        createdAt: "2026-03-05",
        status: "closed",
    },
    {
        id: 29,
        name: "Hoàn thiện trang xác thực người dùng",
        createdAt: "2026-03-05",
        status: "closed",
    },
    {
        id: 34,
        name: "Triển khai hộp hỗ trợ chat (Chatbox)",
        createdAt: "2026-03-05",
        status: "closed",
    },
    {
        id: 48,
        name: "Sửa lỗi giao diện người dùng",
        createdAt: "2026-03-07",
        status: "closed",
    },
    {
        id: 60,
        name: "Sửa giỏ hàng và hoàn thiện phương thức giao hàng",
        createdAt: "2026-03-10",
        status: "closed",
    },
    {
        id: 64,
        name: "Triển khai trang phương thức thanh toán",
        createdAt: "2026-03-10",
        status: "closed",
    },
    {
        id: 66,
        name: "Hoàn thiện trang thanh toán",
        createdAt: "2026-03-10",
        status: "closed",
    },
    {
        id: 69,
        name: "Sửa lỗi thanh toán",
        createdAt: "2026-03-11",
        status: "open",
    },
    {
        id: 70,
        name: "Triển khai trang quản trị (Admin Panel)",
        createdAt: "2026-03-11",
        status: "closed",
    },
    {
        id: 74,
        name: "Tính năng đặt hàng doanh nghiệp (B2B)",
        createdAt: "2026-03-12",
        status: "closed",
    },
    {
        id: 77,
        name: "Cập nhật hồ sơ người dùng",
        createdAt: "2026-03-12",
        status: "closed",
    },
    {
        id: 80,
        name: "Đồng bộ giao diện thanh toán ứng dụng di động",
        createdAt: "2026-03-14",
        status: "closed",
    },
    {
        id: 82,
        name: "Triển khai chức năng Mix & Match (Tự tạo giỏ quà)",
        createdAt: "2026-03-14",
        status: "closed",
    },
    {
        id: 87,
        name: "Sửa lỗi giao diện (Frontend fix)",
        createdAt: "2026-03-15",
        status: "closed",
    },
    {
        id: 91,
        name: "Cải thiện giao diện và kiểm tra dữ liệu đầu vào",
        createdAt: "2026-03-15",
        status: "closed",
    },
    {
        id: 110,
        name: "Xem lịch sử sản phẩm (Backend)",
        createdAt: "2026-03-20",
        status: "closed",
    },
];

function formatDate(dateStr: string): string {
    const [year, month, day] = dateStr.split("-");
    return `${day}/${month}/${year}`;
}

export default function AdminTaskSummaryPage() {
    const closed = TASKS.filter((t) => t.status === "closed").length;
    const open = TASKS.filter((t) => t.status === "open").length;

    return (
        <div className="p-6 space-y-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <div>
                    <h1 className="text-2xl font-bold text-gray-800">Bảng Tổng Kết Công Việc</h1>
                    <p className="text-sm text-gray-500 mt-1">
                        Danh sách các công việc đã thực hiện trong dự án
                    </p>
                </div>
                <div className="flex gap-3">
                    <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium bg-green-100 text-green-700">
                        <span className="w-2 h-2 rounded-full bg-green-500 inline-block" />
                        {closed} Hoàn thành
                    </span>
                    <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-700">
                        <span className="w-2 h-2 rounded-full bg-yellow-500 inline-block" />
                        {open} Đang xử lý
                    </span>
                </div>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="bg-white rounded-xl shadow-sm p-5 border border-gray-100">
                    <p className="text-sm text-gray-500">Tổng số công việc</p>
                    <p className="text-3xl font-bold text-gray-800 mt-1">{TASKS.length}</p>
                </div>
                <div className="bg-white rounded-xl shadow-sm p-5 border border-gray-100">
                    <p className="text-sm text-gray-500">Đã hoàn thành</p>
                    <p className="text-3xl font-bold text-green-600 mt-1">{closed}</p>
                </div>
                <div className="bg-white rounded-xl shadow-sm p-5 border border-gray-100">
                    <p className="text-sm text-gray-500">Đang xử lý</p>
                    <p className="text-3xl font-bold text-yellow-500 mt-1">{open}</p>
                </div>
            </div>

            {/* Table */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                        <thead>
                            <tr className="bg-[#1a1a2e] text-white">
                                <th className="px-4 py-3 text-left font-semibold w-12">#</th>
                                <th className="px-4 py-3 text-left font-semibold">Tên công việc</th>
                                <th className="px-4 py-3 text-center font-semibold w-32">Ngày tạo</th>
                                <th className="px-4 py-3 text-center font-semibold w-32">Trạng thái</th>
                                <th className="px-4 py-3 text-center font-semibold w-20">Issue</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {TASKS.map((task, index) => (
                                <tr
                                    key={task.id}
                                    className="hover:bg-gray-50/50 transition-colors"
                                >
                                    <td className="px-4 py-3 text-gray-400 font-medium">{index + 1}</td>
                                    <td className="px-4 py-3 text-gray-800 font-medium">{task.name}</td>
                                    <td className="px-4 py-3 text-center text-gray-600">
                                        {formatDate(task.createdAt)}
                                    </td>
                                    <td className="px-4 py-3 text-center">
                                        {task.status === "closed" ? (
                                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-green-100 text-green-700">
                                                <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                                                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                                </svg>
                                                Hoàn thành
                                            </span>
                                        ) : (
                                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-700">
                                                <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                                                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd" />
                                                </svg>
                                                Đang xử lý
                                            </span>
                                        )}
                                    </td>
                                    <td className="px-4 py-3 text-center">
                                        <a
                                            href={`https://github.com/hoale-torii-4/sp26-swd392-final-project/issues/${task.id}`}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="text-[#8B1A1A] hover:underline font-mono text-xs"
                                        >
                                            #{task.id}
                                        </a>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}
