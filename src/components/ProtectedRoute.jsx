import { Navigate } from "react-router-dom";
import useAuthStore from "../store/authStore";

const ProtectedRoute = ({ children }) => {
  const { isAuthenticated } = useAuthStore();

  if (!isAuthenticated) {
    // Redirect to homepage where login modal will be shown
    return <Navigate to="/" replace />;
  }

  return children;
};

export default ProtectedRoute;
