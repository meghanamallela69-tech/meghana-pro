import { useState, useEffect } from "react";
import axios from "axios";
import { toast } from "react-hot-toast";
import AdminLayout from "../../components/admin/AdminLayout";
import { FaCreditCard, FaDollarSign, FaPercentage, FaStore, FaExchangeAlt, FaCheck, FaTimes, FaClock, FaWallet, FaCheckCircle, FaTimesCircle } from "react-icons/fa";
import useAuth from "../../context/useAuth";
import { API_BASE, authHeaders } from "../../lib/http";
import AdminStatCard from "../../components/admin/AdminStatCard";

const AdminPayments = () => {
  const { token } = useAuth();
  const [activeTab, setActiveTab] = useState("transactions");
  const [transactions, setTransactions] = useState([]);
  const [summary, setSummary] = useState(null);
  const [commissionData, setCommissionData] = useState(null);
  const [payouts, setPayouts] = useState([]);
  const [refundRequests, setRefundRequests] = useState([]);
  const [withdrawals, setWithdrawals] = useState([]);
  const [withdrawalStats, setWithdrawalStats] = useState({ pending: 0, pendingAmount: 0 });
  const [loading, setLoading] = useState(true);

  // Fetch all payment data
  useEffect(() => {
    fetchAllData();
  }, []);

  const fetchAllData = async () => {
    try {
      setLoading(true);
      const headers = authHeaders(token);

      // Fetch transactions
      const txResponse = await axios.get(`${API_BASE}/admin/payments/transactions`, { headers });
      if (txResponse.data.success) {
        setTransactions(txResponse.data.transactions || []);
        setSummary(txResponse.data.summary || null);
      }

      // Fetch commission details
      const commResponse = await axios.get(`${API_BASE}/admin/payments/commission`, { headers });
      if (commResponse.data.success) {
        setCommissionData(commResponse.data.data || null);
      }

      // Fetch payouts
      const payoutResponse = await axios.get(`${API_BASE}/admin/payments/payouts`, { headers });
      if (payoutResponse.data.success) {
        setPayouts(payoutResponse.data.payouts || []);
      }

      // Fetch refund requests
      const refundResponse = await axios.get(`${API_BASE}/admin/payments/refunds`, { headers });
      if (refundResponse.data.success) {
        setRefundRequests(refundResponse.data.refunds || []);
      }

      // Fetch withdrawal requests
      const withdrawalResponse = await axios.get(`${API_BASE}/admin/withdrawals`, { headers });
      if (withdrawalResponse.data.success) {
        setWithdrawals(withdrawalResponse.data.withdrawals || []);
        setWithdrawalStats(withdrawalResponse.data.stats || { pending: 0, pendingAmount: 0 });
      }
    } catch (error) {
      console.error("Error fetching payment data:", error);
      toast.error(error.response?.data?.message || "Failed to load payment data");
    } finally {
      setLoading(false);
    }
  };

  // Handle refund action
  const handleRefundAction = async (paymentId, action) => {
    try {
      const reason = action === 'approve' 
        ? 'Refund approved by admin' 
        : prompt("Enter reason for rejecting refund:");
      
      if (action === 'reject' && !reason) {
        toast.error("Reason is required to reject refund");
        return;
      }

      const response = await axios.post(
        `${API_BASE}/admin/payments/refund/${paymentId}`,
        { action, reason: reason || '' },
        { headers: authHeaders(token) }
      );

      if (response.data.success) {
        toast.success(`Refund ${action}d successfully`);
        fetchAllData(); // Refresh data
      }
    } catch (error) {
      console.error("Error handling refund:", error);
      toast.error(error.response?.data?.message || "Failed to process refund");
    }
  };

  // Handle withdrawal action
  const handleWithdrawalAction = async (withdrawalId, action) => {
    const message = action === "reject"
      ? prompt("Enter reason for rejection:")
      : prompt("Enter payment reference (optional):", "");

    if (action === "reject" && message === null) return; // cancelled

    try {
      const res = await axios.post(
        `${API_BASE}/admin/withdrawals/${withdrawalId}/action`,
        { action, message: message || "", paymentReference: action === "approve" ? message : undefined },
        { headers: authHeaders(token) }
      );
      if (res.data.success) {
        toast.success(`Withdrawal ${action}d successfully`);
        fetchAllData();
      }
    } catch (err) {
      toast.error(err.response?.data?.message || `Failed to ${action} withdrawal`);
    }
  };

  const formatCurrency = (amount) => {
    return `₹${(amount || 0).toLocaleString('en-IN')}`;
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-IN', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getStatusBadge = (status) => {
    const badges = {
      paid: 'bg-green-100 text-green-700',
      pending: 'bg-yellow-100 text-yellow-700',
      failed: 'bg-red-100 text-red-700',
      refunded: 'bg-blue-100 text-blue-700',
      refund_requested: 'bg-purple-100 text-purple-700'
    };
    return badges[status] || 'bg-gray-100 text-gray-700';
  };

  if (loading) {
    return (
      <AdminLayout>
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-800">Payment Management</h1>
          <p className="text-gray-600 mt-1">Track transactions, commissions, and payouts</p>
        </div>

        {/* Summary Cards */}
        {summary && (
          <div className="admin-grid-stats" style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px', marginBottom: '24px' }}>
            <AdminStatCard label="Total Transactions" value={summary.count} icon={FaCreditCard} iconBg="bg-blue-100" iconColor="text-blue-600" />
            <AdminStatCard label="Total Amount" value={formatCurrency(summary.totalAmount)} icon={FaDollarSign} iconBg="bg-green-100" iconColor="text-green-600" />
            <AdminStatCard label="Total Commission" value={formatCurrency(summary.totalCommission)} icon={FaPercentage} iconBg="bg-purple-100" iconColor="text-purple-600" />
            <AdminStatCard label="Merchant Payouts" value={formatCurrency(summary.totalMerchantPayout)} icon={FaStore} iconBg="bg-orange-100" iconColor="text-orange-600" />
          </div>
        )}

        {/* Tabs */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 mb-6">
          <div className="border-b border-gray-200 overflow-x-auto">
            <nav className="flex gap-1 md:gap-4 px-2 md:px-4 pt-2 min-w-max">
              <button
                onClick={() => setActiveTab("transactions")}
                className={`px-2 md:px-4 py-3 text-xs md:text-sm font-medium border-b-2 transition whitespace-nowrap ${
                  activeTab === "transactions"
                    ? "border-blue-600 text-blue-600"
                    : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                }`}
              >
                <FaExchangeAlt className="inline mr-1 md:mr-2" />
                Transactions
              </button>
              <button
                onClick={() => setActiveTab("commission")}
                className={`px-2 md:px-4 py-3 text-xs md:text-sm font-medium border-b-2 transition whitespace-nowrap ${
                  activeTab === "commission"
                    ? "border-blue-600 text-blue-600"
                    : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                }`}
              >
                <FaPercentage className="inline mr-1 md:mr-2" />
                Commission
              </button>
              <button
                onClick={() => setActiveTab("payouts")}
                className={`px-2 md:px-4 py-3 text-xs md:text-sm font-medium border-b-2 transition whitespace-nowrap ${
                  activeTab === "payouts"
                    ? "border-blue-600 text-blue-600"
                    : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                }`}
              >
                <FaStore className="inline mr-1 md:mr-2" />
                Payouts
              </button>
              <button
                onClick={() => setActiveTab("refunds")}
                className={`px-2 md:px-4 py-3 text-xs md:text-sm font-medium border-b-2 transition whitespace-nowrap ${
                  activeTab === "refunds"
                    ? "border-blue-600 text-blue-600"
                    : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                }`}
              >
                <FaClock className="inline mr-1 md:mr-2" />
                Refunds
                {refundRequests.length > 0 && (
                  <span className="ml-1 bg-red-500 text-white text-xs px-1.5 py-0.5 rounded-full">
                    {refundRequests.length}
                  </span>
                )}
              </button>
              <button
                onClick={() => setActiveTab("withdrawals")}
                className={`px-2 md:px-4 py-3 text-xs md:text-sm font-medium border-b-2 transition whitespace-nowrap ${
                  activeTab === "withdrawals"
                    ? "border-blue-600 text-blue-600"
                    : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                }`}
              >
                <FaWallet className="inline mr-1 md:mr-2" />
                Withdrawals
                {withdrawalStats.pending > 0 && (
                  <span className="ml-1 bg-orange-500 text-white text-xs px-1.5 py-0.5 rounded-full">
                    {withdrawalStats.pending}
                  </span>
                )}
              </button>
            </nav>
          </div>

          {/* Tab Content */}
          <div className="p-3 md:p-6">
            {/* Transactions Tab */}
            {activeTab === "transactions" && (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase hide-mobile">Booking ID</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase hide-mobile">User</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Amount</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase hide-mobile">Commission</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Merchant Gets</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {transactions.map((tx) => (
                      <tr key={tx._id} className="hover:bg-gray-50">
                        <td className="px-4 py-3 text-xs font-mono text-gray-600 hide-mobile">
                          {tx.eventName || tx.bookingId?.serviceTitle || tx.eventId?.title || tx.description || 'N/A'}
                        </td>
                        <td className="px-4 py-3 text-sm hide-mobile">
                          <div className="text-gray-900">{tx.userName || tx.userId?.name || 'Unknown'}</div>
                          <div className="text-xs text-gray-500">{tx.userEmail || tx.userId?.email || ''}</div>
                        </td>
                        <td className="px-4 py-3 text-sm font-medium text-gray-900">
                          {formatCurrency(tx.totalAmount)}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-600 hide-mobile">
                          {formatCurrency(tx.adminCommission)}
                        </td>
                        <td className="px-4 py-3 text-sm text-green-600 font-medium">
                          {formatCurrency(tx.merchantAmount)}
                        </td>
                        <td className="px-4 py-3 text-sm">
                          <span className={`px-2 py-1 rounded text-xs font-medium ${getStatusBadge(tx.paymentStatus)}`}>
                            {tx.paymentStatus}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-600 whitespace-nowrap">
                          {formatDate(tx.createdAt)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* Commission Tab */}
            {activeTab === "commission" && commissionData && (
              <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="bg-gradient-to-br from-blue-50 to-blue-100 p-6 rounded-lg">
                    <p className="text-sm text-blue-700 font-medium">Total Amount Processed</p>
                    <p className="text-3xl font-bold text-blue-900 mt-2">
                      {formatCurrency(commissionData.totalAmount)}
                    </p>
                  </div>

                  <div className="bg-gradient-to-br from-purple-50 to-purple-100 p-6 rounded-lg">
                    <p className="text-sm text-purple-700 font-medium">Total Commission Earned</p>
                    <p className="text-3xl font-bold text-purple-900 mt-2">
                      {formatCurrency(commissionData.totalCommission)}
                    </p>
                  </div>

                  <div className="bg-gradient-to-br from-green-50 to-green-100 p-6 rounded-lg">
                    <p className="text-sm text-green-700 font-medium">Average Commission Rate</p>
                    <p className="text-3xl font-bold text-green-900 mt-2">
                      {commissionData.commissionRate}%
                    </p>
                  </div>
                </div>

                <div className="bg-gray-50 p-6 rounded-lg">
                  <h3 className="text-lg font-semibold text-gray-800 mb-4">Commission Breakdown</h3>
                  <div className="space-y-3">
                    <div className="flex justify-between items-center">
                      <span className="text-gray-600">Total Transactions:</span>
                      <span className="font-semibold text-gray-900">{commissionData.transactionCount}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-gray-600">Platform Commission:</span>
                      <span className="font-semibold text-purple-600">{formatCurrency(commissionData.totalCommission)}</span>
                    </div>
                    <div className="flex justify-between items-center border-t pt-3">
                      <span className="text-gray-600">Example (₹1000 @ 5%):</span>
                      <div className="text-right">
                        <div className="text-sm text-gray-500">Merchant gets: ₹950</div>
                        <div className="font-semibold text-blue-600">Commission: ₹50</div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Payouts Tab */}
            {activeTab === "payouts" && (
              <div className="space-y-6">
                {payouts.length === 0 ? (
                  <div className="text-center py-12 text-gray-500">
                    <FaStore className="mx-auto text-6xl text-gray-300 mb-4" />
                    <p>No payouts yet</p>
                  </div>
                ) : (
                  payouts.map((payout, idx) => (
                    <div key={idx} className="border border-gray-200 rounded-lg p-6">
                      <div className="flex justify-between items-start mb-4">
                        <div>
                          <h3 className="text-lg font-semibold text-gray-900">
                            {payout.merchant?.name || 'Unknown Merchant'}
                          </h3>
                          <p className="text-sm text-gray-500">{payout.merchant?.email}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-sm text-gray-600">Total Payout</p>
                          <p className="text-2xl font-bold text-green-600">
                            {formatCurrency(payout.totalPayout)}
                          </p>
                        </div>
                      </div>
                      <div className="grid grid-cols-3 gap-4 text-sm">
                        <div>
                          <span className="text-gray-500">Bookings:</span>
                          <span className="ml-2 font-medium text-gray-900">{payout.totalBookings}</span>
                        </div>
                        <div>
                          <span className="text-gray-500">Commission Deducted:</span>
                          <span className="ml-2 font-medium text-purple-600">{formatCurrency(payout.totalCommission)}</span>
                        </div>
                        <div className="text-right">
                          <span className="text-gray-500">Net Payout:</span>
                          <span className="ml-2 font-bold text-green-600">{formatCurrency(payout.totalPayout)}</span>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}

            {/* Refunds Tab */}
            {activeTab === "refunds" && (
              <div className="space-y-4">
                {refundRequests.length === 0 ? (
                  <div className="text-center py-12 text-gray-500">
                    <FaCheck className="mx-auto text-6xl text-green-500 mb-4" />
                    <p>No pending refund requests</p>
                  </div>
                ) : (
                  refundRequests.map((refund) => (
                    <div key={refund._id} className="border border-purple-200 rounded-lg p-6 bg-purple-50">
                      <div className="flex justify-between items-start">
                        <div>
                          <h3 className="text-lg font-semibold text-gray-900">
                            {refund.bookingId?.serviceTitle || 'Booking'}
                          </h3>
                          <p className="text-sm text-gray-600">
                            User: {refund.bookingId?.user?.name || 'Unknown'}
                          </p>
                          <p className="text-sm text-gray-600">
                            Amount: {formatCurrency(refund.totalAmount)}
                          </p>
                          <p className="text-sm text-gray-500 mt-2">
                            Requested: {formatDate(refund.updatedAt)}
                          </p>
                        </div>
                        <div className="flex gap-2">
                          <button
                            onClick={() => handleRefundAction(refund._id, 'approve')}
                            className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition flex items-center gap-2"
                          >
                            <FaCheck size={14} />
                            Approve
                          </button>
                          <button
                            onClick={() => handleRefundAction(refund._id, 'reject')}
                            className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition flex items-center gap-2"
                          >
                            <FaTimes size={14} />
                            Reject
                          </button>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}

            {/* Withdrawals Tab */}
            {activeTab === "withdrawals" && (
              <div className="space-y-4">
                {/* Stats row */}
                <div className="grid grid-cols-3 gap-4 mb-2">
                  {[
                    { label: "Total Requests", value: withdrawalStats.total || 0, color: "text-gray-800" },
                    { label: "Pending Approval", value: withdrawalStats.pending || 0, color: "text-orange-600" },
                    { label: "Pending Amount", value: `₹${(withdrawalStats.pendingAmount || 0).toLocaleString("en-IN")}`, color: "text-orange-600" },
                  ].map(s => (
                    <div key={s.label} className="bg-orange-50 border border-orange-100 rounded-lg p-4">
                      <p className="text-xs text-gray-500">{s.label}</p>
                      <p className={`text-xl font-bold mt-1 ${s.color}`}>{s.value}</p>
                    </div>
                  ))}
                </div>

                {withdrawals.length === 0 ? (
                  <div className="text-center py-12 text-gray-500">
                    <FaWallet className="mx-auto text-5xl text-gray-300 mb-4" />
                    <p className="font-medium">No withdrawal requests</p>
                  </div>
                ) : (
                  withdrawals.map((w) => (
                    <div key={w._id} className={`border rounded-xl p-5 ${w.status === "pending" ? "border-orange-200 bg-orange-50" : "border-gray-200 bg-white"}`}>
                      <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
                        {/* Left: merchant + amount info */}
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            <div className="h-10 w-10 rounded-full bg-indigo-100 flex items-center justify-center font-bold text-indigo-700">
                              {w.merchant?.name?.[0]?.toUpperCase() || "M"}
                            </div>
                            <div>
                              <p className="font-semibold text-gray-900">{w.merchant?.name || "Unknown Merchant"}</p>
                              <p className="text-xs text-gray-500">{w.merchant?.email}</p>
                            </div>
                          </div>

                          <div className="grid grid-cols-2 gap-x-6 gap-y-1 text-sm mt-3">
                            <div>
                              <span className="text-gray-500">Amount:</span>
                              <span className="ml-2 font-bold text-gray-900 text-base">₹{w.amount.toLocaleString("en-IN")}</span>
                            </div>
                            <div>
                              <span className="text-gray-500">Status:</span>
                              <span className={`ml-2 font-semibold px-2 py-0.5 rounded-full text-xs ${
                                w.status === "pending" ? "bg-yellow-100 text-yellow-700" :
                                w.status === "approved" ? "bg-green-100 text-green-700" :
                                w.status === "rejected" ? "bg-red-100 text-red-700" :
                                "bg-blue-100 text-blue-700"
                              }`}>
                                {w.status.charAt(0).toUpperCase() + w.status.slice(1)}
                              </span>
                            </div>
                            <div>
                              <span className="text-gray-500">Requested:</span>
                              <span className="ml-2 text-gray-700">{new Date(w.createdAt).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}</span>
                            </div>
                            {w.bankDetails?.bankName && (
                              <div>
                                <span className="text-gray-500">Bank:</span>
                                <span className="ml-2 text-gray-700">{w.bankDetails.bankName}</span>
                              </div>
                            )}
                            {w.bankDetails?.accountNumber && (
                              <div>
                                <span className="text-gray-500">Account:</span>
                                <span className="ml-2 text-gray-700">****{w.bankDetails.accountNumber.slice(-4)}</span>
                              </div>
                            )}
                            {w.bankDetails?.ifscCode && (
                              <div>
                                <span className="text-gray-500">IFSC:</span>
                                <span className="ml-2 text-gray-700">{w.bankDetails.ifscCode}</span>
                              </div>
                            )}
                            {w.bankDetails?.accountHolderName && (
                              <div>
                                <span className="text-gray-500">Holder:</span>
                                <span className="ml-2 text-gray-700">{w.bankDetails.accountHolderName}</span>
                              </div>
                            )}
                          </div>

                          {w.adminResponse?.message && (
                            <div className={`mt-3 p-2 rounded text-xs ${w.status === "rejected" ? "bg-red-50 text-red-600" : "bg-green-50 text-green-600"}`}>
                              Admin note: {w.adminResponse.message}
                            </div>
                          )}
                          {w.paymentReference && (
                            <p className="text-xs text-gray-400 mt-1">Payment Ref: {w.paymentReference}</p>
                          )}
                        </div>

                        {/* Right: action buttons (only for pending) */}
                        {w.status === "pending" && (
                          <div className="flex flex-col gap-2 min-w-[140px]">
                            <button
                              onClick={() => handleWithdrawalAction(w._id, "approve")}
                              className="flex items-center justify-center gap-2 px-4 py-2.5 bg-green-600 text-white rounded-lg hover:bg-green-700 transition font-medium text-sm"
                            >
                              <FaCheckCircle size={14} />
                              Approve
                            </button>
                            <button
                              onClick={() => handleWithdrawalAction(w._id, "reject")}
                              className="flex items-center justify-center gap-2 px-4 py-2.5 bg-red-600 text-white rounded-lg hover:bg-red-700 transition font-medium text-sm"
                            >
                              <FaTimesCircle size={14} />
                              Reject
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </AdminLayout>
  );
};

export default AdminPayments;
