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

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/home" element={<HomePage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route path="/forgot-password" element={<ForgotPasswordPage />} />
        <Route path="/forgot-password/success" element={<ForgotPasswordSuccessPage />} />
        <Route path="/reset-password" element={<ResetPasswordPage />} />
        <Route path="/guide" element={<GuidePage />} />
        <Route path="/about" element={<AboutPage />} />
        <Route path="/account" element={<AccountPage />} />
        <Route path="/gift-boxes" element={<GiftBoxesPage />} />
      </Routes>
    </BrowserRouter>
  )
}

export default App

