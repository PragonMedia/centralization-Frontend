import { Link } from "react-router-dom";
import { useState } from "react";
import useAuthStore from "../store/authStore";
import LogoutConfirmationModal from "./LogoutConfirmationModal";

function NavbarMenu() {
  const { isAuthenticated, user, logout } = useAuthStore();
  const [showLogoutModal, setShowLogoutModal] = useState(false);

  // // Call debug function to see full state
  // debug();

  const handleLogoutClick = () => {
    setShowLogoutModal(true);
  };

  const handleLogoutConfirm = () => {
    logout();
    setShowLogoutModal(false);
  };

  const handleLogoutCancel = () => {
    setShowLogoutModal(false);
  };

  return (
    <>
      <div className="flex items-center space-x-4">
        <div className="flex items-center justify-center space-x-4">
          <span className="text-gray-700 font-medium">
            Welcome, {user?.firstName}!
          </span>
          <Link to="/">
            <button className="bg-blue-700 text-white px-4 py-2 rounded hover:bg-blue-800 transition-colors">
              Home
            </button>
          </Link>
        </div>

        {isAuthenticated ? (
          <>
            <Link to="/create">
              <button className="bg-blue-700 text-white px-4 py-2 rounded hover:bg-blue-800 transition-colors">
                Lander Creation
              </button>
            </Link>
            <Link to="/domains">
              <button className="bg-blue-700 text-white px-4 py-2 rounded hover:bg-blue-800 transition-colors">
                Domains
              </button>
            </Link>

            {/* User info and logout */}
            <div className="flex items-center space-x-3">
              <button
                onClick={handleLogoutClick}
                className="bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700 transition-colors"
              >
                Logout
              </button>
            </div>
          </>
        ) : (
          <div className="text-gray-600">Please log in to access features</div>
        )}
      </div>

      {/* Logout Confirmation Modal */}
      <LogoutConfirmationModal
        isOpen={showLogoutModal}
        onClose={handleLogoutCancel}
        onConfirm={handleLogoutConfirm}
      />
    </>
  );
}

export default NavbarMenu;
