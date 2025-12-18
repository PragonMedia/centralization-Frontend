import React from 'react';
import useAuthStore from '../store/authStore';

const AuthStatus = () => {
  const { isAuthenticated, user, isLoading } = useAuthStore();

  if (isLoading) {
    return (
      <div className="bg-yellow-100 border border-yellow-400 text-yellow-700 px-4 py-3 rounded">
        <div className="flex items-center">
          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-yellow-700 mr-2"></div>
          Authenticating...
        </div>
      </div>
    );
  }

  if (isAuthenticated) {
    return (
      <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded">
        <div className="flex items-center justify-between">
          <span>✅ Authenticated as: {user?.firstName || user?.email || 'User'}</span>
          <span className="text-sm text-green-600">Token: {user?.token ? 'Present' : 'None'}</span>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
      ❌ Not authenticated - Please log in to access features
    </div>
  );
};

export default AuthStatus;
