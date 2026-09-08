/**
 * Aira AI Assistant & Conversational Workspace Service
 * Powered by Google Gemini with deep domain intelligence for SpaceBook.
 * Handles exact Q&A about rooms, desks, campuses, policies, and conversational room bookings.
 */

function getLocalDateStr(dateObj = new Date()) {
  const offset = dateObj.getTimezoneOffset() * 60000;
  return new Date(dateObj.getTime() - offset).toISOString().slice(0, 10);
}

export const ALL_SYSTEM_ROOMS = [
  // Module 1 - Elcot Park - CMB (5 Rooms)
  {
    roomId: 1,
    roomName: "Conference Room 1",
    roomNumber: "CBE-05-EO1-001",
    module: "Module 1 - Elcot Park - CMB",
    capacity: 20,
    roomType: "Conference",
    amenities: ["4K Projector", "Smart TV", "Whiteboard", "Camera", "Mic", "Wi-Fi"],
  },
  {
    roomId: 2,
    roomName: "Discussion Room 1",
    roomNumber: "CBE-05-EO1-003",
    module: "Module 1 - Elcot Park - CMB",
    capacity: 8,
    roomType: "Discussion",
    amenities: ["Monitor", "Whiteboard", "Wi-Fi"],
  },
  {
    roomId: 3,
    roomName: "Discussion Room 2",
    roomNumber: "CBE-05-EO1-005",
    module: "Module 1 - Elcot Park - CMB",
    capacity: 8,
    roomType: "Discussion",
    amenities: ["Monitor", "Whiteboard", "Wi-Fi"],
  },
  {
    roomId: 4,
    roomName: "Discussion Room 3",
    roomNumber: "CBE-05-EO1-006",
    module: "Module 1 - Elcot Park - CMB",
    capacity: 8,
    roomType: "Discussion",
    amenities: ["Monitor", "Whiteboard", "Wi-Fi"],
  },
  {
    roomId: 5,
    roomName: "Training Room 1",
    roomNumber: "CBE-05-EO1-007",
    module: "Module 1 - Elcot Park - CMB",
    capacity: 30,
    roomType: "Training",
    amenities: ["Projector", "Audio System", "Whiteboard", "Dual Screens", "Wi-Fi"],
  },

  // Module 2 - Elcot Park - CMB (5 Rooms)
  {
    roomId: 6,
    roomName: "Training Room 1",
    roomNumber: "CBE-05-EO2-012",
    module: "Module 2 - Elcot Park - CMB",
    capacity: 50,
    roomType: "Training",
    amenities: ["High-Lumen Projector", "Audio System", "Whiteboard", "TV", "Dual Screens", "Wi-Fi"],
  },
  {
    roomId: 7,
    roomName: "Discussion Room 1",
    roomNumber: "CBE-05-EO2-001",
    module: "Module 2 - Elcot Park - CMB",
    capacity: 10,
    roomType: "Discussion",
    amenities: ["Smart TV", "Whiteboard", "Camera", "Conference Mic", "Wi-Fi"],
  },
  {
    roomId: 8,
    roomName: "Discussion Room 2",
    roomNumber: "CBE-05-EO2-002",
    module: "Module 2 - Elcot Park - CMB",
    capacity: 8,
    roomType: "Discussion",
    amenities: ["Smart TV", "Whiteboard", "Mic", "Wi-Fi"],
  },
  {
    roomId: 9,
    roomName: "Discussion Room 3",
    roomNumber: "CBE-05-EO2-007",
    module: "Module 2 - Elcot Park - CMB",
    capacity: 8,
    roomType: "Discussion",
    amenities: ["Smart TV", "Whiteboard", "Camera", "Wi-Fi"],
  },
  {
    roomId: 10,
    roomName: "Discussion Room 4",
    roomNumber: "CBE-05-EO2-010",
    module: "Module 2 - Elcot Park - CMB",
    capacity: 8,
    roomType: "Discussion",
    amenities: ["Smart TV", "Whiteboard", "Camera", "Wi-Fi"],
  },

  // Module 1 - Tidel Park - CMB (5 Rooms)
  {
    roomId: 11,
    roomName: "Conference Room 1",
    roomNumber: "CBE-04-TO1-001",
    module: "Module 1 - Tidel Park - CMB",
    capacity: 16,
    roomType: "Conference",
    amenities: ["Projector", "Smart TV", "Whiteboard", "Camera", "Mic", "Wi-Fi"],
  },
  {
    roomId: 12,
    roomName: "Discussion Room 1",
    roomNumber: "CBE-04-TO1-002",
    module: "Module 1 - Tidel Park - CMB",
    capacity: 8,
    roomType: "Discussion",
    amenities: ["Smart TV", "Whiteboard", "Camera", "Conference Mic", "Wi-Fi"],
  },
  {
    roomId: 13,
    roomName: "Training Room 1",
    roomNumber: "CBE-04-TO1-003",
    module: "Module 1 - Tidel Park - CMB",
    capacity: 25,
    roomType: "Training",
    amenities: ["Projector", "Audio System", "Whiteboard", "TV", "Wi-Fi"],
  },
  {
    roomId: 14,
    roomName: "Discussion Room 2",
    roomNumber: "CBE-04-TO1-004",
    module: "Module 1 - Tidel Park - CMB",
    capacity: 10,
    roomType: "Discussion",
    amenities: ["Smart TV", "Whiteboard", "Camera", "Conference Mic", "Wi-Fi"],
  },
  {
    roomId: 15,
    roomName: "Discussion Room 3",
    roomNumber: "CBE-04-TO1-005",
    module: "Module 1 - Tidel Park - CMB",
    capacity: 8,
    roomType: "Discussion",
    amenities: ["Smart TV", "Whiteboard", "Camera", "Wi-Fi"],
  },
];

