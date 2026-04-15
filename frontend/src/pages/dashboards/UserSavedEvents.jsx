import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import UserLayout from "../../components/user/UserLayout";
import useAuth from "../../context/useAuth";
import { API_BASE, authHeaders } from "../../lib/http";
import { BsBookmarkHeartFill, BsCalendar2Event } from "react-icons/bs";
import { FaMapMarkerAlt, FaTicketAlt } from "react-icons/fa";
import axios from "axios";
import toast from "react-hot-toast";

const getUserId = (user) => user?.userId || user?.id || user?._id || null;
const getSavedKey = (user) => {
  const id = getUserId(user);
  return id ? `savedEvents_${id}` : 'savedEvents';
};

const UserSavedEvents = () => {
  const navigate = useNavigate();
  const { user, token, loading: authLoading } = useAuth();
  const [savedEvents, setSavedEvents] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (authLoading) return;
    loadAndFetch();
  }, [authLoading, user]);

  const loadAndFetch = async () => {
    setLoading(true);
    try {
      const key = getSavedKey(user);

      // Migrate old shared key if needed
      const oldRaw = localStorage.getItem('savedEvents');
      if (oldRaw && key !== 'savedEvents') {
        const oldData = JSON.parse(oldRaw);
        if (oldData.length > 0) {
          const existing = localStorage.getItem(key);
          const existingData = existing ? JSON.parse(existing) : [];
          const existingIds = existingData.map(e => e._id || e);
          const toAdd = oldData.filter(e => !existingIds.includes(e._id || e));
          localStorage.setItem(key, JSON.stringify([...existingData, ...toAdd]));
          localStorage.removeItem('savedEvents');
        }
      }

      const raw = localStorage.getItem(key);
      if (!raw) { setSavedEvents([]); setLoading(false); return; }

      const stored = JSON.parse(raw);
      if (stored.length === 0) { setSavedEvents([]); setLoading(false); return; }

      // If stored objects already have titles, show them immediately
      const withTitles = stored.filter(e => e.title);
      if (withTitles.length > 0) setSavedEvents(withTitles);

      // Fetch all events and filter by saved IDs for fresh data
      const savedIds = stored.map(e => e._id || e).filter(Boolean);
      const res = await axios.get(`${API_BASE}/events`, { headers: authHeaders(token) });
      const allEvents = res.data?.events || [];
      const fresh = allEvents.filter(e => savedIds.includes(e._id));

      if (fresh.length > 0) {
        setSavedEvents(fresh);
        // Update localStorage with fresh data
        localStorage.setItem(key, JSON.stringify(fresh));
      }
    } catch (err) {
      console.error("Failed to fetch saved events:", err);
    } finally {
      setLoading(false);
    }
  };

  const removeEvent = (eventId) => {
    const key = getSavedKey(user);
    const updated = savedEvents.filter(e => e._id !== eventId);
    localStorage.setItem(key, JSON.stringify(updated));
    setSavedEvents(updated);
    toast.success("Event removed from saved");
  };

  const formatDate = (dateString) => {
    if (!dateString) return "Date TBD";
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric", month: "short", day: "numeric",
    });
  };

  const getEventImage = (event) => {
    if (event?.images?.length > 0) return event.images[0]?.url || event.images[0];
    if (event?.bannerImage?.url) return event.bannerImage.url;
    if (typeof event?.bannerImage === "string" && event.bannerImage) return event.bannerImage;
    if (event?.image?.trim()) return event.image;
    return "/party.jpg";
  };

  return (
    <UserLayout>
      <section className="mb-6">
        <h2 className="text-2xl md:text-3xl font-semibold">Saved Events</h2>
        <p className="text-gray-600 mt-1">Your bookmarked events</p>
      </section>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="animate-spin h-10 w-10 border-4 border-blue-500 border-t-transparent rounded-full" />
        </div>
      ) : savedEvents.length === 0 ? (
        <div className="bg-white rounded-xl p-12 text-center shadow-sm border">
          <BsBookmarkHeartFill className="mx-auto text-5xl text-gray-300 mb-4" />
          <p className="text-gray-500 text-lg">No saved events yet</p>
          <p className="text-gray-400 mt-2">Start saving events you're interested in!</p>
          <button onClick={() => navigate("/dashboard/user/browse")}
            className="mt-4 px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition">
            Browse Events
          </button>
        </div>
      ) : (
        <div className="event-cards-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '20px' }}>
          {savedEvents.map((event) => (
            <div key={event._id} className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden hover:shadow-md transition">
              <div className="relative h-40 overflow-hidden">
                <img src={getEventImage(event)} alt={event.title}
                  className="w-full h-full object-cover"
                  onError={e => { e.target.src = "/party.jpg"; }} />
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                <div className="absolute bottom-3 left-3 right-3">
                  <span className="inline-block px-2 py-1 bg-white/90 rounded text-xs font-medium text-gray-700 mb-1">
                    {event.category || "Event"}
                  </span>
                  <h3 className="text-white font-semibold text-lg truncate">{event.title}</h3>
                </div>
              </div>
              <div className="p-4">
                <div className="flex items-center gap-2 text-gray-600 text-sm mb-2">
                  <BsCalendar2Event className="text-blue-500" />
                  <span>{formatDate(event.date)}</span>
                </div>
                <div className="flex items-center gap-2 text-gray-600 text-sm mb-4">
                  <FaMapMarkerAlt className="text-red-500" />
                  <span className="truncate">{event.location || "Location TBD"}</span>
                </div>
                <div className="flex gap-2">
                  <button onClick={() => navigate(`/dashboard/user/events/${event._id}`)}
                    className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition">
                    <FaTicketAlt /> Book Now
                  </button>
                  <button onClick={() => removeEvent(event._id)}
                    className="px-3 py-2 border border-red-300 text-red-600 rounded-lg hover:bg-red-50 transition"
                    title="Remove from saved">
                    <BsBookmarkHeartFill />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </UserLayout>
  );
};

export default UserSavedEvents;
