'use client';

import React, { createContext, useCallback, useContext, useMemo, useRef, useState } from 'react';
import { AlertCircle, AlertTriangle, CheckCircle2, Info, Save, Trash2, X } from 'lucide-react';
import styles from '@/components/common/AppFeedback.module.css';

type ToastTone = 'success' | 'error' | 'warning' | 'info';

type ToastInput = {
  title?: string;
  message: string;
  tone?: ToastTone;
  durationMs?: number;
  persistent?: boolean;
};

type ConfirmOptions = {
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  tone?: 'default' | 'danger';
};

type AlertOptions = {
  title: string;
  message: string;
  acknowledgeLabel?: string;
};

type ToastRecord = ToastInput & {
  id: string;
  tone: ToastTone;
};

type DialogState =
  | ({
      kind: 'confirm';
      resolve: (value: boolean) => void;
    } & Required<Pick<ConfirmOptions, 'title' | 'message' | 'confirmLabel' | 'cancelLabel' | 'tone'>>)
  | ({
      kind: 'alert';
      resolve: () => void;
    } & Required<Pick<AlertOptions, 'title' | 'message' | 'acknowledgeLabel'>>);

type AppFeedbackContextValue = {
  showToast: (input: ToastInput) => void;
  showSuccess: (message: string, title?: string) => void;
  showError: (message: string, title?: string, persistent?: boolean) => void;
  confirm: (options: ConfirmOptions) => Promise<boolean>;
  alert: (options: AlertOptions) => Promise<void>;
};

const AppFeedbackContext = createContext<AppFeedbackContextValue | undefined>(undefined);

function toneIcon(tone: ToastTone) {
  switch (tone) {
    case 'success':
      return <CheckCircle2 size={18} aria-hidden="true" />;
    case 'error':
      return <AlertCircle size={18} aria-hidden="true" />;
    case 'warning':
      return <AlertTriangle size={18} aria-hidden="true" />;
    default:
      return <Info size={18} aria-hidden="true" />;
  }
}

function buttonIcon(label: string) {
  const key = label.toLowerCase();
  if (key.includes('delete')) return <Trash2 size={16} aria-hidden="true" />;
  if (key.includes('save') || key.includes('ok')) return <Save size={16} aria-hidden="true" />;
  return <X size={16} aria-hidden="true" />;
}

export function AppFeedbackProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastRecord[]>([]);
  const [dialog, setDialog] = useState<DialogState | null>(null);
  const toastIdRef = useRef(0);

  const dismissToast = useCallback((id: string) => {
    setToasts((current) => current.filter((toast) => toast.id !== id));
  }, []);

  const showToast = useCallback(
    ({ tone = 'info', durationMs = 4000, persistent = false, ...rest }: ToastInput) => {
      const id = `toast-${toastIdRef.current++}`;
      setToasts((current) => [...current, { id, tone, persistent, durationMs, ...rest }]);
      if (!persistent) {
        window.setTimeout(() => dismissToast(id), durationMs);
      }
    },
    [dismissToast]
  );

  const showSuccess = useCallback(
    (message: string, title = 'Saved') => {
      showToast({ title, message, tone: 'success', durationMs: 4000 });
    },
    [showToast]
  );

  const showError = useCallback(
    (message: string, title = 'Something went wrong', persistent = true) => {
      showToast({ title, message, tone: 'error', persistent });
    },
    [showToast]
  );

  const confirm = useCallback((options: ConfirmOptions) => {
    return new Promise<boolean>((resolve) => {
      setDialog({
        kind: 'confirm',
        resolve,
        title: options.title,
        message: options.message,
        confirmLabel: options.confirmLabel ?? 'Confirm',
        cancelLabel: options.cancelLabel ?? 'Cancel',
        tone: options.tone ?? 'default',
      });
    });
  }, []);

  const alert = useCallback((options: AlertOptions) => {
    return new Promise<void>((resolve) => {
      setDialog({
        kind: 'alert',
        resolve,
        title: options.title,
        message: options.message,
        acknowledgeLabel: options.acknowledgeLabel ?? 'OK',
      });
    });
  }, []);

  const value = useMemo<AppFeedbackContextValue>(
    () => ({
      showToast,
      showSuccess,
      showError,
      confirm,
      alert,
    }),
    [alert, confirm, showError, showSuccess, showToast]
  );

  return (
    <AppFeedbackContext.Provider value={value}>
      {children}
      <div className={styles.toastViewport} aria-live="polite" aria-atomic="false">
        {toasts.map((toast) => (
          <div key={toast.id} className={`${styles.toastCard} ${styles[`toast${toast.tone[0]!.toUpperCase()}${toast.tone.slice(1)}`]}`}>
            <span className={styles.toastIcon}>{toneIcon(toast.tone)}</span>
            <div className={styles.toastBody}>
              {toast.title ? <p className={styles.toastTitle}>{toast.title}</p> : null}
              <p className={styles.toastMessage}>{toast.message}</p>
            </div>
            <button
              type="button"
              className={styles.iconButton}
              onClick={() => dismissToast(toast.id)}
              aria-label="Dismiss notification"
            >
              <X size={16} aria-hidden="true" />
            </button>
          </div>
        ))}
      </div>
      {dialog ? (
        <div className={styles.dialogBackdrop}>
          <div className={styles.dialogCard} role="alertdialog" aria-modal="true" aria-labelledby="app-feedback-title">
            <div className={styles.dialogHeader}>
              <p id="app-feedback-title" className={styles.dialogTitle}>
                {dialog.title}
              </p>
              <button
                type="button"
                className={styles.iconButton}
                aria-label={dialog.kind === 'confirm' ? 'Cancel' : 'Close'}
                onClick={() => {
                  if (dialog.kind === 'confirm') {
                    dialog.resolve(false);
                  } else {
                    dialog.resolve();
                  }
                  setDialog(null);
                }}
              >
                <X size={16} aria-hidden="true" />
              </button>
            </div>
            <p className={styles.dialogMessage}>{dialog.message}</p>
            <div className={styles.dialogActions}>
              {dialog.kind === 'confirm' ? (
                <>
                  <button
                    type="button"
                    className={styles.dialogButton}
                    onClick={() => {
                      dialog.resolve(false);
                      setDialog(null);
                    }}
                    aria-label={dialog.cancelLabel}
                    title={dialog.cancelLabel}
                  >
                    {buttonIcon(dialog.cancelLabel)}
                  </button>
                  <button
                    type="button"
                    className={`${styles.dialogButton} ${
                      dialog.tone === 'danger' ? styles.dialogDanger : styles.dialogPrimary
                    }`}
                    onClick={() => {
                      dialog.resolve(true);
                      setDialog(null);
                    }}
                    aria-label={dialog.confirmLabel}
                    title={dialog.confirmLabel}
                  >
                    {buttonIcon(dialog.confirmLabel)}
                  </button>
                </>
              ) : (
                <button
                  type="button"
                  className={`${styles.dialogButton} ${styles.dialogPrimary}`}
                  onClick={() => {
                    dialog.resolve();
                    setDialog(null);
                  }}
                  aria-label={dialog.acknowledgeLabel}
                  title={dialog.acknowledgeLabel}
                >
                  {buttonIcon(dialog.acknowledgeLabel)}
                </button>
              )}
            </div>
          </div>
        </div>
      ) : null}
    </AppFeedbackContext.Provider>
  );
}

export function useAppFeedback() {
  const context = useContext(AppFeedbackContext);
  if (!context) {
    throw new Error('useAppFeedback must be used within an AppFeedbackProvider');
  }
  return context;
}
