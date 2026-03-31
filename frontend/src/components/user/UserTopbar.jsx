import { useState, useRef, useEffect } from "react";
import { SITE_NAME } from "../../config/site";
import { BsCalendarEvent } from "react-icons/bs";
import { FiBell, FiSearch, FiChevronDown } from "react-icons/fi";
import PropTypes from "prop-types";
import { useNavigate } from "react-router-dom";
import useAuth from "../../context/useAuth";
import useNotificationBadges from "../../context/useNotificationBadges";
import NotificationDropdown from "../shared/NotificationDropdown";

const UserTopbar = ({ onToggleSidebar, onLogout }) => {
  const [profileOpen, setProfileOpen] = useState(false);
  const { user } = useAuth();
  const { refreshBadges } = useNotificationBadges();
  const navigate = useNavigate();
  const profileName = user?.name || "User";
  const profileRef = useRef(null);

  useEffect(() => {
    refreshBadges();
  }, [refreshBadges]);

  useEffect(() => {
    const handler = (e) => {
      if (profileRef.current && !profileRef.current.contains(e.target)) {
        setProfileOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

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
            <input className="bg-transparent outline-none text-sm" placeholder="Search events..." />
          </div>

          {/* Notification Bell */}
          <NotificationDropdown viewAllPath="/dashboard/user/notifications" />

          {/* Profile Dropdown */}
          <div className="relative" ref={profileRef}>
            <button
              type="button"
              className="flex items-center gap-2 p-1 rounded hover:bg-gray-100"
              onClick={() => setProfileOpen(prev => !prev)}
            >
              <div className="h-8 w-8 rounded-full bg-blue-600 text-white flex items-center justify-center overflow-hidden">
                {user?.profileImage
                  ? <img src={user.profileImage} alt={user.name} className="w-full h-full object-cover" />
                  : (user?.name?.[0] || profileName[0])}
              </div>
              <span className="text-sm">{user?.name || profileName}</span>
              <FiChevronDown className={`transition-transform ${profileOpen ? "rotate-180" : ""}`} />
            </button>

            {profileOpen && (
              <div className="absolute right-0 mt-2 w-44 bg-white rounded-md shadow-xl border border-gray-200 z-50">
                <button className="w-full text-left px-4 py-2 hover:bg-gray-100 text-sm"
                  onClick={() => { setProfileOpen(false); navigate("/dashboard/user/profile"); }}>
                  Profile
                </button>
                <button className="w-full text-left px-4 py-2 hover:bg-gray-100 text-sm"
                  onClick={() => { setProfileOpen(false); navigate("/dashboard/user/settings"); }}>
                  Settings
                </button>
                <hr className="my-1" />
                <button className="w-full text-left px-4 py-2 text-red-600 hover:bg-gray-100 text-sm"
                  onClick={() => { setProfileOpen(false); onLogout(); }}>
                  Logout
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};

export default UserTopbar;
UserTopbar.propTypes = {
  onToggleSidebar: PropTypes.func,
  onLogout: PropTypes.func,
};
