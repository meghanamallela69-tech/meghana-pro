import { FaEnvelope, FaPhoneAlt, FaMapMarkerAlt, FaFacebookF, FaTwitter, FaInstagram } from "react-icons/fa";

const Contact = () => {
  return (
    <section className="max-w-6xl mx-auto px-6 py-16">

      {/* Form — full width */}
      <div className="rounded-2xl bg-white shadow-sm ring-1 ring-gray-200 p-6 mb-8">
        <h2 className="text-2xl font-semibold text-gray-900 mb-4">Get in Touch</h2>
        <form className="space-y-4">
          <input className="border rounded-lg px-4 py-2 w-full focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="Name" />
          <input className="border rounded-lg px-4 py-2 w-full focus:outline-none focus:ring-2 focus:ring-blue-500" type="email" placeholder="Email" />
          <input className="border rounded-lg px-4 py-2 w-full focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="Subject" />
          <textarea className="border rounded-lg px-4 py-2 w-full focus:outline-none focus:ring-2 focus:ring-blue-500" rows="5" placeholder="Message" />
          <button className="w-full px-4 py-2 rounded-lg bg-gray-900 text-white hover:bg-black transition">Submit</button>
        </form>
      </div>

      {/* Info cards — 3 per row desktop, 2 per row mobile */}
      <div className="contact-cards-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px' }}>
        <div className="rounded-2xl bg-white shadow-sm ring-1 ring-gray-200 p-5">
          <div className="contact-card-inner flex items-center gap-3">
            <div className="contact-card-icon h-10 w-10 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center flex-shrink-0"><FaEnvelope /></div>
            <div><div className="contact-card-title font-semibold">Email</div><div className="contact-card-value text-sm text-gray-600">support@eventhub.local</div></div>
          </div>
        </div>
        <div className="rounded-2xl bg-white shadow-sm ring-1 ring-gray-200 p-5">
          <div className="contact-card-inner flex items-center gap-3">
            <div className="contact-card-icon h-10 w-10 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center flex-shrink-0"><FaPhoneAlt /></div>
            <div><div className="contact-card-title font-semibold">Phone</div><div className="contact-card-value text-sm text-gray-600">+1 (555) 010-0200</div></div>
          </div>
        </div>
        <div className="rounded-2xl bg-white shadow-sm ring-1 ring-gray-200 p-5">
          <div className="contact-card-inner flex items-center gap-3">
            <div className="contact-card-icon h-10 w-10 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center flex-shrink-0"><FaMapMarkerAlt /></div>
            <div><div className="contact-card-title font-semibold">Office</div><div className="contact-card-value text-sm text-gray-600">123 Market Street, San Francisco, CA</div></div>
          </div>
        </div>
      </div>

      {/* Social links */}
      <div className="flex items-center gap-3 mt-6">
        <a href="#" className="h-10 w-10 flex items-center justify-center bg-gray-900 text-white rounded-lg hover:bg-black" aria-label="Facebook"><FaFacebookF /></a>
        <a href="#" className="h-10 w-10 flex items-center justify-center bg-gray-900 text-white rounded-lg hover:bg-black" aria-label="Twitter"><FaTwitter /></a>
        <a href="#" className="h-10 w-10 flex items-center justify-center bg-gray-900 text-white rounded-lg hover:bg-black" aria-label="Instagram"><FaInstagram /></a>
      </div>

      <style dangerouslySetInnerHTML={{ __html: `
        @media (max-width: 767px) {
          .contact-cards-grid {
            grid-template-columns: repeat(2, 1fr) !important;
            gap: 10px !important;
          }
          .contact-card-inner {
            flex-direction: column !important;
            align-items: flex-start !important;
            gap: 6px !important;
          }
          .contact-card-title {
            font-size: 12px !important;
            font-weight: 600 !important;
          }
          .contact-card-value {
            font-size: 11px !important;
            word-break: break-word !important;
            white-space: normal !important;
          }
          .contact-card-icon {
            width: 28px !important;
            height: 28px !important;
            font-size: 12px !important;
          }
        }
      ` }} />
    </section>
  );
};

export default Contact;
