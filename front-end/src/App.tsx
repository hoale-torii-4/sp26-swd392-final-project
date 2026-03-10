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
import CheckoutPaymentPage from './pages/CheckoutPaymentPage'
import OrderSuccessPage from './pages/OrderSuccessPage'
import VerifyEmailPage from './pages/VerifyEmailPage'
import AIChatBox from './components/AIChatBox'
import { GoogleOAuthProvider } from '@react-oauth/google'

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
          <Route path="/gift-boxes" element={<GiftBoxesPage />} />
          <Route path="/gift-boxes/:id" element={<ProductDetailPage />} />
          <Route path="/cart" element={<CartPage />} />
          <Route path="/checkout" element={<CheckoutPage />} />
          <Route path="/checkout/payment" element={<CheckoutPaymentPage />} />
          <Route path="/order-success" element={<OrderSuccessPage />} />
        </Routes>
        <AIChatBox />
      </BrowserRouter>
    </GoogleOAuthProvider>
  )
}

export default App

