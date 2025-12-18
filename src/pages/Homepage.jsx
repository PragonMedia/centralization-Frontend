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

      {/* Homepage content */}
      <div
        className={`h-screen flex items-center justify-center ${
          showLoginModal ? "pointer-events-none" : ""
        }`}
      >
        <div className="text-center">
          <h1 className="text-6xl font-bold mb-4">Welcome to ParagonMedia</h1>
          <p className="text-xl text-gray-600 mb-8">
            Your platform for creating amazing landing pages
          </p>

          {/* Authentication Status */}
          {/* <div className="mb-6">
            <AuthStatus />
          </div> */}

          {/* {isAuthenticated && (
            <div className="space-y-4">
              <p className="text-green-600 text-lg">
                ✅ You are successfully logged in!
              </p>
              <div className="flex gap-4 justify-center">
                <button className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors">
                  Get Started
                </button>
                <button className="bg-gray-600 text-white px-6 py-3 rounded-lg hover:bg-gray-700 transition-colors">
                  View Dashboard
                </button>
              </div>
            </div>
          )} */}
        </div>
      </div>

      {/* Login Modal */}
      {showLoginModal && <LoginModal onClose={handleCloseModal} />}
    </div>
  );
}

export default Homepage;
