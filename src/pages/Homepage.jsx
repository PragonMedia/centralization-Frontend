import React, { useState, useEffect } from "react";
import LoginModal from "../components/LoginModal";
import useAuthStore from "../store/authStore";
import AuthStatus from "../components/AuthStatus";

function Homepage() {
  const [showLoginModal, setShowLoginModal] = useState(false);
  const { isAuthenticated, checkAuthStatus } = useAuthStore();

  useEffect(() => {
    checkAuthStatus();
  }, [checkAuthStatus]);

  // Show login modal if user is not authenticated
  useEffect(() => {
    if (!isAuthenticated) {
      setShowLoginModal(true);
    } else {
      setShowLoginModal(false);
    }
  }, [isAuthenticated]);

  const handleCloseModal = () => {
    // Only allow closing if user is authenticated
    if (isAuthenticated) {
      setShowLoginModal(false);
    }
  };

  return (
    <div className="relative min-h-screen">
      {/* Blurred overlay - only show when login modal is visible */}
      {showLoginModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 backdrop-blur-sm z-40" />
      )}

      {/* Homepage content — text centered in page flow; logo above */}
      <div
        className={`flex min-h-screen items-center justify-center px-6 ${
          showLoginModal ? "pointer-events-none" : ""
        }`}
      >
        <div className="relative text-center">
          <div className="absolute bottom-full left-0 right-0 mb-8 flex justify-center">
            <img
              src="/logo.svg"
              alt="Paragon Media"
              className="h-72 w-auto sm:h-80 md:h-96 lg:h-[28rem]"
            />
          </div>
          <h1 className="text-6xl font-bold mb-4">Welcome to Paragon Media</h1>
        </div>
      </div>

      {/* Login Modal */}
      {showLoginModal && <LoginModal onClose={handleCloseModal} />}
    </div>
  );
}

export default Homepage;
