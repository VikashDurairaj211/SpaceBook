const SECTION_A = [
  [1, 2, 3, 4, 5, 6, null],
  [13, 12, 11, 10, 9, 8, 7],
  [14, 15, 16, 17, 18, 19, 20],
  [27, 26, 25, 24, 23, 22, 21],
  [28, 29, 30, 31, 32, 33, 34],
  [41, 40, 39, 38, 37, 36, 35],
  [42, 43, 44, 45, 46, 47, 48],
  [55, 54, 53, 52, 51, 50, 49],
  [56, 57, 58, 59, 60, 61, 62],
];

const SECTION_B = [
  [69, 68, 67, 66, 65, 64, 63],
  [70, 71, 72, 73, 74, 75, 76],
  [83, 82, 81, 80, 79, 78, 77],
  [84, 85, 86, 87, 88, 89, 90],
  [97, 96, 95, 94, 93, 92, 91],
  [98, 99, 100, 101, 102, 103, 104],
  [111, 110, 109, 108, 107, 106, 105],
  [112, 113, 114, 115, 116, 117, 118],
];

const SECTION_C = [
  [159, 160, 161, 162, 163, 164],
  [158, 157, 156, 155, 154, 153],
  [147, 148, 149, 150, 151, 152],
  [146, 145, 144, 143, 142, 141],
  [135, 136, 137, 138, 139, 140],
  [134, 133, 132, 131, 130, 129],
  [124, 125, 126, 127, 128, null],
  [123, 122, 121, 120, 119, null],
];

const SECTION_D = [
  [219, 220, 221, 222, 223, 224],
  [218, 217, 216, 215, 214, 213],
  [207, 208, 209, 210, 211, 212],
  [206, 205, 204, 203, 202, 201],
  [195, 196, 197, 198, 199, 200],
  [194, 193, 192, 191, 190, 189],
  [183, 184, 185, 186, 187, 188],
  [182, 181, 180, 179, 178, 177],
  [171, 172, 173, 174, 175, 176],
  [170, 169, 168, 167, 166, 165],
];

const ROW_LABELS_C = ["C8", "C7", "C6", "C5", "C4", "C3", "C2", "C1"];
const ROW_LABELS_D = ["D10", "D9", "D8", "D7", "D6", "D5", "D4", "D3", "D2", "D1"];

function Seat({ seat, selected, onClick }) {
  if (!seat) {
    return <div className="tp-seat-gap tp-seat-unavailable" title="Unavailable" />;
  }

  const rawStatus = (seat.status || "").toLowerCase();
  const isOccupied =
    rawStatus === "occupied" ||
    rawStatus === "booked" ||
    rawStatus === "confirmed" ||
    rawStatus === "approved" ||
    rawStatus === "checked in" ||
    rawStatus === "checkedin" ||
    rawStatus === "1" ||
    rawStatus === "true" ||
    seat.isBooked === true ||
    seat.isOccupied === true;

  const isReserved = rawStatus === "reserved" || rawStatus === "pending";
  const isMyBooked = rawStatus === "my-booked" || seat.isMyBooking === true;
  const isAvailable = !isOccupied && !isReserved && !isMyBooked;

  let statusClass = "tp-vacant";
  if (selected || rawStatus === "selected") {
    statusClass = "tp-selected";
  } else if (isMyBooked) {
    statusClass = "tp-my-booked";
  } else if (isOccupied) {
    statusClass = "tp-occupied";
  } else if (isReserved) {
    statusClass = "tp-reserved";
  } else {
    statusClass = "tp-vacant";
  }

  // Available seats and user's own booking are clickable.
  const isBookable = isAvailable || isMyBooked;

  const formattedSeatId = `WS-04-${String(seat.number).padStart(3, "0")}`;
  const is3Digit = Number(seat.number) >= 100;

  return (
    <button
      type="button"
      id={`seat-${formattedSeatId}`}
      data-seat-id={formattedSeatId}
      data-seat-num={seat.number}
      className={`tp-seat ${statusClass} ${
        selected ? "tp-selected" : ""
      } ${is3Digit ? "tp-seat-3digit" : ""} ${!isBookable ? "tp-disabled" : ""}`}
      onClick={() => {
        if (isBookable) {
          onClick({ ...seat, id: formattedSeatId, label: formattedSeatId });
        }
      }}
      disabled={!isBookable}
      title={`${formattedSeatId} · ${
        selected || rawStatus === "selected"
          ? "SELECTED"
          : isMyBooked
          ? "MY BOOKING"
          : isAvailable
          ? "AVAILABLE"
          : isOccupied
          ? "BOOKED"
          : isReserved
          ? "PENDING CHECK-IN"
          : "UNAVAILABLE"
      }${!isBookable ? " (Unavailable)" : ""}`}
      aria-label={`${formattedSeatId}, ${seat.status}`}
    >
      {seat.number}
    </button>
  );
}

