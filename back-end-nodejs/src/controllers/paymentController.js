import { Router } from 'express';
import { ApiResponse } from '../dtos/index.js';

/**
 * Payment Controller - Tương đương PaymentController.cs
 * Routes: /api/payment
 */
export function createPaymentRouter(orderService, app) {
    const router = Router();

    const ORDER_CODE_REGEX = /\bSHT\d{3,10}\b/i;

    /**
     * Lấy config value từ env variable
     */
    function getConfigValue(envKey, defaultValue = '') {
        return process.env[envKey] || defaultValue;
    }

    /**
     * Extract order code from webhook data
     */
    function extractOrderCode(data) {
        if (data.code) {
            const match = data.code.match(ORDER_CODE_REGEX);
            if (match) return match[0].toUpperCase();
        }
        if (data.content) {
            const match = data.content.match(ORDER_CODE_REGEX);
            if (match) return match[0].toUpperCase();
        }
        return null;
    }

    // ========== POST /api/payment/webhook — SePay webhook ==========
    const webhookHandler = async (req, res) => {
        // Bảo mật: Kiểm tra SePay Webhook Token
        const configuredToken = getConfigValue('SEPAY_WEBHOOK_TOKEN');
        if (configuredToken) {
            const authHeader = req.headers.authorization || '';
            let receivedToken = authHeader;
            if (authHeader.toLowerCase().startsWith('apikey ')) {
                receivedToken = authHeader.slice(7);
            } else if (authHeader.toLowerCase().startsWith('bearer ')) {
                receivedToken = authHeader.slice(7);
            }

            if (receivedToken.trim() !== configuredToken) {
                console.warn(`SePay webhook rejected: invalid token from IP ${req.ip}`);
                return res.status(200).json({ success: true, status: 200 });
            }
        }

        try {
            const data = req.body;
            console.log(`SePay webhook received: TransferType=${data.transferType}, Amount=${data.transferAmount}, Content=${data.content}`);

            // 1. Chỉ xử lý nếu là tiền vào
            if (data.transferType?.toLowerCase() !== 'in') {
                console.log(`Skipping non-incoming transfer: ${data.transferType}`);
                return res.status(200).json({ success: true, status: 200 });
            }

            // 2. Extract order code
            const orderCode = extractOrderCode(data);
            if (!orderCode) {
                console.warn(`No order code found in transfer content: ${data.content}`);
                return res.status(200).json({ success: true, status: 200 });
            }

            console.log(`Found order code: ${orderCode}, Amount: ${data.transferAmount}`);

            // 3. Confirm payment
            const result = await orderService.confirmPayment(orderCode, data.transferAmount);

            if (result) {
                console.log(`Payment confirmed for order: ${orderCode}`);
            } else {
                console.warn(`Payment confirmation failed for order: ${orderCode}`);
            }

            return res.status(200).json({ success: true, status: 200 });
        } catch (error) {
            console.error('Error processing SePay webhook:', error);
            return res.status(200).json({ success: true, status: 200 });
        }
    };

    router.post('/webhook', webhookHandler);

    // Register the alternative webhook path at app level
    if (app) {
        app.post('/hooks/sepay-payment', webhookHandler);
    }

    // ========== GET /api/payment/create-qr/:orderCode ==========
    router.get('/create-qr/:orderCode', async (req, res) => {
        try {
            const order = await orderService.getOrderByCode(req.params.orderCode);
            if (!order) {
                return res.status(404).json(ApiResponse.error('Order not found'));
            }

            const bankAccount = getConfigValue('SEPAY_BANK_ACCOUNT_NUMBER');
            const bankName = getConfigValue('SEPAY_BANK_NAME');

            if (!bankAccount || !bankName) {
                return res.status(400).json(ApiResponse.error('Missing SePay bank config'));
            }

            const qrUrl = `https://qr.sepay.vn/img?acc=${encodeURIComponent(bankAccount)}&bank=${encodeURIComponent(bankName)}&amount=${Math.round(order.totalAmount)}&des=${encodeURIComponent(order.orderCode)}`;

            return res.status(200).json(
                ApiResponse.success(
                    {
                        orderCode: order.orderCode,
                        amount: order.totalAmount,
                        bankAccount,
                        bankName,
                        qrUrl,
                    },
                    'Tạo QR thành công'
                )
            );
        } catch (error) {
            console.error('Error creating QR:', error);
            return res.status(500).json(ApiResponse.error(error.message));
        }
    });

    // ========== GET /api/payment/check-status/:orderCode ==========
    router.get('/check-status/:orderCode', async (req, res) => {
        try {
            const order = await orderService.getOrderByCode(req.params.orderCode);
            if (!order) {
                return res.status(404).json(ApiResponse.error('Order not found'));
            }

            const isPaid =
                order.status === 'PREPARING' ||
                order.status === 'SHIPPING' ||
                order.status === 'COMPLETED';

            return res.status(200).json(
                ApiResponse.success({
                    OrderCode: order.orderCode,
                    Status: order.status,
                    TotalAmount: order.totalAmount,
                    IsPaid: isPaid,
                })
            );
        } catch (error) {
            console.error('Error checking payment status:', error);
            return res.status(400).json(ApiResponse.error(error.message));
        }
    });

    return router;
}
