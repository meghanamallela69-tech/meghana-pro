import { useState, useEffect } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import UserLayout from "../../components/user/UserLayout";
import useAuth from "../../context/useAuth";
import { API_BASE, authHeaders } from "../../lib/http";
import { FiSearch, FiCalendar, FiMapPin } from "react-icons/fi";
import { BsFilter, BsBookmarkHeart, BsBookmarkHeartFill } from "react-icons/bs";
import toast from "react-hot-toast";
import BookingModal from "../../components/BookingModal";
import EventDetailsModal from "../../components/EventDetailsModal";
import { getEventStatus } from "../../lib/utils";

const UserBrowseEvents = () => {
  const { token, user } = useAuth();
  const navigate = useNavigate();
  const [events, setEvents] = useState([]);
  const [filteredEvents, setFilteredEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [dateFilter, setDateFilter] = useState("all");
  const [savedEvents, setSavedEvents] = useState([]);
  const [bookingModalOpen, setBookingModalOpen] = useState(false);
  const [detailsModalOpen, setDetailsModalOpen] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState(null);

  const categories = ["all", "Conference", "Music", "Food", "Tech", "Wedding", "Party", "Outdoor"];

  const getUserId = (u) => u?.userId || u?.id || u?._id || null;
  const savedKey = getUserId(user) ? `savedEvents_${getUserId(user)}` : 'savedEvents';

  useEffect(() => {
    fetchEvents();
  }, []);

  useEffect(() => {
    loadSavedEvents();
  }, [user]);

  const loadSavedEvents = () => {
    const id = getUserId(user);
    const key = id ? `savedEvents_${id}` : 'savedEvents';
    const saved = localStorage.getItem(key);
    setSavedEvents(saved ? JSON.parse(saved) : []);
  };

  const toggleSaveEvent = (event) => {
    const id = getUserId(user);
    const key = id ? `savedEvents_${id}` : 'savedEvents';
    let updatedSaved = [...savedEvents];
    const isSaved = savedEvents.some(e => e._id === event._id);
    if (isSaved) {
      updatedSaved = updatedSaved.filter(e => e._id !== event._id);
      toast.success("Event removed from saved");
    } else {
      updatedSaved.push(event);
      toast.success("Event saved!");
    }
    localStorage.setItem(key, JSON.stringify(updatedSaved));
    setSavedEvents(updatedSaved);
  };

  const isEventSaved = (eventId) => savedEvents.some(e => e._id === eventId);

  useEffect(() => {
    filterEvents();
  }, [searchTerm, categoryFilter, dateFilter, events]);

  // Check for booking redirect on mount (both old and new format)
  useEffect(() => {
    console.log('🔍 UserBrowseEvents - Checking for pending booking...');
    
    // New format: pendingBooking
    const pendingBooking = localStorage.getItem('pendingBooking');
    console.log('   pendingBooking:', pendingBooking);
    console.log('   events.length:', events.length);
    
    if (pendingBooking && events.length > 0) {
      try {
        const { id, type } = JSON.parse(pendingBooking);
        console.log('✅ Found pendingBooking - ID:', id, 'Type:', type);
        localStorage.removeItem('pendingBooking');
        
        // Find the event
        const eventToBook = events.find(e => e._id === id);
        console.log('   Event found:', !!eventToBook, eventToBook?.title);
        
        if (eventToBook) {
          toast.success(`Welcome back! Continue booking: ${eventToBook.title}`);
          setSelectedEvent(eventToBook);
          setBookingModalOpen(true);
          console.log('✅ Booking modal opened for:', eventToBook.title);
        } else {
          console.warn('⚠️ Event not found in events list');
        }
      } catch (error) {
        console.error('❌ Error parsing pending booking:', error);
        localStorage.removeItem('pendingBooking');
      }
      return;
    }
    
    // Old format: bookingRedirect
    const bookingRedirect = localStorage.getItem('bookingRedirect');
    if (bookingRedirect) {
      try {
        const { eventId, eventTitle } = JSON.parse(bookingRedirect);
        
        // Clear the redirect immediately to prevent loops
        localStorage.removeItem('bookingRedirect');
        
        // Show message about redirect
        toast.success(`Welcome back! Continue booking: ${eventTitle}`);
        
        // Find and select the event
        const eventToBook = events.find(e => e._id === eventId);
        if (eventToBook) {
          setSelectedEvent(eventToBook);
          setBookingModalOpen(true);
        } else {
          // Event not loaded yet, will be handled when events load
          console.log('Event not in current list, waiting for events to load...');
        }
      } catch (error) {
        console.error('Error parsing booking redirect:', error);
        localStorage.removeItem('bookingRedirect');
      }
    }
  }, [events]);

  const fetchEvents = async () => {
    try {
      // Add cache-busting timestamp to force fresh data
      const timestamp = new Date().getTime();
      const response = await axios.get(`${API_BASE}/events?t=${timestamp}`, {
        headers: authHeaders(token),
      });
      if (response.data.success) {
        console.log('✅ Events fetched with dynamic availability:', response.data.events.length);
        setEvents(response.data.events);
        setFilteredEvents(response.data.events);
      }
    } catch (error) {
      console.error('Failed to load events:', error);
      toast.error("Failed to load events");
    } finally {
      setLoading(false);
    }
  };

  const filterEvents = () => {
    let filtered = [...events];

    // Search filter
    if (searchTerm) {
      filtered = filtered.filter(
        (event) =>
          event.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          event.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          event.location?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Category filter
    if (categoryFilter !== "all") {
      filtered = filtered.filter(
        (event) => event.category?.toLowerCase() === categoryFilter.toLowerCase()
      );
    }

    // Date filter
    if (dateFilter !== "all") {
      const today = new Date();
      const eventDate = new Date();
      
      filtered = filtered.filter((event) => {
        const eventDateObj = new Date(event.date);
        if (dateFilter === "today") {
          return eventDateObj.toDateString() === today.toDateString();
        } else if (dateFilter === "week") {
          const weekFromNow = new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000);
          return eventDateObj >= today && eventDateObj <= weekFromNow;
        } else if (dateFilter === "month") {
          return (
            eventDateObj.getMonth() === today.getMonth() &&
            eventDateObj.getFullYear() === today.getFullYear()
          );
        }
        return true;
      });
    }

    setFilteredEvents(filtered);
  };

  const handleViewDetails = (event) => {
    setSelectedEvent(event);
    setDetailsModalOpen(true);
  };

  const handleBookNow = (event) => {
    console.log('🔵 Book Now clicked on Browse Events - Event:', event.title, 'ID:', event._id, 'Type:', event.eventType);
    
    // Check if user is logged in using auth context
    if (!token) {
      // User not logged in - redirect to login with event ID for redirect
      toast.success("Please login to book this event");
      
      // Store event ID and type for redirect after login
      localStorage.setItem('bookingEventId', event._id);
      localStorage.setItem('bookingEventType', event.eventType || "full-service");
      console.log('💾 Saved bookingEventId:', event._id, 'bookingEventType:', event.eventType || "full-service");
      
      // Redirect to login page
      navigate('/login');
      return;
    }
    
    // User is logged in - open booking modal directly
    console.log('✅ User logged in - opening booking modal');
    setSelectedEvent(event);
    setBookingModalOpen(true);
  };

  const handleBookingSuccess = () => {
    setBookingModalOpen(false);
    setSelectedEvent(null);
    toast.success("Booking successful!");
  };

  const formatDate = (dateString) => {
    if (!dateString) return "Date TBD";
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  return (
    <UserLayout>
      <section className="mb-6">
        <div className="flex justify-between items-center">
          <div>
            <h2 className="text-2xl md:text-3xl font-semibold">Browse Events</h2>
            <p className="text-gray-600 mt-1">Discover and book amazing events near you</p>
          </div>
        </div>
      </section>

      {/* Search and Filters */}
      <section className="bg-white rounded-xl shadow-sm p-4 mb-6">
        <div className="flex flex-col md:flex-row gap-4">
          {/* Search */}
          <div className="flex-1 relative">
            <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Search events by name, description, or location..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Category Filter */}
          <div className="flex items-center gap-2">
            <BsFilter className="text-gray-500" />
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {categories.map((cat) => (
                <option key={cat} value={cat}>
                  {cat === "all" ? "All Categories" : cat}
                </option>
              ))}
            </select>
          </div>

          {/* Date Filter */}
          <div className="flex items-center gap-2">
            <FiCalendar className="text-gray-500" />
            <select
              value={dateFilter}
              onChange={(e) => setDateFilter(e.target.value)}
              className="px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">Any Date</option>
              <option value="today">Today</option>
              <option value="week">This Week</option>
              <option value="month">This Month</option>
            </select>
          </div>
        </div>
      </section>

      {/* Results Count */}
      <section className="mb-4">
        <p className="text-gray-600">
          Showing <span className="font-semibold">{filteredEvents.length}</span> events
        </p>
      </section>

      {/* Events Grid */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      ) : filteredEvents.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-xl">
          <p className="text-gray-500 text-lg">No events found matching your criteria</p>
          <button
            onClick={() => {
              setSearchTerm("");
              setCategoryFilter("all");
              setDateFilter("all");
            }}
            className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
          >
            Clear Filters
          </button>
        </div>
      ) : (
        <section className="event-cards-grid" style={{ 
          display: 'grid', 
          gridTemplateColumns: 'repeat(4, 1fr)', 
          gap: '24px' 
        }}>
          {filteredEvents.map((event) => {
            const eventStatus = getEventStatus(event);
            const isCompleted = eventStatus.label === 'Completed';
            return (
            <article key={event._id} style={{
              backgroundColor: 'white',
              borderRadius: '16px',
              overflow: 'hidden',
              boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
              transition: 'all 0.3s ease',
              display: 'flex',
              flexDirection: 'column',
              opacity: isCompleted ? 0.75 : 1,
            }} className="event-card">
              <div style={{ 
                position: 'relative', 
                width: '100%', 
                height: '180px',
                overflow: 'hidden'
              }}>
                {/* Show only merchant-uploaded images */}
                {(() => {
                  const getMerchantImage = (ev) => {
                    // Priority: images[0].url -> image -> bannerImage
                    if (ev?.images && ev.images.length > 0 && ev.images[0]?.url) {
                      return ev.images[0].url;
                    }
                    if (ev?.image && ev.image.trim() !== "") {
                      return ev.image;
                    }
                    if (ev?.bannerImage && ev.bannerImage.trim() !== "") {
                      return ev.bannerImage;
                    }
                    return null;
                  };
                  const imageUrl = getMerchantImage(event);
                  return imageUrl ? (
                    <img 
                      src={imageUrl} 
                      alt={event.title} 
                      style={{
                        width: '100%',
                        height: '100%',
                        objectFit: 'cover'
                      }}
                    />
                  ) : (
                    <div style={{
                      width: '100%',
                      height: '100%',
                      backgroundColor: '#f3f4f6',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: '#9ca3af'
                    }}>
                      <span>No Image</span>
                    </div>
                  );
                })()}
                <div style={{
                  position: 'absolute',
                  top: '12px',
                  left: '12px',
                  backgroundColor: '#a2783a',
                  color: 'white',
                  padding: '4px 12px',
                  borderRadius: '20px',
                  fontSize: '12px',
                  fontWeight: '500'
                }}>
                  {event.category || "Event"}
                </div>
                {/* Status badge — only for ticketed events with a date */}
                {event.eventType === 'ticketed' && event.date && (() => {
                  const s = getEventStatus(event);
                  const colorMap = {
                    Completed: { bg: "#4b5563", color: "#fff" },
                    Live: { bg: "#16a34a", color: "#fff" },
                    Upcoming: { bg: "#2563eb", color: "#fff" },
                  };
                  const c = colorMap[s.label] || { bg: "#4b5563", color: "#fff" };
                  return (
                    <div style={{
                      position: 'absolute', bottom: '12px', left: '12px',
                      backgroundColor: c.bg, color: c.color,
                      padding: '3px 10px', borderRadius: '20px',
                      fontSize: '11px', fontWeight: '600'
                    }}>
                      {s.label}
                    </div>
                  );
                })()}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    toggleSaveEvent(event);
                  }}
                  style={{
                    position: 'absolute',
                    top: '12px',
                    right: '12px',
                    backgroundColor: 'rgba(255,255,255,0.9)',
                    border: 'none',
                    borderRadius: '50%',
                    width: '36px',
                    height: '36px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'pointer',
                    transition: 'all 0.2s'
                  }}
                  title={isEventSaved(event._id) ? "Remove from saved" : "Save event"}
                >
                  {isEventSaved(event._id) ? (
                    <BsBookmarkHeartFill style={{ color: '#ec4899', fontSize: '18px' }} />
                  ) : (
                    <BsBookmarkHeart style={{ color: '#6b7280', fontSize: '18px' }} />
                  )}
                </button>
              </div>
              <div style={{ padding: '20px', flex: 1, display: 'flex', flexDirection: 'column' }}>
                <h3 style={{ 
                  fontSize: '18px', 
                  fontWeight: '600', 
                  marginBottom: '8px',
                  color: '#1f2937'
                }}>{event.title}</h3>
                {/* Only show date for non-full-service events */}
                {(!event.eventType || (event.eventType !== 'fullService' && event.eventType !== 'full-service')) && (
                  <div className="event-card-meta" style={{ 
                    display: 'flex', 
                    alignItems: 'center', 
                    gap: '6px',
                    marginBottom: '8px',
                    color: '#6b7280',
                    fontSize: '14px'
                  }}>
                    <FiCalendar />
                    {formatDate(event.date)}
                  </div>
                )}
                <div className="event-card-meta" style={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  gap: '6px',
                  marginBottom: '16px',
                  color: '#6b7280',
                  fontSize: '14px'
                }}>
                  <FiMapPin />
                  {event.location || "Location TBD"}
                </div>
                
                {/* Show ticket availability for ticketed events — moved to View Details modal */}

                <div className="event-card-actions" style={{ display: 'flex', gap: '8px', marginTop: '12px' }}>
                  <button 
                    onClick={() => handleViewDetails(event)}
                    style={{
                      flex: 1,
                      padding: '14px 18px',
                      backgroundColor: 'white',
                      color: '#a2783a',
                      textAlign: 'center',
                      borderRadius: '10px',
                      fontWeight: '700',
                      fontSize: '15px',
                      transition: 'all 0.3s',
                      border: '2px solid #a2783a',
                      cursor: 'pointer',
                      boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
                      textTransform: 'uppercase',
                      letterSpacing: '0.5px'
                    }}
                    onMouseEnter={(e) => {
                      e.target.style.backgroundColor = '#a2783a';
                      e.target.style.color = 'white';
                      e.target.style.transform = 'translateY(-2px)';
                      e.target.style.boxShadow = '0 4px 12px rgba(162, 120, 58, 0.3)';
                    }}
                    onMouseLeave={(e) => {
                      e.target.style.backgroundColor = 'white';
                      e.target.style.color = '#a2783a';
                      e.target.style.transform = 'translateY(0)';
                      e.target.style.boxShadow = '0 2px 4px rgba(0,0,0,0.1)';
                    }}
                  >
                    View Details
                  </button>
                  {(() => {
                    const s = getEventStatus(event);
                    const isCompleted = s.label === 'Completed';
                    return isCompleted ? (
                      <div style={{
                        flex: 1,
                        padding: '14px 18px',
                        backgroundColor: '#f3f4f6',
                        color: '#9ca3af',
                        textAlign: 'center',
                        borderRadius: '10px',
                        fontWeight: '700',
                        fontSize: '13px',
                        border: '2px solid #e5e7eb',
                        textTransform: 'uppercase',
                        letterSpacing: '0.5px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '6px'
                      }}>
                        <span>🚫</span> Not Available
                      </div>
                    ) : (
                      <button 
                        onClick={() => handleBookNow(event)}
                        style={{
                          flex: 1,
                          padding: '14px 18px',
                          backgroundColor: '#a2783a',
                          color: 'white',
                          textAlign: 'center',
                          borderRadius: '10px',
                          fontWeight: '700',
                          fontSize: '15px',
                          transition: 'all 0.3s',
                          border: '2px solid #a2783a',
                          cursor: 'pointer',
                          boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
                          textTransform: 'uppercase',
                          letterSpacing: '0.5px'
                        }}
                        onMouseEnter={(e) => {
                          e.target.style.backgroundColor = '#8b6a30';
                          e.target.style.borderColor = '#8b6a30';
                          e.target.style.transform = 'translateY(-2px)';
                          e.target.style.boxShadow = '0 4px 12px rgba(162, 120, 58, 0.4)';
                        }}
                        onMouseLeave={(e) => {
                          e.target.style.backgroundColor = '#a2783a';
                          e.target.style.borderColor = '#a2783a';
                          e.target.style.transform = 'translateY(0)';
                          e.target.style.boxShadow = '0 2px 4px rgba(0,0,0,0.1)';
                        }}
                      >
                        Book Now
                      </button>
                    );
                  })()}
                </div>
              </div>
            </article>
            );
          })}
        </section>
      )}

      {/* Booking Modal */}
      {bookingModalOpen && selectedEvent && (
        <BookingModal
          isOpen={bookingModalOpen}
          onClose={() => {
            setBookingModalOpen(false);
            setSelectedEvent(null);
          }}
          service={{
            _id: selectedEvent._id,
            title: selectedEvent.title,
            category: selectedEvent.category,
            price: selectedEvent.price,
            location: selectedEvent.location,
            images: selectedEvent.images,
            eventType: selectedEvent.eventType,
            ticketTypes: selectedEvent.ticketTypes,
            addons: selectedEvent.addons
          }}
          coupons={selectedEvent.coupons || []}
          onSuccess={handleBookingSuccess}
        />
      )}

      {/* Event Details Modal */}
      {detailsModalOpen && selectedEvent && (
        <EventDetailsModal
          isOpen={detailsModalOpen}
          onClose={() => {
            setDetailsModalOpen(false);
            setSelectedEvent(null);
          }}
          event={selectedEvent}
          onBookNow={(event) => {
            setDetailsModalOpen(false);
            handleBookNow(event);
          }}
        />
      )}
    </UserLayout>
  );
};

export default UserBrowseEvents;
