import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import Header from '../components/Header';
import Footer from '../components/Footer';
import { authService } from '../services/authService';
import { orderService, type OrderDto } from '../services/orderService';
import { FiEyeOff, FiImage, FiChevronRight } from "react-icons/fi";

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
          <div className="space-y-6">

            {/* General Info */}
            <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
              <p className="text-xs uppercase tracking-wider text-gray-400">Mã đơn</p>
              <h1 className="text-2xl font-bold text-[#8B1A1A] mb-4">{order.OrderCode}</h1>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                <div className="flex flex-col"><span className="text-gray-500 text-xs">Trạng thái</span><span className="font-semibold text-gray-900">{String(order.Status)}</span></div>
                <div className="flex flex-col"><span className="text-gray-500 text-xs">Loại đơn</span><span className="font-semibold text-gray-900">{String(order.OrderType)}</span></div>
                <div className="flex flex-col"><span className="text-gray-500 text-xs">Ngày đặt</span><span className="text-gray-900">{formatDate(order.CreatedAt)}</span></div>
                <div className="flex flex-col"><span className="text-gray-500 text-xs">Ngày giao dự kiến</span><span className="text-gray-900">{formatDate(order.DeliveryDate)}</span></div>

                {order.CustomerBankName && order.CustomerBankAccount && (
                  <div className="flex flex-col md:col-span-2 mt-2 p-3 bg-gray-50 rounded-lg border border-gray-100">
                    <span className="text-gray-500 text-xs mb-1">Thông tin thanh toán</span>
                    <span className="text-gray-900 font-medium">{order.CustomerBankName} - {order.CustomerBankAccount}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Greeting Message */}
            {(order.GreetingMessage || order.GreetingCardUrl) && (
              <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
                <h2 className="text-sm uppercase tracking-wider text-gray-500 font-semibold mb-3">Lời chúc & Thiệp</h2>
                {order.GreetingMessage && (
                  <p className="text-sm text-gray-700 italic bg-amber-50 p-4 rounded-lg border border-amber-100 mb-3 whitespace-pre-wrap">"{order.GreetingMessage}"</p>
                )}
                {order.GreetingCardUrl && (
                  <div className="mt-2">
                    <span className="text-xs text-gray-500 block mb-1">Mẫu thiệp đã chọn:</span>
                    <img src={order.GreetingCardUrl} alt="Greeting Card" className="h-32 object-contain rounded border border-gray-200" />
                  </div>
                )}
              </div>
            )}

            {/* Shipping Info */}
            {order.DeliveryAddresses && order.DeliveryAddresses.length > 0 && (
              <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
                <h2 className="text-sm uppercase tracking-wider text-gray-500 font-semibold mb-3">Thông tin giao hàng</h2>
                <div className="space-y-4">
                  {order.DeliveryAddresses.map((addr, idx) => (
                    <div key={idx} className="p-4 bg-gray-50 rounded-xl border border-gray-100 text-sm">
                      <div className="flex justify-between items-start mb-2">
                        <p className="font-semibold text-gray-900">{addr.ReceiverName} <span className="text-gray-500 font-normal">({addr.ReceiverPhone})</span></p>
                        <span className="text-xs px-2 py-1 bg-green-100 text-green-800 rounded-full font-medium">{addr.Quantity} Hộp</span>
                      </div>
                      <p className="text-gray-600 mt-1">{addr.FullAddress}</p>
                      {addr.HideInvoice && <p className="text-xs text-[#8B1A1A] mt-2 flex items-center gap-1"><FiEyeOff className="w-4 h-4" /> Đã ẩn hóa đơn</p>}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Items */}
            <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
              <h2 className="text-sm uppercase tracking-wider text-gray-500 font-semibold mb-4">Sản phẩm</h2>
              <div className="space-y-4">
                {order.Items?.map((item, idx) => {
                  const total = item.TotalPrice ?? ((item.UnitPrice ?? item.Price ?? 0) * item.Quantity);
                  const isMixMatch = item.Type === "MIX_MATCH" || item.Type === 1 || item.CustomBoxId;

                  // fallback string processing since Type from API could be string or number
                  const typeString = String(item.Type).toUpperCase();
                  const isMixMatchFromStr = typeString === "1" || typeString === "MIX_MATCH";

                  const targetUrl = (isMixMatch || isMixMatchFromStr) ? "/mix-match" : `/gift-boxes/${item.GiftBoxId || item.Id || ''}`;
                  const imageUrl = item.Image;
                  return (
                    <Link
                      key={`${item.Id || idx}`}
                      to={targetUrl}
                      className="flex items-center gap-4 py-3 p-2 hover:bg-red-50/50 rounded-xl transition-colors group"
                    >
                      {imageUrl ? (
                        <img src={imageUrl} alt={item.Name || "Product"} className="w-20 h-20 object-cover rounded-lg border border-gray-200" />
                      ) : (
                          <FiImage className="w-8 h-8" />
                      )}

                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-gray-900 group-hover:text-[#8B1A1A] transition-colors truncate">{item.Name ?? `Sản phẩm ${idx + 1}`}</p>
                        <div className="text-xs text-gray-500 mt-1 space-y-0.5">
                          <p>Phân loại: {isMixMatch || isMixMatchFromStr ? "Hộp tùy chọn" : "Set quà sẵn"}</p>
                          <p>Đơn giá: {formatPrice(item.UnitPrice ?? item.Price)}</p>
                          <p>Số lượng: <span className="font-medium text-gray-900">{item.Quantity}</span></p>
                        </div>
                      </div>

                      <div className="text-right pl-4">
                        <p className="font-bold text-[#8B1A1A]">{formatPrice(total)}</p>
                        <p className="text-xs text-gray-400 mt-1 flex items-center justify-end group-hover:text-[#8B1A1A]">
                          <FiChevronRight className="w-3 h-3 ml-1 transform group-hover:translate-x-1 transition-transform" />
                        </p>
                      </div>
                    </Link>
                  );
                })}
              </div>

              <div className="mt-6 pt-4 border-t border-gray-100 flex justify-between items-center px-2">
                <span className="text-gray-500 font-medium">Tổng thanh toán</span>
                <span className="text-xl font-bold text-[#8B1A1A]">{formatPrice(order.TotalAmount)}</span>
              </div>
            </div>

          </div>
        ) : null}
      </main>
      <Footer />
    </div>
  );
}
