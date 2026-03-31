import { useState, useRef, useEffect } from "react";
import { SITE_NAME } from "../../config/site";
import { BsCalendarEvent } from "react-icons/bs";
import { FiBell, FiSearch, FiChevronDown, FiUser, FiSettings, FiLogOut } from "react-icons/fi";
import useAuth from "../../context/useAuth";
import { useNavigate } from "react-router-dom";
import PropTypes from "prop-types";
import useNotificationBadges from "../../context/useNotificationBadges";
import NotificationDropdown from "../shared/NotificationDropdown";

const MerchantTopbar = ({ onToggleSidebar }) => {
  const [open, setOpen] = useState(false);
  const { user, logout } = useAuth();
  const { refreshBadges } = useNotificationBadges();
  const navigate = useNavigate();
  const name = user?.name || "Merchant";
  const profileRef = useRef(null);

  useEffect(() => {
    refreshBadges();
  }, [refreshBadges]);

  useEffect(() => {
    const handler = (e) => {
      if (profileRef.current && !profileRef.current.contains(e.target)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  return (
    <header className="sticky top-0 z-50 bg-white border-b">
      <div className="flex items-center justify-between px-4 py-3">
        <button className="md:hidden p-2 rounded hover:bg-gray-100" onClick={onToggleSidebar}>☰</button>
        <div className="font-semibold flex items-center gap-2">
          <BsCalendarEvent />
          <span>{SITE_NAME}</span>
        </div>

        <div className="flex items-center gap-3">
          <div className="hidden md:flex items-center gap-2 bg-gray-100 rounded px-3 py-1.5">
            <FiSearch className="text-gray-500" />
            <input className="bg-transparent outline-none text-sm" placeholder="Search events" />
          </div>

          {/* Notification Bell */}
          <NotificationDropdown viewAllPath="/dashboard/merchant/notifications" />

          {/* Profile Dropdown */}
          <div className="relative" ref={profileRef}>
            <button
              type="button"
              className="flex items-center gap-2 p-1 rounded hover:bg-gray-100"
              onClick={() => setOpen(prev => !prev)}
            >
              <div className="h-8 w-8 rounded-full bg-indigo-600 text-white flex items-center justify-center overflow-hidden">
                {user?.profileImage
                  ? <img src={user.profileImage} alt={user.name} className="w-full h-full object-cover" />
                  : (user?.name?.[0] || name[0])}
              </div>
              <span className="text-sm">{user?.name || name}</span>
              <FiChevronDown className={`transition-transform ${open ? "rotate-180" : ""}`} />
            </button>

            {open && (
              <div className="absolute right-0 mt-2 w-44 bg-white rounded-md shadow-xl border border-gray-200 z-50">
                <button onClick={() => { setOpen(false); navigate("/dashboard/merchant/profile"); }}
                  className="w-full text-left px-4 py-2 hover:bg-gray-50 text-sm flex items-center gap-2">
                  <FiUser className="text-gray-500" /> Profile
                </button>
                <button onClick={() => { setOpen(false); navigate("/dashboard/merchant/settings"); }}
                  className="w-full text-left px-4 py-2 hover:bg-gray-50 text-sm flex items-center gap-2">
                  <FiSettings className="text-gray-500" /> Settings
                </button>
                <hr className="my-1" />
                <button onClick={handleLogout}
                  className="w-full text-left px-4 py-2 hover:bg-gray-50 text-sm text-red-600 flex items-center gap-2">
                  <FiLogOut className="text-red-600" /> Logout
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};

export default MerchantTopbar;
MerchantTopbar.propTypes = {
  onToggleSidebar: PropTypes.func,
};
