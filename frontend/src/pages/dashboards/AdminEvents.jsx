import { useEffect, useState, useCallback } from "react";
import axios from "axios";
import toast from "react-hot-toast";
import AdminLayout from "../../components/admin/AdminLayout";
import useAuth from "../../context/useAuth";
import { API_BASE, authHeaders } from "../../lib/http";
import { FaCalendarAlt, FaMapMarkerAlt, FaUser, FaTag } from "react-icons/fa";
import { getEventStatus } from "../../lib/utils";

const AdminEvents = () => {
  const { token } = useAuth();
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);
  const [selectedEvent, setSelectedEvent] = useState(null);

  useEffect(() => {
    const onResize = () => setIsMobile(window.innerWidth <= 768);
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      const { data } = await axios.get(`${API_BASE}/admin/events`, { headers: authHeaders(token) });
      setEvents(data.events || []);
    } catch (error) {
      toast.error("Failed to load events");
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    load();
  }, [load]);

  const formatPrice = (price) => {
    if (!price || price === 0) return "Free";
    return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(price);
  };

  const getStatusBadge = (event) => {
    const s = getEventStatus(event);
    if (s.label === "Completed") return { label: "Completed", className: "bg-gray-100 text-gray-700" };
    if (event.status === "inactive")  return { label: "Inactive",  className: "bg-red-100 text-red-700" };
    return { label: "Active", className: "bg-green-100 text-green-700" };
  };

  const getEventTypeBadge = (eventType) => {
    if (eventType === "ticketed") {
      return { label: "Ticketed", className: "bg-purple-100 text-purple-700", icon: "🎫" };
    }
    return { label: "Full Service", className: "bg-blue-100 text-blue-700", icon: "🤝" };
  };

  return (
    <AdminLayout>
      <div className="mb-6">
        <h2 className="text-2xl font-semibold">Events</h2>
        <p className="text-gray-600">All events created by merchants</p>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      ) : events.length === 0 ? (
        <div className="bg-white rounded-xl p-8 text-center shadow-sm border">
          <p className="text-gray-500">No events found</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 lg:gap-6"
          style={{ gridTemplateColumns: isMobile ? 'repeat(2,1fr)' : 'repeat(4,1fr)' }}>
          {events.map((ev) => {
            const imageSrc = ev.images && ev.images.length > 0 ? ev.images[0].url : null;
            const status = getStatusBadge(ev);
            const type = getEventTypeBadge(ev.eventType);
            
            return (
              <div key={ev._id} 
                className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden hover:shadow-md transition group"
                onClick={() => isMobile && setSelectedEvent(ev)}
                style={{ cursor: isMobile ? 'pointer' : 'default' }}
              >
                {/* Image Header */}
                <div className={`relative overflow-hidden ${isMobile ? 'h-24' : 'h-40'}`}>
                  {imageSrc ? (
                    <img src={imageSrc} alt={ev.title} className="w-full h-full object-cover group-hover:scale-105 transition duration-300" />
                  ) : (
                    <div className="w-full h-full bg-gray-200 flex items-center justify-center">
                      <span className="text-gray-500 text-sm">No Image</span>
                    </div>
                  )}
                  {/* Status Badge */}
                  <span className={`absolute top-1 right-1 rounded-full font-medium ${status.className}`}
                    style={{ fontSize: isMobile ? '7px' : '11px', padding: isMobile ? '1px 4px' : '3px 8px' }}>
                    {status.label}
                  </span>
                  {/* Event Type Badge */}
                  <span className={`absolute rounded-full font-medium ${type.className}`}
                    style={{ fontSize: isMobile ? '7px' : '11px', padding: isMobile ? '1px 4px' : '3px 8px', top: isMobile ? '1px' : '8px', left: isMobile ? '1px' : '8px' }}>
                    {isMobile ? type.label : `${type.icon} ${type.label}`}
                  </span>
                </div>

                {/* Card Body */}
                <div className={isMobile ? "p-2" : "p-4 space-y-3"}>
                  {/* Title */}
                  <h3 className="font-semibold text-gray-900 truncate" style={{ fontSize: isMobile ? '11px' : '14px' }} title={ev.title}>{ev.title}</h3>

                  {/* Category */}
                  <div className="flex items-center gap-1 mt-1">
                    <span style={{ fontSize: isMobile ? '9px' : '12px' }} className="px-1.5 py-0.5 bg-blue-50 text-blue-600 rounded truncate max-w-full">
                      {ev.category || "Uncategorized"}
                    </span>
                  </div>

                  {/* Price */}
                  <div className="flex items-center gap-1 mt-1">
                    <FaTag className="text-amber-600 flex-shrink-0" style={{ fontSize: isMobile ? '9px' : '12px' }} />
                    <span className="font-bold text-amber-600 truncate" style={{ fontSize: isMobile ? '11px' : '16px' }}>{formatPrice(ev.price)}</span>
                  </div>

                  {/* Details — hide on mobile */}
                  {!isMobile && (
                    <div className="space-y-1 text-sm text-gray-600">
                      {ev.date && (
                        <div className="flex items-center gap-2">
                          <FaCalendarAlt className="text-gray-400 text-xs" />
                          <span>{new Date(ev.date).toLocaleDateString('en-IN')}</span>
                          {ev.time && <span>at {ev.time}</span>}
                        </div>
                      )}
                      {ev.location && (
                        <div className="flex items-center gap-2">
                          <FaMapMarkerAlt className="text-gray-400 text-xs" />
                          <span className="truncate">{ev.location}</span>
                        </div>
                      )}
                      {ev.createdBy?.name && (
                        <div className="flex items-center gap-2">
                          <FaUser className="text-gray-400 text-xs" />
                          <span>by {ev.createdBy.name}</span>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Addons/Tickets/ID — desktop only */}
                  {!isMobile && ev.addons && ev.addons.length > 0 && (
                    <div className="flex flex-wrap gap-1 pt-2 border-t">
                      {ev.addons.slice(0, 2).map((addon, idx) => (
                        <span key={idx} className="px-2 py-0.5 bg-amber-50 text-amber-700 rounded text-xs">
                          {addon.name}
                        </span>
                      ))}
                      {ev.addons.length > 2 && (
                        <span className="px-2 py-0.5 text-gray-500 text-xs">+{ev.addons.length - 2}</span>
                      )}
                    </div>
                  )}

                  {!isMobile && ev.eventType === "ticketed" && ev.ticketTypes && ev.ticketTypes.length > 0 && (
                    <div className="pt-2 border-t">
                      <p className="text-xs text-gray-500 mb-1">Ticket Types:</p>
                      <div className="flex flex-wrap gap-1">
                        {ev.ticketTypes.map((t, idx) => (
                          <span key={idx} className="px-2 py-0.5 bg-purple-50 text-purple-700 rounded text-xs">
                            {t.name}: {formatPrice(t.price)}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {!isMobile && (
                    <div className="pt-3 border-t text-xs text-gray-400">
                      Event ID: {ev._id?.slice(-8).toUpperCase()}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
      {/* Mobile Event Detail Modal */}
      {selectedEvent && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 99999, backgroundColor: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'flex-end' }}
          onClick={() => setSelectedEvent(null)}>
          <div style={{ backgroundColor: 'white', borderRadius: '20px 20px 0 0', width: '100%', maxHeight: '85vh', overflowY: 'auto', padding: '20px' }}
            onClick={e => e.stopPropagation()}>
            {/* Handle bar */}
            <div style={{ width: 40, height: 4, backgroundColor: '#d1d5db', borderRadius: 2, margin: '0 auto 16px' }} />
            {/* Image */}
            {selectedEvent.images?.[0]?.url && (
              <img src={selectedEvent.images[0].url} alt={selectedEvent.title}
                style={{ width: '100%', height: 180, objectFit: 'cover', borderRadius: 12, marginBottom: 16 }} />
            )}
            {/* Badges */}
            <div style={{ display: 'flex', gap: 8, marginBottom: 12, flexWrap: 'wrap' }}>
              <span style={{ padding: '3px 10px', borderRadius: 20, fontSize: 11, fontWeight: 600, backgroundColor: '#ede9fe', color: '#7c3aed' }}>
                {getEventTypeBadge(selectedEvent.eventType).icon} {getEventTypeBadge(selectedEvent.eventType).label}
              </span>
              <span style={{ padding: '3px 10px', borderRadius: 20, fontSize: 11, fontWeight: 600, backgroundColor: '#dcfce7', color: '#16a34a' }}>
                {getStatusBadge(selectedEvent).label}
              </span>
            </div>
            {/* Title */}
            <h2 style={{ fontSize: 20, fontWeight: 700, color: '#1f2937', marginBottom: 4 }}>{selectedEvent.title}</h2>
            <span style={{ fontSize: 12, color: '#3b82f6', backgroundColor: '#eff6ff', padding: '2px 8px', borderRadius: 6 }}>{selectedEvent.category}</span>
            {/* Description */}
            {selectedEvent.description && <p style={{ fontSize: 13, color: '#6b7280', marginTop: 12, lineHeight: 1.6 }}>{selectedEvent.description}</p>}
            {/* Price */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 12 }}>
              <FaTag style={{ color: '#d97706' }} />
              <span style={{ fontSize: 18, fontWeight: 700, color: '#d97706' }}>{formatPrice(selectedEvent.price)}</span>
            </div>
            {/* Details */}
            <div style={{ marginTop: 12, display: 'flex', flexDirection: 'column', gap: 6 }}>
              {selectedEvent.date && <div style={{ display: 'flex', gap: 8, fontSize: 13, color: '#374151' }}><FaCalendarAlt style={{ color: '#9ca3af', marginTop: 2 }} /><span>{new Date(selectedEvent.date).toLocaleDateString('en-IN')}{selectedEvent.time && ` at ${selectedEvent.time}`}</span></div>}
              {selectedEvent.location && <div style={{ display: 'flex', gap: 8, fontSize: 13, color: '#374151' }}><FaMapMarkerAlt style={{ color: '#9ca3af', marginTop: 2 }} /><span>{selectedEvent.location}</span></div>}
              {selectedEvent.createdBy?.name && <div style={{ display: 'flex', gap: 8, fontSize: 13, color: '#374151' }}><FaUser style={{ color: '#9ca3af', marginTop: 2 }} /><span>by {selectedEvent.createdBy.name}</span></div>}
            </div>
            {/* Ticket Types */}
            {selectedEvent.eventType === 'ticketed' && selectedEvent.ticketTypes?.length > 0 && (
              <div style={{ marginTop: 12, padding: 12, backgroundColor: '#faf5ff', borderRadius: 10 }}>
                <p style={{ fontSize: 12, fontWeight: 600, color: '#7c3aed', marginBottom: 8 }}>Ticket Types</p>
                {selectedEvent.ticketTypes.map((t, i) => (
                  <div key={i} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, color: '#374151', marginBottom: 4 }}>
                    <span>{t.name}</span><span style={{ fontWeight: 600 }}>{formatPrice(t.price)}</span>
                  </div>
                ))}
              </div>
            )}
            {/* Addons */}
            {selectedEvent.addons?.length > 0 && (
              <div style={{ marginTop: 12 }}>
                <p style={{ fontSize: 12, fontWeight: 600, color: '#92400e', marginBottom: 8 }}>Add-ons</p>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                  {selectedEvent.addons.map((a, i) => (
                    <span key={i} style={{ padding: '3px 10px', backgroundColor: '#fef3c7', color: '#92400e', borderRadius: 20, fontSize: 11 }}>{a.name}</span>
                  ))}
                </div>
              </div>
            )}
            {/* Event ID */}
            <p style={{ fontSize: 11, color: '#9ca3af', marginTop: 16 }}>Event ID: {selectedEvent._id?.slice(-8).toUpperCase()}</p>
            {/* Close */}
            <button onClick={() => setSelectedEvent(null)}
              style={{ width: '100%', marginTop: 16, padding: '12px', backgroundColor: '#1f2937', color: 'white', border: 'none', borderRadius: 10, fontSize: 14, fontWeight: 600, cursor: 'pointer' }}>
              Close
            </button>
          </div>
        </div>
      )}
      <style dangerouslySetInnerHTML={{ __html: `
        @media (max-width: 768px) {
          .admin-events-grid .p-4 { padding: 8px !important; }
          .admin-events-grid .space-y-3 > * + * { margin-top: 4px !important; }
          .admin-events-grid .line-clamp-2 { display: none !important; }
          .admin-events-grid .pt-2.border-t { display: none !important; }
          .admin-events-grid .pt-3.border-t { display: none !important; }
          .admin-events-grid .relative.h-40 { height: 90px !important; }
          .admin-events-grid h3 { font-size: 11px !important; line-height: 1.3 !important; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
          .admin-events-grid .flex.items-center.gap-2.mt-1 span { font-size: 9px !important; padding: 1px 4px !important; }
          .admin-events-grid .text-lg { font-size: 12px !important; }
          .admin-events-grid .space-y-1 { font-size: 10px !important; }
          .admin-events-grid .space-y-1 > div { gap: 3px !important; }
          .admin-events-grid .truncate { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; max-width: 70px !important; }
          .admin-events-grid [class*="absolute top-2"] { font-size: 8px !important; padding: 1px 4px !important; }
        }
      ` }} />
    </AdminLayout>
  );
};

export default AdminEvents;
