import { useState, useEffect, useCallback, useRef } from "react";
import axios from "axios";
import { io } from "socket.io-client";
import useAuth from "./useAuth";
import { API_BASE, authHeaders } from "../lib/http";

const useNotificationBadges = () => {
  const { token, user } = useAuth();
  const [badgeCounts, setBadgeCounts] = useState({
    bookings: 0, payments: 0, system: 0, total: 0, hasMore: false, role: null
  });
  const socketRef = useRef(null);

  const fetchUnreadCounts = useCallback(async () => {
    if (!token) return;
    try {
      const { data } = await axios.get(`${API_BASE}/notifications/unread-counts`, {
        headers: authHeaders(token),
      });
      if (data.success) setBadgeCounts(data.data);
    } catch {}
  }, [token]);

  const markAllAsRead = async () => {
    try {
      await axios.post(`${API_BASE}/notifications/mark-all-read`, {}, { headers: authHeaders(token) });
      await fetchUnreadCounts();
    } catch {}
  };

  const markAsRead = async (notificationId) => {
    try {
      await axios.patch(`${API_BASE}/notifications/${notificationId}/read`, {}, { headers: authHeaders(token) });
      await fetchUnreadCounts();
    } catch {}
  };

  const resetBookingBadge = useCallback(async () => {
    try {
      await axios.post(`${API_BASE}/notifications/mark-booking-read`, {}, { headers: authHeaders(token) });
      await fetchUnreadCounts();
    } catch {
      await fetchUnreadCounts();
    }
  }, [token, fetchUnreadCounts]);

  const refreshBadges = fetchUnreadCounts;

  // Poll every 30s as fallback
  useEffect(() => {
    fetchUnreadCounts();
    const interval = setInterval(fetchUnreadCounts, 30000);
    return () => clearInterval(interval);
  }, [fetchUnreadCounts]);

  // Real-time socket listener — instantly update badge on new notification
  useEffect(() => {
    if (!token || !user) return;

    const userId = user?.id || user?._id || user?.userId;
    if (!userId) return;

    socketRef.current = io(API_BASE, {
      withCredentials: true,
      transports: ['websocket', 'polling'],
    });

    socketRef.current.emit('joinUserRoom', userId);

    socketRef.current.on('newNotification', () => {
      // Immediately refresh badge counts when a new notification arrives
      fetchUnreadCounts();
    });

    return () => {
      if (socketRef.current) {
        socketRef.current.emit('leaveUserRoom', userId);
        socketRef.current.disconnect();
      }
    };
  }, [token, user, fetchUnreadCounts]);

  return { badgeCounts, refreshBadges, markAllAsRead, markAsRead, resetBookingBadge };
};

export default useNotificationBadges;
