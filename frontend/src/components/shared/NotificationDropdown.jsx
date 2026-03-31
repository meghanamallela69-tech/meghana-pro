import { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { FiBell } from "react-icons/fi";
import { FaCheck, FaTrash, FaCalendarAlt, FaDollarSign, FaBell, FaInbox, FaSyncAlt } from "react-icons/fa";
import { toast } from "react-hot-toast";
import useAuth from "../../context/useAuth";
import useNotificationBadges from "../../context/useNotificationBadges";
import { API_BASE, authHeaders } from "../../lib/http";
import PropTypes from "prop-types";

const NotificationDropdown = ({ viewAllPath }) => {
  const { token, user } = useAuth();
  const { badgeCounts, refreshBadges } = useNotificationBadges();
  const navigate = useNavigate();
  const btnRef = useRef(null);

  const [open, setOpen] = useState(false);
  const [dropdownPos, setDropdownPos] = useState({ top: 0, right: 0 });
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);

  // Position the dropdown below the bell button
  const updatePosition = () => {
    if (btnRef.current) {
      const rect = btnRef.current.getBoundingClientRect();
      setDropdownPos({
        top: rect.bottom + window.scrollY + 8,
        right: window.innerWidth - rect.right,
      });
    }
  };

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    const handler = (e) => {
      if (btnRef.current && !btnRef.current.contains(e.target)) {
        // Check if click is inside the dropdown portal
        const portal = document.getElementById("notification-portal");
        if (portal && portal.contains(e.target)) return;
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  // Reposition on scroll/resize
  useEffect(() => {
    if (!open) return;
    const handler = () => updatePosition();
    window.addEventListener("scroll", handler, true);
    window.addEventListener("resize", handler);
    return () => {
      window.removeEventListener("scroll", handler, true);
      window.removeEventListener("resize", handler);
    };
  }, [open]);

  const fetchNotifications = async (pageNum = 1, append = false) => {
    if (!token) return;
    setLoading(true);
    try {
      const res = await axios.get(
        `${API_BASE}/notifications?page=${pageNum}&limit=15`,
        { headers: authHeaders(token) }
      );
      if (res.data.success) {
        const list = res.data.notifications || [];
        setNotifications(prev => append ? [...prev, ...list] : list);
        setHasMore(res.data.pagination?.hasNext || false);
        setPage(pageNum);
        refreshBadges();
      }
    } catch (err) {
      console.error("Failed to load notifications:", err);
      toast.error("Failed to load notifications");
    } finally {
      setLoading(false);
    }
  };

  const seedAdminNotifications = async () => {
    try {
      const res = await axios.post(
        `${API_BASE}/notifications/admin-self`,
        { message: "Notification system is active and working.", type: "system" },
        { headers: authHeaders(token) }
      );
      if (res.data.success) {
        toast.success("Notification created!");
        fetchNotifications(1, false);
        refreshBadges();
      }
    } catch (err) {
      toast.error("Failed to create notification");
    }
  };

  const handleToggle = () => {
    const next = !open;
    if (next) {
      updatePosition();
      setNotifications([]);
      fetchNotifications(1, false);
    }
    setOpen(next);
  };

  const handleMarkRead = async (id, e) => {
    e.stopPropagation();
    try {
      await axios.patch(`${API_BASE}/notifications/${id}/read`, {}, { headers: authHeaders(token) });
      setNotifications(prev => prev.map(n => n._id === id ? { ...n, read: true } : n));
      refreshBadges();
    } catch {
      toast.error("Failed to mark as read");
    }
  };

  const handleMarkAllRead = async () => {
    try {
      await axios.post(`${API_BASE}/notifications/mark-all-read`, {}, { headers: authHeaders(token) });
      setNotifications(prev => prev.map(n => ({ ...n, read: true })));
      refreshBadges();
      toast.success("All marked as read");
    } catch {
      toast.error("Failed to mark all as read");
    }
  };

  const handleDelete = async (id, e) => {
    e.stopPropagation();
    try {
      await axios.delete(`${API_BASE}/notifications/${id}`, { headers: authHeaders(token) });
      setNotifications(prev => prev.filter(n => n._id !== id));
      refreshBadges();
    } catch {
      toast.error("Failed to delete notification");
    }
  };

  const getIcon = (type) => {
    if (type?.includes("booking")) return <FaCalendarAlt className="text-green-500 text-sm" />;
    if (type?.includes("payment")) return <FaDollarSign className="text-blue-500 text-sm" />;
    return <FaBell className="text-amber-500 text-sm" />;
  };

  const getIconBg = (type) => {
    if (type?.includes("booking")) return "bg-green-100";
    if (type?.includes("payment")) return "bg-blue-100";
    return "bg-amber-100";
  };

  const timeAgo = (dateStr) => {
    const diff = Date.now() - new Date(dateStr);
    const m = Math.floor(diff / 60000);
    const h = Math.floor(diff / 3600000);
    const d = Math.floor(diff / 86400000);
    if (m < 1) return "Just now";
    if (m < 60) return `${m}m ago`;
    if (h < 24) return `${h}h ago`;
    if (d < 7) return `${d}d ago`;
    return new Date(dateStr).toLocaleDateString();
  };

  const unreadCount = badgeCounts.total || notifications.filter(n => !n.read).length;

  const dropdown = open ? (
    <div
      id="notification-portal"
      style={{
        position: "fixed",
        top: dropdownPos.top,
        right: dropdownPos.right,
        width: 380,
        zIndex: 99999,
        maxHeight: 520,
        display: "flex",
        flexDirection: "column",
        background: "#fff",
        borderRadius: 12,
        boxShadow: "0 20px 60px rgba(0,0,0,0.15)",
        border: "1px solid #e5e7eb",
        overflow: "hidden",
      }}
    >
      {/* Header */}
      <div style={{ padding: "12px 16px", borderBottom: "1px solid #f3f4f6", display: "flex", alignItems: "center", justifyContent: "space-between", background: "#f9fafb" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <FiBell style={{ color: "#374151", width: 16, height: 16 }} />
          <span style={{ fontWeight: 600, color: "#1f2937", fontSize: 14 }}>Notifications</span>
          {unreadCount > 0 && (
            <span style={{ background: "#fee2e2", color: "#dc2626", fontSize: 11, fontWeight: 700, padding: "2px 8px", borderRadius: 999 }}>
              {unreadCount} new
            </span>
          )}
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
          {notifications.some(n => !n.read) && (
            <button
              onClick={handleMarkAllRead}
              style={{ fontSize: 12, color: "#2563eb", fontWeight: 600, padding: "4px 8px", borderRadius: 6, border: "none", background: "transparent", cursor: "pointer" }}
              onMouseEnter={e => e.target.style.background = "#eff6ff"}
              onMouseLeave={e => e.target.style.background = "transparent"}
            >
              Mark all read
            </button>
          )}
          <button
            onClick={() => setOpen(false)}
            style={{ padding: 4, borderRadius: 6, border: "none", background: "transparent", cursor: "pointer", color: "#9ca3af", display: "flex", alignItems: "center" }}
            onMouseEnter={e => e.target.style.color = "#374151"}
            onMouseLeave={e => e.target.style.color = "#9ca3af"}
          >
            <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      </div>

      {/* Body */}
      <div style={{ overflowY: "auto", flex: 1, maxHeight: 380 }}>
        {loading && notifications.length === 0 ? (
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "48px 16px", gap: 12 }}>
            <div style={{ width: 32, height: 32, border: "2px solid #3b82f6", borderTopColor: "transparent", borderRadius: "50%", animation: "spin 0.8s linear infinite" }} />
            <p style={{ fontSize: 14, color: "#6b7280" }}>Loading notifications...</p>
          </div>
        ) : notifications.length === 0 ? (
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "48px 16px", gap: 8 }}>
            <FaInbox style={{ fontSize: 48, color: "#d1d5db" }} />
            <p style={{ fontWeight: 600, color: "#374151", fontSize: 14 }}>No notifications yet</p>
            <p style={{ fontSize: 12, color: "#9ca3af" }}>You&apos;re all caught up!</p>
            <button
              onClick={() => fetchNotifications(1, false)}
              style={{ marginTop: 8, padding: "6px 16px", fontSize: 12, background: "#eff6ff", color: "#2563eb", border: "none", borderRadius: 8, cursor: "pointer", fontWeight: 600 }}
            >
              Refresh
            </button>
            {user?.role === "admin" && (
              <button
                onClick={seedAdminNotifications}
                style={{ padding: "6px 16px", fontSize: 12, background: "#f5f3ff", color: "#7c3aed", border: "none", borderRadius: 8, cursor: "pointer", fontWeight: 600 }}
              >
                Load Sample Notifications
              </button>
            )}
          </div>
        ) : (
          <div>
            {notifications.map((notif) => (
              <div
                key={notif._id}
                style={{
                  display: "flex",
                  alignItems: "flex-start",
                  gap: 12,
                  padding: "12px 16px",
                  borderBottom: "1px solid #f9fafb",
                  background: !notif.read ? "#eff6ff" : "#fff",
                  transition: "background 0.15s",
                }}
                onMouseEnter={e => e.currentTarget.style.background = !notif.read ? "#dbeafe" : "#f9fafb"}
                onMouseLeave={e => e.currentTarget.style.background = !notif.read ? "#eff6ff" : "#fff"}
              >
                {/* Icon */}
                <div style={{
                  width: 36, height: 36, borderRadius: "50%", flexShrink: 0, marginTop: 2,
                  display: "flex", alignItems: "center", justifyContent: "center",
                  background: notif.type?.includes("booking") ? "#dcfce7" : notif.type?.includes("payment") ? "#dbeafe" : "#fef3c7"
                }}>
                  {getIcon(notif.type)}
                </div>

                {/* Content */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ fontSize: 13, lineHeight: 1.5, fontWeight: !notif.read ? 600 : 400, color: !notif.read ? "#111827" : "#374151", margin: 0 }}>
                    {notif.message}
                  </p>
                  <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 4, flexWrap: "wrap" }}>
                    <span style={{ fontSize: 11, color: "#9ca3af" }}>{timeAgo(notif.createdAt)}</span>
                    {!notif.read && (
                      <span style={{ fontSize: 10, background: "#dbeafe", color: "#1d4ed8", fontWeight: 700, padding: "1px 6px", borderRadius: 999 }}>NEW</span>
                    )}
                    {notif.type && (
                      <span style={{ fontSize: 10, background: "#f3f4f6", color: "#6b7280", padding: "1px 6px", borderRadius: 999, textTransform: "capitalize" }}>
                        {notif.type.replace(/_/g, " ")}
                      </span>
                    )}
                  </div>
                </div>

                {/* Actions */}
                <div style={{ display: "flex", alignItems: "center", gap: 2, flexShrink: 0 }}>
                  {!notif.read && (
                    <button
                      onClick={(e) => handleMarkRead(notif._id, e)}
                      title="Mark as read"
                      style={{ padding: 6, borderRadius: "50%", border: "none", background: "transparent", cursor: "pointer", color: "#22c55e", display: "flex" }}
                      onMouseEnter={e => e.currentTarget.style.background = "#dcfce7"}
                      onMouseLeave={e => e.currentTarget.style.background = "transparent"}
                    >
                      <FaCheck style={{ width: 12, height: 12 }} />
                    </button>
                  )}
                  <button
                    onClick={(e) => handleDelete(notif._id, e)}
                    title="Delete"
                    style={{ padding: 6, borderRadius: "50%", border: "none", background: "transparent", cursor: "pointer", color: "#9ca3af", display: "flex" }}
                    onMouseEnter={e => { e.currentTarget.style.background = "#fee2e2"; e.currentTarget.style.color = "#ef4444"; }}
                    onMouseLeave={e => { e.currentTarget.style.background = "transparent"; e.currentTarget.style.color = "#9ca3af"; }}
                  >
                    <FaTrash style={{ width: 12, height: 12 }} />
                  </button>
                </div>
              </div>
            ))}

            {hasMore && (
              <div style={{ padding: "12px 16px", textAlign: "center" }}>
                <button
                  onClick={() => fetchNotifications(page + 1, true)}
                  disabled={loading}
                  style={{ fontSize: 13, color: "#2563eb", fontWeight: 600, border: "none", background: "transparent", cursor: "pointer" }}
                >
                  {loading ? "Loading..." : "Load more"}
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Footer */}
      <div style={{ borderTop: "1px solid #f3f4f6", padding: "10px 16px" }}>
        <button
          onClick={() => { setOpen(false); navigate(viewAllPath); }}
          style={{ width: "100%", textAlign: "center", fontSize: 13, color: "#2563eb", fontWeight: 600, border: "none", background: "transparent", cursor: "pointer", padding: "4px 0", borderRadius: 8 }}
          onMouseEnter={e => e.target.style.background = "#eff6ff"}
          onMouseLeave={e => e.target.style.background = "transparent"}
        >
          View all notifications →
        </button>
      </div>

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  ) : null;

  return (
    <>
      {/* Bell Button */}
      <button
        ref={btnRef}
        type="button"
        onClick={handleToggle}
        style={{ position: "relative", padding: 8, borderRadius: 8, border: "none", background: "transparent", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}
        onMouseEnter={e => e.currentTarget.style.background = "#f3f4f6"}
        onMouseLeave={e => e.currentTarget.style.background = "transparent"}
      >
        <FiBell style={{ width: 20, height: 20, color: "#374151" }} />
        {unreadCount > 0 && (
          <span style={{
            position: "absolute", top: 0, right: 0,
            minWidth: 18, height: 18,
            background: "#ef4444", color: "#fff",
            fontSize: 10, fontWeight: 700,
            borderRadius: 999, display: "flex",
            alignItems: "center", justifyContent: "center",
            padding: "0 4px", lineHeight: 1,
          }}>
            {unreadCount > 99 ? "99+" : unreadCount}
          </span>
        )}
      </button>

      {/* Portal: renders outside header DOM */}
      {createPortal(dropdown, document.body)}
    </>
  );
};

NotificationDropdown.propTypes = {
  viewAllPath: PropTypes.string.isRequired,
};

export default NotificationDropdown;
