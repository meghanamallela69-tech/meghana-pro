import { useEffect, useState, useCallback } from "react";
import axios from "axios";
import AdminLayout from "../../components/admin/AdminLayout";
import SummaryCard from "../../components/admin/SummaryCard";
import ActivityTable from "../../components/admin/ActivityTable";
import { BsCalendar2Event } from "react-icons/bs";
import { FaUsers, FaStore, FaListAlt } from "react-icons/fa";
import useAuth from "../../context/useAuth";
import { API_BASE, authHeaders } from "../../lib/http";

const AdminDashboardUI = () => {
  const { token } = useAuth();
  const [users, setUsers] = useState([]);
  const [events, setEvents] = useState([]);
  const [registrations, setRegistrations] = useState([]);
  const [merchantsCount, setMerchantsCount] = useState(0);

  const load = useCallback(async () => {
    const headers = authHeaders(token);
    const [u, e, b, m] = await Promise.all([
      axios.get(`${API_BASE}/admin/users`, { headers }),
      axios.get(`${API_BASE}/admin/events`, { headers }),
      axios.get(`${API_BASE}/admin/bookings/all`, { headers }),
      axios.get(`${API_BASE}/admin/merchants`, { headers }),
    ]);
    setUsers(u.data.users || []);
    setEvents(e.data.events || []);
    setRegistrations(b.data.bookings || []);
    // Store merchant count separately
    setMerchantsCount((m.data.merchants || []).length);
  }, [token]);

  useEffect(() => {
    load();
  }, [load]);

  const stats = {
    users: users.filter(u => u.role === "user").length,
    merchants: merchantsCount,
    events: events.length,
    bookings: registrations.length,
  };

  const recentEvents = [...events]
    .sort((a, b) => new Date(b.date) - new Date(a.date))
    .slice(0, 6)
    .map((ev) => ({
      id: ev._id,
      name: ev.title,
      date: new Date(ev.date).toLocaleDateString(),
      merchant: ev.createdBy?.name || "—",
      status: new Date(ev.date) >= new Date() ? "Upcoming" : "Completed",
    }));

  const recentRegs = [...registrations]
    .sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0))
    .slice(0, 6)
    .map((rg) => ({
      id: rg._id,
      user: rg.user?.name || rg.userName || "User",
      event: rg.serviceTitle || rg.eventTitle || rg.event?.title || "Event",
      date: new Date(rg.createdAt || Date.now()).toLocaleString(),
    }));

  return (
    <AdminLayout>
      <section className="mb-6">
        <h2 className="text-2xl md:text-3xl font-semibold">Welcome back, Admin</h2>
        <p className="text-gray-600 mt-1">Here is an overview of your platform today</p>
      </section>

      <div className="admin-grid-stats" style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '24px', marginBottom: '8px' }}>
        <SummaryCard title="Total Users" value={stats.users} icon={FaUsers} color="bg-emerald-600" to="/dashboard/admin/users" />
        <SummaryCard title="Total Merchants" value={stats.merchants} icon={FaStore} color="bg-orange-600" to="/dashboard/admin/merchants" />
        <SummaryCard title="Total Events" value={stats.events} icon={BsCalendar2Event} color="bg-indigo-600" to="/dashboard/admin/events" />
        <SummaryCard title="Total Bookings" value={stats.bookings} icon={FaListAlt} color="bg-blue-600" to="/dashboard/admin/registrations" />
      </div>

      <div className="mt-8 grid grid-cols-1 xl:grid-cols-3 gap-6">
        <section className="xl:col-span-2 rounded-xl bg-white shadow-sm ring-1 ring-gray-200 overflow-hidden">
          <div className="p-5 border-b border-gray-100">
            <h3 className="text-lg font-medium">Recent Events</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="bg-gray-50 text-xs font-medium text-gray-500 uppercase">
                <tr>
                  <th className="text-left px-4 py-3 whitespace-nowrap">Event Name</th>
                  <th className="text-left px-4 py-3 whitespace-nowrap">Date</th>
                  <th className="text-left px-4 py-3 whitespace-nowrap">Merchant</th>
                  <th className="text-left px-4 py-3 whitespace-nowrap">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {recentEvents.map((ev) => (
                  <tr key={ev.id} className="hover:bg-gray-50 transition">
                    <td className="px-4 py-3 whitespace-nowrap font-medium text-gray-900">{ev.name}</td>
                    <td className="px-4 py-3 whitespace-nowrap text-gray-600">{ev.date}</td>
                    <td className="px-4 py-3 whitespace-nowrap text-gray-600">{ev.merchant}</td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <span className={`px-2 py-1 rounded text-xs font-medium ${ev.status === "Upcoming" ? "bg-green-100 text-green-700" : "bg-gray-200 text-gray-700"}`}>
                        {ev.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <ActivityTable
          rows={recentRegs.map((r) => ({
            id: r.id,
            user: r.user,
            event: r.event,
            date: r.date,
            status: "Confirmed",
          }))}
        />
      </div>
    </AdminLayout>
  );
};

export default AdminDashboardUI;
