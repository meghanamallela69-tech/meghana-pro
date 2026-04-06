import { useState, useEffect } from "react";
import axios from "axios";
import toast from "react-hot-toast";
import { FiCalendar, FiClock, FiMapPin, FiUsers, FiDollarSign, FiCheck, FiX, FiLoader } from "react-icons/fi";
import { API_BASE } from "../lib/http";
import useAuth from "../context/useAuth";

const FullServiceBookingFlow = ({ event, isOpen, onClose, onSuccess }) => {
  const { token } = useAuth();
  const [step, setStep] = useState(1); // 1: Details, 2: Addons, 3: Review, 4: Confirm
  const [loading, setLoading] = useState(false);

  // Form state
  const [eventDate, setEventDate] = useState("");
  const [eventTime, setEventTime] = useState("");
  const [guestCount, setGuestCount] = useState(1);
  const [location, setLocation] = useState(event?.location || "");
  const [notes, setNotes] = useState("");
  const [selectedAddons, setSelectedAddons] = useState([]);

  if (!isOpen || !event) return null;

  // Calculate pricing
  const basePrice = event.price * guestCount;
  const addonTotal = selectedAddons.reduce((sum, addon) => sum + (addon.price * addon.quantity), 0);
  const totalAmount = basePrice + addonTotal;
  const advanceAmount = Math.round((totalAmount * 30) / 100 * 100) / 100;
  const remainingAmount = Math.round((totalAmount * 70) / 100 * 100) / 100;

  const handleAddAddon = (addon) => {
    const existing = selectedAddons.find(a => a.name === addon.name);
    if (existing) {
      setSelectedAddons(selectedAddons.map(a =>
        a.name === addon.name ? { ...a, quantity: a.quantity + 1 } : a
      ));
    } else {
      setSelectedAddons([...selectedAddons, { ...addon, quantity: 1 }]);
    }
  };

  const handleRemoveAddon = (addonName) => {
    setSelectedAddons(selectedAddons.filter(a => a.name !== addonName));
  };

  const handleConfirmBooking = async () => {
    try {
      setLoading(true);

      const response = await axios.post(
        `${API_BASE}/bookings/full-service`,
        {
          eventId: event._id,
          eventDate,
          eventTime,
          guestCount: parseInt(guestCount),
          selectedAddons,
          location,
          notes,
          totalAmount
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      if (response.data.success) {
        toast.success("Booking created! Waiting for merchant approval.");
        onSuccess?.(response.data.booking);
        onClose();
      }
    } catch (error) {
      toast.error(error.response?.data?.message || "Booking failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-gradient-to-r from-blue-600 to-blue-700 text-white p-6 flex justify-between items-center">
          <div>
            <h2 className="text-2xl font-bold">{event.title}</h2>
            <p className="text-blue-100">Step {step} of 4</p>
          </div>
          <button onClick={onClose} className="text-2xl hover:bg-blue-800 p-2 rounded">
            ✕
          </button>
        </div>

        {/* Progress Bar */}
        <div className="bg-gray-100 p-4">
          <div className="flex justify-between mb-2">
            {[1, 2, 3, 4].map(s => (
              <div
                key={s}
                className={`h-2 flex-1 mx-1 rounded ${
                  s <= step ? "bg-blue-600" : "bg-gray-300"
                }`}
              />
            ))}
          </div>
        </div>

        {/* Content */}
        <div className="p-6">
          {/* Step 1: Event Details */}
          {step === 1 && (
            <div className="space-y-4">
              <h3 className="text-lg font-semibold mb-4">Select Event Details</h3>

              <div>
                <label className="block text-sm font-medium mb-2">Event Date *</label>
                <input
                  type="date"
                  value={eventDate}
                  onChange={(e) => setEventDate(e.target.value)}
                  className="w-full border rounded-lg p-3"
                  min={new Date().toISOString().split("T")[0]}
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Event Time *</label>
                <input
                  type="time"
                  value={eventTime}
                  onChange={(e) => setEventTime(e.target.value)}
                  className="w-full border rounded-lg p-3"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Number of Guests *</label>
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => setGuestCount(Math.max(1, guestCount - 1))}
                    className="bg-gray-200 p-2 rounded"
                  >
                    −
                  </button>
                  <input
                    type="number"
                    value={guestCount}
                    onChange={(e) => setGuestCount(Math.max(1, parseInt(e.target.value) || 1))}
                    className="w-20 border rounded-lg p-2 text-center"
                    min="1"
                  />
                  <button
                    onClick={() => setGuestCount(guestCount + 1)}
                    className="bg-gray-200 p-2 rounded"
                  >
                    +
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Location</label>
                <input
                  type="text"
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  placeholder="Event location"
                  className="w-full border rounded-lg p-3"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Special Notes</label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Any special requests or notes..."
                  className="w-full border rounded-lg p-3 h-24"
                />
              </div>
            </div>
          )}

          {/* Step 2: Add-ons */}
          {step === 2 && (
            <div className="space-y-4">
              <h3 className="text-lg font-semibold mb-4">Select Add-ons (Optional)</h3>

              {event.addons && event.addons.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {event.addons.map((addon, idx) => (
                    <div key={idx} className="border rounded-lg p-4 hover:shadow-lg transition">
                      <div className="flex justify-between items-start mb-2">
                        <div>
                          <h4 className="font-semibold">{addon.name}</h4>
                          <p className="text-sm text-gray-600">{addon.description}</p>
                        </div>
                        <span className="text-lg font-bold text-blue-600">₹{addon.price}</span>
                      </div>

                      {selectedAddons.find(a => a.name === addon.name) ? (
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => {
                              const existing = selectedAddons.find(a => a.name === addon.name);
                              if (existing.quantity > 1) {
                                setSelectedAddons(selectedAddons.map(a =>
                                  a.name === addon.name ? { ...a, quantity: a.quantity - 1 } : a
                                ));
                              } else {
                                handleRemoveAddon(addon.name);
                              }
                            }}
                            className="bg-red-100 text-red-600 px-3 py-1 rounded"
                          >
                            −
                          </button>
                          <span className="font-semibold">
                            {selectedAddons.find(a => a.name === addon.name)?.quantity}
                          </span>
                          <button
                            onClick={() => handleAddAddon(addon)}
                            className="bg-green-100 text-green-600 px-3 py-1 rounded"
                          >
                            +
                          </button>
                          <button
                            onClick={() => handleRemoveAddon(addon.name)}
                            className="ml-auto bg-red-500 text-white px-3 py-1 rounded"
                          >
                            Remove
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => handleAddAddon(addon)}
                          className="w-full bg-blue-600 text-white py-2 rounded hover:bg-blue-700"
                        >
                          Add
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-gray-500">No add-ons available for this event</p>
              )}
            </div>
          )}

          {/* Step 3: Review */}
          {step === 3 && (
            <div className="space-y-4">
              <h3 className="text-lg font-semibold mb-4">Review Your Booking</h3>

              <div className="bg-gray-50 rounded-lg p-4 space-y-3">
                <div className="flex justify-between">
                  <span className="text-gray-600">Event:</span>
                  <span className="font-semibold">{event.title}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Date:</span>
                  <span className="font-semibold">{new Date(eventDate).toLocaleDateString()}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Time:</span>
                  <span className="font-semibold">{eventTime}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Guests:</span>
                  <span className="font-semibold">{guestCount}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Location:</span>
                  <span className="font-semibold">{location}</span>
                </div>

                {selectedAddons.length > 0 && (
                  <>
                    <div className="border-t pt-3">
                      <p className="font-semibold mb-2">Add-ons:</p>
                      {selectedAddons.map((addon, idx) => (
                        <div key={idx} className="flex justify-between text-sm">
                          <span>{addon.name} × {addon.quantity}</span>
                          <span>₹{addon.price * addon.quantity}</span>
                        </div>
                      ))}
                    </div>
                  </>
                )}

                <div className="border-t pt-3 space-y-2">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Base Amount:</span>
                    <span>₹{basePrice}</span>
                  </div>
                  {addonTotal > 0 && (
                    <div className="flex justify-between">
                      <span className="text-gray-600">Add-ons Total:</span>
                      <span>₹{addonTotal}</span>
                    </div>
                  )}
                  <div className="flex justify-between text-lg font-bold border-t pt-2">
                    <span>Total Amount:</span>
                    <span className="text-blue-600">₹{totalAmount}</span>
                  </div>
                </div>
              </div>

              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <p className="text-sm text-blue-800">
                  <strong>Payment Plan:</strong><br/>
                  • Advance (30%): ₹{advanceAmount}<br/>
                  • Remaining (70%): ₹{remainingAmount}
                </p>
              </div>
            </div>
          )}

          {/* Step 4: Confirmation */}
          {step === 4 && (
            <div className="space-y-4">
              <h3 className="text-lg font-semibold mb-4">Confirm Booking</h3>

              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <p className="text-green-800">
                  ✓ Your booking details are ready. Click "Confirm Booking" to proceed.
                </p>
              </div>

              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                <p className="text-sm text-yellow-800">
                  <strong>Next Steps:</strong><br/>
                  1. Merchant will review your booking<br/>
                  2. You'll receive a notification to pay 30% advance<br/>
                  3. After payment, merchant will accept your booking<br/>
                  4. Pay remaining 70% after event completion
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="bg-gray-50 p-6 flex justify-between gap-3 border-t">
          <button
            onClick={() => step > 1 ? setStep(step - 1) : onClose()}
            className="px-6 py-2 border rounded-lg hover:bg-gray-100"
          >
            {step === 1 ? "Cancel" : "Back"}
          </button>

          {step < 4 ? (
            <button
              onClick={() => {
                if (step === 1 && (!eventDate || !eventTime)) {
                  toast.error("Please fill in all required fields");
                  return;
                }
                setStep(step + 1);
              }}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              Next
            </button>
          ) : (
            <button
              onClick={handleConfirmBooking}
              disabled={loading}
              className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50"
            >
              {loading ? "Processing..." : "Confirm Booking"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default FullServiceBookingFlow;
