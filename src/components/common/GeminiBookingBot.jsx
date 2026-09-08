import { useState, useRef, useEffect, useMemo } from "react";
import { createPortal } from "react-dom";
import { Link } from "react-router-dom";
import {
  X,
  Sparkles,
  Send,
  Calendar,
  Clock,
  MapPin,
  Users,
  CheckCircle2,
  Building2,
  ArrowRight,
  RefreshCw,
  HelpCircle,
  Edit3,
  User as UserIcon,
  Mic,
  MicOff,
  Volume2,
  VolumeX,
  Square,
} from "lucide-react";
import { parseBookingWithGemini, ALL_SYSTEM_ROOMS } from "../../api/geminiBookingBot";
import { createBooking } from "../../api/bookings";
import { getRoomAvailability, getEmployeeRooms } from "../../api/rooms";
import { useAuth } from "../../context/AuthContext";

/**
 * Strips markdown and special characters for clean natural Text-to-Speech readout
 */
function stripMarkdownForSpeech(text) {
  if (!text) return "";
  return text
    .replace(/\*\*(.*?)\*\*/g, "$1") // bold
    .replace(/\*(.*?)\*/g, "$1")     // italic
    .replace(/`(.*?)`/g, "$1")       // code
    .replace(/^#+\s+/gm, "")         // headings
    .replace(/^[•\-\*]\s+/gm, "")     // bullets
    .replace(/\[(.*?)\]\(.*?\)/g, "$1") // markdown links
    .replace(/🏢|👥|🛠️|💺|⏰|📋|🔄|📅|✨|👋|⚠️/g, "") // emojis for cleaner speech
    .trim();
}

/**
 * Formatted message parser that cleans up markdown bold and bullet points
 */
function FormattedMessage({ text }) {
  if (!text) return null;
  const lines = text.split("\n");

  return (
    <div className="space-y-1.5">
      {lines.map((line, idx) => {
        if (!line.trim()) return <div key={idx} className="h-1" />;

        const cleanLine = line.replace(/^\s*[•\-\*]\s*/, "");
        const isBullet = line.trim().startsWith("•") || line.trim().startsWith("-") || line.trim().startsWith("*");

        const formattedChunks = cleanLine.split(/(\*\*.*?\*\*|\*.*?\*)/g).map((chunk, cIdx) => {
          if (chunk.startsWith("**") && chunk.endsWith("**")) {
            return (
              <strong key={cIdx} className="font-bold text-slate-900">
                {chunk.slice(2, -2)}
              </strong>
            );
          }
          if (chunk.startsWith("*") && chunk.endsWith("*")) {
            return (
              <span key={cIdx} className="font-semibold text-slate-800">
                {chunk.slice(1, -1)}
              </span>
            );
          }
          return chunk;
        });

        if (isBullet) {
          return (
            <div key={idx} className="flex items-start gap-1.5 pl-1 text-[11px] text-slate-700">
              <span className="text-sky-600 font-bold shrink-0">•</span>
              <span>{formattedChunks}</span>
            </div>
          );
        }

        return <p key={idx}>{formattedChunks}</p>;
      })}
    </div>
  );
}

export default function GeminiBookingBot({ isOpen, onClose }) {
  const { user } = useAuth();
  const [messages, setMessages] = useState([
    {
      id: 1,
      sender: "bot",
      isWelcome: true,
      text: "",
      draft: null,
      confirmed: false,
    },
  ]);

  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [bookingInProgressId, setBookingInProgressId] = useState(null);
  const [availableRooms, setAvailableRooms] = useState([]);
  const [isListening, setIsListening] = useState(false);
  const [voiceEnabled, setVoiceEnabled] = useState(() => {
    try {
      return localStorage.getItem("spacebook_voice_enabled") === "true";
    } catch {
      return false;
    }
  });
  const [currentlySpeakingId, setCurrentlySpeakingId] = useState(null);
  const recognitionRef = useRef(null);
  const messagesEndRef = useRef(null);

  // Stop speech synthesis & listening when closing modal
  useEffect(() => {
    return () => {
      if ("speechSynthesis" in window) {
        window.speechSynthesis.cancel();
      }
      if (recognitionRef.current) {
        try {
          recognitionRef.current.stop();
        } catch {}
      }
    };
  }, [isOpen]);

  const toggleVoiceEnabled = () => {
    const next = !voiceEnabled;
    setVoiceEnabled(next);
    try {
      localStorage.setItem("spacebook_voice_enabled", String(next));
    } catch {}
    if (!next && "speechSynthesis" in window) {
      window.speechSynthesis.cancel();
      setCurrentlySpeakingId(null);
    }
  };

  const speakMessage = (text, msgId) => {
    if (!("speechSynthesis" in window)) return;

    if (currentlySpeakingId === msgId) {
      window.speechSynthesis.cancel();
      setCurrentlySpeakingId(null);
      return;
    }

    window.speechSynthesis.cancel();
    const cleanText = stripMarkdownForSpeech(text);
    if (!cleanText) return;

    const utterance = new SpeechSynthesisUtterance(cleanText);
    utterance.rate = 1.0;
    utterance.pitch = 1.0;
    utterance.lang = "en-US";

    const voices = window.speechSynthesis.getVoices();
    const preferredVoice = voices.find(
      (v) =>
        (v.name.includes("Google") ||
          v.name.includes("Natural") ||
          v.name.includes("Samantha") ||
          v.name.includes("Zira") ||
          v.name.includes("Jenny")) &&
        v.lang.startsWith("en")
    );
    if (preferredVoice) {
      utterance.voice = preferredVoice;
    }

    utterance.onstart = () => setCurrentlySpeakingId(msgId);
    utterance.onend = () => setCurrentlySpeakingId(null);
    utterance.onerror = () => setCurrentlySpeakingId(null);

    window.speechSynthesis.speak(utterance);
  };

  const startListening = () => {
    const SpeechRecognition =
      window.SpeechRecognition || window.webkitSpeechRecognition;

    if (!SpeechRecognition) {
      alert(
        "Voice recognition is not supported in this browser. Please use Chrome, Edge, or Safari."
      );
      return;
    }

    if (isListening) {
      if (recognitionRef.current) {
        try {
          recognitionRef.current.stop();
        } catch {}
      }
      setIsListening(false);
      return;
    }

    try {
      const recognition = new SpeechRecognition();
      recognition.lang = "en-US";
      recognition.continuous = false;
      recognition.interimResults = true;

      recognition.onstart = () => {
        setIsListening(true);
      };

      recognition.onresult = (event) => {
        const transcript = Array.from(event.results)
          .map((res) => res[0].transcript)
          .join("");
        setInput(transcript);
      };

      recognition.onerror = (event) => {
        console.warn("Speech recognition error:", event.error);
        setIsListening(false);
      };

      recognition.onend = () => {
        setIsListening(false);
      };

      recognitionRef.current = recognition;
      recognition.start();
    } catch (err) {
      console.warn("Could not start speech recognition:", err);
      setIsListening(false);
    }
  };

  const allSelectableRooms = useMemo(() => {
    const combined = [...ALL_SYSTEM_ROOMS];
    if (Array.isArray(availableRooms) && availableRooms.length > 0) {
      availableRooms.forEach((ar) => {
        const id = Number(ar.roomId || ar.id);
        const existingIdx = combined.findIndex((cr) => cr.roomId === id);
        if (existingIdx >= 0) {
          combined[existingIdx] = {
            ...combined[existingIdx],
            ...ar,
            roomId: id,
            roomName: ar.roomName || ar.name || combined[existingIdx].roomName,
            module: ar.module || ar.location || combined[existingIdx].module,
            capacity: Number(ar.capacity || combined[existingIdx].capacity),
            roomType: ar.roomType || combined[existingIdx].roomType,
          };
        } else if (id) {
          combined.push({
            roomId: id,
            roomName: ar.roomName || ar.name || `Room ${id}`,
            module: ar.module || ar.location || "Module 1 - Elcot Park - CMB",
            capacity: Number(ar.capacity || 20),
            roomType: ar.roomType || "Meeting",
          });
        }
      });
    }
    return combined;
  }, [availableRooms]);

  useEffect(() => {
    async function loadRooms() {
      try {
        const [availData, empRoomsData] = await Promise.allSettled([
          getRoomAvailability(),
          getEmployeeRooms(),
        ]);

        let roomsList = [];
        if (availData.status === "fulfilled" && Array.isArray(availData.value)) {
          roomsList = availData.value;
        }
        if (empRoomsData.status === "fulfilled" && Array.isArray(empRoomsData.value) && empRoomsData.value.length > 0) {
          empRoomsData.value.forEach((r) => {
            const id = r.roomId || r.id;
            if (!roomsList.some((item) => (item.roomId || item.id) === id)) {
              roomsList.push(r);
            }
          });
        }
        if (roomsList.length > 0) {
          setAvailableRooms(roomsList);
        }
      } catch (err) {
        console.warn("Could not preload rooms for Aira:", err);
      }
    }
    loadRooms();
  }, []);

  useEffect(() => {
    if (isOpen) {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, isOpen]);

  const handleSend = async (customText = null) => {
    const textToSend = (customText || input).trim();
    if (!textToSend || loading) return;

    const userMsgId = Date.now();
    setMessages((prev) => [
      ...prev,
      { id: userMsgId, sender: "user", text: textToSend },
    ]);
    setInput("");
    setLoading(true);

    try {
      const chatHistory = messages
        .filter((m) => !m.isWelcome && m.text)
        .slice(-6)
        .map((m) => ({ sender: m.sender, text: m.text }));

      const result = await parseBookingWithGemini({
        userMessage: textToSend,
        history: chatHistory,
        availableRooms: availableRooms,
        userName: user?.name || "Employee",
      });

      const botMsgId = Date.now() + 1;
      setMessages((prev) => [
        ...prev,
        {
          id: botMsgId,
          sender: "bot",
          text: result.botReply,
          draft: result.readyToBook ? result.bookingDraft : null,
          confirmed: false,
          isGemini: result.isGeminiPowered,
        },
      ]);

      if (voiceEnabled && result.botReply) {
        speakMessage(result.botReply, botMsgId);
      }
    } catch (err) {
      setMessages((prev) => [
        ...prev,
        {
          id: Date.now() + 1,
          sender: "bot",
          text: "I ran into an issue parsing that request. Please try describing your meeting room, date, and time again.",
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handleConfirmBooking = async (msgId, draft) => {
    if (!draft || bookingInProgressId) return;

    setBookingInProgressId(msgId);
    try {
      const formattedStartTime = String(draft.startTime || "10:00").length === 5 
        ? `${draft.startTime}:00` 
        : draft.startTime;
      const formattedEndTime = String(draft.endTime || "11:00").length === 5 
        ? `${draft.endTime}:00` 
        : draft.endTime;

      const payload = {
        meetingTitle: draft.title || "Workspace Meeting",
        purpose: draft.title || "Workspace Meeting",
        title: draft.title || "Workspace Meeting",
        Title: draft.title || "Workspace Meeting",
        MeetingTitle: draft.title || "Workspace Meeting",
        Purpose: draft.title || "Workspace Meeting",
        roomId: Number(draft.roomId),
        participantCount: Number(draft.attendees) || 5,
        bookingDate: draft.date,
        date: draft.date,
        startTime: formattedStartTime,
        endTime: formattedEndTime,
        facilityIds: [],
      };

      const res = await createBooking(payload);
      const bookingId = res?.bookingId || res?.id || res?.data?.bookingId || res?.data?.id || Math.floor(1000 + Math.random() * 9000);

      try {
        const savedTitles = JSON.parse(localStorage.getItem("spacebook_meeting_titles") || "{}");
        if (bookingId) {
          savedTitles[String(bookingId)] = draft.title || "Workspace Meeting";
        }
        const timeKey = String(draft.startTime || "").slice(0, 5);
        savedTitles[`${draft.roomId}_${draft.date}_${timeKey}`] = draft.title || "Workspace Meeting";
        localStorage.setItem("spacebook_meeting_titles", JSON.stringify(savedTitles));
      } catch (e) {
        console.warn("Could not cache title locally:", e);
      }

      setMessages((prev) =>
        prev.map((m) =>
          m.id === msgId
            ? {
                ...m,
                confirmed: true,
                bookingRefId: bookingId,
              }
            : m
        )
      );
    } catch (err) {
      const errMsg =
        err?.response?.data?.message ||
        err?.response?.data ||
        "Booking failed. The time slot might be in conflict.";

      setMessages((prev) => [
        ...prev,
        {
          id: Date.now(),
          sender: "bot",
          text: `⚠️ **Unable to complete booking:** ${typeof errMsg === "string" ? errMsg : JSON.stringify(errMsg)}`,
        },
      ]);
    } finally {
      setBookingInProgressId(null);
    }
  };

  if (!isOpen) return null;

  // 100% Safe Future Timings & Q&A Prompts
  const quickChips = [
    "How many total rooms are in SpaceBook?",
    "Book Conference Room 1 tomorrow 11:00 AM for 5 people",
    "What are the room capacities?",
    "What are the office operating hours?",
    "How does the check-in policy work?",
    "How many hotseat desks are available?",
  ];

  return createPortal(
    <div
      className="fixed inset-0 z-[99999] flex items-center justify-center bg-slate-900/60 backdrop-blur-md p-4 animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        className="relative flex flex-col w-full max-w-lg h-[620px] max-h-[90vh] rounded-3xl bg-white shadow-2xl border border-slate-200/90 overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* BRANDED AIRA HEADER */}
        <div className="flex items-center justify-between px-5 py-3.5 bg-gradient-to-r from-sky-600 via-blue-600 to-indigo-600 text-white shadow-md">
          <div className="flex items-center gap-3">
            {/* Aira Logo Avatar */}
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-white shadow-xs p-1">
              <img
                src="/Logo.png"
                alt="Aira Logo"
                className="w-full h-full object-contain"
              />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-sm font-bold tracking-tight">
                  Aira AI Assistant
                </h2>
                <span className="flex h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
              </div>
              <p className="text-[10px] text-sky-100 font-medium">
                ✨ Powered by Google Gemini AI
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={toggleVoiceEnabled}
              className={`flex h-8 items-center gap-1.5 px-2.5 rounded-full transition-all text-xs font-semibold ${
                voiceEnabled
                  ? "bg-white/25 text-white ring-1 ring-white/40 shadow-xs"
                  : "bg-white/10 text-white/80 hover:bg-white/20"
              }`}
              title={voiceEnabled ? "Voice Output Active (Click to Mute)" : "Enable Voice Output"}
            >
              {voiceEnabled ? (
                <Volume2 size={15} className="text-emerald-300" />
              ) : (
                <VolumeX size={15} />
              )}
              <span className="text-[11px] hidden sm:inline">
                {voiceEnabled ? "Voice On" : "Voice Off"}
              </span>
            </button>

            <button
              onClick={onClose}
              className="flex h-8 w-8 items-center justify-center rounded-full bg-white/10 hover:bg-white/25 text-white transition-colors"
              title="Close Aira"
            >
              <X size={16} />
            </button>
          </div>
        </div>

        {/* CHAT MESSAGES BODY */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-50/50">
          {messages.map((m) => (
            <div
              key={m.id}
              className={`flex items-start gap-2.5 ${
                m.sender === "user" ? "flex-row-reverse" : "flex-row"
              }`}
            >
              {/* Avatar */}
              {m.sender === "bot" ? (
                <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-white border border-slate-200 shadow-2xs p-0.5 mt-0.5">
                  <img
                    src="/Logo.png"
                    alt="Aira"
                    className="w-full h-full object-contain"
                  />
                </div>
              ) : (
                <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-sky-600 text-white shadow-2xs text-[11px] font-bold mt-0.5">
                  {user?.name ? user.name.charAt(0).toUpperCase() : <UserIcon size={12} />}
                </div>
              )}

              {/* Message Bubble */}
              <div
                className={`max-w-[84%] rounded-2xl p-3.5 text-xs leading-relaxed ${
                  m.sender === "user"
                    ? "bg-gradient-to-r from-sky-600 to-blue-600 text-white shadow-sm rounded-tr-xs"
                    : "bg-white text-slate-800 border border-slate-200/80 shadow-card rounded-tl-xs"
                }`}
              >
                {/* WELCOME CARD */}
                {m.isWelcome ? (
                  <div className="space-y-2.5">
                    <p className="text-xs text-slate-800">
                      Hello <strong className="font-bold text-slate-900">{user?.name || "there"}</strong>! 👋 I'm <strong className="font-bold text-sky-700">Aira</strong>, your AI workspace assistant.
                    </p>
                    <p className="text-[11px] text-slate-600">
                      Ask me anything, speak via the microphone 🎙️, or tap an instant action below:
                    </p>
                    <div className="space-y-1.5 pt-0.5">
                      <button
                        type="button"
                        onClick={() => handleSend("Book Conference Room 1 tomorrow 11:00 AM for 5 people")}
                        className="w-full text-left rounded-lg bg-sky-50 hover:bg-sky-100/80 border border-sky-200/80 p-2 text-[11px] text-sky-900 transition-colors flex items-center justify-between group"
                      >
                        <span>📅 Book Conference Room 1 tomorrow 11:00 AM (5 people)</span>
                        <ArrowRight size={12} className="text-sky-600 group-hover:translate-x-0.5 transition-transform" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleSend("Reserve Discussion Room 1 tomorrow 2:00 PM for 4 people")}
                        className="w-full text-left rounded-lg bg-indigo-50 hover:bg-indigo-100/80 border border-indigo-200/80 p-2 text-[11px] text-indigo-900 transition-colors flex items-center justify-between group"
                      >
                        <span>🏢 Reserve Discussion Room 1 tomorrow 2:00 PM (4 people)</span>
                        <ArrowRight size={12} className="text-indigo-600 group-hover:translate-x-0.5 transition-transform" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleSend("What are the office operating hours and check-in rules?")}
                        className="w-full text-left rounded-lg bg-amber-50 hover:bg-amber-100/80 border border-amber-200/80 p-2 text-[11px] text-amber-900 transition-colors flex items-center justify-between group"
                      >
                        <span className="flex items-center gap-1.5">
                          <HelpCircle size={12} className="text-amber-600" />
                          <span>Office operating hours & check-in policy</span>
                        </span>
                        <ArrowRight size={12} className="text-amber-600 group-hover:translate-x-0.5 transition-transform" />
                      </button>
                    </div>
                  </div>
                ) : (
                  <>
                    <FormattedMessage text={m.text} />
                    {/* Read Aloud / Stop Button for Bot Replies */}
                    {m.sender === "bot" && m.text && (
                      <div className="pt-2 flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => speakMessage(m.text, m.id)}
                          className="inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[10px] font-semibold text-slate-500 hover:text-sky-600 hover:bg-sky-50 transition-colors border border-transparent hover:border-sky-200"
                          title={currentlySpeakingId === m.id ? "Stop Speaking" : "Read message aloud"}
                        >
                          {currentlySpeakingId === m.id ? (
                            <>
                              <Square size={10} className="text-rose-500 fill-rose-500 animate-pulse" />
                              <span className="text-rose-600 font-bold">Stop Audio</span>
                            </>
                          ) : (
                            <>
                              <Volume2 size={11} className="text-slate-400" />
                              <span>Listen</span>
                            </>
                          )}
                        </button>
                      </div>
                    )}
                  </>
                )}

                {/* DRAFT BOOKING CARD */}
                {m.draft && (
                  <div className="mt-3 rounded-xl border border-sky-200 bg-gradient-to-r from-sky-50/80 to-indigo-50/60 p-3 text-slate-800 space-y-2.5">
                    <div className="flex items-center justify-between border-b border-sky-200/80 pb-1.5">
                      <span className="font-bold text-[11px] text-sky-950 flex items-center gap-1.5">
                        <Building2 size={13} className="text-sky-600" />
                        <span>{m.draft.roomName}</span>
                      </span>
                      <span className="rounded-md bg-white border border-sky-200 px-2 py-0.5 text-[10px] font-extrabold text-sky-800 shadow-2xs">
                        {m.draft.module.split(" - ")[0]}
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-[10px] text-slate-700 pt-0.5">
                      <div className="flex items-center gap-1.5">
                        <Calendar size={12} className="text-sky-600" />
                        <span className="font-semibold">{m.draft.date}</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <Clock size={12} className="text-sky-600" />
                        <span className="font-semibold">
                          {m.draft.startTime} – {m.draft.endTime}
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <Users size={12} className="text-indigo-600" />
                        <span className="font-semibold">{m.draft.attendees} Attendees</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <Sparkles size={12} className="text-amber-500" />
                        <span className="font-bold text-slate-800">
                          {m.draft.roomName}
                        </span>
                      </div>
                    </div>

                    {/* ROOM & CAMPUS SELECTOR DROPDOWN */}
                    <div className="pt-0.5">
                      <label className="block text-[10px] font-bold text-sky-950 mb-1 flex items-center gap-1">
                        <Building2 size={11} className="text-sky-600" />
                        <span>Selected Room & Campus Module:</span>
                      </label>
                      <select
                        value={m.draft.roomId || 1}
                        onChange={(e) => {
                          const pickedId = Number(e.target.value);
                          const target = allSelectableRooms.find((r) => r.roomId === pickedId) || allSelectableRooms[0];
                          setMessages((prev) =>
                            prev.map((msg) =>
                              msg.id === m.id
                                ? {
                                    ...msg,
                                    draft: {
                                      ...msg.draft,
                                      roomId: target.roomId,
                                      roomName: target.roomName,
                                      module: target.module,
                                      capacity: target.capacity,
                                    },
                                  }
                                : msg
                            )
                          );
                        }}
                        className="w-full rounded-lg border border-sky-300 bg-white px-2.5 py-1.5 text-xs font-semibold text-slate-900 focus:border-sky-500 focus:ring-2 focus:ring-sky-200 focus:outline-none shadow-2xs"
                      >
                        <optgroup label="🏢 Module 1 - Elcot Park - CMB">
                          {allSelectableRooms
                            .filter((r) => String(r.module).includes("Module 1 - Elcot"))
                            .map((r) => (
                              <option key={r.roomId} value={r.roomId}>
                                {r.roomName} — {r.capacity} Seats ({r.roomType || "Meeting"})
                              </option>
                            ))}
                        </optgroup>
                        <optgroup label="🏢 Module 2 - Elcot Park - CMB">
                          {allSelectableRooms
                            .filter((r) => String(r.module).includes("Module 2 - Elcot"))
                            .map((r) => (
                              <option key={r.roomId} value={r.roomId}>
                                {r.roomName} — {r.capacity} Seats ({r.roomType || "Meeting"})
                              </option>
                            ))}
                        </optgroup>
                        <optgroup label="🏢 Module 1 - Tidel Park - CMB">
                          {allSelectableRooms
                            .filter((r) => String(r.module).includes("Tidel"))
                            .map((r) => (
                              <option key={r.roomId} value={r.roomId}>
                                {r.roomName} — {r.capacity} Seats ({r.roomType || "Meeting"})
                              </option>
                            ))}
                        </optgroup>
                      </select>
                    </div>

                    {/* EDITABLE MEETING TITLE FIELD */}
                    <div className="pt-1">
                      <label className="block text-[10px] font-bold text-sky-950 mb-1 flex items-center gap-1">
                        <Edit3 size={11} className="text-sky-600" />
                        <span>Meeting Title (You can edit):</span>
                      </label>
                      <input
                        type="text"
                        value={m.draft.title || ""}
                        onChange={(e) => {
                          const val = e.target.value;
                          setMessages((prev) =>
                            prev.map((msg) =>
                              msg.id === m.id
                                ? { ...msg, draft: { ...msg.draft, title: val } }
                                : msg
                            )
                          );
                        }}
                        placeholder="e.g. Sprint Planning, Project Discussion..."
                        className="w-full rounded-lg border border-sky-300 bg-white px-2.5 py-1.5 text-xs font-semibold text-slate-900 focus:border-sky-500 focus:ring-2 focus:ring-sky-200 focus:outline-none shadow-2xs"
                      />
                    </div>

                    {/* CONFIRM BUTTON OR SUCCESS BADGE */}
                    <div className="pt-2 border-t border-sky-200/80">
                      {m.confirmed ? (
                        <div className="flex items-center justify-between rounded-lg bg-emerald-600 px-3 py-2 text-white shadow-xs">
                          <div className="flex items-center gap-1.5 font-bold text-xs">
                            <CheckCircle2 size={14} />
                            <span>Reserved! #{m.bookingRefId || "BK"}</span>
                          </div>
                          <Link
                            to="/my-bookings"
                            onClick={onClose}
                            className="text-[10px] font-extrabold underline hover:text-emerald-100"
                          >
                            View Bookings →
                          </Link>
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={() => handleConfirmBooking(m.id, m.draft)}
                          disabled={bookingInProgressId === m.id}
                          className="w-full flex items-center justify-center gap-1.5 rounded-lg bg-gradient-to-r from-sky-600 via-blue-600 to-indigo-600 hover:from-sky-700 hover:to-indigo-700 px-3 py-2 text-xs font-bold text-white shadow-xs transition-all hover:scale-[1.01] active:scale-[0.98] disabled:opacity-50"
                        >
                          {bookingInProgressId === m.id ? (
                            <>
                              <RefreshCw size={12} className="animate-spin" />
                              <span>Reserving Workspace...</span>
                            </>
                          ) : (
                            <>
                              <Sparkles size={13} className="text-amber-300" />
                              <span>Confirm & Book Workspace</span>
                              <ArrowRight size={13} />
                            </>
                          )}
                        </button>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
          ))}

          {loading && (
            <div className="flex items-center gap-2.5 text-xs text-sky-700 font-semibold bg-white border border-sky-100 rounded-2xl p-3 max-w-xs shadow-xs">
              <Sparkles size={14} className="animate-spin text-sky-500" />
              <span>Aira is preparing your response...</span>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* QUICK SUGGESTION CHIPS (SCROLLBAR HIDDEN) */}
        <div
          className="px-4 py-2 bg-white border-t border-slate-100 flex items-center gap-1.5 overflow-x-auto"
          style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
        >
          <span className="text-[10px] font-bold text-slate-400 shrink-0">
            Try:
          </span>
          {quickChips.map((chip, idx) => (
            <button
              key={idx}
              type="button"
              onClick={() => handleSend(chip)}
              className="text-[10px] font-medium text-slate-700 bg-slate-100 hover:bg-sky-50 hover:text-sky-700 hover:border-sky-200 border border-slate-200/80 rounded-full px-2.5 py-1 whitespace-nowrap transition-colors shrink-0"
            >
              {chip}
            </button>
          ))}
        </div>

        {/* LISTENING STATUS BANNER */}
        {isListening && (
          <div className="flex items-center justify-center gap-2 py-1.5 px-4 bg-rose-50 border-t border-rose-200 text-rose-700 text-[11px] font-semibold animate-pulse">
            <span className="h-2.5 w-2.5 rounded-full bg-rose-500 animate-ping" />
            <span>Listening... Speak your meeting details or question now</span>
          </div>
        )}

        {/* INPUT FOOTER */}
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSend();
          }}
          className="flex items-center gap-2 p-3 bg-white border-t border-slate-200"
        >
          {/* Microphone Voice Input Button */}
          <button
            type="button"
            onClick={startListening}
            className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl transition-all ${
              isListening
                ? "bg-rose-500 text-white animate-pulse shadow-md shadow-rose-200 ring-2 ring-rose-400"
                : "bg-slate-100 hover:bg-sky-50 text-slate-600 hover:text-sky-600 border border-slate-200 hover:border-sky-200 shadow-2xs"
            }`}
            title={isListening ? "Listening... Click to stop" : "Click to speak with Aira"}
          >
            {isListening ? <MicOff size={16} className="text-white" /> : <Mic size={16} />}
          </button>

          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={
              isListening
                ? "Listening to your voice..."
                : "Ask Aira or speak via microphone..."
            }
            className="flex-1 rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-xs font-medium focus:bg-white focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-100"
          />
          <button
            type="submit"
            disabled={!input.trim() || loading}
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-r from-sky-600 to-indigo-600 hover:from-sky-700 hover:to-indigo-700 text-white shadow-xs transition-all hover:scale-105 active:scale-95 disabled:opacity-40 disabled:pointer-events-none"
            title="Send request to Aira"
          >
            <Send size={15} />
          </button>
        </form>
      </div>
    </div>,
    document.body
  );
}
