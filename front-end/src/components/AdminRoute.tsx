import { Navigate, Outlet } from "react-router-dom";
import { authService } from "../services/authService";

/**
 * A wrapper component for admin routes that ensures the user is:
 * 1. Logged in
 * 2. Has the ADMIN or STAFF role
 */
export default function AdminRoute() {
    if (!authService.isAuthenticated()) {
        // Not logged in -> redirect to admin login
        return <Navigate to="/admin/login" replace />;
    }

    if (!authService.isAdmin()) {
        // Logged in but NOT admin -> redirect to home page
        return <Navigate to="/" replace />;
    }

    // Authorized -> render nested routes
    return <Outlet />;
}
