import nodemailer from 'nodemailer';

/**
 * Email Service - Tương đương EmailService.cs
 */
export class EmailService {
  constructor() {
    this.host = process.env.SMTP_HOST || 'smtp.gmail.com';
    this.port = parseInt(process.env.SMTP_PORT || '587', 10);
    this.username = process.env.SMTP_USERNAME || '';
    this.password = process.env.SMTP_PASSWORD || '';
    this.from = process.env.SMTP_FROM || this.username;
  }

  /**
   * Tạo transporter (lazy init)
   */
  _getTransporter() {
    if (!this.username || !this.password) {
      return null;
    }
    return nodemailer.createTransport({
      host: this.host,
      port: this.port,
      secure: this.port === 465,
      auth: {
        user: this.username,
        pass: this.password,
      },
    });
  }

  /**
   * Gửi email
   */
  async sendEmail(to, subject, body, isHtml = true) {
    try {
      const transporter = this._getTransporter();
      if (!transporter) {
        console.warn('SMTP credentials not configured. Email not sent.');
        return true; // Return true để không block flow
      }

      await transporter.sendMail({
        from: this.from,
        to,
        subject,
        [isHtml ? 'html' : 'text']: body,
      });

      console.log(`Email sent successfully to ${to}`);
      return true;
    } catch (error) {
      console.error(`Failed to send email to ${to}:`, error);
      return false;
    }
  }

  /**
   * Gửi OTP
   */
  async sendOtp(email, otpCode) {
    const subject = 'Mã xác thực OTP - Shop Hàng Tết';
    const body = `
      <h2>Xác thực tài khoản</h2>
      <p>Mã OTP của bạn là: <strong>${otpCode}</strong></p>
      <p>Mã này có hiệu lực trong 5 phút.</p>
      <p>Nếu bạn không thực hiện yêu cầu này, vui lòng bỏ qua email.</p>
      <hr>
      <p>Cảm ơn bạn đã sử dụng dịch vụ Shop Hàng Tết!</p>
    `;
    return this.sendEmail(email, subject, body, true);
  }

  /**
   * Gửi email xác nhận đơn hàng (full order object)
   */
  async sendOrderConfirmation(email, orderOrCode, totalAmount) {
    // Overload: nếu orderOrCode là string thì dùng phiên bản đơn giản
    if (typeof orderOrCode === 'string') {
      const subject = `Xác nhận đơn hàng #${orderOrCode} - Shop Hàng Tết`;
      const body = `
        <h2>Cảm ơn bạn đã đặt hàng!</h2>
        <p><strong>Mã đơn hàng:</strong> ${orderOrCode}</p>
        <p><strong>Tổng tiền:</strong> ${(totalAmount || 0).toLocaleString('vi-VN')} VNĐ</p>
        <p><strong>Trạng thái:</strong> Đang xác nhận thanh toán</p>
        <hr>
        <p>Bạn có thể tra cứu đơn hàng bằng mã đơn và email tại website của chúng tôi.</p>
        <p>Cảm ơn bạn đã tin tưởng Shop Hàng Tết!</p>
      `;
      return this.sendEmail(email, subject, body, true);
    }

    // Full order object
    const order = orderOrCode;
    const subject = `Xác nhận đơn hàng #${order.orderCode} - Shop Hàng Tết`;
    const deliveryDateStr = order.deliveryDate
      ? new Date(order.deliveryDate).toLocaleDateString('vi-VN')
      : '';
    const body = `
      <h2>Cảm ơn bạn đã đặt hàng!</h2>
      <p><strong>Mã đơn hàng:</strong> ${order.orderCode}</p>
      <p><strong>Tổng tiền:</strong> ${(order.totalAmount || 0).toLocaleString('vi-VN')} VNĐ</p>
      <p><strong>Ngày giao hàng:</strong> ${deliveryDateStr}</p>
      <p><strong>Trạng thái:</strong> Đang xác nhận thanh toán</p>
      
      <h3>Thông tin giao hàng:</h3>
      <p><strong>Người nhận:</strong> ${order.customerName}</p>
      <p><strong>Điện thoại:</strong> ${order.customerPhone}</p>
      
      <hr>
      <p>Bạn có thể tra cứu đơn hàng bằng mã đơn và email tại website của chúng tôi.</p>
      <p>Cảm ơn bạn đã tin tưởng Shop Hàng Tết!</p>
    `;
    return this.sendEmail(email, subject, body, true);
  }

  /**
   * Gửi email cập nhật trạng thái đơn hàng
   */
  async sendOrderStatusUpdate(email, order) {
    const statusText = this._getStatusText(order.status);
    const subject = `Cập nhật đơn hàng #${order.orderCode} - ${statusText}`;
    const body = `
      <h2>Cập nhật trạng thái đơn hàng</h2>
      <p><strong>Mã đơn hàng:</strong> ${order.orderCode}</p>
      <p><strong>Trạng thái mới:</strong> ${statusText}</p>
      <p><strong>Cập nhật lúc:</strong> ${new Date().toLocaleString('vi-VN')}</p>
      <hr>
      <p>Cảm ơn bạn đã tin tưởng Shop Hàng Tết!</p>
    `;
    return this.sendEmail(email, subject, body, true);
  }

  /**
   * Gửi email chào mừng
   */
  async sendWelcomeEmail(email, fullName) {
    const subject = 'Chào mừng bạn đến với Shop Hàng Tết!';
    const body = `
      <h2>Xin chào ${fullName}!</h2>
      <p>Chào mừng bạn đã đăng ký tài khoản tại Shop Hàng Tết.</p>
      <p>Bạn đã sẵn sàng khám phá các bộ sưu tập quà Tết cao cấp của chúng tôi!</p>
      
      <h3>Tính năng dành cho thành viên:</h3>
      <ul>
        <li>Lưu địa chỉ giao hàng yêu thích</li>
        <li>Đặt hàng B2B - giao nhiều địa chỉ</li>
        <li>Theo dõi lịch sử đơn hàng</li>
        <li>Đánh giá sản phẩm đã mua</li>
      </ul>
      
      <hr>
      <p>Cảm ơn bạn đã tin tưởng Shop Hàng Tết!</p>
    `;
    return this.sendEmail(email, subject, body, true);
  }

  _getStatusText(status) {
    const map = {
      PAYMENT_CONFIRMING: 'Đang xác nhận thanh toán',
      PREPARING: 'Đang chuẩn bị',
      SHIPPING: 'Đang được giao',
      COMPLETED: 'Hoàn thành',
    };
    return map[status] || 'Không xác định';
  }
}
