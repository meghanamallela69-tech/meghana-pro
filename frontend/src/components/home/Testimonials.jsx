import { useEffect, useState } from "react";
import axios from "axios";
import { API_BASE } from "../../lib/http";

const Testimonials = () => {
  const [items, setItems] = useState([]);
  const [index, setIndex] = useState(0);

  useEffect(() => {
    axios.get(`${API_BASE}/reviews/latest`).then((res) => {
      const reviews = res.data.reviews || [];
      // Only keep reviews that have actual non-empty text
      const valid = reviews.filter(r => {
        const text = (r.reviewText || r.comment || r.text || r.review || "").trim();
        return text.length > 0;
      }).slice(0, 4);
      if (valid.length > 0) setItems(valid);
    }).catch(() => {});
  }, []);

  useEffect(() => {
    if (items.length <= 1) return;
    const id = setInterval(() => setIndex(i => (i + 1) % items.length), 4000);
    return () => clearInterval(id);
  }, [items.length]);

  if (items.length === 0) return null;

  const t = items[index];
  const text = (t.reviewText || t.comment || t.text || t.review || "").trim();

  return (
    <section className="py-16">
      <div className="max-w-7xl mx-auto px-6">
        <h2 className="text-3xl md:text-4xl font-semibold mb-8">What Our Clients Say</h2>
        <div className="relative max-w-2xl mx-auto">
          <div className="rounded-xl border shadow-sm bg-white p-6 min-h-[140px]">
            <div className="flex items-center gap-3 mb-3">
              <div className="h-10 w-10 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-700 font-bold text-lg flex-shrink-0">
                {(t.user?.name || "U")[0].toUpperCase()}
              </div>
              <div>
                <div className="font-semibold">{t.user?.name || "User"}</div>
                {t.event?.title && (
                  <div className="text-xs text-gray-500">{t.event.title}</div>
                )}
              </div>
            </div>
            <div className="flex gap-0.5 mb-3">
              {[1, 2, 3, 4, 5].map(s => (
                <span key={s} className={s <= (t.rating || 5) ? "text-amber-400 text-lg" : "text-gray-300 text-lg"}>★</span>
              ))}
            </div>
            <p className="text-gray-700 leading-relaxed">"{text}"</p>
          </div>

          {items.length > 1 && (
            <div className="flex items-center justify-center gap-2 mt-3">
              {items.map((_, i) => (
                <button
                  key={i}
                  onClick={() => setIndex(i)}
                  className={`h-2 w-2 rounded-full transition-colors ${i === index ? "bg-gray-900" : "bg-gray-300"}`}
                  aria-label={`Review ${i + 1}`}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </section>
  );
};

export default Testimonials;