function Section({
  title,
  rows,
  rowPrefix,
  customRowLabels,
  seatsByNumber,
  onSelect,
  activeSeatId,
  columns,
}) {
  return (
    <section className="tp-section">
      <div className="tp-section-title">{title}</div>

      <div
        className="tp-column-labels"
        style={{
          gridTemplateColumns: `var(--tp-label) repeat(${columns}, var(--tp-seat))`,
        }}
      >
        <span />

        {Array.from({ length: columns }, (_, idx) => (
          <b key={idx}>{idx + 1}</b>
        ))}
      </div>

      <div className="tp-rows">
        {rows.map((row, rowIndex) => {
          const rowLabel = customRowLabels
            ? customRowLabels[rowIndex]
            : `${rowPrefix}${rowIndex + 1}`;

          return (
            <div
              className="tp-row"
              key={`${title}-${rowIndex}`}
              style={{
                gridTemplateColumns: `var(--tp-label) repeat(${columns}, var(--tp-seat))`,
              }}
            >
              <strong className="tp-row-label">{rowLabel}</strong>

              {row.map((number, columnIndex) => {
                if (number === null) {
                  return (
                    <div
                      className="tp-seat-cell"
                      key={`gap-${rowIndex}-${columnIndex}`}
                    >
                      <div
                        className="tp-seat-gap tp-seat-unavailable"
                        title="Unavailable"
                      />
                    </div>
                  );
                }

                const seat = seatsByNumber[number] || {
                  id: `WS-04-${String(number).padStart(3, "0")}`,
                  number,
                  status: "available",
                };

                const isSelected =
                  activeSeatId &&
                  (activeSeatId === seat.id ||
                    activeSeatId === String(number) ||
                    activeSeatId.endsWith(`-${String(number).padStart(3, "0")}`));

                return (
                  <div className="tp-seat-cell" key={number}>
                    <Seat
                      seat={seat}
                      selected={isSelected}
                      onClick={onSelect}
                    />
                  </div>
                );
              })}
            </div>
          );
        })}
      </div>
    </section>
  );
}

function Room({
  children,
  className = "",
}) {
  return (
    <div className={`tp-room ${className}`}>
      {children}
    </div>
  );
}

