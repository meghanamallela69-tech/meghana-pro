import { useState, useEffect, useCallback } from "react";
import axios from "axios";
import useAuth from "./useAuth";
import { API_BASE, authHeaders } from "../lib/http";

const useNotificationBadges = () => {
  const { token } = useAuth();
  const [badgeCounts, setBadgeCounts] = useState({
    bookings: 0, payments: 0, system: 0, total: 0, hasMore: false, role: null
  });

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

  useEffect(() => {
    fetchUnreadCounts();
    const interval = setInterval(fetchUnreadCounts, 10000);
    return () => clearInterval(interval);
  }, [fetchUnreadCounts]);

  return { badgeCounts, refreshBadges, markAllAsRead, markAsRead, resetBookingBadge };
};

export default useNotificationBadges;
