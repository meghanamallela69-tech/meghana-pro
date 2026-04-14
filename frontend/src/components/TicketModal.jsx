import { useRef, useState } from "react";
import { FaTimes, FaDownload, FaQrcode, FaCalendar, FaMapMarkerAlt, FaTicketAlt, FaPrint } from "react-icons/fa";
import QRCode from "react-qr-code";

const TicketModal = ({ booking, isOpen, onClose }) => {
  const ticketRef = useRef(null);
  const [downloading, setDownloading] = useState(false);

  if (!isOpen || !booking) return null;

  // Debug: Log the booking data to understand its structure
  console.log('🎫 Ticket Modal - Raw booking data:', booking);

  const handleDownload = async () => {
    setDownloading(true);
    try {
      // Try a different approach - use dom-to-image as fallback
      let canvas;
      
      try {
        // First try html2canvas
        const html2canvas = (await import('html2canvas')).default;
        
        if (ticketRef.current) {
          // Hide the download buttons
          const actionButtons = document.querySelector('[data-action-buttons]');
          if (actionButtons) {
            actionButtons.style.display = 'none';
          }
          
          // Wait for rendering
          await new Promise(resolve => setTimeout(resolve, 500));
          
          canvas = await html2canvas(ticketRef.current, {
            backgroundColor: '#ffffff',
            scale: 2,
            useCORS: true,
            allowTaint: true,
            logging: false,
            letterRendering: true,
            width: ticketRef.current.scrollWidth,
            height: ticketRef.current.scrollHeight,
            onclone: (clonedDoc) => {
              // Ensure all content is visible
              const allElements = clonedDoc.querySelectorAll('*');
              allElements.forEach(el => {
                el.style.webkitPrintColorAdjust = 'exact';
                el.style.colorAdjust = 'exact';
                if (el.textContent && el.textContent.trim()) {
                  el.style.color = '#000000';
                  el.style.opacity = '1';
                  el.style.visibility = 'visible';
                }
              });
              
              // Handle SVG QR codes
              const svgs = clonedDoc.querySelectorAll('svg');
              svgs.forEach(svg => {
                svg.style.display = 'block';
                svg.style.visibility = 'visible';
                svg.setAttribute('width', '160');
                svg.setAttribute('height', '160');
                
                const paths = svg.querySelectorAll('path');
                paths.forEach(path => {
                  path.setAttribute('fill', '#000000');
                });
              });
            }
          });
          
          // Show buttons again
          if (actionButtons) {
            actionButtons.style.display = 'flex';
          }
        }
      } catch (html2canvasError) {
        console.error('html2canvas failed:', html2canvasError);
        
        // Fallback: try dom-to-image
        try {
          const domtoimage = (await import('dom-to-image')).default;
          
          const dataUrl = await domtoimage.toPng(ticketRef.current, {
            quality: 1.0,
            bgcolor: '#ffffff',
            width: ticketRef.current.scrollWidth * 2,
            height: ticketRef.current.scrollHeight * 2,
            style: {
              transform: 'scale(2)',
              transformOrigin: 'top left'
            }
          });
          
          // Convert data URL to blob
          const response = await fetch(dataUrl);
          const blob = await response.blob();
          
          // Create download
          const url = URL.createObjectURL(blob);
          const link = document.createElement('a');
          link.href = url;
          link.download = `EventHub_Ticket_${ticketData.ticketNumber}.png`;
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
          URL.revokeObjectURL(url);
          
          console.log('✅ Ticket downloaded using dom-to-image');
          return;
        } catch (domToImageError) {
          console.error('dom-to-image also failed:', domToImageError);
          throw new Error('Both capture methods failed');
        }
      }
      
      if (canvas) {
        // Create download from canvas
        canvas.toBlob((blob) => {
          const url = URL.createObjectURL(blob);
          const link = document.createElement('a');
          link.href = url;
          link.download = `EventHub_Ticket_${ticketData.ticketNumber}.png`;
          
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
          
          URL.revokeObjectURL(url);
        }, 'image/png', 1.0);
        
        console.log('✅ Ticket downloaded using html2canvas');
      }
      
    } catch (error) {
      console.error('❌ All download methods failed:', error);
      // Final fallback to print
      window.print();
    } finally {
      setDownloading(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const formatDate = (dateString) => {
    if (!dateString) return "TBD";
    try {
      return new Date(dateString).toLocaleDateString("en-IN", {
        weekday: "long",
        year: "numeric",
        month: "long",
        day: "numeric",
      });
    } catch (error) {
      return "TBD";
    }
  };

  const formatTime = (timeString) => {
    if (!timeString) return "6:00 PM";
    // If it's already a formatted time string, return it
    if (typeof timeString === 'string' && timeString.includes(':')) {
      return timeString;
    }
    // If it's a date string, extract time
    try {
      return new Date(timeString).toLocaleTimeString("en-IN", {
        hour: "2-digit",
        minute: "2-digit",
      });
    } catch (error) {
      return "6:00 PM";
    }
  };

  const formatPrice = (amount) => {
    if (!amount) return "Free";
    return new Intl.NumberFormat('en-IN', { 
      style: 'currency', 
      currency: 'INR',
      maximumFractionDigits: 0 
    }).format(amount);
  };

  // Clean and extract comprehensive ticket data from potentially raw MongoDB objects
  const cleanBookingData = (rawBooking) => {
    // Convert MongoDB objects to plain objects safely
    let booking;
    try {
      booking = JSON.parse(JSON.stringify(rawBooking));
    } catch (error) {
      booking = { ...rawBooking };
    }
    
    // Handle selectedTickets Map conversion
    let selectedTickets = {};
    let ticketType = 'Standard';
    let ticketCount = 1;
    
    if (booking.selectedTickets) {
      if (booking.selectedTickets instanceof Map) {
        selectedTickets = Object.fromEntries(booking.selectedTickets);
      } else if (typeof booking.selectedTickets === 'object' && booking.selectedTickets.constructor === Object) {
        selectedTickets = booking.selectedTickets;
      } else if (Array.isArray(booking.selectedTickets)) {
        // Convert array format to object
        booking.selectedTickets.forEach(([key, value]) => {
          selectedTickets[key] = value;
        });
      }
      
      // Extract ticket type and quantity from selectedTickets
      const ticketEntries = Object.entries(selectedTickets);
      if (ticketEntries.length > 0) {
        ticketType = ticketEntries[0][0];
        ticketCount = ticketEntries.reduce((sum, [, qty]) => sum + (qty || 0), 0);
      }
    }
    
    // Fallback to other fields if selectedTickets is empty
    if (ticketCount === 0) {
      ticketCount = booking.guestCount || booking.ticket?.quantity || 1;
    }
    
    return {
      ...booking,
      selectedTickets,
      ticketType,
      ticketCount
    };
  };

  const cleanedBooking = cleanBookingData(booking);
  console.log('🎫 Cleaned booking data:', cleanedBooking);
  
  const ticketData = {
    // Basic ticket info
    ticketNumber: cleanedBooking.ticketId || 
                 cleanedBooking.ticket?.ticketNumber || 
                 cleanedBooking.payment?.paymentId || 
                 cleanedBooking.paymentId || 
                 `TKT_${(cleanedBooking._id?.toString() || cleanedBooking._id || '').slice(-8)?.toUpperCase()}`,
    
    eventName: cleanedBooking.serviceTitle || cleanedBooking.eventTitle || "Event",
    eventDate: formatDate(cleanedBooking.eventDate),
    eventTime: formatTime(cleanedBooking.eventTime),
    location: cleanedBooking.location || "Location TBD",
    
    // Ticket specifics
    ticketType: cleanedBooking.ticketType || "Standard",
    quantity: cleanedBooking.ticketCount || 1,
    
    // Pricing info
    originalAmount: cleanedBooking.originalAmount || 
                   cleanedBooking.totalPrice || 
                   cleanedBooking.servicePrice || 
                   cleanedBooking.payment?.amount || 0,
    
    discountAmount: cleanedBooking.discountAmount || cleanedBooking.discount || 0,
    
    finalAmount: cleanedBooking.finalAmount || 
                cleanedBooking.payment?.amount || 
                cleanedBooking.totalPrice || 
                cleanedBooking.servicePrice || 0,
    
    couponCode: cleanedBooking.couponCode,
    
    // Booking details
    bookingId: (cleanedBooking._id?.toString() || cleanedBooking._id || '').slice(-8)?.toUpperCase(),
    bookingDate: formatDate(cleanedBooking.createdAt || cleanedBooking.bookingDate),
    paymentId: cleanedBooking.payment?.paymentId || cleanedBooking.paymentId,
    paymentStatus: cleanedBooking.paymentStatus || (cleanedBooking.payment?.paid ? 'paid' : 'pending'),
    
    // Event category
    category: cleanedBooking.serviceCategory || cleanedBooking.eventCategory || "General",
    
    // Attendee info
    attendeeName: cleanedBooking.attendeeName || "Guest",
    attendeeEmail: cleanedBooking.attendeeEmail || "",
  };

  console.log('🎫 Final ticket data:', ticketData);

  return (
    <div
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: "rgba(0, 0, 0, 0.8)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 1000,
        padding: "20px",
      }}
      onClick={onClose}
    >
      <div
        style={{
          backgroundColor: "white",
          borderRadius: "20px",
          maxWidth: "500px",
          width: "100%",
          maxHeight: "95vh",
          overflowY: "auto",
          position: "relative",
          boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.25)",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            padding: "24px 28px",
            borderBottom: "1px solid #e5e7eb",
            background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
            color: "white",
            borderRadius: "20px 20px 0 0",
          }}
        >
          <h2 style={{ fontSize: "22px", fontWeight: "700", display: "flex", alignItems: "center", gap: "10px", margin: 0 }}>
            <FaTicketAlt style={{ color: "#fbbf24" }} />
            Event Ticket
          </h2>
          <button
            onClick={onClose}
            style={{
              background: "rgba(255,255,255,0.2)",
              border: "none",
              cursor: "pointer",
              padding: "10px",
              borderRadius: "50%",
              color: "white",
              transition: "all 0.2s",
            }}
          >
            <FaTimes style={{ fontSize: "18px" }} />
          </button>
        </div>

        {/* Ticket */}
        <div ref={ticketRef} style={{ padding: "28px" }}>
          <div
            style={{
              background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
              borderRadius: "20px",
              padding: "28px",
              color: "white",
              position: "relative",
              overflow: "hidden",
              boxShadow: "0 20px 25px -5px rgba(0, 0, 0, 0.1)",
            }}
          >
            {/* Decorative elements */}
            <div style={{ position: "absolute", top: "-30px", right: "-30px", width: "120px", height: "120px", background: "rgba(255,255,255,0.1)", borderRadius: "50%" }} />
            <div style={{ position: "absolute", bottom: "-40px", left: "-40px", width: "140px", height: "140px", background: "rgba(255,255,255,0.08)", borderRadius: "50%" }} />
            <div style={{ position: "absolute", top: "50%", right: "-20px", width: "40px", height: "40px", background: "rgba(251, 191, 36, 0.3)", borderRadius: "50%" }} />

            {/* Ticket Header */}
            <div style={{ textAlign: "center", marginBottom: "24px", position: "relative", zIndex: 1 }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "8px", marginBottom: "8px" }}>
                <div style={{ width: "30px", height: "2px", background: "#ffffff", opacity: 0.8 }} />
                <h3 style={{ 
                  fontSize: "14px", 
                  textTransform: "uppercase", 
                  letterSpacing: "3px", 
                  margin: 0, 
                  fontWeight: "700",
                  color: "#ffffff",
                  textShadow: "0 2px 4px rgba(0,0,0,0.3)"
                }}>
                  EventHub
                </h3>
                <div style={{ width: "30px", height: "2px", background: "#ffffff", opacity: 0.8 }} />
              </div>
              <h2 style={{ 
                fontSize: "26px", 
                fontWeight: "800", 
                margin: "8px 0", 
                lineHeight: "1.2",
                color: "#ffffff",
                textShadow: "0 2px 8px rgba(0,0,0,0.4)"
              }}>{ticketData.eventName}</h2>
              <div style={{ 
                display: "inline-block", 
                background: "rgba(255, 255, 255, 0.9)", 
                color: "#667eea",
                padding: "6px 16px", 
                borderRadius: "20px", 
                fontSize: "12px", 
                fontWeight: "700", 
                textTransform: "uppercase",
                boxShadow: "0 2px 4px rgba(0,0,0,0.1)"
              }}>
                {ticketData.category}
              </div>
            </div>

            {/* Main Ticket Details */}
            <div style={{ 
              background: "#ffffff", 
              borderRadius: "16px", 
              padding: "20px", 
              marginBottom: "24px", 
              position: "relative", 
              zIndex: 1, 
              boxShadow: "0 4px 12px rgba(0,0,0,0.1)",
              border: "2px solid #e5e7eb"
            }}>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px", marginBottom: "16px" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                  <FaCalendar style={{ color: "#667eea", fontSize: "18px" }} />
                  <div>
                    <p style={{ 
                      fontSize: "12px", 
                      color: "#374151", 
                      margin: 0, 
                      textTransform: "uppercase", 
                      letterSpacing: "1px",
                      fontWeight: "700"
                    }}>Date</p>
                    <p style={{ 
                      fontWeight: "800", 
                      margin: "2px 0 0 0", 
                      fontSize: "16px",
                      color: "#000000"
                    }}>{ticketData.eventDate}</p>
                  </div>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                  <FaQrcode style={{ color: "#667eea", fontSize: "18px" }} />
                  <div>
                    <p style={{ 
                      fontSize: "12px", 
                      color: "#374151", 
                      margin: 0, 
                      textTransform: "uppercase", 
                      letterSpacing: "1px",
                      fontWeight: "700"
                    }}>Time</p>
                    <p style={{ 
                      fontWeight: "800", 
                      margin: "2px 0 0 0", 
                      fontSize: "16px",
                      color: "#000000"
                    }}>{ticketData.eventTime}</p>
                  </div>
                </div>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                <FaMapMarkerAlt style={{ color: "#667eea", fontSize: "18px" }} />
                <div style={{ flex: 1 }}>
                  <p style={{ 
                    fontSize: "12px", 
                    color: "#374151", 
                    margin: 0, 
                    textTransform: "uppercase", 
                    letterSpacing: "1px",
                    fontWeight: "700"
                  }}>Venue</p>
                  <p style={{ 
                    fontWeight: "800", 
                    margin: "2px 0 0 0", 
                    fontSize: "16px",
                    color: "#000000"
                  }}>{ticketData.location}</p>
                </div>
              </div>
            </div>

            {/* Ticket Type & Quantity */}
            <div style={{ marginBottom: "24px", position: "relative", zIndex: 1 }}>
              {/* Ticket breakdown — one row per type */}
              {(() => {
                const entries = cleanedBooking.selectedTickets
                  ? Object.entries(cleanedBooking.selectedTickets).filter(([, v]) => Number(v) > 0)
                  : [];
                if (entries.length > 1) {
                  return (
                    <div style={{ display: "flex", flexDirection: "column", gap: "10px", marginBottom: "16px" }}>
                      {entries.map(([type, qty]) => {
                        const typeInfo = cleanedBooking.eventTicketTypes?.find(
                          t => t.name?.toLowerCase() === type?.toLowerCase()
                        );
                        const unitPrice = typeInfo?.price ?? cleanedBooking.ticketTypePrices?.[type] ?? 0;
                        const lineTotal = unitPrice * Number(qty);
                        return (
                          <div key={type} style={{
                            display: "flex", justifyContent: "space-between", alignItems: "center",
                            background: "#ffffff", borderRadius: "12px", padding: "12px 16px",
                            boxShadow: "0 2px 8px rgba(0,0,0,0.1)", border: "2px solid #e5e7eb"
                          }}>
                            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                              <span style={{ fontSize: "18px" }}>🎟</span>
                              <div>
                                <p style={{ fontSize: "11px", color: "#374151", textTransform: "uppercase", letterSpacing: "1px", margin: 0, fontWeight: "700" }}>Ticket Type</p>
                                <p style={{ fontWeight: "800", fontSize: "16px", margin: "2px 0 0 0", color: "#000" }}>{type}</p>
                                {unitPrice > 0 && (
                                  <p style={{ fontSize: "11px", color: "#6b7280", margin: "2px 0 0 0", fontWeight: "600" }}>{formatPrice(unitPrice)}/ticket</p>
                                )}
                              </div>
                            </div>
                            <div style={{ textAlign: "right" }}>
                              <p style={{ fontSize: "11px", color: "#374151", textTransform: "uppercase", letterSpacing: "1px", margin: 0, fontWeight: "700" }}>Qty</p>
                              <p style={{ fontWeight: "800", fontSize: "20px", margin: "2px 0 0 0", color: "#667eea" }}>{qty}</p>
                              {lineTotal > 0 && (
                                <p style={{ fontSize: "12px", color: "#059669", margin: "2px 0 0 0", fontWeight: "700" }}>{formatPrice(lineTotal)}</p>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  );
                }
                return null;
              })()}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "16px" }}>
              <div style={{ 
                textAlign: "center", 
                background: "#ffffff", 
                borderRadius: "12px", 
                padding: "16px",
                boxShadow: "0 2px 8px rgba(0,0,0,0.1)",
                border: "2px solid #e5e7eb"
              }}>
                <p style={{ 
                  fontSize: "11px", 
                  color: "#374151", 
                  textTransform: "uppercase", 
                  letterSpacing: "1px", 
                  margin: 0,
                  fontWeight: "700"
                }}>Ticket Type</p>
                <p style={{ 
                  fontWeight: "800", 
                  fontSize: "16px", 
                  margin: "4px 0 0 0",
                  color: "#000000"
                }}>
                  {(() => {
                    const entries = cleanedBooking.selectedTickets
                      ? Object.entries(cleanedBooking.selectedTickets).filter(([, v]) => Number(v) > 0)
                      : [];
                    if (entries.length === 1) return entries[0][0];
                    if (entries.length > 1) return "Multiple";
                    return ticketData.ticketType;
                  })()}
                </p>
              </div>
              <div style={{ 
                textAlign: "center", 
                background: "#ffffff", 
                borderRadius: "12px", 
                padding: "16px",
                boxShadow: "0 2px 8px rgba(0,0,0,0.1)",
                border: "2px solid #e5e7eb"
              }}>
                <p style={{ 
                  fontSize: "11px", 
                  color: "#374151", 
                  textTransform: "uppercase", 
                  letterSpacing: "1px", 
                  margin: 0,
                  fontWeight: "700"
                }}>Quantity</p>
                <p style={{ 
                  fontWeight: "800", 
                  fontSize: "16px", 
                  margin: "4px 0 0 0",
                  color: "#000000"
                }}>{ticketData.quantity}</p>
              </div>
              <div style={{ 
                textAlign: "center", 
                background: "#ffffff", 
                borderRadius: "12px", 
                padding: "16px",
                boxShadow: "0 2px 8px rgba(0,0,0,0.1)",
                border: "2px solid #e5e7eb"
              }}>
                <p style={{ 
                  fontSize: "11px", 
                  color: "#374151", 
                  textTransform: "uppercase", 
                  letterSpacing: "1px", 
                  margin: 0,
                  fontWeight: "700"
                }}>Amount</p>
                <p style={{ 
                  fontWeight: "800", 
                  fontSize: "14px", 
                  margin: "4px 0 0 0",
                  color: "#059669"
                }}>{formatPrice(ticketData.finalAmount)}</p>
              </div>
            </div>
            </div>

            {/* Pricing Details */}
            {(ticketData.discountAmount > 0 || ticketData.couponCode) && (
              <div style={{ 
                background: "rgba(255,255,255,0.95)", 
                borderRadius: "12px", 
                padding: "16px", 
                marginBottom: "24px", 
                position: "relative", 
                zIndex: 1,
                boxShadow: "0 2px 8px rgba(0,0,0,0.1)"
              }}>
                <h4 style={{ 
                  fontSize: "12px", 
                  textTransform: "uppercase", 
                  letterSpacing: "1px", 
                  margin: "0 0 8px 0", 
                  color: "#6b7280",
                  fontWeight: "600"
                }}>Pricing Details</h4>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: "14px", marginBottom: "4px", color: "#1f2937" }}>
                  <span>Original Amount:</span>
                  <span style={{ fontWeight: "600" }}>{formatPrice(ticketData.originalAmount)}</span>
                </div>
                {ticketData.discountAmount > 0 && (
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: "14px", marginBottom: "4px", color: "#059669" }}>
                    <span>Discount {ticketData.couponCode ? `(${ticketData.couponCode})` : ''}:</span>
                    <span style={{ fontWeight: "600" }}>-{formatPrice(ticketData.discountAmount)}</span>
                  </div>
                )}
                <div style={{ borderTop: "1px solid #e5e7eb", paddingTop: "8px", marginTop: "8px" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: "16px", fontWeight: "700", color: "#1f2937" }}>
                    <span>Final Amount:</span>
                    <span>{formatPrice(ticketData.finalAmount)}</span>
                  </div>
                </div>
              </div>
            )}

            {/* QR Code */}
            <div style={{ 
              background: "white", 
              borderRadius: "16px", 
              padding: "24px", 
              textAlign: "center", 
              position: "relative", 
              zIndex: 1,
              boxShadow: "0 4px 12px rgba(0,0,0,0.15)"
            }}>
              <div style={{ 
                display: "inline-block", 
                padding: "20px", 
                background: "#ffffff", 
                borderRadius: "12px", 
                boxShadow: "0 2px 8px rgba(0, 0, 0, 0.1)",
                border: "3px solid #e5e7eb"
              }}>
                <div style={{ 
                  width: "160px", 
                  height: "160px", 
                  display: "flex", 
                  alignItems: "center", 
                  justifyContent: "center",
                  backgroundColor: "#ffffff"
                }}>
                  <QRCode
                    value={`TICKET:${ticketData.ticketNumber}|EVENT:${ticketData.eventName}|DATE:${ticketData.eventDate}|BOOKING:${ticketData.bookingId}`}
                    size={160}
                    level="M"
                    fgColor="#000000"
                    bgColor="#ffffff"
                    includeMargin={false}
                    renderAs="svg"
                  />
                </div>
              </div>
              <div style={{ marginTop: "16px" }}>
                <p style={{ 
                  color: "#000000", 
                  fontSize: "16px", 
                  fontFamily: "monospace", 
                  fontWeight: "800", 
                  margin: "0 0 8px 0",
                  letterSpacing: "2px",
                  textShadow: "none"
                }}>
                  {ticketData.ticketNumber}
                </p>
                <p style={{ 
                  color: "#374151", 
                  fontSize: "12px", 
                  margin: 0,
                  fontWeight: "600"
                }}>
                  Booking ID: {ticketData.bookingId}
                </p>
              </div>
            </div>

            {/* Attendee Info */}
            <div style={{ 
              marginTop: "20px", 
              textAlign: "center", 
              position: "relative", 
              zIndex: 1,
              background: "#ffffff",
              borderRadius: "12px",
              padding: "16px",
              border: "2px solid #e5e7eb",
              boxShadow: "0 2px 8px rgba(0,0,0,0.1)"
            }}>
              <p style={{ 
                fontSize: "12px", 
                color: "#374151", 
                margin: "0 0 4px 0",
                textTransform: "uppercase",
                letterSpacing: "1px",
                fontWeight: "700"
              }}>Attendee</p>
              <p style={{ 
                fontWeight: "800", 
                fontSize: "18px", 
                margin: 0,
                color: "#000000"
              }}>{ticketData.attendeeName}</p>
              {ticketData.attendeeEmail && (
                <p style={{ 
                  fontSize: "12px", 
                  color: "#374151", 
                  margin: "2px 0 0 0",
                  fontWeight: "600"
                }}>{ticketData.attendeeEmail}</p>
              )}
            </div>

            {/* Footer */}
            <div style={{ 
              textAlign: "center", 
              marginTop: "20px", 
              position: "relative", 
              zIndex: 1,
              background: "#ffffff",
              borderRadius: "12px",
              padding: "16px",
              border: "2px solid #e5e7eb",
              boxShadow: "0 2px 8px rgba(0,0,0,0.1)"
            }}>
              <div style={{ width: "60px", height: "2px", background: "#d1d5db", margin: "0 auto 12px" }} />
              <p style={{ 
                fontSize: "12px", 
                color: "#374151", 
                margin: 0, 
                lineHeight: "1.4",
                fontWeight: "600"
              }}>
                Present this ticket at the event entrance<br />
                <span style={{ fontWeight: "800", color: "#000000" }}>Booked on {ticketData.bookingDate}</span>
              </p>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div data-action-buttons style={{ padding: "0 28px 28px", display: "flex", gap: "12px" }}>
          <button
            onClick={handleDownload}
            disabled={downloading}
            style={{
              flex: 1,
              padding: "16px 20px",
              background: downloading ? "#9ca3af" : "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
              color: "white",
              fontSize: "16px",
              fontWeight: "600",
              border: "none",
              borderRadius: "12px",
              cursor: downloading ? "not-allowed" : "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "8px",
              transition: "all 0.2s",
              boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.1)",
            }}
          >
            <FaDownload />
            {downloading ? "Downloading..." : "Download Ticket"}
          </button>
          <button
            onClick={handlePrint}
            disabled={downloading}
            style={{
              padding: "16px 20px",
              background: downloading ? "#9ca3af" : "linear-gradient(135deg, #f59e0b 0%, #d97706 100%)",
              color: "white",
              fontSize: "16px",
              fontWeight: "600",
              border: "none",
              borderRadius: "12px",
              cursor: downloading ? "not-allowed" : "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "8px",
              transition: "all 0.2s",
              boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.1)",
            }}
          >
            <FaPrint />
            Print
          </button>
        </div>
      </div>
    </div>
  );
};

export default TicketModal;