export default function FloorMapTidalParkModule1({
  seats = [],
  onSelect,
  activeSeatId,
  filterSection = "ALL",
}) {
  const seatsByNumber = {};
  seats.forEach((seat) => {
    const num =
      seat.number ||
      parseInt(String(seat.id || seat.seatNumber || "").split("-").pop(), 10);
    if (!Number.isNaN(num)) {
      seatsByNumber[num] = { ...seat, number: num };
    }
  });

  const showA = filterSection === "ALL" || filterSection === "A";
  const showB = filterSection === "ALL" || filterSection === "B";
  const showC = filterSection === "ALL" || filterSection === "C";
  const showD = filterSection === "ALL" || filterSection === "D";

  return (
    <div className="tp-map-wrapper">
      <div className="tp-floor-map">
        {/* LEFT COLUMN: SECTION D & SECTION C */}
        {(showC || showD) && (
          <div className="tp-col-left">
            {showD && (
              <Section
                title="SECTION D (Seats 165 – 224)"
                rows={SECTION_D}
                customRowLabels={ROW_LABELS_D}
                seatsByNumber={seatsByNumber}
                onSelect={onSelect}
                activeSeatId={activeSeatId}
                columns={6}
              />
            )}

            {showC && (
              <Section
                title="SECTION C (Seats 119 – 164)"
                rows={SECTION_C}
                customRowLabels={ROW_LABELS_C}
                seatsByNumber={seatsByNumber}
                onSelect={onSelect}
                activeSeatId={activeSeatId}
                columns={6}
              />
            )}
          </div>
        )}

        {/* RIGHT COLUMN: RECEPTION, SECTION A & SECTION B */}
        {(showA || showB) && (
          <div className="tp-col-right">
            {filterSection === "ALL" && (
              <div className="tp-reception-container">
                <Room className="tp-reception-room">
                  RECEPTION
                </Room>
              </div>
            )}

            {showA && (
              <Section
                title="SECTION A (Seats 1 – 62)"
                rows={SECTION_A}
                rowPrefix="A"
                seatsByNumber={seatsByNumber}
                onSelect={onSelect}
                activeSeatId={activeSeatId}
                columns={7}
              />
            )}

            {showB && (
              <Section
                title="SECTION B (Seats 63 – 118)"
                rows={SECTION_B}
                rowPrefix="B"
                seatsByNumber={seatsByNumber}
                onSelect={onSelect}
                activeSeatId={activeSeatId}
                columns={7}
              />
            )}
          </div>
        )}
      </div>

      <style>{`
        .tp-map-wrapper {
          --tp-seat: clamp(19px, 1.9vw, 29px);
          --tp-label: clamp(11px, 1.1vw, 15px);

          width: 100%;
          min-width: 0;
          box-sizing: border-box;
          margin: 0;
          padding: 4px 8px;

          display: flex;
          flex-direction: column;
          align-items: center;
          background: transparent;
        }

        .tp-header-banner {
          text-align: center;
          margin-bottom: 10px;
        }

        .tp-title {
          color: #071d61;
          font-size: clamp(13px, 1.3vw, 17px);
          font-weight: 800;
          line-height: 1.2;
          letter-spacing: 0.03em;
          text-transform: uppercase;
        }

        .tp-subtitle {
          color: #64748b;
          font-size: clamp(9px, 0.8vw, 11.5px);
          font-weight: 600;
          letter-spacing: 0.03em;
          margin-top: 2px;
        }

        .tp-floor-map {
          width: 100%;
          max-width: 100%;
          display: flex;
          justify-content: center;
          align-items: flex-start;
          gap: clamp(14px, 2vw, 28px);
          padding: 10px 14px;
          box-sizing: border-box;
          background: #ffffff;
          border: 1px solid #e2e8f0;
          border-radius: 10px;
          box-shadow: 0 1px 4px rgba(0, 0, 0, 0.04);
          overflow-x: auto;
        }

        @media (max-width: 850px) {
          .tp-floor-map {
            flex-direction: column;
            align-items: center;
            gap: 12px;
            padding: 8px;
          }
        }

        .tp-col-left,
        .tp-col-right {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 10px;
          min-width: max-content;
        }

        .tp-reception-container {
          width: 100%;
          display: flex;
          justify-content: center;
          align-items: center;
          margin-bottom: 4px;
        }

        .tp-room {
          display: flex;
          align-items: center;
          justify-content: center;
          text-align: center;
          box-sizing: border-box;
          width: 85%;
          max-width: 200px;
          height: clamp(38px, 4.2vw, 52px);
          border-radius: 8px;
          font-size: clamp(9px, 0.85vw, 11.5px);
          line-height: 1.2;
          font-weight: 800;
          letter-spacing: 0.04em;
          text-transform: uppercase;
        }

        .tp-reception-room {
          background: #eff6ff;
          border: 1.5px solid #bfdbfe;
          color: #2563eb;
        }

        .tp-section {
          width: 100%;
          min-width: max-content;
          box-sizing: border-box;
          padding: 2px;
          background: transparent;
        }

        .tp-section-title {
          width: max-content;
          max-width: 95%;
          margin: 0 auto 4px;
          padding: 2px 10px;
          box-sizing: border-box;
          background: #062268;
          color: #ffffff;
          border-radius: 4px;
          text-align: center;
          font-size: clamp(8px, 0.75vw, 10.5px);
          line-height: 1.2;
          font-weight: 800;
          letter-spacing: 0.02em;
          white-space: nowrap;
        }

        .tp-column-labels {
          display: grid;
          justify-content: center;
          align-items: center;
          gap: 3px;
          margin-bottom: 3px;
          color: #071d61;
          font-size: clamp(8px, 0.72vw, 10px);
          line-height: 1;
          text-align: center;
        }

        .tp-column-labels b {
          font-weight: 700;
        }

        .tp-rows {
          width: 100%;
          display: flex;
          flex-direction: column;
          gap: 3px;
          align-items: center;
        }

        .tp-row {
          display: grid;
          justify-content: center;
          align-items: center;
          gap: 3px;
        }

        .tp-row-label {
          color: #071d61;
          font-size: clamp(8px, 0.72vw, 10px);
          line-height: 1;
          font-weight: 700;
          text-align: left;
          padding-right: 3px;
        }

        .tp-seat-cell {
          width: var(--tp-seat);
          height: var(--tp-seat);
          min-width: 0;
          min-height: 0;
          display: flex;
          align-items: center;
          justify-content: center;
          box-sizing: border-box;
        }

        .tp-seat {
          width: 95%;
          height: 93%;
          min-width: 0;
          min-height: 0;
          padding: 0;
          box-sizing: border-box;
          border-radius: 6px;
          font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", monospace;
          font-size: clamp(9.5px, 0.9vw, 12px);
          font-weight: 800;
          line-height: 1;
          display: flex;
          justify-content: center;
          align-items: center;
          cursor: pointer;
          transition:
            transform 0.15s cubic-bezier(0.4, 0, 0.2, 1),
            box-shadow 0.15s cubic-bezier(0.4, 0, 0.2, 1),
            background 0.15s ease,
            border-color 0.15s ease;
          outline: none;
        }

        .tp-seat:hover:not(.tp-disabled) {
          transform: translateY(-2px) scale(1.06);
          box-shadow: 0 4px 10px -2px rgba(16, 185, 129, 0.4);
          z-index: 10;
        }

        .tp-seat-3digit {
          font-size: clamp(8px, 0.75vw, 10px) !important;
          letter-spacing: -0.03em !important;
          font-variant-numeric: tabular-nums;
        }

        .tp-disabled {
          cursor: not-allowed !important;
          opacity: 0.85;
        }

        /* Available: Soft emerald gradient with dark green monospace */
        .tp-vacant {
          background: linear-gradient(180deg, #ecfdf5 0%, #d1fae5 100%);
          border: 1.5px solid #10b981;
          color: #065f46;
          box-shadow: 0 1px 2px rgba(16, 185, 129, 0.12);
        }

        .tp-vacant:hover {
          background: #10b981 !important;
          color: #ffffff !important;
          border-color: #059669 !important;
        }

        /* Selected: Electric Blue Gradient with Aura */
        .tp-selected {
          background: linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%) !important;
          border: 2px solid #1e40af !important;
          color: #ffffff !important;
          box-shadow: 0 0 0 3.5px rgba(59, 130, 246, 0.45), 0 4px 8px -2px rgba(29, 78, 216, 0.3) !important;
          transform: translateY(-2px) scale(1.08) !important;
          z-index: 20;
        }

        /* Occupied: Muted soft rose desk */
        .tp-occupied {
          background: #fef2f2 !important;
          border: 1.5px solid #fecaca !important;
          color: #b91c1c !important;
          box-shadow: none !important;
        }

        .tp-reserved {
          background: #fffbeb !important;
          border: 1.5px solid #fde68a !important;
          color: #b45309 !important;
        }

        /* Your Booking: Royal Indigo/Violet Gradient with glow */
        .tp-my-booked {
          background: linear-gradient(135deg, #6366f1 0%, #4f46e5 100%) !important;
          border: 2px solid #3730a3 !important;
          color: #ffffff !important;
          box-shadow: 0 0 0 4px rgba(99, 102, 241, 0.45) !important;
          animation: tp-my-seat-pulse 2s infinite !important;
          z-index: 10;
        }

        @keyframes tp-my-seat-pulse {
          0% {
            box-shadow: 0 0 0 0 rgba(99, 102, 241, 0.8), 0 0 10px rgba(99, 102, 241, 0.5);
          }
          70% {
            box-shadow: 0 0 0 8px rgba(99, 102, 241, 0), 0 0 18px rgba(99, 102, 241, 0.3);
          }
          100% {
            box-shadow: 0 0 0 0 rgba(99, 102, 241, 0), 0 0 10px rgba(99, 102, 241, 0.5);
          }
        }

        .tp-seat-gap {
          width: 95%;
          height: 92%;
          box-sizing: border-box;
          border: 1px dashed #e2e8f0;
          border-radius: 6px;
          background: #f8fafc;
          display: grid;
          place-items: center;
          opacity: 0.5;
        }

        /* Unavailable slots */
        .tp-seat-unavailable {
          background: #f1f5f9 !important;
          border: 1px dashed #cbd5e1 !important;
          opacity: 0.45;
        }
      `}</style>
    </div>
  );
}
