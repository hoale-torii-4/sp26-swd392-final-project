import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import Header from '../components/Header';
import Footer from '../components/Footer';
import { authService } from '../services/authService';
import { orderService, type OrderDto } from '../services/orderService';

function formatPrice(v?: number | null) {
  if (v == null) return '--';
  return v.toLocaleString('vi-VN') + '₫';
}

function formatDate(v?: string | null) {
  if (!v) return '--';
  return new Date(v).toLocaleString('vi-VN');
}

export default function OrderDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [order, setOrder] = useState<OrderDto | null>(null);

  useEffect(() => {
    if (!authService.isAuthenticated()) {
      navigate('/login');
      return;
    }

    const load = async () => {
      if (!id) {
        setError('Thiếu mã định danh đơn hàng.');
        setLoading(false);
        return;
      }

      try {
        const data = await orderService.getOrderDetailById(id);
        setOrder(data);
      } catch (err: any) {
        setError(err?.message ?? 'Không thể tải chi tiết đơn hàng.');
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [id, navigate]);

  return (
    <div className="font-sans bg-[#F5F5F5] min-h-screen flex flex-col">
      <Header />
      <main className="flex-1 max-w-5xl w-full mx-auto px-6 py-10 lg:py-14">
        <div className="mb-4">
          <Link to="/orders" className="text-sm text-[#8B1A1A] font-semibold hover:underline">← Quay lại danh sách đơn</Link>
        </div>

        {loading ? (
          <div className="bg-white rounded-2xl p-8 shadow-sm">Đang tải chi tiết đơn hàng...</div>
        ) : error ? (
          <div className="bg-white rounded-2xl p-8 shadow-sm text-red-600">{error}</div>
        ) : order ? (
          <div className="space-y-4">
            <div className="bg-white rounded-2xl p-6 shadow-sm">
              <p className="text-xs uppercase tracking-wider text-gray-400">Mã đơn</p>
              <h1 className="text-2xl font-bold text-[#8B1A1A]">{order.OrderCode}</h1>
              <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                <div className="flex justify-between"><span className="text-gray-500">Trạng thái</span><span className="font-semibold">{String(order.Status)}</span></div>
                <div className="flex justify-between"><span className="text-gray-500">Loại đơn</span><span className="font-semibold">{String(order.OrderType)}</span></div>
                <div className="flex justify-between"><span className="text-gray-500">Ngày đặt</span><span>{formatDate(order.CreatedAt)}</span></div>
                <div className="flex justify-between"><span className="text-gray-500">Ngày giao</span><span>{formatDate(order.DeliveryDate)}</span></div>
                <div className="flex justify-between md:col-span-2"><span className="text-gray-500">Tổng tiền</span><span className="font-bold text-[#8B1A1A]">{formatPrice(order.TotalAmount)}</span></div>
              </div>
            </div>

            <div className="bg-white rounded-2xl p-6 shadow-sm">
              <h2 className="text-sm uppercase tracking-wider text-gray-500 font-semibold mb-3">Sản phẩm</h2>
              <div className="space-y-2">
                {order.Items?.map((item, idx) => {
                  const total = item.TotalPrice ?? ((item.UnitPrice ?? item.Price ?? 0) * item.Quantity);
                  return (
                    <div key={`${item.Id}-${idx}`} className="flex justify-between py-2 border-b border-gray-100 last:border-0">
                      <div>
                        <p className="font-medium text-gray-900">{item.Name ?? `Sản phẩm ${idx + 1}`}</p>
                        <p className="text-xs text-gray-500">Số lượng: {item.Quantity}</p>
                      </div>
                      <p className="font-semibold text-gray-900">{formatPrice(total)}</p>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        ) : null}
      </main>
      <Footer />
    </div>
  );
}
