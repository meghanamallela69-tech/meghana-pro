import React, { useState } from "react";
import PropTypes from "prop-types";
import { FaTimes, FaMapMarkerAlt, FaUser, FaCheck, FaPlusCircle, FaCalendarAlt, FaClock } from "react-icons/fa";
import { getEventStatus } from "../lib/utils";

const EventDetailsModal = ({ isOpen, onClose, event, onBookNow }) => {

  if (!isOpen || !event) return null;

  const status = getEventStatus(event);
  const eventImages = event.images && event.images.length > 0 
    ? event.images.map(img => img.url) 
    : ["/party.jpg"]; // Fallback image

  // Handle Book Now click
  const handleBookNowClick = () => {
    const token = localStorage.getItem("token");
    console.log('🔵 Book Now clicked - Token:', !!token, 'Event ID:', event._id, 'Event Type:', event.eventType);
    
    if (!token) {
      // Save event ID and type, then redirect to login
      localStorage.setItem("bookingEventId", event._id);
      localStorage.setItem("bookingEventType", event.eventType || "full-service");
      console.log('💾 Saved to localStorage - bookingEventId:', event._id, 'bookingEventType:', event.eventType || "full-service");
      window.location.href = `/login?redirect=booking`;
    } else {
      console.log('✅ User logged in - calling onBookNow');
      onBookNow(event);
    }
  };

  // Default features if not provided
  const defaultFeatures = [
    "Professional Photography",
    "Catering & Refreshments", 
    "Live Entertainment",
    "Decoration & Setup",
    "Sound & Lighting",
    "Event Coordinator"
  ];

  const features = event.features && event.features.length > 0 ? event.features : defaultFeatures;

  // Check if we're in a dashboard layout (has sidebar) or regular page layout
  const isDashboardLayout = window.location.pathname.includes('/dashboard/');
  
  return (
    <>
      {/* Full screen overlay to completely hide all page content including sidebar and navbar */}
      <div
        style={{
          position: "fixed",
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: "rgba(0, 0, 0, 0.8)",
          zIndex: 9999, // Very high z-index to cover everything
        }}
        onClick={onClose}
      />
      
      {/* Modal positioned as full screen */}
      <div
        style={{
          position: "fixed",
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: "white",
          zIndex: 10000, // Higher than overlay
          overflow: "hidden",
          display: "flex",
          flexDirection: "column"
        }}
      >
        {/* Custom Modal Header with Close Button */}
        <div style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          padding: "16px 24px",
          borderBottom: "1px solid #e5e7eb",
          backgroundColor: "#f8fafc"
        }}>
          <h1 style={{
            fontSize: "24px",
            fontWeight: "700",
            color: "#1f2937"
          }}>
            {event.title}
          </h1>
          <button
            onClick={onClose}
            style={{
              background: "#ef4444",
              border: "none",
              borderRadius: "50%",
              width: "40px",
              height: "40px",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "white",
              fontSize: "18px",
              fontWeight: "bold"
            }}
          >
            ✕
          </button>
        </div>
      {/* Modal Content - Full Height with flex layout */}
      <div style={{ flex: 1, display: "flex", overflow: "hidden" }}>
        
        {/* LEFT SIDE - Image Gallery */}
        <div style={{ 
          width: "50%", // Fixed 50% width
          backgroundColor: "#f8fafc",
          display: "flex",
          flexDirection: "column",
          position: "relative"
        }}>
          {/* Main Banner Image - 50% height */}
          <div style={{ 
            height: "50%", // Reduced from 60% to 50%
            position: "relative",
            overflow: "hidden"
          }}>
            <img 
              src={eventImages[0]} 
              alt={event.title}
              style={{
                width: "100%",
                height: "100%",
                objectFit: "cover"
              }}
            />
            {/* Overlay with Event Info */}
            <div style={{
              position: "absolute",
              bottom: 0,
              left: 0,
              right: 0,
              background: "linear-gradient(transparent, rgba(0,0,0,0.8))",
              padding: "30px 20px 20px",
              color: "white"
            }}>
              <div style={{
                display: "inline-flex",
                alignItems: "center",
                padding: "6px 12px",
                borderRadius: "20px",
                fontSize: "12px",
                fontWeight: "600",
                marginBottom: "12px",
                backgroundColor: status.label === 'Completed' ? '#6b7280' :
                                status.label === 'Live' ? '#10b981' : '#f59e0b',
                color: "white"
              }}>
                {status.label}
              </div>
              <p style={{ 
                fontSize: "16px", 
                opacity: 0.9,
                marginBottom: "12px"
              }}>
                {event.category} • {event.location}
              </p>
            </div>
          </div>

          {/* Image Gallery Thumbnails - 50% height */}
          <div style={{ 
            height: "50%", // Increased from 40% to 50%
            padding: "24px",
            backgroundColor: "white",
            borderTop: "1px solid #e5e7eb",
            overflow: "hidden"
          }}>
            <h3 style={{ 
              fontSize: "18px", 
              fontWeight: "600", 
              marginBottom: "16px",
              color: "#374151"
            }}>
              Event Gallery
            </h3>
            {eventImages.length > 0 ? (
              <div style={{ 
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(120px, 1fr))",
                gap: "16px",
                height: "calc(100% - 50px)",
                overflowY: "auto"
              }}>
                {eventImages.map((image, index) => (
                  <img
                    key={index}
                    src={image}
                    alt={`${event.title} ${index + 1}`}
                    style={{
                      width: "100%",
                      height: "140px", // Increased from 120px to 140px
                      objectFit: "cover",
                      borderRadius: "12px",
                      cursor: "pointer",
                      border: "3px solid transparent",
                      transition: "all 0.3s ease",
                      boxShadow: "0 2px 8px rgba(0,0,0,0.1)"
                    }}
                    onMouseEnter={(e) => {
                      e.target.style.borderColor = "#a2783a";
                      e.target.style.transform = "scale(1.05)";
                      e.target.style.boxShadow = "0 4px 16px rgba(0,0,0,0.2)";
                    }}
                    onMouseLeave={(e) => {
                      e.target.style.borderColor = "transparent";
                      e.target.style.transform = "scale(1)";
                      e.target.style.boxShadow = "0 2px 8px rgba(0,0,0,0.1)";
                    }}
                  />
                ))}
              </div>
            ) : (
              <div style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                height: "calc(100% - 50px)",
                color: "#9ca3af",
                fontSize: "14px"
              }}>
                No additional images available
              </div>
            )}
          </div>
        </div>

        {/* RIGHT SIDE - Event Details */}
        <div style={{ 
          width: "50%", // Fixed 50% width
          backgroundColor: "white",
          display: "flex",
          flexDirection: "column",
          borderLeft: "1px solid #e5e7eb"
        }}>
          {/* Details Header */}
          <div style={{
            padding: "20px 32px",
            borderBottom: "1px solid #e5e7eb",
            backgroundColor: "#fafafa"
          }}>
            <h2 style={{ 
              fontSize: "20px", 
              fontWeight: "700", 
              color: "#1f2937",
              marginBottom: "4px"
            }}>
              Event Details
            </h2>
            <p style={{ 
              color: "#6b7280", 
              fontSize: "14px" 
            }}>
              Complete information about this event
            </p>
          </div>

          {/* Details Container */}
          <div style={{ 
            flex: "1", 
            overflowY: "auto",
            padding: "32px"
          }}>
            {/* Description */}
            <div style={{ marginBottom: "32px" }}>
              <h3 style={{ fontSize: "18px", fontWeight: "600", marginBottom: "12px", color: "#374151" }}>
                About This Event
              </h3>
              <p style={{ color: "#6b7280", lineHeight: "1.6", fontSize: "14px" }}>
                {event.description || "Join us for an amazing event experience!"}
              </p>
            </div>

            {/* Event Information */}
            <div style={{ marginBottom: "32px" }}>
              <h3 style={{ fontSize: "18px", fontWeight: "600", marginBottom: "16px", color: "#374151" }}>
                Event Information
              </h3>
              <div style={{ backgroundColor: "#f9fafb", padding: "20px", borderRadius: "12px", border: "1px solid #e5e7eb", display: "flex", flexDirection: "column", gap: "16px" }}>
                {/* Location */}
                <div style={{ display: "flex", alignItems: "center" }}>
                  <FaMapMarkerAlt style={{ color: "#ef4444", marginRight: "12px", fontSize: "16px", flexShrink: 0 }} />
                  <div>
                    <p style={{ fontWeight: "600", color: "#374151", fontSize: "14px", marginBottom: "2px" }}>Location</p>
                    <p style={{ color: "#6b7280", fontSize: "14px" }}>{event.location || "Location TBD"}</p>
                  </div>
                </div>
                {/* Date — ticketed events */}
                {event.date && (
                  <div style={{ display: "flex", alignItems: "center" }}>
                    <FaCalendarAlt style={{ color: "#2563eb", marginRight: "12px", fontSize: "16px", flexShrink: 0 }} />
                    <div>
                      <p style={{ fontWeight: "600", color: "#374151", fontSize: "14px", marginBottom: "2px" }}>Date</p>
                      <p style={{ color: "#6b7280", fontSize: "14px" }}>
                        {new Date(event.date).toLocaleDateString("en-IN", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}
                      </p>
                    </div>
                  </div>
                )}
                {/* Time — ticketed events */}
                {event.time && (
                  <div style={{ display: "flex", alignItems: "center" }}>
                    <FaClock style={{ color: "#059669", marginRight: "12px", fontSize: "16px", flexShrink: 0 }} />
                    <div>
                      <p style={{ fontWeight: "600", color: "#374151", fontSize: "14px", marginBottom: "2px" }}>Time</p>
                      <p style={{ color: "#6b7280", fontSize: "14px" }}>{event.time}</p>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Add-ons — full-service events only */}
            {event.eventType !== "ticketed" && event.addons && event.addons.length > 0 && (
              <div style={{ marginBottom: "32px" }}>
                <h3 style={{ fontSize: "18px", fontWeight: "600", marginBottom: "16px", color: "#374151", display: "flex", alignItems: "center", gap: "8px" }}>
                  <FaPlusCircle style={{ color: "#a2783a", fontSize: "16px" }} />
                  Available Add-ons
                </h3>
                <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                  {event.addons.map((addon, idx) => {
                    // Infer per_person for food/catering add-ons even if stored as fixed
                    const perPersonKeywords = /veg|catering|food|meal|plate|lunch|dinner|breakfast/i;
                    const displayType = addon.type === "per_person" || perPersonKeywords.test(addon.name)
                      ? "per_person" : "fixed";
                    return (
                    <div key={idx} style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      backgroundColor: "#fdf8f2",
                      border: "1px solid #e8d5b7",
                      borderRadius: "10px",
                      padding: "12px 16px"
                    }}>
                      <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                        <div style={{
                          width: "8px", height: "8px", borderRadius: "50%",
                          backgroundColor: "#a2783a", flexShrink: 0
                        }} />
                        <span style={{ fontWeight: "500", color: "#374151", fontSize: "14px" }}>
                          {addon.name}
                        </span>
                      </div>
                      <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                        <span style={{
                          fontSize: "15px", fontWeight: "700", color: "#a2783a"
                        }}>
                          ₹{Number(addon.price || 0).toLocaleString("en-IN")}
                        </span>
                        <span style={{
                          fontSize: "11px", color: "#9ca3af",
                          backgroundColor: "#f3f4f6",
                          padding: "2px 8px", borderRadius: "20px"
                        }}>
                          {displayType === "per_person" ? "/ person" : "fixed"}
                        </span>
                      </div>
                    </div>
                    );
                  })}
                </div>
                <p style={{ fontSize: "12px", color: "#9ca3af", marginTop: "10px" }}>
                  Add-ons can be selected during booking
                </p>
              </div>
            )}

            {/* Ticket Availability — ticketed events only */}
            {event.eventType === "ticketed" && event.ticketTypes && event.ticketTypes.length > 0 && (
              <div style={{ marginBottom: "32px" }}>
                <h3 style={{ fontSize: "18px", fontWeight: "600", marginBottom: "16px", color: "#374151" }}>
                  Ticket Availability
                </h3>
                {(() => {
                  const ticketsWithAvail = event.ticketTypes.map(t => ({
                    ...t,
                    available: Math.max(0,
                      (t.quantityTotal || t.quantity || 0) -
                      (t.quantitySold || 0) -
                      (t.quantityReserved || 0)
                    )
                  }));
                  const totalAvailable = ticketsWithAvail.reduce((s, t) => s + t.available, 0);
                  return (
                    <div style={{
                      backgroundColor: totalAvailable > 0 ? "#f0fdf4" : "#fef2f2",
                      border: `1px solid ${totalAvailable > 0 ? "#bbf7d0" : "#fecaca"}`,
                      borderRadius: "12px",
                      padding: "16px"
                    }}>
                      <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "12px" }}>
                        <span style={{
                          width: "10px", height: "10px", borderRadius: "50%",
                          backgroundColor: totalAvailable > 0 ? "#16a34a" : "#dc2626",
                          display: "inline-block", flexShrink: 0
                        }} />
                        <span style={{ fontSize: "15px", fontWeight: "700", color: totalAvailable > 0 ? "#15803d" : "#dc2626" }}>
                          {totalAvailable > 0 ? `${totalAvailable} tickets available` : "Sold Out"}
                        </span>
                      </div>
                      <div style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>
                        {ticketsWithAvail.map((ticket, idx) => (
                          <div key={idx} style={{
                            backgroundColor: "white",
                            border: `1px solid ${ticket.available > 0 ? "#86efac" : "#fca5a5"}`,
                            borderRadius: "8px",
                            padding: "8px 14px",
                            minWidth: "100px"
                          }}>
                            <p style={{ fontSize: "12px", color: "#6b7280", marginBottom: "2px" }}>{ticket.name}</p>
                            <p style={{ fontSize: "16px", fontWeight: "700", color: ticket.available > 0 ? "#15803d" : "#dc2626" }}>
                              {ticket.available}
                              <span style={{ fontSize: "11px", fontWeight: "400", color: "#9ca3af", marginLeft: "4px" }}>
                                / {ticket.quantityTotal || ticket.quantity || 0}
                              </span>
                            </p>
                            <p style={{ fontSize: "11px", color: "#6b7280" }}>₹{ticket.price?.toLocaleString()}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })()}
              </div>
            )}

            {/* Organizer Section */}
            {event.createdBy?.name && (
              <div style={{ marginBottom: "32px" }}>
                <h3 style={{ fontSize: "18px", fontWeight: "600", marginBottom: "16px", color: "#374151" }}>
                  Organizer
                </h3>
                <div style={{ display: "flex", alignItems: "center", backgroundColor: "#f3f4f6", padding: "20px", borderRadius: "12px" }}>
                  <div style={{ backgroundColor: "#a2783a", padding: "12px", borderRadius: "50%", marginRight: "16px" }}>
                    <FaUser style={{ color: "white", fontSize: "16px" }} />
                  </div>
                  <div>
                    <p style={{ fontWeight: "600", color: "#374151", fontSize: "16px", marginBottom: "2px" }}>
                      {event.createdBy.name}
                    </p>
                    <p style={{ color: "#6b7280", fontSize: "14px" }}>Event Organizer</p>
                    {event.createdBy.email && (
                      <p style={{ color: "#9ca3af", fontSize: "12px" }}>{event.createdBy.email}</p>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Bottom Section - Price and Book Now */}
          <div style={{
            borderTop: "1px solid #e5e7eb",
            padding: "24px 32px",
            backgroundColor: "#fafafa"
          }}>
            <div style={{
              display: "flex",
              flexDirection: "column",
              gap: "16px"
            }}>
              {/* Price Row */}
              <div style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center"
              }}>
                <div>
                  <p style={{ 
                    color: "#6b7280",
                    fontSize: "14px",
                    marginBottom: "4px"
                  }}>
                    Price per person
                  </p>
                  <p style={{ 
                    fontSize: "32px",
                    fontWeight: "700",
                    color: "#374151"
                  }}>
                    {event.price > 0 ? `₹${event.price.toLocaleString()}` : "FREE"}
                  </p>
                </div>
              </div>
              
              {/* Action Buttons */}
              <div style={{
                display: "flex",
                flexDirection: "column",
                gap: "12px"
              }}>
                <button
                  onClick={handleBookNowClick}
                  disabled={status.label === 'Completed' || status.label === 'Sold Out'}
                  style={{
                    padding: "16px 32px",
                    borderRadius: "12px",
                    fontWeight: "600",
                    fontSize: "16px",
                    border: "none",
                    cursor: status.label === 'Completed' || status.label === 'Sold Out' ? "not-allowed" : "pointer",
                    backgroundColor: status.label === 'Completed' || status.label === 'Sold Out' ? "#d1d5db" : "#a2783a",
                    color: status.label === 'Completed' || status.label === 'Sold Out' ? "#6b7280" : "white",
                    transition: "all 0.3s ease",
                  }}
                  onMouseEnter={(e) => {
                    if (status.label !== 'Completed' && status.label !== 'Sold Out') {
                      e.target.style.backgroundColor = "#92692d";
                      e.target.style.transform = "translateY(-2px)";
                      e.target.style.boxShadow = "0 4px 16px rgba(0,0,0,0.2)";
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (status.label !== 'Completed' && status.label !== 'Sold Out') {
                      e.target.style.backgroundColor = "#a2783a";
                      e.target.style.transform = "translateY(0)";
                      e.target.style.boxShadow = "none";
                    }
                  }}
                >
                  {status.label === 'Completed' ? '🚫 Event Ended' : 
                   status.label === 'Sold Out' ? 'Sold Out' : 'Book Now'}
                </button>
                
                <button
                  onClick={() => {
                    const token = localStorage.getItem('token');
                    if (!token) { window.location.href = '/login'; return; }
                    const merchantId = event.createdBy?._id || event.createdBy?.id;
                    if (!merchantId) { alert('Merchant information not available'); return; }
                    window.location.href = `/dashboard/user/messages?merchantId=${merchantId}&merchantName=${encodeURIComponent(event.createdBy.name)}`;
                  }}
                  style={{
                    padding: "14px 32px",
                    borderRadius: "12px",
                    fontWeight: "600",
                    fontSize: "15px",
                    border: "2px solid #a2783a",
                    cursor: "pointer",
                    backgroundColor: "white",
                    color: "#a2783a",
                    transition: "all 0.3s ease",
                  }}
                  onMouseEnter={(e) => {
                    e.target.style.backgroundColor = "#a2783a";
                    e.target.style.color = "white";
                  }}
                  onMouseLeave={(e) => {
                    e.target.style.backgroundColor = "white";
                    e.target.style.color = "#a2783a";
                  }}
                >
                  💬 Message Merchant
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
      </div>

      {/* Login Modal */}
    </>
  );
};

EventDetailsModal.propTypes = {
  isOpen: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
  event: PropTypes.object,
  onBookNow: PropTypes.func.isRequired,
};

export default EventDetailsModal;