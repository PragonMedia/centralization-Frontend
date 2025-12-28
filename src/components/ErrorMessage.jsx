import React from "react";

const ErrorMessage = ({
  error,
  onRetry,
  onDismiss,
  variant = "error",
  className = "",
}) => {
  if (!error) return null;

  const variants = {
    error: {
      bg: "bg-red-50",
      border: "border-red-200",
      text: "text-red-700",
      icon: "text-red-400",
      iconPath:
        "M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z",
    },
    warning: {
      bg: "bg-yellow-50",
      border: "border-yellow-200",
      text: "text-yellow-700",
      icon: "text-yellow-400",
      iconPath:
        "M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z",
    },
    info: {
      bg: "bg-blue-50",
      border: "border-blue-200",
      text: "text-blue-700",
      icon: "text-blue-400",
      iconPath: "M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z",
    },
  };

  const currentVariant = variants[variant] || variants.error;

  return (
    <div
      className={`${currentVariant.bg} ${currentVariant.border} border rounded-md p-4 ${className}`}
    >
      <div className="flex">
        <div className="flex-shrink-0">
          <svg
            className={`h-5 w-5 ${currentVariant.icon}`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d={currentVariant.iconPath}
            />
          </svg>
        </div>
        <div className="ml-3 flex-1">
          <p className={`text-sm font-medium ${currentVariant.text}`}>
            {typeof error === "string"
              ? error
              : error.message || "An error occurred"}
          </p>

          <div className="mt-2 flex space-x-2">
            {onRetry && (
              <button
                onClick={onRetry}
                className={`text-sm font-medium ${currentVariant.text} hover:underline`}
              >
                Try again
              </button>
            )}
            {onDismiss && (
              <button
                onClick={onDismiss}
                className={`text-sm font-medium ${currentVariant.text} hover:underline`}
              >
                Dismiss
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ErrorMessage;

































