import { useState, useCallback } from "react";
import axios from "axios";
import toast from "react-hot-toast";
import { API_BASE } from "../lib/http";

/**
 * Single source of truth for all coupon logic.
 * Usage:
 *   const coupon = useCoupon({ token, eventId, getAmount });
 *   coupon.apply("CODE")   — apply by code string
 *   coupon.remove()        — remove applied coupon
 *   coupon.discount        — number (discount amount)
 *   coupon.applied         — coupon object or null
 *   coupon.loading         — boolean
 */
const useCoupon = ({ token, eventId, getAmount }) => {
  const [applied, setApplied] = useState(null);   // full API response
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState("");

  const apply = useCallback(async (code) => {
    const trimmed = (code || "").trim().toUpperCase();
    if (!trimmed) { toast.error("Enter a coupon code"); return; }
    if (loading) return;

    const amount = typeof getAmount === "function" ? getAmount() : getAmount;
    const numAmount = parseFloat(amount);
    if (!numAmount || numAmount <= 0) {
      toast.error("Cannot apply coupon: invalid booking amount");
      return;
    }

    setLoading(true);
    setError("");
    try {
      const res = await axios.post(
        `${API_BASE}/coupons/apply`,
        { code: trimmed, totalAmount: numAmount, eventId: eventId || undefined },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      if (res.data.success) {
        setApplied(res.data);
        toast.success(`✅ "${trimmed}" applied! You save ₹${res.data.discountAmount.toLocaleString("en-IN")}`);
      } else {
        const msg = res.data.message || "Invalid coupon";
        setError(msg);
        toast.error(msg);
      }
    } catch (err) {
      const msg = err.response?.data?.message || "Invalid coupon code";
      setError(msg);
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  }, [token, eventId, getAmount, loading]);

  const remove = useCallback(() => {
    setApplied(null);
    setError("");
    toast.success("Coupon removed");
  }, []);

  const reset = useCallback(() => {
    setApplied(null);
    setError("");
  }, []);

  return {
    applied,                                          // full API response object
    discount: applied?.discountAmount ?? 0,           // number
    finalAmount: applied?.finalAmount ?? null,        // number or null
    loading,
    error,
    apply,
    remove,
    reset,
  };
};

export default useCoupon;
