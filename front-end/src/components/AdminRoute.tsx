import { Navigate, Outlet } from "react-router-dom";
import { authService } from "../services/authService";

/**
 * A wrapper component for admin routes that ensures the user is:
 * 1. Logged in
 * 2. Has the ADMIN or STAFF role
 * 3. Has a role included in allowedRoles (if specified)
 */
export default function AdminRoute({ allowedRoles }: { allowedRoles?: number[] }) {
    if (!authService.isAuthenticated()) {
        // Not logged in -> redirect to admin login
        return <Navigate to="/admin/login" replace />;
    }

    if (!authService.isAdmin()) {
        // Logged in but NOT admin/staff -> redirect to home page
        return <Navigate to="/" replace />;
    }

    const user = authService.getUser();
    if (allowedRoles && user && !allowedRoles.includes(user.Role)) {
        // Logged in, is admin/staff, but does not have the specific required role
        // Redirect them to a safe page (e.g. Orders) instead of letting them see unauthorized pages
        return <Navigate to="/admin/orders" replace />;
    }

    // Authorized -> render nested routes
    return <Outlet />;
}
