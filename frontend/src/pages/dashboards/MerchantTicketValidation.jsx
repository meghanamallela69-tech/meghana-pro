import { useState } from "react";
import axios from "axios";
import MerchantLayout from "../../components/merchant/MerchantLayout";
import useAuth from "../../context/useAuth";
import { FaTicketAlt, FaCheckCircle, FaTimesCircle, FaSearch, FaQrcode, FaUser, FaCalendarAlt, FaHashtag } from "react-icons/fa";
import { API_BASE, authHeaders } from "../../lib/http";
import { toast } from "react-hot-toast";

const MerchantTicketValidation = () => {
  const { token } = useAuth();
  const [ticketCode, setTicketCode] = useState("");
  const [validationResult, setValidationResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [recentValidations, setRecentValidations] = useState([]);

  const handleValidateTicket = async (e) => {
    e.preventDefault();
    
    if (!ticketCode.trim()) {
      toast.error("Please enter a ticket code");
      return;
    }

    setLoading(true);

    // Helper: extract only safe primitive fields from a booking object
    const extractBooking = (b, valid, extra = {}) => ({
      valid,
      ticketNumber: typeof b?.ticketNumber === 'string' ? b.ticketNumber : null,
      userName: typeof b?.userName === 'string' ? b.userName : null,
      userEmail: typeof b?.userEmail === 'string' ? b.userEmail : null,
      userPhone: typeof b?.userPhone === 'string' ? b.userPhone : null,
      eventTitle: typeof b?.eventTitle === 'string' ? b.eventTitle : null,
      status: typeof b?.status === 'string' ? b.status : null,
      paymentStatus: typeof b?.paymentStatus === 'string' ? b.paymentStatus : null,
      totalPrice: typeof b?.totalPrice === 'number' ? String(b.totalPrice) : null,
      finalAmount: typeof b?.finalAmount === 'number' ? String(b.finalAmount) : null,
      quantity: (typeof b?.quantity === 'number' && b.quantity > 0) ? String(b.quantity) : null,
      guestCount: (typeof b?.guestCount === 'number' && b.guestCount > 0) ? String(b.guestCount) : null,
      ticketType: typeof b?.ticketType === 'string' ? b.ticketType : null,
      validatedAt: typeof b?.validatedAt === 'string' ? b.validatedAt : new Date().toISOString(),
      ...extra,
    });

    try {
      const response = await axios.get(
        `${API_BASE}/bookings/merchant/validate-ticket/${encodeURIComponent(ticketCode.trim())}`,
        { headers: authHeaders(token) }
      );

      const data = response.data;

      if (data.booking) {
        const result = extractBooking(data.booking, !!data.success);
        setValidationResult(result);
        // Add to recent validations table
        setRecentValidations(prev => [{
          ticketNumber: result.ticketNumber || ticketCode.trim(),
          eventTitle: result.eventTitle || '—',
          userName: result.userName || '—',
          status: data.success ? 'Valid' : result.alreadyUsed ? 'Already Used' : 'Invalid',
          validatedAt: result.validatedAt || new Date().toISOString(),
        }, ...prev].slice(0, 20));
        if (data.success) toast.success("✅ Ticket validated successfully!");
        else toast.error(data.message || "Ticket validation failed");
      } else {
        setValidationResult({ valid: false, error: data.message || "Ticket validation failed" });
        setRecentValidations(prev => [{
          ticketNumber: ticketCode.trim(),
          eventTitle: '—',
          userName: '—',
          status: 'Invalid',
          validatedAt: new Date().toISOString(),
        }, ...prev].slice(0, 20));
        toast.error(data.message || "Ticket validation failed");
      }
    } catch (error) {
      const errorData = error.response?.data;
      const errorMessage = errorData?.message || error.message || "Failed to validate ticket";

      if (errorData?.booking) {
        const result = extractBooking(errorData.booking, false, {
          alreadyUsed: !!errorData.alreadyUsed,
          error: errorMessage,
        });
        setValidationResult(result);
        setRecentValidations(prev => [{
          ticketNumber: result.ticketNumber || ticketCode.trim(),
          eventTitle: result.eventTitle || '—',
          userName: result.userName || '—',
          status: errorData.alreadyUsed ? 'Already Used' : 'Invalid',
          validatedAt: new Date().toISOString(),
        }, ...prev].slice(0, 20));
      } else {
        setValidationResult({ valid: false, error: errorMessage });
        setRecentValidations(prev => [{
          ticketNumber: ticketCode.trim(),
          eventTitle: '—',
          userName: '—',
          status: 'Invalid',
          validatedAt: new Date().toISOString(),
        }, ...prev].slice(0, 20));
      }

      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleReset = () => {
    setTicketCode("");
    setValidationResult(null);
  };

  return (
    <MerchantLayout>
      <div className="mb-6">
        <h2 className="text-2xl font-semibold">Ticket Validation</h2>
        <p className="text-gray-600 mt-1">Verify and validate attendee tickets at the event</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Validation Form */}
        <div className="bg-white rounded-xl shadow-sm border p-6">
          <div className="flex items-center gap-3 mb-6">
            <div className="h-12 w-12 bg-blue-100 rounded-lg flex items-center justify-center">
              <FaTicketAlt className="text-blue-600 text-xl" />
            </div>
            <div>
              <h3 className="font-semibold text-lg">Scan or Enter Ticket</h3>
              <p className="text-sm text-gray-500">Validate tickets by entering the code</p>
            </div>
          </div>

          <form onSubmit={handleValidateTicket} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Ticket Number / QR Code
              </label>
              <div className="relative">
                <input
                  type="text"
                  value={ticketCode}
                  onChange={(e) => setTicketCode(e.target.value.toUpperCase())}
                  placeholder="Enter ticket code (e.g., TKT-123456-ABC123)"
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent uppercase"
                  disabled={loading}
                />
                <FaQrcode className="absolute right-3 top-3.5 text-gray-400 text-xl" />
              </div>
            </div>

            <div className="flex gap-3">
              <button
                type="submit"
                disabled={loading || !ticketCode.trim()}
                className="flex-1 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {loading ? (
                  <>
                    <div className="animate-spin h-5 w-5 border-2 border-white border-t-transparent rounded-full"></div>
                    Validating...
                  </>
                ) : (
                  <>
                    <FaSearch />
                    Validate Ticket
                  </>
                )}
              </button>
              
              <button
                type="button"
                onClick={handleReset}
                className="px-6 py-3 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition"
              >
                Reset
              </button>
            </div>
          </form>

          <div className="mt-6 p-4 bg-gray-50 rounded-lg">
            <h4 className="font-medium text-sm text-gray-700 mb-2">How to validate:</h4>
            <ol className="text-sm text-gray-600 space-y-1 list-decimal list-inside">
              <li>Ask attendee for their ticket</li>
              <li>Enter the ticket number or scan QR code</li>
              <li>Click "Validate Ticket"</li>
              <li>Check the validation result</li>
            </ol>
          </div>
        </div>

        {/* Validation Result */}
        <div className="bg-white rounded-xl shadow-sm border p-6">
          <div className="flex items-center gap-3 mb-6">
            <div className="h-12 w-12 bg-green-100 rounded-lg flex items-center justify-center">
              <FaCheckCircle className="text-green-600 text-xl" />
            </div>
            <div>
              <h3 className="font-semibold text-lg">Validation Result</h3>
              <p className="text-sm text-gray-500">Ticket verification status</p>
            </div>
          </div>

          {!validationResult ? (
            <div className="flex flex-col items-center justify-center h-64 text-gray-400">
              <FaTicketAlt className="text-6xl mb-4 opacity-20" />
              <p className="text-lg">No ticket validated yet</p>
              <p className="text-sm">Enter a ticket code to validate</p>
            </div>
          ) : (
            <div className={`rounded-lg border-2 p-6 ${validationResult.valid ? 'border-green-200 bg-green-50' : 'border-red-200 bg-red-50'}`}>
              {/* Header */}
              <div className="flex items-center gap-3 mb-5">
                {validationResult.valid
                  ? <FaCheckCircle className="text-green-600 text-3xl" />
                  : <FaTimesCircle className="text-red-600 text-3xl" />}
                <div>
                  <h4 className={`font-bold text-lg ${validationResult.valid ? 'text-green-800' : 'text-red-800'}`}>
                    {validationResult.valid ? 'VALID TICKET' : validationResult.alreadyUsed ? 'ALREADY USED' : 'INVALID TICKET'}
                  </h4>
                  <p className={`text-sm ${validationResult.valid ? 'text-green-600' : 'text-red-600'}`}>
                    {validationResult.valid ? 'Entry approved' : validationResult.error || 'Entry denied'}
                  </p>
                </div>
              </div>

              {/* Details — only safe string/number fields */}
              <div className="space-y-2">
                {[
                  { label: 'Ticket Number', value: validationResult.ticketNumber, mono: true },
                  { label: 'Attendee', value: validationResult.userName, icon: <FaUser className="text-gray-400" /> },
                  { label: 'Event', value: validationResult.eventTitle, icon: <FaCalendarAlt className="text-gray-400" /> },
                  { label: 'Ticket Type', value: validationResult.ticketType, icon: <FaHashtag className="text-gray-400" /> },
                  { label: 'Quantity', value: (validationResult.quantity || validationResult.guestCount) ? `${validationResult.quantity || validationResult.guestCount} ticket(s)` : null },
                  { label: 'Total Price', value: (validationResult.totalPrice || validationResult.finalAmount) ? `₹${Number(validationResult.totalPrice || validationResult.finalAmount).toLocaleString('en-IN')}` : null, green: true },
                  { label: 'Email', value: validationResult.userEmail },
                  { label: 'Phone', value: validationResult.userPhone },
                  { label: 'Validated At', value: validationResult.validatedAt ? new Date(validationResult.validatedAt).toLocaleString() : null },
                ].filter(row => row.value && typeof row.value === 'string').map(row => (
                  <div key={row.label} className="bg-white p-3 rounded-lg border flex justify-between items-center gap-3">
                    <span className="text-sm font-medium text-gray-700 flex items-center gap-2 flex-shrink-0">
                      {row.icon}{row.label}:
                    </span>
                    <span className={`text-sm font-semibold text-right truncate ${row.mono ? 'font-mono text-blue-600' : row.green ? 'text-green-600' : 'text-gray-900'}`}>
                      {row.value}
                    </span>
                  </div>
                ))}

                {/* Booking status badges */}
                {(validationResult.status || validationResult.paymentStatus) && (
                  <div className="bg-white p-3 rounded-lg border flex justify-between items-center">
                    <span className="text-sm font-medium text-gray-700">Status:</span>
                    <div className="flex gap-2">
                      {validationResult.status && typeof validationResult.status === 'string' && (
                        <span className={`text-xs font-medium px-3 py-1 rounded-full ${['confirmed','paid','completed'].includes(validationResult.status) ? 'bg-green-100 text-green-700' : validationResult.status === 'pending' ? 'bg-yellow-100 text-yellow-700' : 'bg-gray-100 text-gray-700'}`}>
                          {validationResult.status.toUpperCase()}
                        </span>
                      )}
                      {validationResult.paymentStatus && typeof validationResult.paymentStatus === 'string' && (
                        <span className={`text-xs font-medium px-3 py-1 rounded-full ${validationResult.paymentStatus === 'paid' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                          {validationResult.paymentStatus.toUpperCase()}
                        </span>
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* Footer message */}
              {validationResult.valid && (
                <div className="mt-4 pt-4 border-t border-green-200">
                  <p className="text-sm text-green-700 flex items-center gap-2">
                    <FaCheckCircle /> <strong>Entry Approved</strong> — Ticket marked as used.
                  </p>
                </div>
              )}
              {validationResult.alreadyUsed && (
                <div className="mt-4 pt-4 border-t border-red-200">
                  <p className="text-sm text-red-700 flex items-center gap-2">
                    <FaTimesCircle /> <strong>Already Validated</strong> — Entry denied.
                  </p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Recent Validations Table */}
      <div className="mt-6 bg-white rounded-xl shadow-sm border">
        <div className="px-6 py-4 border-b flex items-center justify-between">
          <h3 className="font-semibold text-lg">Recent Validations</h3>
          {recentValidations.length > 0 && (
            <span className="text-xs text-gray-500">{recentValidations.length} this session</span>
          )}
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-gray-600">
              <tr>
                <th className="text-left px-6 py-3">Ticket Number</th>
                <th className="text-left px-6 py-3">Event</th>
                <th className="text-left px-6 py-3">Attendee</th>
                <th className="text-left px-6 py-3">Status</th>
                <th className="text-left px-6 py-3">Validated At</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {recentValidations.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-8 text-center text-gray-500">
                    No validations yet. Start validating tickets above.
                  </td>
                </tr>
              ) : recentValidations.map((v, i) => (
                <tr key={i} className="hover:bg-gray-50 transition">
                  <td className="px-6 py-3 font-mono text-blue-600 text-xs">{v.ticketNumber}</td>
                  <td className="px-6 py-3 text-gray-800 max-w-[180px] truncate">{v.eventTitle}</td>
                  <td className="px-6 py-3 text-gray-700">{v.userName}</td>
                  <td className="px-6 py-3">
                    <span className={`px-2 py-1 rounded-full text-xs font-semibold ${
                      v.status === 'Valid' ? 'bg-green-100 text-green-700' :
                      v.status === 'Already Used' ? 'bg-yellow-100 text-yellow-700' :
                      'bg-red-100 text-red-700'
                    }`}>
                      {v.status}
                    </span>
                  </td>
                  <td className="px-6 py-3 text-gray-500 text-xs">{new Date(v.validatedAt).toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </MerchantLayout>
  );
};

export default MerchantTicketValidation;
