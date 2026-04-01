import { useState, useEffect, useCallback } from "react";
import axios from "axios";
import { useNavigate, useParams } from "react-router-dom";
import useAuth from "../../context/useAuth";
import { API_BASE, authHeaders } from "../../lib/http";
import MerchantLayout from "../../components/merchant/MerchantLayout";
import toast from "react-hot-toast";
import { FiX, FiImage, FiPlus, FiTrash2 } from "react-icons/fi";

const MerchantEditEvent = () => {
  const { token } = useAuth();
  const navigate = useNavigate();
  const { eventId } = useParams();

  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);
  const [categories, setCategories] = useState([]);
  const [eventType, setEventType] = useState("full-service");

  // Common fields
  const [form, setForm] = useState({
    title: "", description: "", category: "",
    location: "", date: "", time: "", duration: "1",
  });

  // Full-service fields
  const [price, setPrice] = useState("");
  const [addons, setAddons] = useState([]);
  const [addonInput, setAddonInput] = useState({ name: "", price: "", type: "fixed", unit: "person" });

  // Ticketed fields
  const [ticketTypes, setTicketTypes] = useState([]);
  const [ticketInput, setTicketInput] = useState({ name: "", price: "", quantityTotal: "" });

  // Features
  const [features, setFeatures] = useState([]);
  const [featureInput, setFeatureInput] = useState("");

  // Images
  const [existingImages, setExistingImages] = useState([]);
  const [newImages, setNewImages] = useState([]);
  const [previews, setPreviews] = useState([]);

  // Load event
  const fetchEvent = useCallback(async () => {
    try {
      const { data } = await axios.get(`${API_BASE}/merchant/events/${eventId}`, { headers: authHeaders(token) });
      const e = data.event;
      if (!e) throw new Error("Not found");

      setEventType(e.eventType || "full-service");
      setForm({
        title: e.title || "",
        description: e.description || "",
        category: e.category || "",
        location: e.location || "",
        date: e.date ? new Date(e.date).toISOString().split("T")[0] : "",
        time: e.time || "",
        duration: String(e.duration || 1),
      });
      setPrice(String(e.price || ""));
      setAddons((e.addons || []).map(a => ({ name: a.name, price: String(a.price || ""), type: a.type || "fixed", unit: a.unit || "person" })));
      setFeatures(e.features || []);
      setExistingImages(e.images || []);

      // Ticketed: map ticketTypes
      if (e.ticketTypes && e.ticketTypes.length > 0) {
        setTicketTypes(e.ticketTypes.map(t => ({
          name: t.name,
          price: String(t.price),
          quantityTotal: String(t.quantityTotal || t.quantity || 0),
          quantitySold: t.quantitySold || 0,
        })));
      }
    } catch {
      toast.error("Failed to load event");
      navigate("/dashboard/merchant/events");
    } finally {
      setFetching(false);
    }
  }, [token, eventId, navigate]);

  useEffect(() => { fetchEvent(); }, [fetchEvent]);

  // Load categories
  useEffect(() => {
    axios.get(`${API_BASE}/categories`, { headers: authHeaders(token) })
      .then(r => { if (r.data.success) setCategories(r.data.categories); })
      .catch(() => {});
  }, [token]);

  // ── Handlers ──────────────────────────────────────────────────────────────
  const handleChange = e => setForm(p => ({ ...p, [e.target.name]: e.target.value }));

  // Features
  const addFeature = () => {
    if (featureInput.trim()) {
      setFeatures(p => [...p, featureInput.trim()]);
      setFeatureInput("");
    }
  };

  // Addons (full-service)
  const addAddon = () => {
    if (!addonInput.name.trim()) return toast.error("Addon name required");
    setAddons(p => [...p, { name: addonInput.name.trim(), price: Number(addonInput.price) || 0, type: addonInput.type || "fixed", unit: addonInput.unit || "person" }]);
    setAddonInput({ name: "", price: "", type: "fixed", unit: "person" });
  };
  const removeAddon = i => setAddons(p => p.filter((_, idx) => idx !== i));

  // Ticket types (ticketed)
  const addTicketType = () => {
    if (!ticketInput.name.trim()) return toast.error("Ticket type name required");
    if (!ticketInput.price || Number(ticketInput.price) < 0) return toast.error("Valid price required");
    if (!ticketInput.quantityTotal || Number(ticketInput.quantityTotal) < 1) return toast.error("Quantity must be at least 1");
    setTicketTypes(p => [...p, {
      name: ticketInput.name.trim(),
      price: ticketInput.price,
      quantityTotal: ticketInput.quantityTotal,
      quantitySold: 0,
    }]);
    setTicketInput({ name: "", price: "", quantityTotal: "" });
  };
  const removeTicketType = i => setTicketTypes(p => p.filter((_, idx) => idx !== i));
  const updateTicketType = (i, field, val) => {
    setTicketTypes(p => p.map((t, idx) => idx === i ? { ...t, [field]: val } : t));
  };

  // Images
  const handleImageChange = e => {
    const files = Array.from(e.target.files);
    const valid = files.filter(f => f.size <= 5 * 1024 * 1024);
    if (valid.length < files.length) toast.error("Some files exceed 5MB and were skipped");
    setNewImages(p => [...p, ...valid]);
    valid.forEach(file => {
      const reader = new FileReader();
      reader.onloadend = () => setPreviews(p => [...p, reader.result]);
      reader.readAsDataURL(file);
    });
  };
  const removeNewImage = i => {
    setNewImages(p => p.filter((_, idx) => idx !== i));
    setPreviews(p => p.filter((_, idx) => idx !== i));
  };

  // ── Submit ─────────────────────────────────────────────────────────────────
  const handleSubmit = async e => {
    e.preventDefault();
    if (!form.title.trim()) return toast.error("Title is required");
    if (existingImages.length + newImages.length === 0) return toast.error("At least one image required");
    if (eventType === "ticketed" && ticketTypes.length === 0) return toast.error("Add at least one ticket type");

    setLoading(true);
    try {
      const fd = new FormData();
      fd.append("title", form.title.trim());
      fd.append("description", form.description);
      fd.append("category", form.category);
      fd.append("location", form.location);
      fd.append("date", form.date);
      fd.append("time", form.time);
      fd.append("duration", form.duration);
      fd.append("features", JSON.stringify(features));

      if (eventType === "full-service") {
        fd.append("price", Number(price) || 0);
        fd.append("addons", JSON.stringify(
          addons.filter(a => a.name?.trim()).map(a => ({
            name: a.name.trim(),
            price: Number(a.price) || 0,
            type: a.type || "fixed",
            unit: a.unit || "person",
          }))
        ));
      } else {
        fd.append("ticketTypes", JSON.stringify(ticketTypes.map(t => ({
          ...t,
          price: Number(t.price),
          quantityTotal: Number(t.quantityTotal),
        }))));
      }

      if (newImages.length > 0) {
        fd.append("bannerImage", newImages[0]);
        newImages.slice(1, 4).forEach(f => fd.append("galleryImages", f));
      }

      await axios.put(`${API_BASE}/merchant/events/${eventId}`, fd, { headers: authHeaders(token) });
      toast.success("Event updated successfully!");
      navigate("/dashboard/merchant/events");
    } catch (err) {
      toast.error(err?.response?.data?.message || "Failed to update event");
    } finally {
      setLoading(false);
    }
  };

  if (fetching) {
    return (
      <MerchantLayout>
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600" />
        </div>
      </MerchantLayout>
    );
  }

  const isTicketed = eventType === "ticketed";

  return (
    <MerchantLayout>
      <div className="mb-6">
        <h2 className="text-2xl font-semibold">Edit Event</h2>
        <p className="text-gray-500 mt-1">
          <span className={`inline-block px-2 py-0.5 rounded text-xs font-semibold ${isTicketed ? "bg-purple-100 text-purple-700" : "bg-blue-100 text-blue-700"}`}>
            {isTicketed ? "Ticketed Event" : "Full-Service Event"}
          </span>
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6 max-w-3xl">

        {/* ── Basic Info ── */}
        <div className="bg-white rounded-xl border p-6 space-y-4">
          <h3 className="font-semibold text-gray-800 border-b pb-2">Basic Information</h3>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Event Title *</label>
            <input name="title" value={form.title} onChange={handleChange} required
              className="w-full border rounded-lg px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Enter event title" />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
            <textarea name="description" value={form.description} onChange={handleChange} rows={3}
              className="w-full border rounded-lg px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Describe your event..." />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
              <select name="category" value={form.category} onChange={handleChange}
                className="w-full border rounded-lg px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-blue-500">
                <option value="">Select category</option>
                {categories.map(c => <option key={c._id} value={c.name}>{c.name}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Location</label>
              <input name="location" value={form.location} onChange={handleChange}
                className="w-full border rounded-lg px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Event location" />
            </div>
          </div>

          {/* Date/Time only for ticketed events */}
          {isTicketed && (
            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Date</label>
                <input type="date" name="date" value={form.date} onChange={handleChange}
                  className="w-full border rounded-lg px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Time</label>
                <input type="time" name="time" value={form.time} onChange={handleChange}
                  className="w-full border rounded-lg px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Duration (hrs)</label>
                <input type="number" name="duration" value={form.duration} onChange={handleChange} min="1"
                  className="w-full border rounded-lg px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
            </div>
          )}
        </div>

        {/* ── Ticketed: Ticket Types ── */}
        {isTicketed && (
          <div className="bg-white rounded-xl border p-6 space-y-4">
            <h3 className="font-semibold text-gray-800 border-b pb-2">Ticket Types</h3>

            {/* Existing ticket types */}
            {ticketTypes.length > 0 && (
              <div className="space-y-2">
                {ticketTypes.map((t, i) => (
                  <div key={i} className="grid grid-cols-4 gap-2 items-center bg-gray-50 rounded-lg p-3">
                    <input value={t.name}
                      onChange={e => updateTicketType(i, "name", e.target.value)}
                      className="border rounded px-3 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
                      placeholder="Type name" />
                    <div className="relative">
                      <span className="absolute left-2 top-1.5 text-gray-400 text-sm">₹</span>
                      <input type="number" value={t.price} min="0"
                        onChange={e => updateTicketType(i, "price", e.target.value)}
                        className="w-full border rounded pl-6 pr-2 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
                        placeholder="Price" />
                    </div>
                    <div>
                      <input type="number" value={t.quantityTotal} min={t.quantitySold || 0}
                        onChange={e => updateTicketType(i, "quantityTotal", e.target.value)}
                        className="w-full border rounded px-3 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
                        placeholder="Total qty" />
                      {t.quantitySold > 0 && (
                        <p className="text-xs text-gray-400 mt-0.5">{t.quantitySold} sold</p>
                      )}
                    </div>
                    <button type="button" onClick={() => removeTicketType(i)}
                      className="flex items-center justify-center p-2 text-red-500 hover:bg-red-50 rounded-lg transition">
                      <FiTrash2 size={16} />
                    </button>
                  </div>
                ))}
              </div>
            )}

            {/* Add new ticket type */}
            <div className="grid grid-cols-4 gap-2 items-end border-t pt-4">
              <div>
                <label className="block text-xs text-gray-500 mb-1">Type Name</label>
                <input value={ticketInput.name} onChange={e => setTicketInput(p => ({ ...p, name: e.target.value }))}
                  className="w-full border rounded px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
                  placeholder="e.g. VIP, Regular" />
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">Price (₹)</label>
                <input type="number" value={ticketInput.price} min="0"
                  onChange={e => setTicketInput(p => ({ ...p, price: e.target.value }))}
                  className="w-full border rounded px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
                  placeholder="0" />
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">Total Quantity</label>
                <input type="number" value={ticketInput.quantityTotal} min="1"
                  onChange={e => setTicketInput(p => ({ ...p, quantityTotal: e.target.value }))}
                  className="w-full border rounded px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
                  placeholder="100" />
              </div>
              <button type="button" onClick={addTicketType}
                className="flex items-center justify-center gap-1 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition text-sm">
                <FiPlus size={14} /> Add
              </button>
            </div>
          </div>
        )}

        {/* ── Full-Service: Price & Addons ── */}
        {!isTicketed && (
          <div className="bg-white rounded-xl border p-6 space-y-4">
            <h3 className="font-semibold text-gray-800 border-b pb-2">Pricing & Add-ons</h3>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Base Price (₹)</label>
              <input type="number" value={price} onChange={e => setPrice(e.target.value)} min="0"
                className="w-full border rounded-lg px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="0 for free" />
            </div>

            {/* Existing addons */}
            {addons.length > 0 && (
              <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-700">Add-ons</label>
                {addons.map((a, i) => (
                  <div key={i} className="flex items-center gap-3 bg-gray-50 rounded-lg px-3 py-2">
                    <span className="flex-1 text-sm font-medium">{a.name}</span>
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${a.type === "per_person" ? "bg-blue-100 text-blue-700" : "bg-gray-200 text-gray-600"}`}>
                      {a.type === "per_person" ? "Per Person" : "Fixed"}
                    </span>
                    <span className="text-sm text-green-600 font-semibold">
                      ₹{a.price}{a.type === "per_person" ? "/person" : ""}
                    </span>
                    <button type="button" onClick={() => removeAddon(i)}
                      className="text-red-400 hover:text-red-600 transition">
                      <FiX size={16} />
                    </button>
                  </div>
                ))}
              </div>
            )}

            {/* Add addon */}
            <div className="border-t pt-4 space-y-3">
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Add-on Name</label>
                  <input value={addonInput.name} onChange={e => setAddonInput(p => ({ ...p, name: e.target.value }))}
                    className="w-full border rounded px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
                    placeholder="e.g. Veg Catering, DJ Music" />
                </div>
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Price (₹)</label>
                  <input type="number" value={addonInput.price} min="0"
                    onChange={e => setAddonInput(p => ({ ...p, price: e.target.value }))}
                    className="w-full border rounded px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
                    placeholder="0" />
                </div>
              </div>
              <div className="flex items-center gap-3">
                <label className="text-xs text-gray-500 font-medium">Pricing Type:</label>
                <div className="flex rounded-lg overflow-hidden border border-gray-200">
                  <button type="button"
                    onClick={() => setAddonInput(p => ({ ...p, type: "fixed" }))}
                    className={`px-3 py-1.5 text-xs font-semibold transition ${addonInput.type === "fixed" ? "bg-blue-600 text-white" : "bg-white text-gray-600 hover:bg-gray-50"}`}>
                    Fixed
                  </button>
                  <button type="button"
                    onClick={() => setAddonInput(p => ({ ...p, type: "per_person" }))}
                    className={`px-3 py-1.5 text-xs font-semibold transition ${addonInput.type === "per_person" ? "bg-blue-600 text-white" : "bg-white text-gray-600 hover:bg-gray-50"}`}>
                    Per Person
                  </button>
                </div>
              </div>
              <button type="button" onClick={addAddon}
                className="w-full flex items-center justify-center gap-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition text-sm">
                <FiPlus size={14} /> Add Add-on
              </button>
            </div>
          </div>
        )}

        {/* ── Features ── */}
        <div className="bg-white rounded-xl border p-6 space-y-3">
          <h3 className="font-semibold text-gray-800 border-b pb-2">Event Features</h3>
          <div className="flex gap-2">
            <input value={featureInput} onChange={e => setFeatureInput(e.target.value)}
              onKeyDown={e => { if (e.key === "Enter") { e.preventDefault(); addFeature(); } }}
              className="flex-1 border rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="e.g. Live Music, Free Parking" />
            <button type="button" onClick={addFeature}
              className="px-4 py-2 bg-gray-800 text-white rounded-lg hover:bg-black transition text-sm">
              Add
            </button>
          </div>
          <div className="flex flex-wrap gap-2">
            {features.map((f, i) => (
              <span key={i} className="inline-flex items-center gap-1 px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-sm">
                {f}
                <button type="button" onClick={() => setFeatures(p => p.filter((_, idx) => idx !== i))}>
                  <FiX size={13} />
                </button>
              </span>
            ))}
          </div>
        </div>

        {/* ── Images ── */}
        <div className="bg-white rounded-xl border p-6 space-y-4">
          <h3 className="font-semibold text-gray-800 border-b pb-2">Event Images</h3>

          {existingImages.length > 0 && (
            <div>
              <p className="text-sm text-gray-500 mb-2">Current images:</p>
              <div className="grid grid-cols-4 gap-3">
                {existingImages.map((img, i) => (
                  <div key={i} className="relative aspect-square rounded-lg overflow-hidden group">
                    <img src={img.url} alt="" className="w-full h-full object-cover" />
                    <button type="button" onClick={() => setExistingImages(p => p.filter((_, idx) => idx !== i))}
                      className="absolute top-1 right-1 p-1 bg-red-500 text-white rounded-full opacity-0 group-hover:opacity-100 transition">
                      <FiX size={14} />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
            <input type="file" id="imgs" accept="image/*" multiple onChange={handleImageChange} className="hidden" />
            <label htmlFor="imgs" className="cursor-pointer flex flex-col items-center gap-2">
              <FiImage className="text-gray-400 text-4xl" />
              <span className="text-blue-600 font-medium text-sm">Click to upload new images</span>
              <span className="text-xs text-gray-400">PNG, JPG up to 5MB · max 4 images</span>
            </label>
          </div>

          {previews.length > 0 && (
            <div className="grid grid-cols-4 gap-3">
              {previews.map((src, i) => (
                <div key={i} className="relative aspect-square rounded-lg overflow-hidden group">
                  <img src={src} alt="" className="w-full h-full object-cover" />
                  <button type="button" onClick={() => removeNewImage(i)}
                    className="absolute top-1 right-1 p-1 bg-red-500 text-white rounded-full opacity-0 group-hover:opacity-100 transition">
                    <FiX size={14} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* ── Actions ── */}
        <div className="flex gap-4 pb-8">
          <button type="button" onClick={() => navigate("/dashboard/merchant/events")}
            className="flex-1 px-6 py-3 rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50 transition font-medium">
            Cancel
          </button>
          <button type="submit" disabled={loading}
            className="flex-1 px-6 py-3 rounded-lg bg-blue-600 text-white hover:bg-blue-700 transition disabled:opacity-50 font-medium">
            {loading ? "Saving..." : "Save Changes"}
          </button>
        </div>
      </form>
    </MerchantLayout>
  );
};

export default MerchantEditEvent;
