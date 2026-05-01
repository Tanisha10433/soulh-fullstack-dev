import React, { createContext, useContext, useEffect, useState, useRef } from 'react';
import { Client } from '@stomp/stompjs';
import SockJS from 'sockjs-client';
import { useAuth } from './AuthContext';
import { useToast } from './ToastContext';

const WebSocketContext = createContext(null);
export const useWebSocket = () => useContext(WebSocketContext);

export const WebSocketProvider = ({ children }) => {
  const { user } = useAuth();
  const { addToast } = useToast();          // ← was wrongly called showToast
  const clientRef = useRef(null);
  const [stompClient, setStompClient]   = useState(null);
  const [isConnected, setIsConnected]   = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount]   = useState(0);

  useEffect(() => {
    if (!user) return;                      // not logged in — do nothing
    if (clientRef.current) return;          // already initialised

    const token = localStorage.getItem('soulh_token');

    const client = new Client({
      // SockJS factory — recreated on each reconnect attempt
      webSocketFactory: () => new SockJS('http://localhost:8080/ws'),
      reconnectDelay: 5000,

      // Pass JWT in STOMP CONNECT frame so Spring Security accepts it
      connectHeaders: token ? { Authorization: `Bearer ${token}` } : {},

      onConnect: () => {
        setIsConnected(true);

        // Global notification subscription
        client.subscribe('/user/queue/notifications', msg => {
          try {
            const notif = JSON.parse(msg.body);
            setNotifications(prev => [notif, ...prev]);
            setUnreadCount(c => c + 1);
            addToast(notif.message, notif.type === 'CONNECTION_REQUEST' ? 'info' : 'success');
          } catch { /* ignore malformed */ }
        });
      },

      onDisconnect: () => setIsConnected(false),

      onStompError: frame => {
        console.error('[STOMP] Broker error:', frame.headers['message']);
      },

      onWebSocketError: err => {
        console.error('[STOMP] WebSocket error:', err);
      },
    });

    client.activate();
    clientRef.current = client;
    setStompClient(client);

    return () => {
      if (client.active) client.deactivate();
      clientRef.current = null;
    };
  }, [user]);   // re-run only when user changes (login/logout)

  const markAllNotificationsAsRead = async () => {
    try {
      const api = (await import('../api')).default;
      await api.patch('/api/notifications/read-all');
      setUnreadCount(0);
      setNotifications(prev => prev.map(n => ({ ...n, read: true })));
    } catch (e) {
      console.error('Failed to clear notifications', e);
    }
  };

  return (
    <WebSocketContext.Provider value={{ stompClient, isConnected, notifications, unreadCount, setUnreadCount, markAllNotificationsAsRead }}>
      {children}
    </WebSocketContext.Provider>
  );
};
