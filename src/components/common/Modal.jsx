import React, { useEffect, useRef } from "react";
import { createPortal } from "react-dom";

export default function Modal({
  open,
  title,
  children,
  footer,
  onClose,
  onConfirm,
  className = "",
}) {
  const modalRef = useRef(null);

  useEffect(() => {
    if (!open) return;

    function handleKeyDown(e) {
      if (e.key === "Escape") {
        if (onClose) {
          e.preventDefault();
          onClose();
        }
      } else if (e.key === "Enter") {
        const targetTag = e.target?.tagName?.toLowerCase();
        if (targetTag === "textarea") return;

        if (targetTag === "button" && e.target?.type === "button") {
          return;
        }

        if (onConfirm) {
          e.preventDefault();
          onConfirm();
          return;
        }

        const formEl = modalRef.current?.querySelector("form");
        if (formEl) {
          e.preventDefault();
          if (typeof formEl.requestSubmit === "function") {
            formEl.requestSubmit();
          } else {
            const submitBtn = formEl.querySelector(
              'button[type="submit"]:not([disabled]), button:not([type="button"]):not([disabled])'
            );
            if (submitBtn) {
              submitBtn.click();
            } else {
              formEl.dispatchEvent(
                new Event("submit", { cancelable: true, bubbles: true })
              );
            }
          }
          return;
        }

        const confirmBtn = modalRef.current?.querySelector(
          '.border-t button:last-child:not([disabled]), footer button:last-child:not([disabled]), button[type="submit"]:not([disabled]), .flex.justify-end button:last-child:not([disabled])'
        );

        if (confirmBtn && e.target !== confirmBtn) {
          e.preventDefault();
          confirmBtn.click();
        }
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [open, onClose, onConfirm]);

  if (!open) return null;

  return createPortal(
    <div className="fixed inset-0 z-[10000] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
      <div
        ref={modalRef}
        className={`relative w-full max-w-2xl rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 shadow-xl ${className}`}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-line dark:border-slate-800 pb-4">
          <h3 className="font-display text-lg font-bold text-ink dark:text-white">
            {title}
          </h3>

          {onClose && (
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg p-1 text-slate dark:text-slate-400 hover:bg-portal-bg dark:hover:bg-slate-800 hover:text-ink dark:hover:text-white"
            >
              ✕
            </button>
          )}
        </div>

        {/* Content */}
        <div className="py-4 text-slate-800 dark:text-slate-200">{children}</div>

        {/* Footer */}
        {footer && (
          <div className="flex items-center justify-end gap-3 border-t border-line dark:border-slate-800 pt-4">
            {footer}
          </div>
        )}
      </div>
    </div>,
    document.body
  );
}