import { create } from "zustand";
import axios from "axios";
import { API_ENDPOINTS } from "../config/api.js";

const useAuthStore = create((set, get) => ({
  // State
  user: null,
  isAuthenticated: false,
  isLoading: false,
  error: null,

  // Actions
  login: async (email, password) => {
    set({ isLoading: true, error: null });

    try {
      const response = await axios.post(API_ENDPOINTS.AUTH.LOGIN, {
        email,
        password,
      });

      const { user, token } = response.data;

      console.log("API Response:", response.data);
      console.log("Extracted user:", user);
      console.log("Extracted token:", token);

      set({
        user: user,
        isAuthenticated: true,
        isLoading: false,
        error: null,
      });

      // Store token and user data in localStorage
      if (token) {
        localStorage.setItem("authToken", token);
        localStorage.setItem("userData", JSON.stringify(user));
        localStorage.setItem("userEmail", user.email); // Store email separately
        console.log(
          "Stored in localStorage:",
          localStorage.getItem("userData")
        );
        console.log("Stored user email:", user.email);
      }

      return { success: true };
    } catch (err) {
      const errorMessage =
        err.response?.data?.message || "Login failed. Please try again.";
      set({
        error: errorMessage,
        isLoading: false,
      });
      return { success: false, error: errorMessage };
    }
  },

  logout: () => {
    localStorage.removeItem("authToken");
    localStorage.removeItem("userData");
    localStorage.removeItem("userEmail"); // Also remove email
    set({
      user: null,
      isAuthenticated: false,
      error: null,
    });
  },

  checkAuthStatus: () => {
    const token = localStorage.getItem("authToken");
    const userData = localStorage.getItem("userData");
    const userEmail = localStorage.getItem("userEmail");

    console.log("checkAuthStatus - token:", token);
    console.log("checkAuthStatus - userData:", userData);
    console.log("checkAuthStatus - userEmail:", userEmail);

    if (token && userData) {
      try {
        const parsedUserData = JSON.parse(userData);
        console.log("checkAuthStatus - parsed user data:", parsedUserData);
        set({
          user: parsedUserData,
          isAuthenticated: true,
        });
      } catch (err) {
        console.error("Error parsing user data:", err);
        // If parsing fails, clear storage
        localStorage.removeItem("authToken");
        localStorage.removeItem("userData");
        localStorage.removeItem("userEmail");
      }
    }
  },

  clearError: () => set({ error: null }),

  // Debug function
  debug: () => {
    const state = get();
    console.log("Current Auth State:", state);
    console.log("localStorage authToken:", localStorage.getItem("authToken"));
    console.log("localStorage userData:", localStorage.getItem("userData"));
    return state;
  },
}));

export default useAuthStore;
