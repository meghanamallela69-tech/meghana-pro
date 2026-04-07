import { useState, useEffect } from "react";
import axios from "axios";
import MerchantLayout from "../../components/merchant/MerchantLayout";
import useAuth from "../../context/useAuth";
import { API_BASE, authHeaders } from "../../lib/http";
import { FaStar, FaRegStar } from "react-icons/fa";

const StarDisplay = ({ rating, size = 14 }) => (
  <div className="flex items-center gap-0.5">
    {[1, 2, 3, 4, 5].map(i => (
      i <= Math.round(rating)
        ? <FaStar key={i} size={size} className="text-yellow-400" />
        : <FaRegStar key={i} size={size} className="text-gray-300" />
    ))}
  </div>
);

const MerchantRatings = () => {
  const { token } = useAuth();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedEvent, setSelectedEvent] = useState(null);

  useEffect(() => {
    axios.get(`${API_BASE}/merchant/ratings`, { headers: authHeaders(token) })
      .then(res => {
        if (res.data.success) {
          setData(res.data);
          if (res.data.events?.length) setSelectedEvent(res.data.events[0]);
        }
      })
      .catch(err => console.error("Failed to load ratings:", err))
      .finally(() => setLoading(false));
  }, [token]);

  const formatDate = d => new Date(d).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });

  if (loading) return (
    <MerchantLayout>
      <div className="flex items-center justify-center py-20">
        <div className="animate-spin h-10 w-10 border-4 border-blue-500 border-t-transparent rounded-full" />
      </div>
    </MerchantLayout>
  );

  return (
    <MerchantLayout>
      <div className="mb-6">
        <h2 className="text-2xl font-semibold">Ratings &amp; Reviews</h2>
        <p className="text-gray-600 mt-1">See what customers say about your events</p>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="bg-white rounded-xl shadow-sm border p-5">
          <p className="text-sm text-gray-500 mb-1">Overall Rating</p>
          <p className="text-3xl font-bold text-yellow-500">{data?.overallAverage ?? "—"}</p>
          <StarDisplay rating={data?.overallAverage ?? 0} size={16} />
        </div>
        <div className="bg-white rounded-xl shadow-sm border p-5">
          <p className="text-sm text-gray-500 mb-1">Total Reviews</p>
          <p className="text-3xl font-bold text-gray-900">{data?.totalReviews ?? 0}</p>
        </div>
        <div className="bg-white rounded-xl shadow-sm border p-5">
          <p className="text-sm text-gray-500 mb-1">Events Rated</p>
          <p className="text-3xl font-bold text-gray-900">
            {data?.events?.filter(e => e.totalRatings > 0).length ?? 0}
          </p>
        </div>
      </div>

      {!data?.events?.length ? (
        <div className="bg-white rounded-xl border p-12 text-center text-gray-500">
          <FaRegStar className="mx-auto text-5xl text-gray-300 mb-3" />
          <p className="text-lg">No reviews yet</p>
          <p className="text-sm mt-1">Reviews will appear here once customers rate your events</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Event list */}
          <div className="space-y-2">
            {data.events.map(ev => (
              <button
                key={ev.eventId}
                onClick={() => setSelectedEvent(ev)}
                className={`w-full text-left p-4 rounded-xl border transition ${
                  selectedEvent?.eventId === ev.eventId
                    ? "border-blue-500 bg-blue-50"
                    : "bg-white hover:bg-gray-50"
                }`}
              >
                <p className="font-medium text-gray-900 truncate">{ev.title}</p>
                <div className="flex items-center gap-2 mt-1">
                  <StarDisplay rating={ev.averageRating} />
                  <span className="text-sm text-gray-500">
                    {ev.averageRating > 0 ? ev.averageRating.toFixed(1) : "No ratings"} ({ev.totalRatings})
                  </span>
                </div>
              </button>
            ))}
          </div>

          {/* Reviews for selected event */}
          <div className="lg:col-span-2">
            {selectedEvent && (
              <div className="bg-white rounded-xl border p-6">
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h3 className="text-lg font-semibold">{selectedEvent.title}</h3>
                    <div className="flex items-center gap-2 mt-1">
                      <StarDisplay rating={selectedEvent.averageRating} size={16} />
                      <span className="text-sm text-gray-600">
                        {selectedEvent.averageRating > 0
                          ? `${selectedEvent.averageRating.toFixed(1)} / 5`
                          : "No ratings yet"}
                        {selectedEvent.totalRatings > 0 && ` · ${selectedEvent.totalRatings} review${selectedEvent.totalRatings !== 1 ? "s" : ""}`}
                      </span>
                    </div>
                  </div>
                </div>

                {selectedEvent.reviews.length === 0 ? (
                  <p className="text-gray-500 text-sm py-8 text-center">No reviews for this event yet</p>
                ) : (
                  <div className="space-y-4">
                    {selectedEvent.reviews.map(r => (
                      <div key={r._id} className="border-b pb-4 last:border-0">
                        <div className="flex items-center justify-between mb-1">
                          <div className="flex items-center gap-2">
                            <div className="w-8 h-8 rounded-full bg-purple-100 flex items-center justify-center text-purple-700 font-semibold text-sm">
                              {r.user?.name?.charAt(0)?.toUpperCase() || "U"}
                            </div>
                            <span className="font-medium text-sm">{r.user?.name || "Anonymous"}</span>
                          </div>
                          <span className="text-xs text-gray-400">{formatDate(r.createdAt)}</span>
                        </div>
                        <StarDisplay rating={r.rating} />
                        {r.reviewText && (
                          <p className="text-sm text-gray-700 mt-2 leading-relaxed">{r.reviewText}</p>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </MerchantLayout>
  );
};

export default MerchantRatings;
