import React, { useState } from "react";

const DeleteConfirmationModal = ({
  isOpen,
  onClose,
  onConfirm,
  itemType,
  itemName,
  domainName,
}) => {
  const [confirmationText, setConfirmationText] = useState("");
  const [isDeleting, setIsDeleting] = useState(false);

  if (!isOpen) return null;

  const handleConfirm = async () => {
    if (confirmationText === domainName) {
      setIsDeleting(true);
      try {
        await onConfirm();
        onClose();
      } catch (error) {
        console.error("Error during deletion:", error);
      } finally {
        setIsDeleting(false);
      }
    }
  };

  const isConfirmed = confirmationText === domainName;

  return (
    <div className="fixed inset-0 z-[99999] flex items-center justify-center p-4">
      {/* Modal */}
      <div className="bg-gray-900 rounded-2xl shadow-2xl w-full max-w-md mx-auto relative">
        <div className="flex justify-between items-center p-6 border-b border-gray-700">
          <h2 className="text-2xl font-bold text-red-400">Confirm Deletion</h2>
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-white hover:bg-gray-800 rounded-lg transition-all duration-200"
            disabled={isDeleting}
          >
            <svg
              className="w-6 h-6"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>

        <div className="p-6">
          <div className="space-y-4">
            <div className="text-gray-300">
              <p className="mb-2">You are about to delete this {itemType}:</p>
              <p className="font-semibold text-white bg-gray-800 p-3 rounded-lg">
                {itemName}
              </p>
            </div>

            <div className="border-t border-gray-700 pt-4">
              <p className="text-sm text-gray-300 mb-3">
                To confirm deletion, please type the domain name:
              </p>
              <p className="font-mono text-sm bg-red-900 text-red-200 p-2 rounded-lg mb-3">
                {domainName}
              </p>
              <input
                type="text"
                value={confirmationText}
                onChange={(e) => setConfirmationText(e.target.value)}
                placeholder="Type the domain name to confirm"
                className="w-full px-3 py-2 border border-gray-600 bg-gray-800 text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent"
                disabled={isDeleting}
              />
            </div>

            <div className="text-sm text-red-400">
              <p>⚠️ This action cannot be undone.</p>
            </div>
          </div>

          <div className="mt-8 flex gap-3 justify-end">
            <button
              onClick={onClose}
              className="bg-gray-600 text-white px-6 py-3 rounded-xl hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 transition-all duration-200 font-medium disabled:opacity-50"
              disabled={isDeleting}
            >
              Cancel
            </button>
            <button
              onClick={handleConfirm}
              disabled={!isConfirmed || isDeleting}
              className="bg-red-600 text-white px-6 py-3 rounded-xl hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 transition-all duration-200 font-medium disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isDeleting ? (
                <div className="flex items-center gap-2">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  Deleting...
                </div>
              ) : (
                "Delete"
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DeleteConfirmationModal;
