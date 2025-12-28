// Input sanitization utilities
export const sanitizeInput = {
  // Sanitize text input
  text: (input) => {
    if (typeof input !== "string") return "";
    return input.trim().replace(/[<>]/g, "");
  },

  // Sanitize domain name
  domain: (domain) => {
    if (!domain || typeof domain !== "string") return "";

    let sanitized = domain.trim().toLowerCase();

    // Remove any invalid characters (keep only letters, numbers, hyphens, and dots)
    sanitized = sanitized.replace(/[^a-z0-9.-]/g, "");

    // Remove consecutive hyphens
    sanitized = sanitized.replace(/-+/g, "-");

    // Remove leading/trailing hyphens
    sanitized = sanitized.replace(/^-+|-+$/g, "");

    return sanitized;
  },

  // Sanitize email
  email: (email) => {
    if (!email || typeof email !== "string") return "";
    const sanitized = email.trim().toLowerCase();
    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(sanitized) ? sanitized : "";
  },

  // Sanitize ID (for domain IDs)
  id: (id) => {
    if (!id || typeof id !== "string") return "";
    return id.trim().replace(/[^a-zA-Z0-9_-]/g, "");
  },

  // Sanitize phone number
  phone: (phone) => {
    if (!phone || typeof phone !== "string") return "";
    // Keep only digits, +, -, (, ), and spaces
    return phone.replace(/[^\d+\-() ]/g, "");
  },

  // Sanitize route path
  route: (route) => {
    if (!route || typeof route !== "string") return "";
    let sanitized = route.trim().toLowerCase();
    // Remove invalid characters for URL paths
    sanitized = sanitized.replace(/[^a-z0-9\-_/]/g, "");
    // Remove consecutive slashes
    sanitized = sanitized.replace(/\/+/g, "/");
    // Remove leading/trailing slashes
    sanitized = sanitized.replace(/^\/+|\/+$/g, "");
    return sanitized;
  },
};

// Validation utilities
export const validateInput = {
  domain: (domain) => {
    if (!domain) return false;
    if (domain.length < 3 || domain.length > 253) return false;
    if (!domain.includes(".")) return false;
    if (domain.startsWith("-") || domain.endsWith("-")) return false;
    if (domain.startsWith(".") || domain.endsWith(".")) return false;
    if (domain.includes("..")) return false;

    const validChars = /^[a-z0-9.-]+$/;
    if (!validChars.test(domain)) return false;

    const parts = domain.split(".");
    for (let part of parts) {
      if (part.length === 0) return false;
      if (part.startsWith("-") || part.endsWith("-")) return false;
      if (!/^[a-z0-9-]+$/.test(part)) return false;
    }

    return true;
  },

  email: (email) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  },

  required: (value) => {
    return (
      value !== null && value !== undefined && value.toString().trim() !== ""
    );
  },

  minLength: (value, min) => {
    return value && value.toString().length >= min;
  },

  maxLength: (value, max) => {
    return !value || value.toString().length <= max;
  },
};

































