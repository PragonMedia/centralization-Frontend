import { Navigate } from "react-router-dom";
import useAuthStore from "../store/authStore";

/**
 * Protects routes by requiring authentication and one of the allowed roles.
 * @param {React.ReactNode} children - Content to render when allowed
 * @param {string[]} allowedRoles - Roles that can access (e.g. ["tech", "ceo", "admin"])
 */
const RoleProtectedRoute = ({ children, allowedRoles = [] }) => {
  const { isAuthenticated, user } = useAuthStore();
  const role = user?.role || "";

  if (!isAuthenticated) {
    return <Navigate to="/" replace />;
  }

  const hasAllowedRole =
    allowedRoles.length === 0 ||
    (role && allowedRoles.includes(role.toLowerCase()));

  if (!hasAllowedRole) {
    return <Navigate to="/" replace />;
  }

  return children;
};

export default RoleProtectedRoute;
