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

        // Ticketed events: must have a future date
        const ticketed = events
          .filter((e) => e.eventType === "ticketed" && e.date && new Date(e.date) >= now)
          .sort((a, b) => new Date(a.date) - new Date(b.date));

        // Full-service events: no fixed date, always "available"
        const fullService = events
          .filter((e) => e.eventType !== "ticketed" && e.status !== "inactive");

        // Merge: ticketed first, then full-service, take up to 3
        const upcoming = [...ticketed, ...fullService].slice(0, 3);
        setItems(upcoming);
      })
      .catch(() => {});
  }, []);

  // After login redirect: auto-open booking modal for the saved event
  useEffect(() => {
    const pendingBooking = localStorage.getItem("pendingBooking");
    if (!pendingBooking || !token || items.length === 0) return;

    try {
      const { id } = JSON.parse(pendingBooking);
      const ev = items.find(e => e._id === id);
      if (ev) {
        localStorage.removeItem("pendingBooking");
        setBookingEvent(ev);
        toast.success(`Welcome back! Continue booking: ${ev.title}`);
      }
    } catch (error) {
      console.error('Error parsing pending booking:', error);
      localStorage.removeItem("pendingBooking");
    }
  }, [token, items]);

  const handleViewDetails = (ev) => {
    setDetailsEvent(ev);
  };

  if (items.length === 0) return null;

  return (
    <>
      <section className="upcoming-events">
        <div className="container">
          <div className="section-header">
            <h2>UPCOMING EVENTS</h2>
            <a
              href="/services"
              style={{ fontSize: 14, color: "#1f2937", fontWeight: 600, textDecoration: "none", cursor: "pointer", alignSelf: "flex-end", paddingBottom: 4 }}
            >
              View All
            </a>
          </div>
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
                  <p>{e.eventType === "ticketed" && e.date ? new Date(e.date).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" }) : ""}</p>
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
          onBookNow={(ev) => {
            // Check if user is logged in
            if (token) {
              // User is logged in - close details modal and open booking modal
              setDetailsEvent(null);
              setBookingEvent(ev || detailsEvent);
            }
            // If not logged in, EventDetailsModal will handle showing login modal
          }}
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
          onSuccess={() => {
            setBookingEvent(null);
            toast.success("Booking successful!");
          }}
        />
      )}
    </>
  );
};

export default UpcomingEvents;
