import { useState, useEffect, useCallback } from "react";
import axios from "axios";
import QRCode from "react-qr-code";
import MerchantLayout from "../../components/merchant/MerchantLayout";
import useAuth from "../../context/useAuth";
import { API_BASE, authHeaders } from "../../lib/http";
import { toast } from "react-hot-toast";
import { FiDownload, FiCopy, FiExternalLink } from "react-icons/fi";
import { FaQrcode, FaPlus } from "react-icons/fa";

const MerchantQRCodes = () => {
  const { token } = useAuth();
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [qrMap, setQrMap] = useState({});

  const loadEvents = useCallback(async () => {
    try {
      const { data } = await axios.get(`${API_BASE}/merchant/events`, { headers: authHeaders(token) });
      setEvents(data.events || []);
    } catch {
      toast.error("Failed to load events");
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    loadEvents();
    const saved = localStorage.getItem("merchant_qr_map");
    if (saved) setQrMap(JSON.parse(saved));
  }, [loadEvents]);

  const getEventUrl = (eventId) => `${window.location.origin}/event/${eventId}`;

  const generateQR = (eventId) => {
    const updated = { ...qrMap, [eventId]: true };
    setQrMap(updated);
    localStorage.setItem("merchant_qr_map", JSON.stringify(updated));
    toast.success("QR Code generated!");
  };

  const copyLink = (eventId) => {
    navigator.clipboard.writeText(getEventUrl(eventId));
    toast.success("Link copied!");
  };

  const openInNewTab = (eventId) => {
    window.open(getEventUrl(eventId), "_blank");
  };

  const downloadQR = (eventId, title) => {
    const svg = document.getElementById(`qr-${eventId}`);
    if (!svg) return;
    const svgData = new XMLSerializer().serializeToString(svg);
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");
    const img = new Image();
    const blob = new Blob([svgData], { type: "image/svg+xml;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    img.onload = () => {
      canvas.width = 256;
      canvas.height = 256;
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, 256, 256);
      ctx.drawImage(img, 0, 0, 256, 256);
      URL.revokeObjectURL(url);
      const a = document.createElement("a");
      a.download = `${title.replace(/\s+/g, "_")}_QR.png`;
      a.href = canvas.toDataURL("image/png");
      a.click();
    };
    img.src = url;
  };

  return (
    <MerchantLayout>
      {/* Header */}
      <div className="mb-6">
        <h2 className="text-2xl font-semibold text-gray-900">QR Codes</h2>
        <p className="text-gray-500 text-sm mt-1">
          Create QR codes for your events. Anyone can scan to view details and book.
        </p>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="animate-spin h-10 w-10 border-4 border-blue-600 border-t-transparent rounded-full" />
        </div>
      ) : events.length === 0 ? (
        <div className="text-center py-20 bg-white rounded-xl border">
          <FaQrcode className="mx-auto text-5xl text-gray-300 mb-4" />
          <p className="text-gray-600 font-medium">No events found</p>
          <p className="text-gray-400 text-sm mt-1">Create an event first to generate QR codes</p>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '20px' }}>
          {events.map((ev) => {
            const hasQR = !!qrMap[ev._id];
            const url = getEventUrl(ev._id);
            const img = ev.images?.[0]?.url;

            return (
              <div
                key={ev._id}
                style={{
                  background: '#fff',
                  borderRadius: '12px',
                  border: '1px solid #e5e7eb',
                  boxShadow: '0 1px 4px rgba(0,0,0,0.08)',
                  overflow: 'hidden',
                  display: 'flex',
                  flexDirection: 'column',
                  transition: 'box-shadow 0.2s',
                }}
                onMouseEnter={e => e.currentTarget.style.boxShadow = '0 4px 16px rgba(0,0,0,0.12)'}
                onMouseLeave={e => e.currentTarget.style.boxShadow = '0 1px 4px rgba(0,0,0,0.08)'}
              >
                {/* Event image banner */}
                <div style={{ position: 'relative', height: '120px', overflow: 'hidden', background: 'linear-gradient(135deg, #dbeafe, #e0e7ff)', flexShrink: 0 }}>
                  {img ? (
                    <img src={img} alt={ev.title} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  ) : (
                    <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <FaQrcode style={{ fontSize: '40px', color: '#93c5fd' }} />
                    </div>
                  )}
                  <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to top, rgba(0,0,0,0.65), transparent)' }} />
                  <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, padding: '8px 12px' }}>
                    <p style={{ color: '#fff', fontWeight: 600, fontSize: '13px', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{ev.title}</p>
                    <p style={{ color: 'rgba(255,255,255,0.7)', fontSize: '11px', margin: 0 }}>{ev.category || 'Event'}</p>
                  </div>
                </div>

                {/* Card body */}
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', padding: '14px' }}>
                  {hasQR ? (
                    <>
                      {/* QR Code */}
                      <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '10px', padding: '12px', background: '#f9fafb', borderRadius: '8px', border: '1px solid #f3f4f6' }}>
                        <QRCode
                          id={`qr-${ev._id}`}
                          value={url}
                          size={120}
                          bgColor="#ffffff"
                          fgColor="#1e293b"
                          level="M"
                        />
                      </div>

                      {/* URL */}
                      <p style={{ fontSize: '10px', color: '#9ca3af', textAlign: 'center', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', marginBottom: '10px', padding: '0 4px' }}>
                        {url}
                      </p>

                      {/* Download */}
                      <button
                        onClick={() => downloadQR(ev._id, ev.title)}
                        style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', padding: '8px', background: '#2563eb', color: '#fff', border: 'none', borderRadius: '8px', cursor: 'pointer', fontSize: '12px', fontWeight: 600, marginBottom: '8px' }}
                        onMouseEnter={e => e.currentTarget.style.background = '#1d4ed8'}
                        onMouseLeave={e => e.currentTarget.style.background = '#2563eb'}
                      >
                        <FiDownload size={13} />
                        Download QR
                      </button>

                      {/* Copy + Open */}
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px' }}>
                        <button
                          onClick={() => copyLink(ev._id)}
                          style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px', padding: '7px', border: '1px solid #d1d5db', background: '#fff', color: '#374151', borderRadius: '8px', cursor: 'pointer', fontSize: '11px' }}
                          onMouseEnter={e => e.currentTarget.style.background = '#f9fafb'}
                          onMouseLeave={e => e.currentTarget.style.background = '#fff'}
                        >
                          <FiCopy size={12} />
                          Copy Link
                        </button>
                        <button
                          onClick={() => openInNewTab(ev._id)}
                          style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px', padding: '7px', border: '1px solid #d1d5db', background: '#fff', color: '#374151', borderRadius: '8px', cursor: 'pointer', fontSize: '11px' }}
                          onMouseEnter={e => e.currentTarget.style.background = '#f9fafb'}
                          onMouseLeave={e => e.currentTarget.style.background = '#fff'}
                        >
                          <FiExternalLink size={12} />
                          Open
                        </button>
                      </div>
                    </>
                  ) : (
                    /* No QR yet */
                    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '16px 8px', textAlign: 'center' }}>
                      <div style={{ width: '52px', height: '52px', borderRadius: '50%', background: '#f3f4f6', border: '2px dashed #d1d5db', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '10px' }}>
                        <FaPlus style={{ fontSize: '18px', color: '#9ca3af' }} />
                      </div>
                      <p style={{ fontSize: '13px', fontWeight: 600, color: '#374151', margin: '0 0 4px' }}>No QR Code</p>
                      <p style={{ fontSize: '11px', color: '#9ca3af', margin: '0 0 14px' }}>Create a QR code for this event</p>
                      <button
                        onClick={() => generateQR(ev._id)}
                        style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '8px 16px', background: '#2563eb', color: '#fff', border: 'none', borderRadius: '8px', cursor: 'pointer', fontSize: '12px', fontWeight: 600 }}
                        onMouseEnter={e => e.currentTarget.style.background = '#1d4ed8'}
                        onMouseLeave={e => e.currentTarget.style.background = '#2563eb'}
                      >
                        <FaQrcode size={13} />
                        Create QR Code
                      </button>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </MerchantLayout>
  );
};

export default MerchantQRCodes;
