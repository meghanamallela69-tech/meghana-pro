import { useEffect, useState, useCallback } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import useAuth from "../../context/useAuth";
import { API_BASE, authHeaders } from "../../lib/http";
import MerchantLayout from "../../components/merchant/MerchantLayout";
import SummaryCard from "../../components/admin/SummaryCard";
import { BsCalendar2Event } from "react-icons/bs";
import { FaListAlt, FaDollarSign } from "react-icons/fa";
import { LuCalendarClock } from "react-icons/lu";

const MerchantDashboard = () => {
  const { user, token } = useAuth();
  const navigate = useNavigate();
  const [events, setEvents] = useState([]);
  const [stats, setStats] = useState({ totalEvents: 0, totalBookings: 0, totalRevenue: 0, upcoming: 0 });
  const headersJson = (t) => ({ ...authHeaders(t), "Content-Type": "application/json" });

  const loadDashboard = useCallback(async () => {
    try {
      // Load events and analytics summary in parallel
      const [eventsRes, summaryRes] = await Promise.all([
        axios.get(`${API_BASE}/merchant/events`, { headers: authHeaders(token) }),
        axios.get(`${API_BASE}/analytics/summary`, { headers: authHeaders(token) })
      ]);

      const eventsData = eventsRes.data.events || [];
      setEvents(eventsData);

      if (summaryRes.data.success) {
        const s = summaryRes.data.summary;
        const upcoming = eventsData.filter(e => e.date && new Date(e.date) >= new Date()).length;
        setStats({
          totalEvents: s.totalEvents || eventsData.length,
          totalBookings: s.totalBookings || 0,
          totalRevenue: s.totalRevenue || 0,
          upcoming
        });
      } else {
        // Fallback: compute from events
        const upcoming = eventsData.filter(e => e.date && new Date(e.date) >= new Date()).length;
        setStats({
          totalEvents: eventsData.length,
          totalBookings: 0,
          totalRevenue: 0,
          upcoming
        });
      }
    } catch (err) {
      console.error("Failed to load merchant dashboard:", err);
      // Fallback to just events
      try {
        const { data } = await axios.get(`${API_BASE}/merchant/events`, { headers: authHeaders(token) });
        const eventsData = data.events || [];
        setEvents(eventsData);
        const upcoming = eventsData.filter(e => e.date && new Date(e.date) >= new Date()).length;
        setStats({ totalEvents: eventsData.length, totalBookings: 0, totalRevenue: 0, upcoming });
      } catch {}
    }
  }, [token]);

  useEffect(() => {
    loadDashboard();
  }, [loadDashboard]);

  const createEvent = async (e) => {
    e.preventDefault();
    navigate("/dashboard/merchant/create");
  };

  const updateEvent = async (id, patch) => {
    const { data } = await axios.put(`${API_BASE}/merchant/events/${id}`, patch, { headers: headersJson(token) });
    setEvents((prev) => prev.map((ev) => (ev._id === id ? data.event : ev)));
  };

  const removeEvent = async (id) => {
    await axios.delete(`${API_BASE}/merchant/events/${id}`, { headers: authHeaders(token) });
    setEvents((prev) => prev.filter((e) => e._id !== id));
    // Refresh stats after deletion
    loadDashboard();
  };

  return (
    <MerchantLayout>
      <section className="mb-6">
        <div className="create-event-mobile-fix flex items-center justify-between">
          <div>
            <h2 className="text-2xl md:text-3xl font-semibold">Welcome back, {user?.name || "Merchant"}</h2>
            <p className="text-gray-600 mt-1">Here is your business overview</p>
          </div>
          <button
            onClick={createEvent}
            className="create-btn px-4 py-2 rounded-lg bg-gray-900 text-white hover:bg-black transition responsive-btn"
          >
            <span className="btn-label">Create Event</span>
          </button>
        </div>
      </section>

      <div className="merchant-stats-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '24px' }}>
        <SummaryCard title="Total Events" value={stats.totalEvents} icon={BsCalendar2Event} color="bg-indigo-600" to="/dashboard/merchant/events" />
        <SummaryCard title="Total Bookings" value={stats.totalBookings} icon={FaListAlt} color="bg-emerald-600" to="/dashboard/merchant/bookings" />
        <SummaryCard title="Total Revenue" value={`₹${stats.totalRevenue.toLocaleString()}`} icon={FaDollarSign} color="bg-amber-600" to="/dashboard/merchant/earnings" />
        <SummaryCard title="Upcoming Events" value={stats.upcoming} icon={LuCalendarClock} color="bg-blue-600" to="/dashboard/merchant/events" />
      </div>

      <div className="mt-8 rounded-xl bg-white shadow-sm ring-1 ring-gray-200 overflow-hidden">
        <div className="p-5 border-b border-gray-100 flex items-center justify-between">
          <h3 className="text-lg font-medium">My Events</h3>
        </div>
        <div className="events-table-mobile-fix overflow-x-auto">
          <table className="w-full text-sm table-fixed">
            <thead className="bg-gray-50 text-xs font-medium text-gray-500 uppercase">
              <tr>
                <th className="text-left px-6 py-3">Event Name</th>
                <th className="text-left px-6 py-3">Date</th>
                <th className="text-left px-6 py-3">Location</th>
                <th className="text-left px-6 py-3">Status</th>
                <th className="text-left px-6 py-3">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {events.map((ev) => {
                const status = ev.date && new Date(ev.date) >= new Date() ? "Upcoming" : "Completed";
                
                // Only show date/time for ticketed events, not for full-service events
                const shouldShowDateTime = ev.eventType === 'ticketed';
                const eventDate = ev.date ? new Date(ev.date) : null;
                const dateStr = shouldShowDateTime && eventDate ? eventDate.toLocaleDateString() : "-";
                const timeStr = shouldShowDateTime && eventDate ? eventDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : "";
                
                return (
                  <tr key={ev._id} className="hover:bg-gray-50 transition">
                    <td className="px-6 py-4 whitespace-nowrap">{ev.title}</td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {shouldShowDateTime ? (
                        <div>
                          <div>{dateStr}</div>
                          {timeStr && <div className="text-xs text-gray-500">{timeStr}</div>}
                        </div>
                      ) : (
                        <span className="text-gray-400 italic">User chooses</span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">{ev.location || "-"}</td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 py-1 rounded text-xs ${status === "Upcoming" ? "bg-green-100 text-green-700" : "bg-gray-200 text-gray-700"}`}>
                        {status}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        <button
                          className="px-3 py-1 rounded-md bg-blue-600 text-white hover:bg-blue-700 transition"
                          onClick={() => window.location.href = `/dashboard/merchant/events/edit/${ev._id}`}
                        >
                          Edit
                        </button>
                        <button
                          className="px-3 py-1 rounded-md bg-red-600 text-white hover:bg-red-700 transition"
                          onClick={() => removeEvent(ev._id)}
                        >
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Mobile Responsive Styles */}
      <style dangerouslySetInnerHTML={{ __html: `
        @media (max-width: 767px) {
          .responsive-btn { 
            padding: 8px 12px !important; 
            font-size: 14px !important; 
          }
          .btn-label { display: none; }
          .merchant-stats-grid {
            display: grid !important;
            grid-template-columns: repeat(2, 1fr) !important;
            gap: 12px !important;
          }
        }
      ` }} />
    </MerchantLayout>
  );
};

export default MerchantDashboard;
