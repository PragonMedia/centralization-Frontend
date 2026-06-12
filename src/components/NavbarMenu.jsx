import { Link } from "react-router-dom";
import { useState } from "react";
import useAuthStore from "../store/authStore";
import LogoutConfirmationModal from "./LogoutConfirmationModal";

function NavbarMenu() {
  const { isAuthenticated, user, logout } = useAuthStore();
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const role = user?.role?.toLowerCase() || "";
  const canAccessAccounting = ["tech", "ceo", "admin"].includes(role);
  const canAccessStatePerformance = ["mediabuyer", "tech", "ceo"].includes(role);
  const canAccessTvAdSpend = ["tech", "ceo", "admin"].includes(role);

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

  const navButtonClass =
    "whitespace-nowrap rounded bg-blue-700 px-3 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-800 sm:px-4";

  return (
    <>
      <div className="flex min-w-0 flex-1 flex-wrap items-center justify-end gap-2 sm:gap-3">
        <div className="flex flex-wrap items-center gap-2 sm:gap-3">
          <span className="whitespace-nowrap text-sm font-medium text-gray-700 sm:text-base">
            Welcome, {user?.firstName}!
          </span>
          <Link to="/">
            <button type="button" className={navButtonClass}>
              Home
            </button>
          </Link>
        </div>

        {isAuthenticated ? (
          <>
            <Link to="/create">
              <button type="button" className={navButtonClass}>
                Lander Creation
              </button>
            </Link>
            <Link to="/domains">
              <button type="button" className={navButtonClass}>
                Domains
              </button>
            </Link>
            {canAccessAccounting && (
              <Link to="/accounting">
                <button type="button" className={navButtonClass}>
                  Accounting
                </button>
              </Link>
            )}
            {canAccessStatePerformance && (
              <Link to="/state-performance">
                <button type="button" className={navButtonClass}>
                  State Performance
                </button>
              </Link>
            )}
            {canAccessTvAdSpend && (
              <Link to="/tv-adspend">
                <button type="button" className={navButtonClass}>
                  TV AdSpend
                </button>
              </Link>
            )}

            <button
              type="button"
              onClick={handleLogoutClick}
              className="whitespace-nowrap rounded bg-red-600 px-3 py-2 text-sm font-medium text-white transition-colors hover:bg-red-700 sm:px-4"
            >
              Logout
            </button>
          </>
        ) : (
          <div className="text-sm text-gray-600 sm:text-base">
            Please log in to access features
          </div>
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
