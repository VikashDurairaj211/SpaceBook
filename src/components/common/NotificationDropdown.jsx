import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Bell,
  CheckCircle2,
  Clock,
  Building2,
  MapPin,
  Calendar,
  Trash2,
  CheckCheck,
  ArrowRight,
  ShieldAlert,
  X,
} from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import {
  getNotifications,
  markAllNotificationsAsRead,
  clearAllNotifications,
  clearNotification,
} from "../../api/notifications";

export default function NotificationDropdown({
  open,
  buttonRef,
  notifications: initialNotifications,
  onClose,
  onMarkAllRead,
  onClearAll,
  onClearOne,
  onViewAll,
}) {
  const { user } = useAuth();
  const isAdmin =
    user?.role === "Admin" ||
    user?.role === "admin" ||
    user?.isAdmin === true;

  const navigate = useNavigate();
  const panelRef = useRef(null);
  const [notifications, setNotifications] = useState(initialNotifications || []);
  const [loading, setLoading] = useState(false);

  // Helper to get locally marked read notification IDs
  const getReadNotificationIds = () => {
    try {
      const raw = localStorage.getItem('spacebook_read_notifications');
      return raw ? JSON.parse(raw) : [];
    } catch (e) {
      return [];
    }
  };

  const saveReadNotificationIds = (ids) => {
    try {
      const existing = getReadNotificationIds();
      const merged = Array.from(new Set([...existing, ...ids]));
      localStorage.setItem('spacebook_read_notifications', JSON.stringify(merged));
    } catch (e) {
      // ignore
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

  // Sync initialNotifications prop whenever it changes
  useEffect(() => {
    if (!initialNotifications) return;
    const clearedIds = new Set(getClearedNotificationIds().map(String));
    const active = initialNotifications.filter(
      (n) => !clearedIds.has(String(n.notificationId || n.id))
    );
    setNotifications(active);
  }, [initialNotifications]);

  // Fetch API data when dropdown opens
  useEffect(() => {
    if (!open) return;

    const readIds = new Set(getReadNotificationIds().map(String));
    const clearedIds = new Set(getClearedNotificationIds().map(String));

    if (initialNotifications && initialNotifications.length > 0) {
      const active = initialNotifications.filter(
        (n) => !clearedIds.has(String(n.notificationId || n.id))
      );
      setNotifications(active);
      return;
    }

    const fetchAlerts = async () => {
      setLoading(true);
      try {
        const data = await getNotifications();
        const rawList = Array.isArray(data) ? data : data.notifications || [];
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
        console.error("Failed to fetch notifications in dropdown:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchAlerts();
  }, [open, initialNotifications]);

  // Click outside and escape listeners
  useEffect(() => {
    if (!open) return;

    function handleClickOutside(event) {
      if (
        panelRef.current &&
        !panelRef.current.contains(event.target) &&
        buttonRef?.current &&
        !buttonRef.current.contains(event.target)
      ) {
        onClose();
      }
    }

    function handleEscape(event) {
      if (event.key === "Escape") {
        onClose();
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleEscape);

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleEscape);
    };
  }, [open, buttonRef, onClose]);

  const handleMarkAll = async () => {
    if (onMarkAllRead) {
      await onMarkAllRead();
    } else {
      try {
        const allIds = notifications.map((n) => String(n.notificationId || n.id));
        saveReadNotificationIds(allIds);
        await markAllNotificationsAsRead();
      } catch (e) {
        // ignore
      }
      window.dispatchEvent(new Event("notificationsRead"));
    }
    setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
  };

  const handleClearAll = async () => {
    const currentIds = notifications.map((n, idx) =>
      String(n.notificationId ?? n.id ?? idx)
    );
    saveClearedNotificationIds(currentIds);
    setNotifications([]);

    if (onClearAll) {
      await onClearAll();
    } else {
      try {
        await clearAllNotifications();
      } catch (e) {
        // ignore
      }
      window.dispatchEvent(new Event("notificationsRead"));
    }
  };

  const handleClearSingle = async (e, id) => {
    e.stopPropagation();
    const idStr = String(id);
    saveClearedNotificationIds([idStr]);
    setNotifications((prev) =>
      prev.filter((item) => String(item.notificationId ?? item.id) !== idStr)
    );

    if (onClearOne) {
      await onClearOne(id);
    } else {
      try {
        await clearNotification(id);
      } catch (e) {
        // ignore
      }
      window.dispatchEvent(new Event("notificationsRead"));
    }
  };

  const handleSelectNotification = (n) => {
    const id = String(n.notificationId ?? n.id ?? "");
    if (id) {
      saveReadNotificationIds([id]);
      setNotifications((prev) =>
        prev.map((item) =>
          String(item.notificationId ?? item.id) === id
            ? { ...item, isRead: true }
            : item
        )
      );
      window.dispatchEvent(new Event("notificationsRead"));
    }

    if (onClose) onClose();

    if (isAdmin) {
      const targetHighlight = id || n.notificationId || "";
      const adminParams = new URLSearchParams();
      if (targetHighlight) {
        adminParams.set("highlight", targetHighlight);
      }
      navigate(`/admin/notifications?${adminParams.toString()}`);
      return;
    }

    const bookingId =
      n.bookingId ??
      n.booking_id ??
      n.BookingId ??
      n.hotseatBookingId ??
      n.hotseat_booking_id ??
      n.seatBookingId ??
      n.seat_booking_id ??
      n.booking?.id ??
      n.booking?.bookingId ??
      String(n.message || "").match(/#(\d+)/)?.[1] ??
      "";

    const rawMsg = String(n.message || "");
    const rawTitle = String(n.title || "");
    const combined = `${rawTitle} ${rawMsg}`;

    const extractedRoom =
      n.roomName ??
      n.room_name ??
      n.RoomName ??
      n.booking?.roomName ??
      n.booking?.room_name ??
      combined.match(/(Conference Room \d+|Meeting Room \d+|Discussion Room \d+|Board Room \d+|Training Room \d+|Room \d+)/i)?.[0] ??
      "";

    const extractedSeat =
      n.seatNumber ??
      n.seat_number ??
      n.SeatNumber ??
      n.seat ??
      n.booking?.seatNumber ??
      n.booking?.seat ??
      combined.match(/(WS-[\w-]+|Hot\s*Seat\s*[\w-]+|Seat\s*[\w-]+)/i)?.[0] ??
      "";

    let bookingDate =
      n.bookingDate ??
      n.booking_date ??
      n.BookingDate ??
      n.date ??
      n.booking?.bookingDate ??
      n.booking?.date ??
      "";

    if (!bookingDate) {
      const isoDateMatch = combined.match(/\b(\d{4}-\d{2}-\d{2})\b/);
      if (isoDateMatch) {
        bookingDate = isoDateMatch[1];
      }
    }

    const params = new URLSearchParams();
    if (bookingId) params.set("highlight", String(bookingId).replace(/^#/, ""));
    if (extractedRoom) params.set("room", extractedRoom);
    if (extractedSeat) params.set("seat", extractedSeat);
    if (bookingDate) params.set("date", bookingDate);

    navigate(`/my-bookings?${params.toString()}`);
  };

  const getNotificationCategory = (item) => {
    const text = `${item.title || ""} ${item.message || ""}`.toLowerCase();
    if (text.includes("cancel") || text.includes("rejected") || text.includes("declined")) {
      return { icon: ShieldAlert, iconBg: "bg-rose-100 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400" };
    }
    if (text.includes("check-in") || text.includes("check in") || text.includes("expire") || text.includes("reminder")) {
      return { icon: Clock, iconBg: "bg-amber-100 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400" };
    }
    if (text.includes("hotseat") || text.includes("desk") || text.includes("workstation") || text.includes("ws-")) {
      return { icon: MapPin, iconBg: "bg-sky-100 dark:bg-sky-950/60 text-sky-600 dark:text-sky-400" };
    }
    return { icon: Building2, iconBg: "bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400" };
  };

  if (!open) return null;

  const unreadCount = notifications.filter((n) => !n.isRead && !n.read && n.unread !== false).length;

  return (
    <div
      ref={panelRef}
      className="absolute right-0 top-full z-50 mt-2.5 w-96 max-w-[calc(100vw-1.5rem)] overflow-hidden rounded-3xl border border-slate-200/90 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 shadow-2xl animate-in fade-in zoom-in-95 duration-200"
    >
      {/* HEADER */}
      <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 bg-gradient-to-r from-slate-50 to-sky-50/40 dark:from-slate-900 dark:to-slate-800/80 px-4 py-3.5">
        <div className="flex items-center gap-2">
          <div className="flex h-7 w-7 items-center justify-center rounded-xl bg-sky-100 dark:bg-sky-950/70 text-sky-700 dark:text-sky-300">
            <Bell size={14} />
          </div>
          <div>
            <h2 className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
              <span>Notifications</span>
              {unreadCount > 0 && (
                <span className="rounded-full bg-amber-500 px-2 py-0.5 text-[9px] font-extrabold text-white whitespace-nowrap shrink-0">
                  {unreadCount}
                </span>
              )}
            </h2>
          </div>
        </div>

        <div className="flex items-center gap-1.5">
          {unreadCount > 0 && (
            <button
              type="button"
              onClick={handleMarkAll}
              className="text-[11px] font-bold text-sky-600 dark:text-sky-400 hover:text-sky-800 dark:hover:text-sky-300 hover:underline transition"
              title="Mark all as read"
            >
              Mark all read
            </button>
          )}

          {notifications.length > 0 && (
            <button
              type="button"
              onClick={handleClearAll}
              className="rounded-lg p-1 text-slate-400 dark:text-slate-500 hover:bg-rose-50 dark:hover:bg-rose-950/40 hover:text-rose-600 dark:hover:text-rose-400 transition"
              title="Clear all notifications"
            >
              <Trash2 size={13} />
            </button>
          )}
        </div>
      </div>

      {/* NOTIFICATIONS LIST */}
      <div className="max-h-80 space-y-1.5 overflow-y-auto p-2.5 bg-slate-50/40 dark:bg-slate-950/60">
        {loading && notifications.length === 0 ? (
          <div className="p-6 text-center text-xs text-slate-400 dark:text-slate-500">Loading notifications...</div>
        ) : notifications.length === 0 ? (
          <div className="flex flex-col items-center justify-center p-8 text-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-sky-50 dark:bg-sky-950/60 text-sky-600 dark:text-sky-400 mb-2">
              <CheckCircle2 size={22} />
            </div>
            <p className="text-xs font-bold text-slate-800 dark:text-slate-200">All caught up!</p>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">No recent alerts for your account.</p>
          </div>
        ) : (
          notifications.map((n, index) => {
            const id = n.notificationId || n.id || index;
            const title = n.title || "Notification";
            const message = n.message || "";
            const time = n.timeAgo && !n.timeAgo.includes("0001") ? n.timeAgo : "Just now";
            const isUnread = n.isRead !== undefined ? !n.isRead : n.unread;
            const cat = getNotificationCategory(n);
            const Icon = cat.icon;

            return (
              <div
                key={id}
                role="button"
                tabIndex={0}
                onClick={() => handleSelectNotification(n)}
                className={`group relative rounded-2xl border p-3 cursor-pointer transition-all duration-200 hover:shadow-md ${
                  isUnread
                    ? "border-amber-200 dark:border-amber-900/60 bg-gradient-to-r from-amber-50/70 to-white dark:from-amber-950/30 dark:to-slate-900/90 hover:border-amber-300 dark:hover:border-amber-700"
                    : "border-slate-200/70 dark:border-slate-800/80 bg-white dark:bg-slate-900/80 hover:border-sky-300 dark:hover:border-sky-700"
                }`}
              >
                {isUnread && (
                  <span className="absolute top-3 right-3 h-2 w-2 rounded-full bg-amber-500" />
                )}

                <div className="flex items-start gap-2.5">
                  <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-xl ${cat.iconBg} mt-0.5`}>
                    <Icon size={14} />
                  </div>

                  <div className="flex-1 min-w-0 pr-4">
                    <p className="text-xs font-bold text-slate-900 dark:text-slate-100 truncate group-hover:text-sky-700 dark:group-hover:text-sky-400 transition-colors">
                      {title}
                    </p>
                    <p className="text-[11px] text-slate-600 dark:text-slate-400 line-clamp-2 mt-0.5 leading-relaxed font-normal">
                      {message}
                    </p>
                    <div className="mt-1.5 flex items-center justify-between">
                      <span className="text-[10px] font-semibold text-slate-400 dark:text-slate-500">
                        {time}
                      </span>
                      <span className="text-[10px] font-bold text-sky-600 dark:text-sky-400 opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-0.5">
                        <span>View</span>
                        <ArrowRight size={10} />
                      </span>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={(e) => handleClearSingle(e, id)}
                    className="shrink-0 rounded-lg p-1 text-slate-300 dark:text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-rose-600 dark:hover:text-rose-400 transition"
                    title="Dismiss"
                  >
                    <X size={13} />
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* FOOTER */}
      <div className="border-t border-slate-100 dark:border-slate-800 p-2 bg-white dark:bg-slate-900">
        <button
          type="button"
          onClick={() => {
            if (onViewAll) onViewAll();
            if (onClose) onClose();
            navigate("/notifications");
          }}
          className="w-full rounded-xl bg-slate-50 dark:bg-slate-800/80 hover:bg-sky-50 dark:hover:bg-sky-950/50 text-slate-700 dark:text-slate-300 hover:text-sky-700 dark:hover:text-sky-300 py-2 text-xs font-bold transition flex items-center justify-center gap-1.5"
        >
          <span>Open Full Notification Center</span>
          <ArrowRight size={12} />
        </button>
      </div>
    </div>
  );
}