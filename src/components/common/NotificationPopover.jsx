import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  getNotifications,
  markAllNotificationsAsRead,
  clearAllNotifications,
  clearNotification,
} from "../../api/notifications";

export default function NotificationPopover({ onClose }) {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);

  // Helper to get locally marked read notification IDs
  const getReadNotificationIds = () => {
    try {
      const raw = localStorage.getItem('spacebook_read_notifications');
      return raw ? JSON.parse(raw) : [];
    } catch (e) {
      return [];
    }
  };

  // Helper to get locally cleared/dismissed notification IDs
  const getClearedNotificationIds = () => {
    try {
      const raw = localStorage.getItem('spacebook_cleared_notifications');
      return raw ? JSON.parse(raw) : [];
    } catch (e) {
      return [];
    }
  };

  const saveClearedNotificationIds = (ids) => {
    try {
      const existing = getClearedNotificationIds();
      const merged = Array.from(new Set([...existing, ...ids]));
      localStorage.setItem('spacebook_cleared_notifications', JSON.stringify(merged));
    } catch (e) {
      // ignore
    }
  };

  const fetchNotifications = async () => {
    try {
      setLoading(true);
      const data = await getNotifications();
      const rawList = Array.isArray(data) ? data : data.notifications || [];
      const readIds = new Set(getReadNotificationIds().map(String));
      const clearedIds = new Set(getClearedNotificationIds().map(String));

      const mapped = rawList
        .map((n, idx) => {
          const id = String(n.notificationId ?? n.id ?? idx);
          return {
            ...n,
            notificationId: id,
            isRead: n.isRead === true || n.is_read === true || readIds.has(id),
          };
        })
        .filter((n) => !clearedIds.has(String(n.notificationId)));

      setNotifications(mapped);
    } catch (err) {
      console.error("Failed to load notifications:", err);
      setNotifications([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchNotifications();

    const handleRefresh = () => {
      fetchNotifications();
    };

    window.addEventListener("notificationsRead", handleRefresh);
    return () => {
      window.removeEventListener("notificationsRead", handleRefresh);
    };
  }, []);

  const handleMarkAllRead = async () => {
    try {
      await markAllNotificationsAsRead();
      setNotifications((prev) =>
        prev.map((n) => ({ ...n, isRead: true }))
      );
      window.dispatchEvent(new Event("notificationsRead"));
    } catch (err) {
      console.error("Failed to mark notifications as read:", err);
      setNotifications((prev) =>
        prev.map((n) => ({ ...n, isRead: true }))
      );
    }
  };

  const handleClearAll = async () => {
    const currentIds = notifications.map((n, idx) =>
      String(n.notificationId ?? n.id ?? idx)
    );
    saveClearedNotificationIds(currentIds);
    setNotifications([]);

    try {
      await clearAllNotifications();
    } catch (e) {
      // ignore
    }

    window.dispatchEvent(new Event("notificationsRead"));
  };

  const handleClearSingle = async (e, id) => {
    e.stopPropagation();
    const idStr = String(id);
    saveClearedNotificationIds([idStr]);
    setNotifications((prev) =>
      prev.filter((n) => String(n.notificationId ?? n.id) !== idStr)
    );

    try {
      await clearNotification(id);
    } catch (e) {
      // ignore
    }

    window.dispatchEvent(new Event("notificationsRead"));
  };

  const hasUnread = notifications.some((n) => !n.isRead);

  return (
    <div className="absolute right-0 mt-2 w-80 sm:w-96 rounded-2xl border border-line bg-white shadow-xl z-50 overflow-hidden font-sans">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-line bg-white">
        <div>
          <h3 className="font-display font-bold text-base text-ink">Notifications</h3>
          <p className="text-xs text-slate mt-0.5">Recent alerts for your account.</p>
        </div>

        <div>
          {notifications.length > 0 && (
            <button
              type="button"
              onClick={handleClearAll}
              disabled={loading}
              className="rounded-xl border border-line px-2.5 py-1 text-xs font-semibold text-slate hover:text-ink focus:outline-none transition"
            >
              Clear all
            </button>
          )}
        </div>
      </div>

      {/* Notification Items List */}
      <div className="max-h-80 overflow-y-auto divide-y divide-line p-2">
        {loading ? (
          <div className="p-6 text-center text-xs text-slate">Loading alerts...</div>
        ) : notifications.length === 0 ? (
          <div className="rounded-xl bg-portal-bg p-6 text-center text-xs text-slate">
            No notifications available.
          </div>
        ) : (
          notifications.map((item, index) => {
            const isUnread = !item.isRead;
            const notificationId = item.notificationId || item.id || index;

            const targetBookingId =
              item.bookingId ||
              item.booking_id ||
              item.id ||
              (item.message && item.message.match(/#?(\d+)/) ? item.message.match(/#?(\d+)/)[1] : null);

            return (
              <div
                key={notificationId}
                className={`p-3 rounded-xl transition cursor-pointer group ${
                  isUnread ? "bg-amber-50/50 font-medium hover:bg-amber-50" : "hover:bg-slate-50"
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <Link
                    to={targetBookingId ? `/my-bookings?highlight=${targetBookingId}` : "/my-bookings"}
                    onClick={onClose}
                    className="min-w-0 flex-1 block"
                  >
                    {/* DTO Title */}
                    <div className="flex items-center gap-2">
                      <p className="text-xs font-bold text-slate-900 group-hover:text-sky-700 transition-colors truncate">
                        {item.title || "Notification"}
                      </p>
                      {isUnread && (
                        <span className="h-2 w-2 rounded-full bg-amber-500 shrink-0" />
                      )}
                    </div>
                    {/* DTO Message */}
                    {item.message && (
                      <p className="text-xs text-slate-600 mt-1 line-clamp-2">
                        {item.message}
                      </p>
                    )}
                    {/* DTO TimeAgo / CreatedOn */}
                    <div className="mt-1.5 flex items-center justify-between text-[10px] text-slate-400 font-mono">
                      <span>{item.timeAgo || item.createdOn || "Just now"}</span>
                      {targetBookingId && (
                        <span className="text-sky-600 font-sans font-bold group-hover:underline">
                          View Pass →
                        </span>
                      )}
                    </div>
                  </Link>

                  <button
                    type="button"
                    onClick={(e) => handleClearSingle(e, notificationId)}
                    className="shrink-0 rounded p-1 text-slate-400 hover:bg-slate-200 hover:text-ink transition"
                    title="Dismiss notification"
                  >
                    ✕
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Footer Link */}
      <div className="p-3 border-t border-line bg-white text-center">
        <Link
          to="/notifications"
          onClick={onClose}
          className="block w-full rounded-xl border border-line py-2 text-xs font-bold text-ink hover:bg-portal-bg transition"
        >
          View all notifications
        </Link>
      </div>
    </div>
  );
}