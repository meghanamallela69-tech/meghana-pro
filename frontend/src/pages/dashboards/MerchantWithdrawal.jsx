import { useState, useEffect, useCallback } from "react";
import axios from "axios";
import MerchantLayout from "../../components/merchant/MerchantLayout";
import useAuth from "../../context/useAuth";
import { API_BASE, authHeaders } from "../../lib/http";
import { FaWallet, FaHistory, FaCheckCircle, FaTimesCircle, FaClock, FaRupeeSign, FaUniversity } from "react-icons/fa";
import { toast } from "react-hot-toast";

const STATUS_STYLES = {
  pending:   { bg: "bg-yellow-100", text: "text-yellow-700", icon: <FaClock className="inline mr-1" />, label: "Pending" },
  approved:  { bg: "bg-green-100",  text: "text-green-700",  icon: <FaCheckCircle className="inline mr-1" />, label: "Approved" },
  rejected:  { bg: "bg-red-100",    text: "text-red-700",    icon: <FaTimesCircle className="inline mr-1" />, label: "Rejected" },
  completed: { bg: "bg-blue-100",   text: "text-blue-700",   icon: <FaCheckCircle className="inline mr-1" />, label: "Completed" },
  processing:{ bg: "bg-purple-100", text: "text-purple-700", icon: <FaClock className="inline mr-1" />, label: "Processing" },
};

