import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { API_BASE } from "../../lib/http";
import EventDetailsModal from "../EventDetailsModal";
import BookingModal from "../BookingModal";
import useAuth from "../../context/useAuth";
import toast from "react-hot-toast";

const UpcomingEvents = () => {
  const [items, setItems] = useState([]);
  const [detailsEvent, setDetailsEvent] = useState(null);
  const [bookingEvent, setBookingEvent] = useState(null);
  const { token } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    axios.get(`${API_BASE}/events`)
      .then((res) => {
        const events = res.data.events || [];
        const now = new Date();
        const upcoming = events
          .filter((e) => e.date && new Date(e.date) >= now)
          .sort((a, b) => new Date(a.date) - new Date(b.date))
          .slice(0, 3);
        setItems(upcoming);
      })
      .catch(() => {});
  }, []);

  // After login redirect: auto-open booking modal for the saved event
  useEffect(() => {
    const redirect = localStorage.getItem("home_booking_redirect");
    if (!redirect || !token || items.length === 0) return;

    const ev = items.find(e => e._id === redirect);
    if (ev) {
      localStorage.removeItem("home_booking_redirect");
      setBookingEvent(ev);
    }
  }, [token, items]);

  const handleViewDetails = (ev) => {
    setDetailsEvent(ev);
  };

  const handleBookNow = (ev) => {
    if (!token) {
      // Save intent and redirect to login
      localStorage.setItem("home_booking_redirect", ev._id);
      navigate("/login", { state: { from: "/" } });
      return;
    }
    setDetailsEvent(null);
    setBookingEvent(ev);
  };

  if (items.length === 0) return null;

  return (
    <>
      <section className="upcoming-events">
        <div className="container">
          <h2>UPCOMING EVENTS</h2>
          <div className="banner">
            {items.map((e) => (
              <div key={e._id} className="item">
                <img
                  src={e.image || e.images?.[0]?.url || "/party.jpg"}
                  alt={e.title}
                  onError={(ev) => { ev.target.src = "/party.jpg"; }}
                />
                <div className="content">
                  <h3>{e.title}</h3>
                  <p>{e.date ? new Date(e.date).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" }) : ""}</p>
                  <p>{e.location || ""}</p>
                  <button
                    onClick={() => handleViewDetails(e)}
                    style={{
                      display: "inline-block",
                      padding: "8px 18px",
                      background: "#1f2937",
                      color: "#fff",
                      border: "none",
                      borderRadius: 6,
                      cursor: "pointer",
                      fontWeight: 600,
                      fontSize: 13,
                    }}
                  >
                    View Details
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Event Details Modal */}
      {detailsEvent && (
        <EventDetailsModal
          isOpen={!!detailsEvent}
          onClose={() => setDetailsEvent(null)}
          event={detailsEvent}
          onBookNow={(ev) => handleBookNow(ev || detailsEvent)}
        />
      )}

      {/* Booking Modal */}
      {bookingEvent && (
        <BookingModal
          isOpen={!!bookingEvent}
          onClose={() => setBookingEvent(null)}
          service={{
            _id: bookingEvent._id,
            title: bookingEvent.title,
            category: bookingEvent.category,
            price: bookingEvent.price,
            location: bookingEvent.location,
            images: bookingEvent.images,
            eventType: bookingEvent.eventType,
            ticketTypes: bookingEvent.ticketTypes,
            addons: bookingEvent.addons,
          }}
          coupons={bookingEvent.coupons || []}
          onBookingSuccess={() => {
            setBookingEvent(null);
            toast.success("Booking successful!");
          }}
        />
      )}
    </>
  );
};

export default UpcomingEvents;
