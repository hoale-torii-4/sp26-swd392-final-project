import './index.css'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import HomePage from './pages/HomePage'
import LoginPage from './pages/LoginPage'
import RegisterPage from './pages/RegisterPage'
import ForgotPasswordPage from './pages/ForgotPasswordPage'
import ForgotPasswordSuccessPage from './pages/ForgotPasswordSuccessPage'
import ResetPasswordPage from './pages/ResetPasswordPage'
import GuidePage from './pages/GuidePage'
import AboutPage from './pages/AboutPage'
import AccountPage from './pages/AccountPage'
import GiftBoxesPage from './pages/GiftBoxesPage'
import ProductDetailPage from './pages/ProductDetailPage'
import CartPage from './pages/CartPage'
import CheckoutPage from './pages/CheckoutPage'
import B2BCheckoutPage from './pages/B2BCheckoutPage'
import CheckoutPaymentPage from './pages/CheckoutPaymentPage'
import OrderSuccessPage from './pages/OrderSuccessPage'
import VerifyEmailPage from './pages/VerifyEmailPage'
import OrderTrackingPage from './pages/OrderTrackingPage'
import MixMatchPage from './pages/MixMatchPage'
import OrdersPage from './pages/OrdersPage'
import AIChatBox from './components/AIChatBox'
import { GoogleOAuthProvider } from '@react-oauth/google'
import { ToastContainer } from 'react-toastify'
import 'react-toastify/dist/ReactToastify.css'

// Admin imports
import AdminRoute from './components/AdminRoute'
import AdminLayout from './components/AdminLayout'
import AdminLoginPage from './pages/admin/AdminLoginPage'
import AdminDashboardPage from './pages/admin/AdminDashboardPage'
import AdminOrdersPage from './pages/admin/AdminOrdersPage'
import AdminUsersPage from './pages/admin/AdminUsersPage'
import AdminCollectionsPage from './pages/admin/AdminCollectionsPage'
import AdminGiftBoxesPage from './pages/admin/AdminGiftBoxesPage'
import AdminInventoryPage from './pages/admin/AdminInventoryPage'
import AdminMixMatchPage from './pages/admin/AdminMixMatchPage'
import AdminReviewsPage from './pages/admin/AdminReviewsPage'
import AdminReportsPage from './pages/admin/AdminReportsPage'
import AddressesPage from './pages/AddressesPage'
import CustomBoxPage from './pages/CustomBoxPage'

const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID || ''

function App() {
  return (
    <GoogleOAuthProvider clientId={GOOGLE_CLIENT_ID}>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/home" element={<HomePage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route path="/verify-email" element={<VerifyEmailPage />} />
          <Route path="/forgot-password" element={<ForgotPasswordPage />} />
          <Route path="/forgot-password/success" element={<ForgotPasswordSuccessPage />} />
          <Route path="/reset-password" element={<ResetPasswordPage />} />
          <Route path="/guide" element={<GuidePage />} />
          <Route path="/about" element={<AboutPage />} />
          <Route path="/account" element={<AccountPage />} />
          <Route path="/addresses" element={<AddressesPage />} />
          <Route path="/custom-box" element={<CustomBoxPage />} />
          <Route path="/gift-boxes" element={<GiftBoxesPage />} />
          <Route path="/gift-boxes/:id" element={<ProductDetailPage />} />
          <Route path="/cart" element={<CartPage />} />
          <Route path="/checkout" element={<CheckoutPage />} />
          <Route path="/checkout/b2b" element={<B2BCheckoutPage />} />
          <Route path="/checkout/payment" element={<CheckoutPaymentPage />} />
          <Route path="/order-success" element={<OrderSuccessPage />} />
          <Route path="/order-tracking" element={<OrderTrackingPage />} />
          <Route path="/orders" element={<OrdersPage />} />
          <Route path="/mix-match" element={<MixMatchPage />} />

          {/* Admin panel routes */}
          <Route path="/admin/login" element={<AdminLoginPage />} />

          <Route path="/admin" element={<AdminRoute />}>
            <Route element={<AdminLayout />}>
              <Route index element={<AdminDashboardPage />} />
              <Route path="orders" element={<AdminOrdersPage />} />
              <Route path="users" element={<AdminUsersPage />} />
              <Route path="collections" element={<AdminCollectionsPage />} />
              <Route path="giftboxes" element={<AdminGiftBoxesPage />} />
              <Route path="inventory" element={<AdminInventoryPage />} />
              <Route path="mix-match" element={<AdminMixMatchPage />} />
              <Route path="reviews" element={<AdminReviewsPage />} />
              <Route path="reports" element={<AdminReportsPage />} />
            </Route>
          </Route>
        </Routes>
        <AIChatBox />
        <ToastContainer
          position="top-right"
          autoClose={3000}
          hideProgressBar={false}
          newestOnTop
          closeOnClick
          pauseOnFocusLoss
          draggable
          pauseOnHover
        />
      </BrowserRouter>
    </GoogleOAuthProvider>
  )
}

export default App

