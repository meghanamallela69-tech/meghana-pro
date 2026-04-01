import { useState, useEffect } from "react";
import axios from "axios";
import toast from "react-hot-toast";
import { FaTimes, FaCalendarAlt, FaClock, FaMapMarkerAlt, FaPercent, FaCheckSquare, FaSquare, FaTicketAlt, FaUsers, FaPlus, FaMinus } from "react-icons/fa";
import { API_BASE } from "../lib/http";
import useAuth from "../context/useAuth";
import PaymentModal from "./PaymentModal";
import FullServiceBookingModal from "./FullServiceBookingModal";

const BookingModal = ({ service, isOpen, onClose, onSuccess, coupons = [] }) => {
  const { token } = useAuth();
  const [loading, setLoading] = useState(false);
  const [showPayment, setShowPayment] = useState(false);
  const [createdBooking, setCreatedBooking] = useState(null);
  
  // Coupon states
  const [availableCoupons, setAvailableCoupons] = useState([]);
  const [showCouponDropdown, setShowCouponDropdown] = useState(false);
  const [couponCode, setCouponCode] = useState("");
  const [appliedCoupon, setAppliedCoupon] = useState(null);
  const [couponLoading, setCouponLoading] = useState(false);
  
  // Determine event type
  const eventType = service?.eventType || "full-service";
  const isFullService = eventType === "full-service";
  const isTicketed = eventType === "ticketed";

  // ── Route full-service events to the new FullServiceBookingModal ──────────
  if (isFullService && isOpen) {
    return (
      <FullServiceBookingModal
        isOpen={isOpen}
        onClose={onClose}
        event={service}
        onSuccess={onSuccess}
      />
    );
  }

  // Full Service States
  const [eventDate, setEventDate] = useState("");
  const [timeSlot, setTimeSlot] = useState("");
  const [selectedAddons, setSelectedAddons] = useState([]);
  const [useCurrentLocation, setUseCurrentLocation] = useState(false);
  const [address, setAddress] = useState("");
  const [locationLoading, setLocationLoading] = useState(false);

  // Ticketed States
  const [selectedTickets, setSelectedTickets] = useState({}); // { "Regular": 2, "VIP": 1 }

  // Common States
  const [promoCode, setPromoCode] = useState("");
  const [discount, setDiscount] = useState(0);

  // --- DERIVED VARIABLES ---

  // Get available addons from service
  const availableAddons = service?.addons || [];
  
  // Get ticket info
  let ticketTypes = [];
  let availableTickets = 0;
  let totalTickets = 0;
  
  if (isTicketed) {
    if (service?.ticketTypes && Array.isArray(service.ticketTypes) && service.ticketTypes.length > 0) {
      ticketTypes = service.ticketTypes.map(ticket => ({
        name: ticket.name,
        price: parseInt(ticket.price) || 0,
        quantityTotal: parseInt(ticket.quantity) || 0,
        quantitySold: Math.max(0, (parseInt(ticket.quantity) || 0) - (parseInt(ticket.available) || 0)),
        quantityAvailable: parseInt(ticket.available) || 0
      }));
      totalTickets = ticketTypes.reduce((sum, t) => sum + (parseInt(t.quantityTotal) || 0), 0);
      availableTickets = ticketTypes.reduce((sum, t) => sum + (parseInt(t.quantityAvailable) || 0), 0);
    } else {
      const basePriceFallback = parseInt(service?.price) || 2999;
      const totalAvailableFallback = parseInt(service?.availableTickets || service?.totalTickets || 15);
      const totalCapacityFallback = parseInt(service?.totalTickets || totalAvailableFallback || 15);
      ticketTypes = [
        { 
          name: "Regular", 
          price: basePriceFallback, 
          quantityTotal: Math.floor(totalCapacityFallback * 0.7),
          quantitySold: 0,
          quantityAvailable: Math.floor(totalAvailableFallback * 0.7)
        },
        { 
          name: "VIP", 
          price: basePriceFallback + 2000, 
          quantityTotal: Math.ceil(totalCapacityFallback * 0.3),
          quantitySold: 0,
          quantityAvailable: Math.ceil(totalAvailableFallback * 0.3)
        }
      ];
      totalTickets = totalCapacityFallback;
      availableTickets = totalAvailableFallback;
    }
  } else {
    availableTickets = parseInt(service?.availableTickets || service?.totalTickets || 0);
    totalTickets = parseInt(service?.totalTickets || availableTickets || 0);
  }

  totalTickets = isNaN(totalTickets) ? 0 : totalTickets;
  availableTickets = isNaN(availableTickets) ? 0 : availableTickets;

  // Prices for Ticketed
  const totalSelectedTickets = Object.values(selectedTickets).reduce((sum, qty) => sum + qty, 0);
  const ticketedSubtotal = ticketTypes.reduce((sum, ticket) => {
    const quantity = selectedTickets[ticket.name] || 0;
    const price = parseInt(ticket.price) || 0;
    return sum + (price * quantity);
  }, 0);
  const ticketedTotal = Math.max(0, ticketedSubtotal - discount);

  // Prices for Full Service
  const basePrice = service?.price || 0;
  const addonsTotal = selectedAddons.reduce((sum, addon) => sum + (addon.price || 0), 0);
  const fullServiceSubtotal = basePrice + addonsTotal;
  const fullServiceTotal = Math.max(0, fullServiceSubtotal - discount);

  // --- HELPER FUNCTIONS ---

  const calculateTotal = () => {
    return isTicketed ? ticketedSubtotal : fullServiceTotal;
  };

  const fetchAvailableCoupons = async () => {
    try {
      if (!service || !service._id) {
        setAvailableCoupons([]);
        return;
      }
      const amount = calculateTotal() || 1000;
      const serviceCategory = service.category || service.serviceType || '';
      const serviceOrEventId = service.eventId || service._id;
      const url = `${API_BASE}/coupons/available?eventId=${serviceOrEventId}&totalAmount=${amount}&category=${encodeURIComponent(serviceCategory)}`;
      
      const response = await axios.get(url, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      if (response.data && response.data.success) {
        const couponsData = response.data.coupons || [];
        setAvailableCoupons(couponsData);
        setShowCouponDropdown(couponsData.length > 0);
      } else {
        setAvailableCoupons([]);
        setShowCouponDropdown(false);
      }
    } catch (error) {
      console.error('❌ COUPON FETCH FAILED:', error.message);
      setAvailableCoupons([]);
      setShowCouponDropdown(false);
      toast.error('Unable to load coupons');
    }
  };

  const updateTicketQuantity = (ticketName, newQuantity) => {
    const ticket = ticketTypes.find(t => t.name === ticketName);
    if (!ticket) return;
    const maxAvailable = ticket.quantityAvailable !== undefined ? ticket.quantityAvailable : (ticket.quantityTotal - (ticket.quantitySold || 0));
    const validQuantity = Math.max(0, Math.min(newQuantity, maxAvailable));
    setSelectedTickets(prev => {
      const updated = { ...prev };
      if (validQuantity === 0) delete updated[ticketName];
      else updated[ticketName] = validQuantity;
      return updated;
    });
  };

  const incrementTicket = (ticketName) => updateTicketQuantity(ticketName, (selectedTickets[ticketName] || 0) + 1);
  const decrementTicket = (ticketName) => updateTicketQuantity(ticketName, (selectedTickets[ticketName] || 0) - 1);

  const toggleAddon = (addon) => {
    const exists = selectedAddons.find(a => a.name === addon.name);
    if (exists) setSelectedAddons(selectedAddons.filter(a => a.name !== addon.name));
    else setSelectedAddons([...selectedAddons, addon]);
  };

  const formatTimeDisplay = (timeString) => {
    if (!timeString) return "";
    const [hours, minutes] = timeString.split(':');
    const hour = parseInt(hours);
    const ampm = hour >= 12 ? 'PM' : 'AM';
    const displayHour = hour % 12 || 12;
    return `${displayHour}:${minutes} ${ampm}`;
  };

  const handleCheckboxChange = async (e) => {
    const checked = e.target.checked;
    setUseCurrentLocation(checked);
    if (checked) {
      try {
        setLocationLoading(true);
        const L = await import('leaflet');
        await import('leaflet/dist/leaflet.css');
        const tempContainer = document.createElement('div');
        tempContainer.id = 'temp-location-map';
        tempContainer.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;z-index:9999;display:block;';
        document.body.appendChild(tempContainer);
        navigator.geolocation.getCurrentPosition(
          async (position) => {
            const lat = position.coords.latitude;
            const lng = position.coords.longitude;
            const map = L.map('temp-location-map').setView([lat, lng], 15);
            L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png').addTo(map);
            L.marker([lat, lng]).addTo(map).bindPopup('Your current location').openPopup();
            setAddress(`Latitude: ${lat.toFixed(6)}, Longitude: ${lng.toFixed(6)}`);
            setTimeout(() => { map.remove(); tempContainer.remove(); setLocationLoading(false); toast.success('Location acquired!'); }, 2000);
          },
          (error) => { tempContainer.remove(); setLocationLoading(false); setUseCurrentLocation(false); toast.error('Unable to get location'); },
          { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
        );
      } catch (err) { setLocationLoading(false); setUseCurrentLocation(false); toast.error('Map error'); }
    } else setAddress('');
  };

  // --- EFFECTS ---

  useEffect(() => {
    if (isOpen) {
      setEventDate(""); setTimeSlot(""); setSelectedAddons([]); setUseCurrentLocation(false); setAddress("");
      setSelectedTickets({}); setPromoCode(""); setDiscount(0); setShowPayment(false); setCreatedBooking(null);
      setAppliedCoupon(null); setCouponCode("");
    }
  }, [isOpen]);

  useEffect(() => {
    if (isOpen && service && service._id) {
      fetchAvailableCoupons();
    }
  }, [isOpen, service?._id, totalSelectedTickets, selectedAddons.length]);

  // --- HANDLERS ---

  const handleApplyPromo = async () => {
    if (!promoCode || !promoCode.trim()) {
      toast.error("Please enter a promo code");
      return;
    }

    const subtotal = isTicketed ? ticketedSubtotal : fullServiceSubtotal;
    const serviceOrEventId = service.eventId || service._id;

    try {
      setLoading(true);
      const response = await axios.post(
        `${API_BASE}/coupons/apply`,
        {
          code: promoCode.toUpperCase(),
          totalAmount: subtotal,
          eventId: serviceOrEventId
        },
        {
          headers: { Authorization: `Bearer ${token}` }
        }
      );

      if (response.data.success) {
        const { discountAmount, coupon } = response.data;
        setDiscount(discountAmount);
        setAppliedCoupon(coupon);
        toast.success(`Promo applied! You saved ₹${discountAmount.toLocaleString("en-IN")}`);
      }
    } catch (error) {
      console.error("Apply promo error:", error);
      const message = error.response?.data?.message || "Invalid promo code";
      toast.error(message);
      setDiscount(0);
      setAppliedCoupon(null);
    } finally {
      setLoading(false);
    }
  };

  const handleFullServiceSubmit = async (e) => {
    e.preventDefault();
    if (!eventDate || !timeSlot || (!useCurrentLocation && !address.trim())) {
      toast.error("Please fill all required fields");
      return;
    }
    setLoading(true);
    try {
      const bookingData = {
        serviceId: service._id.toString(),
        serviceTitle: service.title,
        serviceCategory: service.category,
        servicePrice: basePrice,
        eventType: "full-service",
        eventDate: new Date(eventDate),
        eventTime: timeSlot,
        selectedAddOns: selectedAddons,
        location: useCurrentLocation ? "Current Location" : address,
        locationType: "custom",
        totalAmount: fullServiceTotal,
        discount,
        promoCode: promoCode || null,
        status: "pending",
        guestCount: 1,
      };
      const response = await axios.post(`${API_BASE}/bookings`, bookingData, {
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` }
      });
      toast.success("Booking request sent!");
      onSuccess && onSuccess(response.data.booking);
      onClose();
    } catch (error) {
      toast.error(error?.response?.data?.message || "Booking failed");
    } finally { setLoading(false); }
  };

  const handleTicketedSubmit = async (e) => {
    e.preventDefault();
    if (totalSelectedTickets === 0) {
      toast.error("Please select at least 1 ticket");
      return;
    }
    setLoading(true);
    try {
      const bookingData = {
        serviceId: service._id,
        serviceTitle: service.title,
        serviceCategory: service.category,
        servicePrice: service.price || 0,
        eventType: "ticketed",
        eventDate: service.date,
        eventTime: service.time,
        selectedTickets,
        totalAmount: ticketedTotal,
        discount,
        promoCode: promoCode?.trim() || null,
        status: "pending_payment",
        paymentStatus: "pending",
        location: service.location || "Event Venue",
      };
      const response = await axios.post(`${API_BASE}/bookings`, bookingData, {
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` }
      });
      setCreatedBooking(response.data.booking);
      setShowPayment(true);
    } catch (error) {
      toast.error(error?.response?.data?.message || "Booking failed");
    } finally { setLoading(false); }
  };

  const handlePaymentSuccess = (paidBooking) => {
    toast.success("Payment successful!");
    setShowPayment(false);
    onSuccess && onSuccess(paidBooking);
    onClose();
  };

  if (!isOpen || !service) return null;
  const today = new Date().toISOString().split("T")[0];

  if (showPayment && createdBooking) {
    return (
      <PaymentModal
        booking={createdBooking}
        isOpen={true}
        onClose={() => { setShowPayment(false); onClose(); }}
        onSuccess={handlePaymentSuccess}
      />
    );
  }

  return (
    <div style={{ position: "fixed", top: 0, left: 0, right: 0, bottom: 0, backgroundColor: "white", zIndex: 9999, display: "flex", flexDirection: "column", overflow: "hidden" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "20px 24px", borderBottom: "1px solid #e5e7eb", backgroundColor: "#f8fafc" }}>
          <h1 style={{ fontSize: "24px", fontWeight: "700", color: "#1f2937", margin: 0 }}>{service.title}</h1>
          <button onClick={onClose} style={{ background: "#ef4444", border: "none", borderRadius: "50%", width: "40px", height: "40px", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", color: "white", fontSize: "18px", fontWeight: "bold" }}>✕</button>
        </div>
        <div style={{ flex: 1, display: "flex", overflow: "hidden" }}>
          <div style={{ width: "50%", backgroundColor: "#f8fafc", display: "flex", flexDirection: "column" }}>
            <div style={{ height: "50%", position: "relative", overflow: "hidden" }}>
              <img src={service.images?.[0]?.url || "/party.jpg"} alt={service.title} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
              <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, background: "linear-gradient(transparent, rgba(0,0,0,0.8))", padding: "30px 20px 20px", color: "white" }}>
                <p style={{ fontSize: "16px", opacity: 0.9, marginBottom: "12px", margin: "0 0 12px 0" }}>{service.category} • {service.location}</p>
                <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "6px" }}><FaCalendarAlt /><span>Mar 31, 2026</span></div>
                  <div style={{ display: "flex", alignItems: "center", gap: "6px" }}><FaClock /><span>6:00 PM</span></div>
                </div>
              </div>
            </div>
            <div style={{ height: "50%", padding: "24px", backgroundColor: "white", borderTop: "1px solid #e5e7eb", overflow: "hidden" }}>
              <h3 style={{ fontSize: "18px", fontWeight: "600", marginBottom: "16px", color: "#374151", margin: "0 0 16px 0" }}>Event Gallery</h3>
              {service.images && service.images.length > 0 ? (
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(120px, 1fr))", gap: "16px", height: "calc(100% - 50px)", overflowY: "auto" }}>
                  {service.images.map((image, index) => (
                    <img key={index} src={image.url} alt={`${service.title} ${index + 1}`} style={{ width: "100%", height: "140px", objectFit: "cover", borderRadius: "12px", cursor: "pointer", border: "3px solid transparent", transition: "all 0.3s ease", boxShadow: "0 2px 8px rgba(0,0,0,0.1)" }} />
                  ))}
                </div>
              ) : (
                <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "calc(100% - 50px)", color: "#9ca3af", fontSize: "14px" }}>No additional images available</div>
              )}
            </div>
          </div>
          <div style={{ width: "50%", backgroundColor: "white", display: "flex", flexDirection: "column", borderLeft: "1px solid #e5e7eb" }}>
            <div style={{ padding: "20px 32px", borderBottom: "1px solid #e5e7eb", backgroundColor: "#fafafa" }}>
              <h2 style={{ fontSize: "20px", fontWeight: "700", color: "#1f2937", marginBottom: "4px", margin: "0 0 4px 0" }}>Book Now</h2>
              <p style={{ color: "#6b7280", fontSize: "14px", margin: 0 }}>{isTicketed ? "Select your tickets and complete payment" : "Fill in your details for booking request"}</p>
            </div>
            <div style={{ flex: "1", overflowY: "auto", padding: "32px" }}>
              <form onSubmit={isTicketed ? handleTicketedSubmit : handleFullServiceSubmit}>
                {isTicketed ? (
                  <div>
                    <div style={{ marginBottom: "24px" }}>
                      <h3 style={{ fontSize: "18px", fontWeight: "600", color: "#1f2937", marginBottom: "16px" }}>Select Tickets</h3>
                      {ticketTypes.map((ticket) => (
                        <div key={ticket.name} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "16px", border: "1px solid #e5e7eb", borderRadius: "8px", marginBottom: "12px" }}>
                          <div>
                            <div style={{ fontWeight: "600", color: "#374151", marginBottom: "4px" }}>{ticket.name}</div>
                            <div style={{ color: "#6b7280", fontSize: "14px" }}>₹{ticket.price.toLocaleString("en-IN")} • Available: {ticket.quantityAvailable}</div>
                          </div>
                          <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                            <button type="button" onClick={() => decrementTicket(ticket.name)} style={{ width: "32px", height: "32px", borderRadius: "50%", border: "1px solid #d1d5db", backgroundColor: "white", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "18px", color: "#374151" }}>-</button>
                            <span style={{ fontSize: "16px", fontWeight: "600", minWidth: "32px", textAlign: "center" }}>{selectedTickets[ticket.name] || 0}</span>
                            <button type="button" onClick={() => incrementTicket(ticket.name)} disabled={selectedTickets[ticket.name] >= ticket.quantityAvailable} style={{ width: "32px", height: "32px", borderRadius: "50%", border: "1px solid #d1d5db", backgroundColor: selectedTickets[ticket.name] >= ticket.quantityAvailable ? "#f3f4f6" : "white", cursor: selectedTickets[ticket.name] >= ticket.quantityAvailable ? "not-allowed" : "pointer", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "18px", color: selectedTickets[ticket.name] >= ticket.quantityAvailable ? "#9ca3af" : "#374151" }}>+</button>
                          </div>
                        </div>
                      ))}
                    </div>
                    <div style={{ marginBottom: "20px" }}>
                      <label style={{ display: "block", fontSize: "14px", fontWeight: "500", color: "#374151", marginBottom: "8px" }}>Have a promo code?</label>
                      {availableCoupons.length > 0 && (
                        <div style={{ marginBottom: "12px" }}>
                          <p style={{ fontSize: "13px", color: "#6b7280", marginBottom: "6px" }}>🏷️ Available offers ({availableCoupons.length}):</p>
                          <div style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>
                            {availableCoupons.map((coupon) => (
                              <button key={coupon._id} type="button" onClick={() => { setPromoCode(coupon.code); toast.success(`Coupon "${coupon.code}" selected!`); }} style={{ padding: "6px 12px", backgroundColor: "#fef3c7", border: "1px solid #f59e0b", borderRadius: "6px", fontSize: "12px", fontWeight: "600", color: "#92400e", cursor: "pointer" }}>{coupon.code} - {coupon.discountType === 'percentage' ? `${coupon.discountValue}%` : `₹${coupon.discountValue}`} Off</button>
                            ))}
                          </div>
                        </div>
                      )}
                      <div style={{ display: "flex", gap: "8px" }}>
                        <input type="text" value={promoCode} onChange={(e) => setPromoCode(e.target.value.toUpperCase())} placeholder="Enter code" style={{ flex: 1, padding: "10px 12px", border: "1px solid #d1d5db", borderRadius: "6px", fontSize: "14px" }} />
                        <button type="button" onClick={handleApplyPromo} style={{ padding: "10px 20px", backgroundColor: discount > 0 ? "#10b981" : "#a2783a", color: "white", border: "none", borderRadius: "6px", fontSize: "14px", fontWeight: "500", cursor: "pointer" }}>Apply</button>
                      </div>
                      {discount > 0 && <div style={{ marginTop: "8px", padding: "8px", backgroundColor: "#d1fae5", borderRadius: "6px", color: "#065f46", fontSize: "14px" }}>Discount applied: ₹{discount.toLocaleString("en-IN")} off</div>}
                    </div>
                    <div style={{ padding: "16px", backgroundColor: "#fef3e6", borderRadius: "12px", marginBottom: "20px", border: "1px solid #a2783a" }}>
                      <div style={{ marginBottom: "8px", paddingBottom: "8px", borderBottom: "1px solid rgba(162, 120, 58, 0.3)" }}>
                        <div style={{ display: "flex", justifyContent: "space-between", color: "#92400e", fontSize: "14px", marginBottom: "4px" }}><span>Tickets ({totalSelectedTickets})</span><span>₹{ticketedSubtotal.toLocaleString("en-IN")}</span></div>
                        {discount > 0 && <div style={{ display: "flex", justifyContent: "space-between", color: "#059669", fontSize: "14px" }}><span>Discount</span><span>-₹{discount.toLocaleString("en-IN")}</span></div>}
                      </div>
                      <div style={{ display: "flex", justifyContent: "space-between", fontWeight: "700", color: "#78350f", fontSize: "18px" }}><span>Total</span><span>₹{ticketedTotal.toLocaleString("en-IN")}</span></div>
                    </div>
                    <button type="submit" disabled={loading || totalSelectedTickets === 0} style={{ width: "100%", padding: "16px 24px", backgroundColor: loading || totalSelectedTickets === 0 ? "#9ca3af" : "#a2783a", color: "white", fontSize: "16px", fontWeight: "600", border: "none", borderRadius: "8px", cursor: loading || totalSelectedTickets === 0 ? "not-allowed" : "pointer", marginBottom: "12px" }}>{loading ? "Processing..." : totalSelectedTickets === 0 ? "Select Tickets" : "Book Now"}</button>
                  </div>
                ) : (
                  <div>
                    <div style={{ marginBottom: "20px" }}>
                      <label style={{ display: "block", fontSize: "14px", fontWeight: "500", color: "#374151", marginBottom: "8px" }}><FaCalendarAlt style={{ marginRight: "6px" }} />Event Date</label>
                      <input type="date" value={eventDate} onChange={(e) => setEventDate(e.target.value)} min={today} style={{ width: "100%", padding: "12px", border: "1px solid #d1d5db", borderRadius: "8px", fontSize: "16px" }} />
                    </div>
                    <div style={{ marginBottom: "20px" }}>
                      <label style={{ display: "block", fontSize: "14px", fontWeight: "500", color: "#374151", marginBottom: "8px" }}><FaClock style={{ marginRight: "6px" }} />Select Time</label>
                      <input type="time" value={timeSlot} onChange={(e) => setTimeSlot(e.target.value)} style={{ width: "100%", padding: "12px", border: "1px solid #d1d5db", borderRadius: "8px", fontSize: "16px" }} />
                    </div>
                    {availableAddons.length > 0 && (
                      <div style={{ marginBottom: "20px" }}>
                        <label style={{ display: "block", fontSize: "14px", fontWeight: "500", color: "#374151", marginBottom: "8px" }}>Additional Services</label>
                        <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                          {availableAddons.map((addon, index) => (
                            <label key={index} style={{ display: "flex", alignItems: "center", padding: "12px", border: selectedAddons.find(a => a.name === addon.name) ? "2px solid #a2783a" : "1px solid #e5e7eb", borderRadius: "8px", cursor: "pointer", backgroundColor: selectedAddons.find(a => a.name === addon.name) ? "#fffbeb" : "white" }}>
                              <input type="checkbox" checked={!!selectedAddons.find(a => a.name === addon.name)} onChange={() => toggleAddon(addon)} style={{ marginRight: "12px", width: "18px", height: "18px" }} />
                              <div style={{ flex: 1 }}>
                                <div style={{ fontWeight: "500", color: "#374151" }}>{addon.name}</div>
                                <div style={{ fontSize: "14px", color: "#6b7280" }}>₹{addon.price?.toLocaleString("en-IN") || 0}</div>
                              </div>
                            </label>
                          ))}
                        </div>
                      </div>
                    )}
                    <div style={{ marginBottom: "20px" }}>
                      <label style={{ display: "flex", alignItems: "center", marginBottom: "12px", cursor: "pointer" }}>
                        <input type="checkbox" checked={useCurrentLocation} onChange={handleCheckboxChange} disabled={locationLoading} style={{ width: "18px", height: "18px", marginRight: "8px" }} />
                        <span style={{ fontSize: "14px", fontWeight: "500", color: "#374151" }}>{locationLoading ? 'Getting location...' : 'Use my current location'}</span>
                      </label>
                      {!useCurrentLocation && (
                        <div>
                          <label style={{ display: "block", fontSize: "14px", fontWeight: "500", color: "#374151", marginBottom: "8px" }}><FaMapMarkerAlt style={{ marginRight: "6px" }} />Event Address</label>
                          <textarea value={address} onChange={(e) => setAddress(e.target.value)} placeholder="Enter complete address" rows={3} style={{ width: "100%", padding: "12px", border: "1px solid #d1d5db", borderRadius: "8px", fontSize: "14px", resize: "vertical" }} />
                        </div>
                      )}
                    </div>
                    <div style={{ marginBottom: "20px" }}>
                      <label style={{ display: "block", fontSize: "14px", fontWeight: "500", color: "#374151", marginBottom: "8px" }}><FaPercent style={{ marginRight: "6px" }} />Promo Code (Optional)</label>
                      
                      {/* Available Coupons List for Full Service */}
                      {availableCoupons.length > 0 && (
                        <div style={{ marginBottom: "12px" }}>
                          <p style={{ fontSize: "13px", color: "#6b7280", marginBottom: "6px" }}>🏷️ Available offers ({availableCoupons.length}):</p>
                          <div style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>
                            {availableCoupons.map((coupon) => (
                              <button 
                                key={coupon._id} 
                                type="button" 
                                onClick={() => { 
                                  if (coupon.alreadyUsed) {
                                    toast.error("You have already used this promo code once.");
                                    return;
                                  }
                                  setPromoCode(coupon.code); 
                                  toast.success(`Coupon "${coupon.code}" selected!`); 
                                }} 
                                style={{ 
                                  padding: "6px 12px", 
                                  backgroundColor: "#fef3c7", 
                                  border: "1px solid #f59e0b", 
                                  borderRadius: "6px", 
                                  fontSize: "12px", 
                                  fontWeight: "600", 
                                  color: "#92400e", 
                                  cursor: "pointer",
                                  transition: "all 0.2s"
                                }}
                                onMouseEnter={(e) => e.target.style.backgroundColor = "#fde68a"}
                                onMouseLeave={(e) => e.target.style.backgroundColor = "#fef3c7"}
                              >
                                {coupon.code} - {coupon.discountType === 'percentage' ? `${coupon.discountValue}%` : `₹${coupon.discountValue}`} Off
                              </button>
                            ))}
                          </div>
                        </div>
                      )}

                      <div style={{ display: "flex", gap: "8px" }}>
                        <input type="text" value={promoCode} onChange={(e) => setPromoCode(e.target.value.toUpperCase())} placeholder="Enter code" style={{ flex: 1, padding: "10px 12px", border: "1px solid #d1d5db", borderRadius: "6px", fontSize: "14px" }} />
                        <button type="button" onClick={handleApplyPromo} disabled={!promoCode || !promoCode.trim()} style={{ padding: "10px 20px", backgroundColor: discount > 0 ? "#10b981" : "#a2783a", color: "white", border: "none", borderRadius: "6px", fontSize: "14px", fontWeight: "500", cursor: "pointer", opacity: (!promoCode || !promoCode.trim()) ? 0.6 : 1 }}>Apply</button>
                      </div>
                      {discount > 0 && <div style={{ marginTop: "8px", padding: "8px", backgroundColor: "#d1fae5", borderRadius: "6px", color: "#065f46", fontSize: "14px" }}>Discount applied: ₹{discount.toLocaleString("en-IN")} off</div>}
                    </div>
                    <div style={{ padding: "16px", backgroundColor: "#f9fafb", borderRadius: "8px", marginBottom: "20px", border: "1px solid #e5e7eb" }}>
                      <div style={{ marginBottom: "8px", paddingBottom: "8px", borderBottom: "1px solid #e5e7eb" }}>
                        <div style={{ display: "flex", justifyContent: "space-between", color: "#374151", fontSize: "14px", marginBottom: "4px" }}><span>Base Price</span><span>₹{basePrice.toLocaleString("en-IN")}</span></div>
                        {addonsTotal > 0 && <div style={{ display: "flex", justifyContent: "space-between", color: "#374151", fontSize: "14px" }}><span>Add-ons ({selectedAddons.length})</span><span>₹{addonsTotal.toLocaleString("en-IN")}</span></div>}
                        {discount > 0 && <div style={{ display: "flex", justifyContent: "space-between", color: "#059669", fontSize: "14px" }}><span>Discount</span><span>-₹{discount.toLocaleString("en-IN")}</span></div>}
                      </div>
                      <div style={{ display: "flex", justifyContent: "space-between", fontWeight: "700", color: "#1f2937", fontSize: "18px" }}><span>Total</span><span>₹{fullServiceTotal.toLocaleString("en-IN")}</span></div>
                    </div>
                    <button type="submit" disabled={loading} style={{ width: "100%", padding: "16px 24px", backgroundColor: loading ? "#9ca3af" : "#a2783a", color: "white", fontSize: "16px", fontWeight: "600", border: "none", borderRadius: "8px", cursor: loading ? "not-allowed" : "pointer", marginBottom: "12px" }}>{loading ? "Sending Request..." : "Request Booking"}</button>
                  </div>
                )}
                <button type="button" onClick={onClose} style={{ width: "100%", padding: "16px 24px", backgroundColor: "transparent", border: "1px solid #e5e7eb", borderRadius: "8px", color: "#6b7280", fontSize: "16px", fontWeight: "500", cursor: "pointer" }}>Cancel</button>
              </form>
            </div>
          </div>
        </div>
      </div>
  );
};

export default BookingModal;
