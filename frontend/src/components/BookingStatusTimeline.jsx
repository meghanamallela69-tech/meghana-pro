import { FiCheck, FiClock, FiAlertCircle, FiX } from "react-icons/fi";

const BookingStatusTimeline = ({ booking }) => {
  const statusSteps = [
    {
      key: "pending",
      label: "Booking Created",
      description: "Waiting for merchant review"
    },
    {
      key: "advance_requested",
      label: "Advance Requested",
      description: "Merchant requested 30% advance payment"
    },
    {
      key: "advance_paid",
      label: "Advance Paid",
      description: "30% advance payment received"
    },
    {
      key: "accepted",
      label: "Booking Accepted",
      description: "Merchant accepted your booking"
    },
    {
      key: "processing",
      label: "In Progress",
      description: "Event is happening now"
    },
    {
      key: "completed",
      label: "Event Completed",
      description: "Event finished, pay remaining amount"
    }
  ];

  const getStatusIndex = () => {
    return statusSteps.findIndex(step => step.key === booking.status);
  };

  const currentIndex = getStatusIndex();

  const getStatusIcon = (index) => {
    if (index < currentIndex) {
      return <FiCheck className="w-6 h-6 text-green-600" />;
    } else if (index === currentIndex) {
      return <FiClock className="w-6 h-6 text-blue-600 animate-spin" />;
    } else {
      return <FiAlertCircle className="w-6 h-6 text-gray-400" />;
    }
  };

  const getStatusColor = (index) => {
    if (index < currentIndex) return "bg-green-100 border-green-300";
    if (index === currentIndex) return "bg-blue-100 border-blue-300";
    return "bg-gray-100 border-gray-300";
  };

  const getTextColor = (index) => {
    if (index < currentIndex) return "text-green-700";
    if (index === currentIndex) return "text-blue-700";
    return "text-gray-500";
  };

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <h3 className="text-lg font-bold mb-6">Booking Status Timeline</h3>

      <div className="space-y-4">
        {statusSteps.map((step, index) => (
          <div key={step.key} className="flex gap-4">
            {/* Timeline dot and line */}
            <div className="flex flex-col items-center">
              <div className={`w-12 h-12 rounded-full border-2 flex items-center justify-center ${getStatusColor(index)}`}>
                {getStatusIcon(index)}
              </div>
              {index < statusSteps.length - 1 && (
                <div className={`w-1 h-12 ${index < currentIndex ? "bg-green-300" : "bg-gray-300"}`} />
              )}
            </div>

            {/* Status info */}
            <div className="flex-1 pt-2">
              <h4 className={`font-semibold ${getTextColor(index)}`}>
                {step.label}
              </h4>
              <p className="text-sm text-gray-600">{step.description}</p>

              {/* Show payment info for relevant steps */}
              {step.key === "advance_requested" && booking.advanceAmount && (
                <p className="text-sm text-blue-600 mt-1">
                  Amount: ₹{booking.advanceAmount}
                </p>
              )}
              {step.key === "completed" && booking.remainingAmount && (
                <p className="text-sm text-blue-600 mt-1">
                  Remaining: ₹{booking.remainingAmount}
                </p>
              )}
            </div>

            {/* Status badge */}
            {index === currentIndex && (
              <div className="flex items-center">
                <span className="bg-blue-600 text-white text-xs px-3 py-1 rounded-full">
                  Current
                </span>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Payment Status Summary */}
      <div className="mt-6 pt-6 border-t">
        <h4 className="font-semibold mb-3">Payment Summary</h4>
        <div className="grid grid-cols-2 gap-4">
          <div className="bg-gray-50 p-3 rounded">
            <p className="text-sm text-gray-600">Total Amount</p>
            <p className="text-lg font-bold">₹{booking.totalPrice}</p>
          </div>
          <div className={`p-3 rounded ${booking.advancePaid ? "bg-green-50" : "bg-yellow-50"}`}>
            <p className="text-sm text-gray-600">Advance (30%)</p>
            <p className="text-lg font-bold">
              {booking.advancePaid ? "✓ Paid" : "Pending"}
            </p>
          </div>
          <div className={`p-3 rounded ${booking.paymentStatus === "paid" ? "bg-green-50" : "bg-gray-50"}`}>
            <p className="text-sm text-gray-600">Remaining (70%)</p>
            <p className="text-lg font-bold">
              {booking.paymentStatus === "paid" ? "✓ Paid" : "Pending"}
            </p>
          </div>
          <div className="bg-blue-50 p-3 rounded">
            <p className="text-sm text-gray-600">Status</p>
            <p className="text-lg font-bold text-blue-600 capitalize">
              {booking.status.replace(/_/g, " ")}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default BookingStatusTimeline;
