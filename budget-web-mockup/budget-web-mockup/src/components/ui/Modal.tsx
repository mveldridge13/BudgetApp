'use client';

import { useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  showCloseButton?: boolean;
  /** 'indigo' renders the filled brand header used by the Add Goal modal. */
  headerVariant?: 'default' | 'indigo';
}

const sizeClasses = {
  sm: 'max-w-sm',
  md: 'max-w-md',
  lg: 'max-w-lg',
  xl: 'max-w-xl',
};

export default function Modal({
  isOpen,
  onClose,
  title,
  children,
  size = 'md',
  showCloseButton = true,
  headerVariant = 'default',
}: ModalProps) {
  const isIndigo = headerVariant === 'indigo';
  const handleEscape = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    },
    [onClose]
  );

  useEffect(() => {
    if (isOpen) {
      // Calculate scrollbar width before hiding it
      const scrollbarWidth = window.innerWidth - document.documentElement.clientWidth;

      document.addEventListener('keydown', handleEscape);
      document.body.style.overflow = 'hidden';
      // Add padding to prevent layout shift when scrollbar is hidden
      if (scrollbarWidth > 0) {
        document.body.style.paddingRight = `${scrollbarWidth}px`;
      }
    }

    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = 'unset';
      document.body.style.paddingRight = '';
    };
  }, [isOpen, handleEscape]);

  if (!isOpen) return null;

  const modalContent = (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby={title ? 'modal-title' : undefined}
    >
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/20 backdrop-blur-sm transition-opacity"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Modal content */}
      <div
        className={`
          relative bg-white rounded-xl shadow-2xl w-full ${sizeClasses[size]}
          max-h-[90vh] overflow-hidden
          transform transition-all
        `}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        {(title || showCloseButton) && (
          <div
            className={
              isIndigo
                ? 'flex items-center justify-between px-6 py-5'
                : 'flex items-center justify-between p-4 border-b border-gray-100'
            }
            style={isIndigo ? { backgroundColor: '#6366f1' } : undefined}
          >
            {title && (
              <h2
                id="modal-title"
                className={
                  isIndigo
                    ? 'text-xl font-semibold text-white'
                    : 'text-lg font-semibold text-gray-900'
                }
              >
                {title}
              </h2>
            )}
            {showCloseButton && (
              <button
                onClick={onClose}
                className={
                  isIndigo
                    ? 'text-white transition-colors p-1 rounded-lg hover:bg-white/10'
                    : 'text-gray-400 hover:text-gray-600 transition-colors p-1 rounded-lg hover:bg-gray-100'
                }
                aria-label="Close modal"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            )}
          </div>
        )}

        {/* Body */}
        <div className="overflow-y-auto max-h-[calc(90vh-80px)]">{children}</div>
      </div>
    </div>
  );

  // Use portal to render modal at document body level
  if (typeof document !== 'undefined') {
    return createPortal(modalContent, document.body);
  }

  return null;
}
