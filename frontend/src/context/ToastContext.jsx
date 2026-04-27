import React, { createContext, useContext, useState, useCallback } from 'react';

const ToastContext = createContext(null);

let toastId = 0;

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);

  const addToast = useCallback((message, type = 'info') => {
    const id = ++toastId;
    setToasts(t => [...t, { id, message, type }]);
    setTimeout(() => setToasts(t => t.filter(x => x.id !== id)), 4000);
  }, []);

  const removeToast = (id) => setToasts(t => t.filter(x => x.id !== id));

  const colors = {
    success: { bg: 'rgba(255,255,255,0.97)', border: 'rgba(13,107,94,0.35)',  text: '#0d6b5e', icon: '✅' },
    error:   { bg: 'rgba(255,255,255,0.97)', border: 'rgba(220,38,38,0.3)',   text: '#dc2626', icon: '❌' },
    info:    { bg: 'rgba(255,255,255,0.97)', border: 'rgba(13,107,94,0.25)',  text: '#0f8b7a', icon: '🫀' },
  };

  return (
    <ToastContext.Provider value={{ addToast }}>
      {children}
      {/* Toast Container */}
      <div style={{ position: 'fixed', bottom: '24px', right: '24px', zIndex: 9999, display: 'flex', flexDirection: 'column', gap: '10px' }}>
        {toasts.map(toast => {
          const c = colors[toast.type] || colors.info;
          return (
            <div
              key={toast.id}
              onClick={() => removeToast(toast.id)}
              style={{
                background: c.bg,
                border: `1px solid ${c.border}`,
                color: c.text,
                backdropFilter: 'blur(20px)',
                borderRadius: '14px',
                padding: '14px 18px',
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                fontFamily: 'Inter, sans-serif',
                fontWeight: 600,
                fontSize: '14px',
                cursor: 'pointer',
                maxWidth: '320px',
                boxShadow: '0 8px 32px rgba(0,0,0,0.3)',
                animation: 'slideIn 0.3s ease',
              }}
            >
              <span>{c.icon}</span>
              <span>{toast.message}</span>
            </div>
          );
        })}
      </div>
      <style>{`@keyframes slideIn { from { opacity:0; transform: translateX(40px); } to { opacity:1; transform: translateX(0); } }`}</style>
    </ToastContext.Provider>
  );
}

export const useToast = () => useContext(ToastContext);