export async function parseBookingWithGemini({
  userMessage,
  history = [],
  availableRooms = [],
  userName = "Employee",
  apiKey = import.meta.env.VITE_GEMINI_API_KEY || "",
}) {
  const now = new Date();
  const todayIso = getLocalDateStr(now);
  const currentHour = now.getHours();
  const currentMinutes = now.getMinutes();
  const currentTimeStr = `${String(currentHour).padStart(2, "0")}:${String(currentMinutes).padStart(2, "0")}`;
  const dayName = now.toLocaleDateString("en-US", { weekday: "long" });

  // Calculate default next available whole hour slot
  let defaultStartHour = currentHour + 1;
  let defaultDate = todayIso;
  if (defaultStartHour >= 21) {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    defaultDate = getLocalDateStr(tomorrow);
    defaultStartHour = 10;
  } else if (defaultStartHour < 10) {
    defaultStartHour = 10;
  }
  const defaultStartTime = `${String(defaultStartHour).padStart(2, "0")}:00`;
  const defaultEndTime = `${String(defaultStartHour + 1).padStart(2, "0")}:00`;

  // Merge available rooms with standard system rooms to ensure full campus coverage
  const combinedRooms = [...ALL_SYSTEM_ROOMS];
  if (Array.isArray(availableRooms) && availableRooms.length > 0) {
    availableRooms.forEach((ar) => {
      const id = Number(ar.roomId || ar.id);
      const existingIdx = combinedRooms.findIndex((cr) => cr.roomId === id);
      if (existingIdx >= 0) {
        combinedRooms[existingIdx] = {
          ...combinedRooms[existingIdx],
          ...ar,
          roomId: id,
          roomName: ar.roomName || ar.name || combinedRooms[existingIdx].roomName,
          module: ar.module || ar.location || combinedRooms[existingIdx].module,
          capacity: Number(ar.capacity || combinedRooms[existingIdx].capacity),
          amenities: ar.amenities || combinedRooms[existingIdx].amenities,
        };
      } else if (id) {
        combinedRooms.push({
          roomId: id,
          roomName: ar.roomName || ar.name || `Room ${id}`,
          module: ar.module || ar.location || "Module 1 - Elcot Park - CMB",
          capacity: Number(ar.capacity || 20),
          roomType: ar.roomType || "Meeting",
          amenities: ar.amenities || ["Wi-Fi", "Whiteboard"],
        });
      }
    });
  }

  const roomListSummary = combinedRooms
    .map(
      (r) =>
        `- ID ${r.roomId}: "${r.roomName}" (${r.roomType}) in "${r.module}", Capacity: ${r.capacity} seats, Amenities: [${(r.amenities || []).join(", ")}]`
    )
    .join("\n");

  const cleanKey = String(apiKey || "").trim();

  // If any API key is provided, attempt Google Generative AI call
  if (cleanKey && cleanKey.length > 5) {
    const recentHistoryText = Array.isArray(history) && history.length > 0
      ? history
          .map((h) => `${h.sender === "user" ? "User" : "Aira"}: ${h.text}`)
          .join("\n")
      : "";

    const systemPrompt = `You are Aira, the intelligent, friendly, and precise AI Assistant for SpaceBook (Corporate Workspace & Desk Reservation Platform).
Current Date: ${dayName}, ${todayIso}.
Current Live Time: ${currentTimeStr} (24-hour IST format).

=== SPACEBOOK DETAILED CAMPUS & ROOM KNOWLEDGE BASE ===
${roomListSummary}

Total Meeting Rooms: ${combinedRooms.length}
Total Hotseat Desks: 453 across 3 modules in Coimbatore:
1. Module 1 (Elcot Park CMB): 98 Desks (EO1-01 to EO1-98)
2. Module 2 (Elcot Park CMB): 131 Desks (EO2-01 to EO2-131)
3. Module 1 (Tidel Park CMB): 224 Desks (WS-04-001 to WS-04-224)

=== OPERATING RULES & POLICIES ===
1. Operating Hours: Monday to Friday: 10:00 AM to 10:00 PM IST (10:00 - 22:00). Strictly closed on Weekends (Saturday & Sunday).
2. Instant Confirmation: All room and desk bookings are auto-approved instantly in real-time. No admin approval required.
3. Check-In Window: Users must check in on Dashboard or My Bookings within 30 minutes of reservation start time.
4. Auto-Release: Unconfirmed/unchecked-in reservations are automatically released after 30 minutes for others to book.
5. Hotseat Policy: Fair use policy allows 1 active hotseat desk pass per employee per day.
6. Microsoft 365 Outlook Integration: Meeting bookings can be saved to Outlook/Teams calendar with 1 click via the Outlook sync button on My Bookings.
7. Managing Bookings: Users can modify time or cancel any booking on the My Bookings page (cancelling immediately releases the space).

=== YOUR BEHAVIOR & INTENT CLASSIFICATION ===
1. "general_query" (readyToBook: false, bookingDraft: null):
   - Triggered when the user asks ANY question about rooms, desks, campuses, rules, amenities, operating hours, check-in, cancellations, who you are, greetings, or help.
   - In "botReply": Provide a direct, beautifully formatted markdown response with bullet points and bold highlights answering their specific question accurately based on the knowledge base above. DO NOT generate a bookingDraft.

2. "book_room" (readyToBook: true, bookingDraft: { ... }):
   - ONLY when the user explicitly wants to book, reserve, hold, or schedule a room (e.g. "Book Conference Room 1 tomorrow at 2 PM for 5 people", "Reserve Discussion Room 2 on Friday at 11 AM").
   - Extract the closest room ID, date (YYYY-MM-DD), startTime (HH:MM), endTime (HH:MM), attendees, and meaningful meeting title.
   - If requested time on today (${todayIso}) has already passed (${currentTimeStr}), automatically schedule for tomorrow at that time.
   - If outside operating hours (10:00 to 22:00), adjust within operating hours.

${recentHistoryText ? `=== RECENT CHAT HISTORY ===\n${recentHistoryText}\n` : ""}
=== CURRENT USER QUERY ===
User: "${userMessage}"
User Name: "${userName}"

=== REQUIRED JSON OUTPUT FORMAT ===
Respond ONLY with a valid JSON object:
{
  "intent": "general_query" | "book_room",
  "botReply": "Markdown response addressing user query",
  "readyToBook": true | false,
  "bookingDraft": null | {
    "title": "Meeting Title",
    "roomId": 1,
    "roomName": "Exact Room Name",
    "module": "Exact Module Name",
    "date": "YYYY-MM-DD",
    "startTime": "HH:MM",
    "endTime": "HH:MM",
    "attendees": 5
  }
}`;

    // Try primary models (gemini-1.5-flash, fallback to gemini-2.0-flash / gemini-1.5-pro)
    const models = ["gemini-1.5-flash", "gemini-2.0-flash", "gemini-1.5-pro"];

    for (const model of models) {
      try {
        const response = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${cleanKey}`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              contents: [{ parts: [{ text: systemPrompt }] }],
              generationConfig: {
                temperature: 0.2,
                topK: 40,
                topP: 0.95,
              },
            }),
          }
        );

        if (response.ok) {
          const data = await response.json();
          const rawText = data?.candidates?.[0]?.content?.parts?.[0]?.text?.trim();
          if (rawText) {
            // Strip markdown code block fences if present
            const cleanJsonText = rawText
              .replace(/^```(?:json)?\s*/i, "")
              .replace(/\s*```$/i, "")
              .trim();

            const parsed = JSON.parse(cleanJsonText);
            if (parsed && parsed.botReply) {
              let readyToBook = Boolean(parsed.readyToBook);
              let sanitizedDraft = null;

              if (readyToBook && parsed.bookingDraft) {
                const validation = validateBookingDraft(parsed.bookingDraft, combinedRooms);
                if (validation.isValid) {
                  sanitizedDraft = validation.sanitizedDraft;
                } else {
                  readyToBook = false;
                  parsed.botReply += `\n\n*(Note: Adjusting booking request — ${validation.reason})*`;
                }
              }

              return {
                intent: readyToBook ? "book_room" : (parsed.intent || "general_query"),
                botReply: parsed.botReply,
                readyToBook,
                bookingDraft: sanitizedDraft,
                isGeminiPowered: true,
              };
            }
          }
        }
      } catch (err) {
        console.warn(`Gemini API attempt with ${model} failed, checking next:`, err);
      }
    }
  }

  // Fallback to high-accuracy local NLP engine
  return parseLocally(
    userMessage,
    combinedRooms,
    todayIso,
    now,
    defaultStartTime,
    defaultEndTime,
    defaultDate
  );
}

/**
 * Enterprise XSS Sanitizer for AI output and user inputs
 */
export function sanitizeText(text) {
  if (!text) return "";
  return String(text)
    .replace(/<[^>]*>/g, "")
    .replace(/javascript:/gi, "")
    .replace(/on\w+=/gi, "")
    .slice(0, 100)
    .trim();
}

/**
 * Strict Schema Validation Guard for AI-generated drafts
 * Enforces Zero-Trust boundary: LLM Output -> Schema Validation -> UI Preview -> Human Review -> API
 */
export function validateBookingDraft(draft, rooms = ALL_SYSTEM_ROOMS) {
  if (!draft || typeof draft !== "object") {
    return { isValid: false, reason: "No booking draft provided", sanitizedDraft: null };
  }

  // 1. Room ID validation
  const roomId = Number(draft.roomId);
  const targetRoom = rooms.find((r) => Number(r.roomId || r.id) === roomId);
  if (!targetRoom) {
    return { isValid: false, reason: `Invalid room selection (#${draft.roomId})`, sanitizedDraft: null };
  }

  // 2. Date validation (YYYY-MM-DD)
  const dateStr = String(draft.date || "").trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
    return { isValid: false, reason: "Invalid date format. Expected YYYY-MM-DD", sanitizedDraft: null };
  }

  // Weekend check
  const [y, m, d] = dateStr.split("-").map(Number);
  const dateObj = new Date(y, m - 1, d);
  const day = dateObj.getDay();
  if (day === 0 || day === 6) {
    return { isValid: false, reason: "Office is closed on weekends (Saturday & Sunday)", sanitizedDraft: null };
  }

  // 3. Time validation (10:00 - 22:00)
  const startTime = String(draft.startTime || "10:00").slice(0, 5);
  const endTime = String(draft.endTime || "11:00").slice(0, 5);
  const startH = parseInt(startTime.split(":")[0], 10);
  const endH = parseInt(endTime.split(":")[0], 10);

  if (startH < 10 || startH >= 22 || endH > 22 || startH >= endH) {
    return { isValid: false, reason: "Booking times must be between 10:00 AM and 10:00 PM IST", sanitizedDraft: null };
  }

  // 4. Attendees validation
  const attendees = Math.max(1, Math.min(Number(draft.attendees) || 5, targetRoom.capacity || 50));

  // 5. Title sanitization
  const title = sanitizeText(draft.title) || "Workspace Meeting";

  return {
    isValid: true,
    reason: null,
    sanitizedDraft: {
      title,
      roomId: targetRoom.roomId,
      roomName: targetRoom.roomName,
      module: targetRoom.module,
      date: dateStr,
      startTime,
      endTime,
      attendees,
    },
  };
}

/**
 * High-Accuracy Local Natural Language Engine for SpaceBook
 */
export function parseLocally(message, rooms, todayIso, now, defaultStartTime, defaultEndTime, defaultDate) {
  const raw = String(message || "").trim();
  const lower = raw.toLowerCase();

  // Helper: check if query contains question words or ends with '?'
  const isQuestion =
    lower.includes("?") ||
    lower.startsWith("what") ||
    lower.startsWith("how") ||
    lower.startsWith("where") ||
    lower.startsWith("when") ||
    lower.startsWith("who") ||
    lower.startsWith("why") ||
    lower.startsWith("which") ||
    lower.startsWith("is ") ||
    lower.startsWith("are ") ||
    lower.startsWith("can i") ||
    lower.startsWith("tell me") ||
    lower.startsWith("show") ||
    lower.startsWith("list") ||
    lower.startsWith("check") ||
    lower.startsWith("explain") ||
    lower.startsWith("do we have") ||
    lower.startsWith("does ");

  // Helper: check if query contains explicit booking commands
  const hasBookingVerb =
    /\b(book|reserve|schedule|block|hold)\b/.test(lower) ||
    lower.includes("i want to book") ||
    lower.includes("need a room for") ||
    lower.includes("book me") ||
    lower.includes("reserve a room");

  // If it is NOT an explicit booking command or it's clearly a question, process as general inquiry
  const shouldProcessAsQuery = isQuestion || !hasBookingVerb;

  if (shouldProcessAsQuery) {
    // 1. GREETINGS & INTRO
    if (
      lower === "hi" ||
      lower === "hello" ||
      lower === "hey" ||
      lower.startsWith("hi ") ||
      lower.startsWith("hello ") ||
      lower.startsWith("hey ") ||
      lower.includes("good morning") ||
      lower.includes("good afternoon") ||
      lower.includes("good evening") ||
      lower.includes("who are you") ||
      lower.includes("what is spacebook") ||
      lower === "help"
    ) {
      return {
        intent: "general_query",
        botReply: `Hello! 👋 I'm **Aira**, your intelligent SpaceBook assistant.\n\nI can help you with:\n• **Conference & Meeting Rooms** (Capacities, Amenities, Floor locations)\n• **Hotseat Desk Passes** (Elcot Park & Tidel Park - 453 desks)\n• **Office Rules & Check-In Policies** (30-min window, auto-release)\n• **Instant Room Bookings** (e.g. *"Book Conference Room 1 for tomorrow at 2 PM"*)\n\nWhat would you like to know or book today?`,
        readyToBook: false,
        bookingDraft: null,
        isGeminiPowered: false,
      };
    }

    // 2. AMENITIES / FACILITIES / PROJECTOR / TV / WHITEBOARD
    if (
      lower.includes("projector") ||
      lower.includes("whiteboard") ||
      lower.includes("smart tv") ||
      lower.includes("tv") ||
      lower.includes("camera") ||
      lower.includes("mic") ||
      lower.includes("microphone") ||
      lower.includes("audio") ||
      lower.includes("screen") ||
      lower.includes("amenit") ||
      lower.includes("facilit")
    ) {
      return {
        intent: "general_query",
        botReply: `🛠️ **SpaceBook Room Amenities & Technical Facilities**:\n\n• **Conference Room 1 (20 seats)**: 4K Projector, Smart TV, Magnetic Whiteboard, HD Camera, Conference Mic, High-Speed Wi-Fi.\n• **Training Room 1 (50 seats)**: High-Lumen Projector, Full Audio System, Dual Screens, Wireless Mics, Whiteboard, High-Speed Wi-Fi.\n• **Discussion Room 1 (10 seats)**: Smart TV, Whiteboard, Video Camera, Conference Mic.\n• **Discussion Room 2 (10 seats)**: Smart TV, Whiteboard, Video Camera, Conference Mic.\n• **Hotseat Desks (453 total)**: Ergonomic chairs, multi-plug power outlets, high-speed Wi-Fi.`,
        readyToBook: false,
        bookingDraft: null,
        isGeminiPowered: false,
      };
    }

    // 3. TOTAL ROOMS / ROOM LIST
    if (
      lower.includes("total room") ||
      lower.includes("how many room") ||
      lower.includes("how many meeting room") ||
      lower.includes("list room") ||
      lower.includes("list of room") ||
      lower.includes("all room") ||
      lower.includes("show room") ||
      lower.includes("what room") ||
      lower.includes("which room") ||
      lower.includes("available room") ||
      lower.includes("room count") ||
      lower.includes("rooms list") ||
      lower === "rooms" ||
      lower === "meeting rooms"
    ) {
      const m1Rooms = rooms.filter((r) => String(r.module).includes("Module 1 - Elcot"));
      const m2Rooms = rooms.filter((r) => String(r.module).includes("Module 2 - Elcot"));
      const tidelRooms = rooms.filter((r) => String(r.module).includes("Tidel"));

      const formatGroup = (list) =>
        list
          .map((r) => `  • **${r.roomName}** (${r.roomType}) — **${r.capacity} Seats** [${r.roomNumber || `ID ${r.roomId}`}]`)
          .join("\n");

      const response = `SpaceBook provides **${rooms.length} total meeting & conference rooms** across 3 campus modules in Coimbatore:

🏢 **Module 1 - Elcot Park (5 Rooms)**:
${formatGroup(m1Rooms)}

🏢 **Module 2 - Elcot Park (5 Rooms)**:
${formatGroup(m2Rooms)}

🏢 **Module 1 - Tidel Park (5 Rooms)**:
${formatGroup(tidelRooms)}

Additionally, we have **453 hotseat desk workstations**. Which room would you like to reserve?`;

      return {
        intent: "general_query",
        botReply: response,
        readyToBook: false,
        bookingDraft: null,
        isGeminiPowered: false,
      };
    }

    // 4. CAPACITIES & ROOM SIZES
    if (
      lower.includes("capacity") ||
      lower.includes("capacities") ||
      lower.includes("how many people") ||
      lower.includes("how many seat") ||
      lower.includes("room size") ||
      lower.includes("largest room") ||
      lower.includes("biggest room") ||
      lower.includes("smallest room")
    ) {
      return {
        intent: "general_query",
        botReply: `👥 **Seating Capacities across SpaceBook (15 Rooms Total)**:\n\n• **Training Room 1 (Module 2 Elcot)**: **50 Seats** (Largest room in SpaceBook)\n• **Training Room 1 (Module 1 Elcot)**: **30 Seats**\n• **Training Room 1 (Module 1 Tidel)**: **25 Seats**\n• **Conference Room 1 (Module 1 Elcot)**: **20 Seats**\n• **Conference Room 1 (Module 1 Tidel)**: **16 Seats**\n• **Discussion Rooms (10 Seats)**: Discussion Room 1 (M2 Elcot), Discussion Room 2 (Tidel)\n• **Discussion Rooms (8 Seats)**: Discussion Rooms 1, 2, 3 in M1 Elcot & M2 Elcot & Tidel\n• **Hotseat Desks**: **1 Seat per workstation** (453 desks total)`,
        readyToBook: false,
        bookingDraft: null,
        isGeminiPowered: false,
      };
    }

    // 5. HOTSEATS & WORKSTATIONS
    if (
      lower.includes("hotseat") ||
      lower.includes("hot seat") ||
      lower.includes("total desk") ||
      lower.includes("how many desk") ||
      lower.includes("desk count") ||
      lower.includes("workstation") ||
      lower.includes("desks") ||
      lower.includes("desk")
    ) {
      return {
        intent: "general_query",
        botReply: `💺 **SpaceBook Hotseat Desks (453 Total)**:\n\n• **Module 1 (Elcot Park CMB)**: 98 Desks (\`EO1-01\` to \`EO1-98\`)\n• **Module 2 (Elcot Park CMB)**: 131 Desks (\`EO2-01\` to \`EO2-131\`)\n• **Module 1 (Tidel Park CMB)**: 224 Desks (\`WS-04-001\` to \`WS-04-224\`)\n\n✨ **Policy**: 1 active desk reservation per employee per day. You can select any seat directly on the interactive floor map!`,
        readyToBook: false,
        bookingDraft: null,
        isGeminiPowered: false,
      };
    }

    // 6. OPERATING HOURS & WORKING DAYS & WEEKENDS
    if (
      lower.includes("operating hour") ||
      lower.includes("office hour") ||
      lower.includes("timings") ||
      lower.includes("timing") ||
      lower.includes("when is office open") ||
      lower.includes("working hours") ||
      lower.includes("business hours") ||
      lower.includes("weekend") ||
      lower.includes("saturday") ||
      lower.includes("sunday") ||
      lower.includes("night") ||
      lower.includes("after 10") ||
      lower.includes("closed")
    ) {
      return {
        intent: "general_query",
        botReply: `⏰ **SpaceBook Operating Hours & Schedule**:\n\n• **Working Days**: Monday through Friday\n• **Operating Hours**: **10:00 AM to 10:00 PM IST** (10:00 – 22:00 in 24-hour format)\n• **Weekends (Saturday & Sunday)**: Office is closed, bookings are disabled.\n\nAll room and hotseat bookings must be scheduled within this 10:00 AM to 10:00 PM window.`,
        readyToBook: false,
        bookingDraft: null,
        isGeminiPowered: false,
      };
    }

    // 7. CHECK-IN RULES & AUTO-RELEASE POLICY
    if (
      lower.includes("check in") ||
      lower.includes("check-in") ||
      lower.includes("checkin") ||
      lower.includes("deadline") ||
      lower.includes("release") ||
      lower.includes("auto release") ||
      lower.includes("auto-release") ||
      lower.includes("qr code")
    ) {
      return {
        intent: "general_query",
        botReply: `📋 **SpaceBook Check-In & Auto-Release Rules**:\n\n• **Check-In Window**: Check-in becomes active on your **Dashboard** and **My Bookings** on the day of your reservation.\n• **30-Minute Grace Period**: You must click **"Check In"** within **30 minutes** of your scheduled start time.\n• **Automatic Release**: If check-in is not confirmed within 30 minutes, your reservation is automatically cancelled and released for other colleagues to book.\n• **Auto-Approval**: All new reservations are confirmed immediately without waiting for admin approval.`,
        readyToBook: false,
        bookingDraft: null,
        isGeminiPowered: false,
      };
    }

    // 8. CANCELLATION & RESCHEDULING
    if (
      lower.includes("cancel") ||
      lower.includes("cancellation") ||
      lower.includes("delete booking") ||
      lower.includes("modify") ||
      lower.includes("reschedule") ||
      lower.includes("edit schedule")
    ) {
      return {
        intent: "general_query",
        botReply: `🔄 **How to Cancel or Modify Reservations**:\n\n1. Go to the **My Bookings** page from the top navigation bar or sidebar.\n2. Find your room or hotseat reservation card.\n3. Click the **Edit** icon to adjust your time slot or date.\n4. Click the **Trash / Cancel** icon to cancel the booking immediately and free up the space for other team members.`,
        readyToBook: false,
        bookingDraft: null,
        isGeminiPowered: false,
      };
    }

    // 9. CALENDAR & MICROSOFT 365 OUTLOOK INTEGRATION
    if (
      lower.includes("outlook") ||
      lower.includes("calendar") ||
      lower.includes("teams") ||
      lower.includes("sync")
    ) {
      return {
        intent: "general_query",
        botReply: `📅 **Microsoft Outlook & Teams Calendar Sync**:\n\n• SpaceBook integrates directly with **Microsoft 365 Outlook Web**.\n• On the **My Bookings** page, click the **"Outlook"** button on any room reservation.\n• A pre-filled Outlook calendar event will open in your browser—click **"Save"** to sync it instantly to your Microsoft 365 Outlook and Teams schedule!`,
        readyToBook: false,
        bookingDraft: null,
        isGeminiPowered: false,
      };
    }

    // 10. CAMPUS LOCATIONS & MODULES
    if (
      lower.includes("campus") ||
      lower.includes("location") ||
      lower.includes("elcot") ||
      lower.includes("tidel") ||
      lower.includes("modules") ||
      lower.includes("coimbatore") ||
      lower.includes("where is")
    ) {
      return {
        intent: "general_query",
        botReply: `🏢 **SpaceBook Campuses & Module Directory (Coimbatore)**:\n\n1. **Elcot Park (CMB)**:\n   • **Module 1 (5 Rooms)**: Conference Room 1 (20 seats), Training Room 1 (30 seats), Discussion Rooms 1, 2, 3 (8 seats each), 98 Hotseats.\n   • **Module 2 (5 Rooms)**: Training Room 1 (50 seats), Discussion Room 1 (10 seats), Discussion Rooms 2, 3, 4 (8 seats each), 131 Hotseats.\n\n2. **Tidel Park (CMB)**:\n   • **Module 1 (5 Rooms)**: Conference Room 1 (16 seats), Training Room 1 (25 seats), Discussion Room 2 (10 seats), Discussion Rooms 1 & 3 (8 seats each), 224 Hotseats.`,
        readyToBook: false,
        bookingDraft: null,
        isGeminiPowered: false,
      };
    }

    // Default general response if no specific question matched
    return {
      intent: "general_query",
      botReply: `I can answer any questions about SpaceBook! Here are quick topics you can ask me:\n\n• **"List all 15 rooms"** or **"What are the room capacities?"**\n• **"Which room has a projector and whiteboard?"**\n• **"How many hotseat desks are in Tidel Park?"**\n• **"What are the office timings and check-in rules?"**\n• Or command me: *"Book Training Room 1 in Module 2 for tomorrow at 2 PM for 25 people"*`,
      readyToBook: false,
      bookingDraft: null,
      isGeminiPowered: false,
    };
  }

  // =========================================================================
  // EXPLICIT BOOKING COMMAND PARSING (when user says "book", "reserve", etc.)
  // =========================================================================

  // 1. Date Calculation
  let date = todayIso;
  let dateShiftedToTomorrow = false;

  if (lower.includes("tomorrow")) {
    const d = new Date();
    d.setDate(d.getDate() + 1);
    date = getLocalDateStr(d);
  } else if (lower.includes("day after tomorrow")) {
    const d = new Date();
    d.setDate(d.getDate() + 2);
    date = getLocalDateStr(d);
  } else if (lower.includes("monday")) {
    const d = new Date();
    d.setDate(d.getDate() + ((1 + 7 - d.getDay()) % 7 || 7));
    date = getLocalDateStr(d);
  } else if (lower.includes("tuesday")) {
    const d = new Date();
    d.setDate(d.getDate() + ((2 + 7 - d.getDay()) % 7 || 7));
    date = getLocalDateStr(d);
  } else if (lower.includes("wednesday")) {
    const d = new Date();
    d.setDate(d.getDate() + ((3 + 7 - d.getDay()) % 7 || 7));
    date = getLocalDateStr(d);
  } else if (lower.includes("thursday")) {
    const d = new Date();
    d.setDate(d.getDate() + ((4 + 7 - d.getDay()) % 7 || 7));
    date = getLocalDateStr(d);
  } else if (lower.includes("friday")) {
    const d = new Date();
    d.setDate(d.getDate() + ((5 + 7 - d.getDay()) % 7 || 7));
    date = getLocalDateStr(d);
  }

  // 2. Attendees extraction
  let attendees = 5;
  const attMatch = lower.match(/(\d+)\s*(?:people|attendees|members|persons|pax|seats|guests)/);
  if (attMatch) {
    attendees = parseInt(attMatch[1], 10);
  }

  // 3. Room & Module matching across all 15 rooms
  let matchedRoom = rooms[0] || ALL_SYSTEM_ROOMS[0]; // Default: Conference Room 1

  const isTidel = lower.includes("tidel") || lower.includes("tidal");
  const isM2 = lower.includes("module 2") || lower.includes("m2") || lower.includes("eo2");
  const isM1 = lower.includes("module 1") || lower.includes("m1") || lower.includes("eo1");

  if (isTidel) {
    if (lower.includes("train")) {
      matchedRoom = rooms.find((r) => Number(r.roomId) === 13) || matchedRoom;
    } else if (lower.includes("conf")) {
      matchedRoom = rooms.find((r) => Number(r.roomId) === 11) || matchedRoom;
    } else if (lower.includes("discussion 2") || lower.includes("discussion room 2")) {
      matchedRoom = rooms.find((r) => Number(r.roomId) === 14) || matchedRoom;
    } else if (lower.includes("discussion 3") || lower.includes("discussion room 3")) {
      matchedRoom = rooms.find((r) => Number(r.roomId) === 15) || matchedRoom;
    } else {
      matchedRoom = rooms.find((r) => Number(r.roomId) === 12) || matchedRoom;
    }
  } else if (isM2) {
    if (lower.includes("train") || attendees > 20) {
      matchedRoom = rooms.find((r) => Number(r.roomId) === 6) || matchedRoom;
    } else if (lower.includes("discussion 4") || lower.includes("discussion room 4")) {
      matchedRoom = rooms.find((r) => Number(r.roomId) === 10) || matchedRoom;
    } else if (lower.includes("discussion 3") || lower.includes("discussion room 3")) {
      matchedRoom = rooms.find((r) => Number(r.roomId) === 9) || matchedRoom;
    } else if (lower.includes("discussion 2") || lower.includes("discussion room 2")) {
      matchedRoom = rooms.find((r) => Number(r.roomId) === 8) || matchedRoom;
    } else {
      matchedRoom = rooms.find((r) => Number(r.roomId) === 7) || matchedRoom;
    }
  } else {
    // Module 1 Elcot Park
    if (lower.includes("train") || (attendees > 20 && attendees <= 30)) {
      matchedRoom = rooms.find((r) => Number(r.roomId) === 5) || matchedRoom;
    } else if (attendees > 30) {
      matchedRoom = rooms.find((r) => Number(r.roomId) === 6) || matchedRoom; // 50 seat training room
    } else if (lower.includes("discussion 3") || lower.includes("discussion room 3")) {
      matchedRoom = rooms.find((r) => Number(r.roomId) === 4) || matchedRoom;
    } else if (lower.includes("discussion 2") || lower.includes("discussion room 2")) {
      matchedRoom = rooms.find((r) => Number(r.roomId) === 3) || matchedRoom;
    } else if (lower.includes("discussion 1") || lower.includes("discussion room 1")) {
      matchedRoom = rooms.find((r) => Number(r.roomId) === 2) || matchedRoom;
    } else if (lower.includes("conf") || lower.includes("conference")) {
      matchedRoom = rooms.find((r) => Number(r.roomId) === 1) || matchedRoom;
    }
  }

  // 4. Time Extraction & 24-Hour Office Hours Mapping (10:00 to 22:00)
  let startTime = defaultStartTime;
  let endTime = defaultEndTime;
  
  // Prioritize explicit time indicators (e.g., 'at 2 PM', '2:00 PM', '11 am') over room/module numbers
  const explicitTimeMatch =
    lower.match(/(?:at|from|@)\s*(\d{1,2})(?::(\d{2}))?\s*(am|pm)?/) ||
    lower.match(/(\d{1,2}):(\d{2})\s*(am|pm)?/) ||
    lower.match(/(\d{1,2})\s*(am|pm)/);

  const timeMatch = explicitTimeMatch || lower.match(/\b(\d{1,2})(?::(\d{2}))?\s*(am|pm)?\b/);

  if (timeMatch) {
    let hour = parseInt(timeMatch[1], 10);
    const min = timeMatch[2] || "00";
    const ampm = timeMatch[3];

    if (ampm === "pm" && hour < 12) {
      hour += 12;
    } else if (ampm === "am" && hour === 12) {
      hour = 0;
    } else if (!ampm) {
      if (hour >= 1 && hour <= 9) {
        hour += 12;
      }
    }

    hour = Math.max(10, Math.min(21, hour));
    startTime = `${String(hour).padStart(2, "0")}:${min}`;
    const endHour = Math.min(22, hour + 1);
    endTime = `${String(endHour).padStart(2, "0")}:${min}`;

    // Past Time Check for Today
    const currentHour = now.getHours();
    const currentMin = now.getMinutes();
    if (date === todayIso) {
      if (hour < currentHour || (hour === currentHour && parseInt(min, 10) <= currentMin)) {
        const tmrw = new Date();
        tmrw.setDate(tmrw.getDate() + 1);
        date = getLocalDateStr(tmrw);
        dateShiftedToTomorrow = true;
      }
    }
  } else if (date === todayIso) {
    startTime = defaultStartTime;
    endTime = defaultEndTime;
    date = defaultDate;
  }

  const formatDisplayTime = (t) => {
    const h = parseInt(t.split(":")[0], 10);
    const m = t.split(":")[1] || "00";
    if (h === 12) return `12:${m} PM`;
    if (h > 12) return `${h - 12}:${m} PM`;
    return `${h}:${m} AM`;
  };

  const moduleShort = String(matchedRoom.module || "Module 1").split(" - ")[0];

  let reply = dateShiftedToTomorrow
    ? `Since ${formatDisplayTime(startTime)} has already passed today, I have prepared your workspace reservation for **${matchedRoom.roomName}** (${moduleShort}) for **tomorrow (${date}) from ${formatDisplayTime(startTime)} to ${formatDisplayTime(endTime)}** for **${attendees} attendees**.`
    : `I have prepared your workspace reservation for **${matchedRoom.roomName}** (${moduleShort}) on **${date} from ${formatDisplayTime(startTime)} to ${formatDisplayTime(endTime)}** for **${attendees} attendees**. Review below to confirm!`;

  return {
    intent: "book_room",
    botReply: reply,
    readyToBook: true,
    isGeminiPowered: false,
    bookingDraft: {
      title: "Workspace Meeting",
      roomId: matchedRoom.roomId || 1,
      roomName: matchedRoom.roomName || "Conference Room 1",
      module: matchedRoom.module || "Module 1 - Elcot Park - CMB",
      date: date,
      startTime: startTime,
      endTime: endTime,
      attendees: attendees,
    },
  };
}