const MerchantWithdrawal = () => {
  const { token } = useAuth();
  const [earnings, setEarnings] = useState({ totalEarnings: 0, availableBalance: 0, pendingAmount: 0, withdrawnAmount: 0 });
  const [withdrawals, setWithdrawals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({
    amount: "",
    accountHolderName: "",
    accountNumber: "",
    ifscCode: "",
    bankName: "",
  });

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const [earningsRes, withdrawalsRes] = await Promise.all([
        axios.get(`${API_BASE}/merchant/earnings`, { headers: authHeaders(token) }),
        axios.get(`${API_BASE}/merchant/withdrawals`, { headers: authHeaders(token) }),
      ]);
      if (earningsRes.data.success) setEarnings(earningsRes.data.data);
      if (withdrawalsRes.data.success) setWithdrawals(withdrawalsRes.data.withdrawals || []);
    } catch (err) {
      toast.error("Failed to load earnings data");
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => { loadData(); }, [loadData]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    const amount = parseFloat(form.amount);
    if (!amount || amount <= 0) return toast.error("Enter a valid amount");
    if (amount < 100) return toast.error("Minimum withdrawal is ₹100");
    if (!form.accountHolderName || !form.accountNumber || !form.ifscCode || !form.bankName) {
      return toast.error("Please fill all bank details");
    }

    setSubmitting(true);
    try {
      const res = await axios.post(
        `${API_BASE}/merchant/withdrawal`,
        {
          amount,
          bankDetails: {
            accountHolderName: form.accountHolderName,
            accountNumber: form.accountNumber,
            ifscCode: form.ifscCode.toUpperCase(),
            bankName: form.bankName,
          },
        },
        { headers: authHeaders(token) }
      );
      if (res.data.success) {
        toast.success("Withdrawal request submitted! Admin will review it.");
        setForm({ amount: "", accountHolderName: "", accountNumber: "", ifscCode: "", bankName: "" });
        loadData();
      }
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to submit withdrawal request");
    } finally {
      setSubmitting(false);
    }
  };

  const fmt = (n) => `₹${(n || 0).toLocaleString("en-IN", { minimumFractionDigits: 2 })}`;

  return (
    <MerchantLayout>
      <div className="mb-6">
        <h2 className="text-2xl font-semibold">Withdrawal</h2>
        <p className="text-gray-500 mt-1">Request payout to your bank account</p>
      </div>

      {/* Balance Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {[
          { label: "Total Earnings", value: fmt(earnings.totalEarnings), color: "bg-green-600" },
          { label: "Available Balance", value: fmt(earnings.availableBalance), color: "bg-blue-600" },
          { label: "Pending Withdrawal", value: fmt(earnings.pendingAmount), color: "bg-yellow-500" },
          { label: "Total Withdrawn", value: fmt(earnings.withdrawnAmount), color: "bg-purple-600" },
        ].map((c) => (
          <div key={c.label} className="bg-white rounded-xl p-5 shadow-sm border">
            <p className="text-xs text-gray-500 mb-1">{c.label}</p>
            <p className={`text-xl font-bold ${c.color.replace("bg-", "text-")}`}>{c.value}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Request Form */}
        <div className="bg-white rounded-xl shadow-sm border p-6">
          <h3 className="font-semibold text-lg mb-5 flex items-center gap-2">
            <FaWallet className="text-blue-600" /> Request Withdrawal
          </h3>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Amount (₹)</label>
              <div className="relative">
                <FaRupeeSign className="absolute left-3 top-3 text-gray-400" />
                <input
                  type="number"
                  value={form.amount}
                  onChange={e => setForm(p => ({ ...p, amount: e.target.value }))}
                  placeholder="Enter amount"
                  min="100"
                  max={earnings.availableBalance}
                  className="w-full pl-9 pr-4 py-2.5 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
              </div>
              <p className="text-xs text-gray-400 mt-1">Available: {fmt(earnings.availableBalance)} · Min: ₹100</p>
            </div>

            <div className="border-t pt-4">
              <p className="text-sm font-medium text-gray-700 mb-3 flex items-center gap-2">
                <FaUniversity className="text-gray-500" /> Bank Details
              </p>
              <div className="space-y-3">
                {[
                  { key: "accountHolderName", label: "Account Holder Name", placeholder: "Full name as per bank" },
                  { key: "bankName", label: "Bank Name", placeholder: "e.g. State Bank of India" },
                  { key: "accountNumber", label: "Account Number", placeholder: "Enter account number" },
                  { key: "ifscCode", label: "IFSC Code", placeholder: "e.g. SBIN0001234" },
                ].map(({ key, label, placeholder }) => (
                  <div key={key}>
                    <label className="block text-xs font-medium text-gray-600 mb-1">{label}</label>
                    <input
                      type="text"
                      value={form[key]}
                      onChange={e => setForm(p => ({ ...p, [key]: e.target.value }))}
                      placeholder={placeholder}
                      className="w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
                    />
                  </div>
                ))}
              </div>
            </div>

            <button
              type="submit"
              disabled={submitting || earnings.availableBalance <= 0}
              className="w-full py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {submitting ? "Submitting..." : "Submit Withdrawal Request"}
            </button>
          </form>
        </div>

        {/* History */}
        <div className="bg-white rounded-xl shadow-sm border p-6">
          <h3 className="font-semibold text-lg mb-5 flex items-center gap-2">
            <FaHistory className="text-purple-600" /> Withdrawal History
          </h3>
          {loading ? (
            <div className="flex justify-center py-12">
              <div className="animate-spin h-8 w-8 border-2 border-blue-500 border-t-transparent rounded-full" />
            </div>
          ) : withdrawals.length === 0 ? (
            <div className="text-center py-12 text-gray-400">
              <FaHistory className="text-5xl mx-auto mb-3 opacity-20" />
              <p>No withdrawal requests yet</p>
            </div>
          ) : (
            <div className="space-y-3 max-h-[480px] overflow-y-auto pr-1">
              {withdrawals.map((w) => {
                const s = STATUS_STYLES[w.status] || STATUS_STYLES.pending;
                return (
                  <div key={w._id} className="border rounded-lg p-4">
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-semibold text-gray-900">₹{w.amount.toLocaleString("en-IN")}</span>
                      <span className={`text-xs font-semibold px-2 py-1 rounded-full ${s.bg} ${s.text}`}>
                        {s.icon}{s.label}
                      </span>
                    </div>
                    <p className="text-xs text-gray-500">
                      Requested: {new Date(w.createdAt).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
                    </p>
                    {w.bankDetails?.bankName && (
                      <p className="text-xs text-gray-500 mt-1">
                        Bank: {w.bankDetails.bankName} · A/C: ****{w.bankDetails.accountNumber?.slice(-4)}
                      </p>
                    )}
                    {w.adminResponse?.message && (
                      <p className={`text-xs mt-2 p-2 rounded ${w.status === "rejected" ? "bg-red-50 text-red-600" : "bg-green-50 text-green-600"}`}>
                        Admin: {w.adminResponse.message}
                      </p>
                    )}
                    {w.paymentReference && (
                      <p className="text-xs text-gray-400 mt-1">Ref: {w.paymentReference}</p>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </MerchantLayout>
  );
};

export default MerchantWithdrawal;
