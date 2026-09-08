const SECTION_A = [
  [null, null, 3, 2, 1],
  [null, null, 4, 5, 6],
  [null, null, 9, 8, 7],
  [10, 11, 12, 13, 14],
  [15, 16, 17, 18, 19],
  [20, null, 21, 22, 23],
  [27, null, 26, 25, 24],
  [28, 29, 30, 31, 32],
];

const SECTION_B = [
  [33, 34, 35, 36, 37, 38, 39],
  [46, 45, 44, 43, 42, 41, 40],
  [null, 47, 48, 49, 50, 51, 52],
  [null, 58, 57, 56, 55, 54, 53],
];

const SECTION_C = [
  [59, 60, 61, 62, 63, 64, 65],
  [72, 71, 70, 69, 68, 67, 66],
  [73, 74, 75, 76, 77, 78, 79],
  [86, 85, 84, 83, 82, 81, 80],
  [null, null, null, 87, 88, 89, 90],
  [null, null, null, 94, 93, 92, 91],
  [null, null, null, 95, 96, 97, 98],
];

function Seat({ seat, selected, onClick }) {
  if (!seat) {
    return <div className="m1-seat-gap" />;
  }

  // Normalize status to handle both parent variations ("available") and internal variations ("vacant")
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

  // Map status class correctly for CSS styling
  let statusClass = "m1-vacant";
  if (selected || rawStatus === "selected") {
    statusClass = "m1-selected";
  } else if (isMyBooked) {
    statusClass = "m1-my-booked";
  } else if (isOccupied) {
    statusClass = "m1-occupied";
  } else if (isReserved) {
    statusClass = "m1-reserved";
  } else {
    statusClass = "m1-vacant";
  }

  // Available seats and user's own booking are clickable.
  const isBookable = isAvailable || isMyBooked;

  const is3Digit = Number(seat.number) >= 100;

  return (
    <button
      type="button"
      id={`seat-${seat.id || `EO1-${seat.number}`}`}
      data-seat-id={seat.id || `EO1-${seat.number}`}
      data-seat-num={seat.number}
      className={`m1-seat ${statusClass} ${
        selected ? "m1-selected" : ""
      } ${is3Digit ? "m1-seat-3digit" : ""} ${!isBookable ? "m1-disabled" : ""}`}
      onClick={() => {
        if (isBookable) {
          onClick(seat);
        }
      }}
      disabled={!isBookable}
      title={`${seat.label || `Seat ${seat.number}`} · ${
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
      aria-label={`${seat.label || `Seat ${seat.number}`}, ${seat.status}`}
    >
      {seat.number}
    </button>
  );
}

function Section({
  title,
  rows,
  rowPrefix,
  seatsByNumber,
  onSelect,
  activeSeatId,
  columns,
}) {
  return (
    <section className="m1-section">
      <div className="m1-section-title">{title}</div>

      <div
        className="m1-column-labels"
        style={{
          gridTemplateColumns: `var(--m1-label) repeat(${columns}, var(--m1-seat))`,
        }}
      >
        <span />

        {Array.from(
          { length: columns },
          (_, index) => (
            <b key={index}>{index + 1}</b>
          )
        )}
      </div>

      <div className="m1-rows">
        {rows.map((row, rowIndex) => (
          <div
            className="m1-row"
            key={`${title}-${rowIndex}`}
            style={{
              gridTemplateColumns: `var(--m1-label) repeat(${columns}, var(--m1-seat))`,
            }}
          >
            <strong className="m1-row-label">
              {rowPrefix}
              {rowIndex + 1}
            </strong>

            {row.map(
              (number, columnIndex) => {
                if (number === null) {
                  return (
                    <div
                      className="m1-seat-cell"
                      key={`gap-${rowIndex}-${columnIndex}`}
                    >
                      {/* Added title and updated class for grey styling */}
                      <div 
                        className="m1-seat-gap m1-seat-unavailable" 
                        title="Unavailable"
                      />
                    </div>
                  );
                }

                const seat =
                  seatsByNumber[number];

                return (
                  <div
                    className="m1-seat-cell"
                    key={number}
                  >
                    {seat && (
                      <Seat
                        seat={seat}
                        selected={
                          seat.id === activeSeatId
                        }
                        onClick={onSelect}
                      />
                    )}
                  </div>
                );
              }
            )}
          </div>
        ))}
      </div>
    </section>
  );
}

function Room({
  children,
  className = "",
}) {
  return (
    <div className={`m1-room ${className}`}>
      {children}
    </div>
  );
}

export default function FloorMapModule1({
  seats = [],
  onSelect,
  activeSeatId,
  filterSection = "ALL",
}) {
  const seatsByNumber =
    Object.fromEntries(
      seats.map((seat) => [
        seat.number,
        seat,
      ])
    );

  const showA = filterSection === "ALL" || filterSection === "A";
  const showB = filterSection === "ALL" || filterSection === "B";
  const showC = filterSection === "ALL" || filterSection === "C";

  return (
    <div className="m1-map-wrapper">
      <div className={`m1-floor-map ${filterSection !== "ALL" ? "m1-single-section" : ""}`}>
        {/* SECTION A */}
        {showA && (
          <div className="m1-a">
            <Section
              title="SECTION A (Seats 1 – 32)"
              rows={SECTION_A}
              seatsByNumber={seatsByNumber}
              onSelect={onSelect}
              activeSeatId={activeSeatId}
              columns={5}
              rowPrefix="A"
            />
          </div>
        )}

        {/* RECEPTION */}
        {filterSection === "ALL" && (
          <div className="m1-reception">
            <Room className="m1-reception-room">
              RECEPTION
            </Room>
          </div>
        )}

        {/* SECTION C */}
        {showC && (
          <div className="m1-c">
            <Section
              title="SECTION C (Seats 59 – 98)"
              rows={SECTION_C}
              seatsByNumber={seatsByNumber}
              onSelect={onSelect}
              activeSeatId={activeSeatId}
              columns={7}
              rowPrefix="C"
            />
          </div>
        )}

        {/* CONFERENCE ROOM */}
        {filterSection === "ALL" && (
          <div className="m1-conference">
            <Room className="m1-conference-room">
              CONFERENCE
              <br />
              ROOM
            </Room>
          </div>
        )}

        {/* SECTION B */}
        {showB && (
          <div className="m1-b">
            <Section
              title="SECTION B (Seats 33 – 58)"
              rows={SECTION_B}
              seatsByNumber={seatsByNumber}
              onSelect={onSelect}
              activeSeatId={activeSeatId}
              columns={7}
              rowPrefix="B"
            />
          </div>
        )}
      </div>

      <style>{`
        .m1-map-wrapper {
          --m1-seat: clamp(21px, 2.1vw, 32px);
          --m1-label: clamp(12px, 1.2vw, 16px);

          width: 100%;
          min-width: 0;
          box-sizing: border-box;
          margin: 0;
          padding: 4px 8px;

          display: flex;
          flex-direction: column;

          background: transparent;
        }

        .m1-title {
          flex: 0 0 auto;
          width: 100%;
          margin: 0 0 6px;
          padding: 0;

          box-sizing: border-box;

          text-align: center;

          color: #071d61;

          font-size: clamp(13px, 1.3vw, 17px);
          line-height: 1.2;

          font-weight: 800;
          letter-spacing: 0.025em;

          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .m1-floor-map {
          width: 100%;
          min-width: 0;

          display: grid;

          grid-template-columns: 33% 34% 33%;
          grid-template-rows: auto auto;

          grid-template-areas:
            "a reception c"
            "conference b c";

          gap: 4px;

          padding: 8px;

          box-sizing: border-box;

          background: #ffffff;

          border: 1px solid #e2e8f0;
          border-radius: 10px;
        }

        .m1-a {
          grid-area: a;
          min-width: 0;

          display: flex;
          justify-content: center;
        }

        .m1-reception {
          grid-area: reception;
          min-width: 0;

          display: flex;
          justify-content: center;
          align-items: center;

          padding: 2px 4px 6px;
        }

        .m1-b {
          grid-area: b;
          min-width: 0;

          display: flex;
          justify-content: center;
          align-items: flex-start;

          margin-top: -22px;
          padding-top: 0;
        }

        .m1-c {
          grid-area: c;
          min-width: 0;

          display: flex;
          justify-content: center;
        }

        .m1-conference {
          grid-area: conference;
          min-width: 0;

          display: flex;
          align-items: flex-start;
          justify-content: center;

          padding: 2px 4px;
          margin-top: 10px;
        }

        .m1-section {
          width: 100%;
          min-width: 0;

          box-sizing: border-box;

          padding: 2px;

          background: transparent;
        }

        .m1-section-title {
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

        .m1-column-labels {
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

        .m1-column-labels b {
          font-weight: 700;
        }

        .m1-rows {
          width: 100%;

          display: flex;
          flex-direction: column;

          gap: 3px;
        }

        .m1-row {
          display: grid;

          justify-content: center;
          align-items: center;

          gap: 3px;
        }

        .m1-row-label {
          color: #071d61;

          font-size: clamp(8px, 0.72vw, 10px);
          line-height: 1;

          text-align: left;

          font-weight: 700;
          padding-right: 3px;
        }

        .m1-seat-cell {
          width: var(--m1-seat);
          height: var(--m1-seat);

          min-width: 0;
          min-height: 0;

          display: flex;

          align-items: center;
          justify-content: center;

          box-sizing: border-box;
        }

        .m1-seat {
          width: 95%;
          height: 93%;

          min-width: 0;
          min-height: 0;

          padding: 0;

          box-sizing: border-box;

          border-radius: 6px;

          font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", monospace;
          font-size: clamp(10px, 1.0vw, 13px);
          font-weight: 800;
          line-height: 1;

          cursor: pointer;

          display: flex;
          align-items: center;
          justify-content: center;

          transition:
            transform 0.15s cubic-bezier(0.4, 0, 0.2, 1),
            box-shadow 0.15s cubic-bezier(0.4, 0, 0.2, 1),
            background 0.15s ease,
            border-color 0.15s ease;
        }

        .m1-seat:hover:not(.m1-disabled) {
          transform: translateY(-2px) scale(1.06);
          box-shadow: 0 4px 10px -2px rgba(16, 185, 129, 0.4);
          z-index: 10;
        }

        .m1-seat-3digit {
          font-size: clamp(8.5px, 0.8vw, 11px) !important;
          letter-spacing: -0.03em !important;
          font-variant-numeric: tabular-nums;
        }

        .m1-disabled {
          cursor: not-allowed !important;
          opacity: 0.85;
        }

        /* Available: Soft emerald gradient with dark green monospace */
        .m1-vacant {
          background: linear-gradient(180deg, #ecfdf5 0%, #d1fae5 100%);
          border: 1.5px solid #10b981;
          color: #065f46;
          box-shadow: 0 1px 2px rgba(16, 185, 129, 0.12);
        }

        .m1-vacant:hover {
          background: #10b981 !important;
          color: #ffffff !important;
          border-color: #059669 !important;
        }

        /* Occupied: Muted soft rose desk */
        .m1-occupied {
          background: #fef2f2 !important;
          border: 1.5px solid #fecaca !important;
          color: #b91c1c !important;
          box-shadow: none !important;
        }

        .m1-reserved {
          background: #fffbeb !important;
          border: 1.5px solid #fde68a !important;
          color: #b45309 !important;
        }

        /* Your Booking: Royal Indigo/Violet Gradient with glow */
        .m1-my-booked {
          background: linear-gradient(135deg, #6366f1 0%, #4f46e5 100%) !important;
          border: 2px solid #3730a3 !important;
          color: #ffffff !important;
          box-shadow: 0 0 0 4px rgba(99, 102, 241, 0.45) !important;
          animation: m1-my-seat-pulse 2s infinite !important;
          z-index: 10;
        }

        @keyframes m1-my-seat-pulse {
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

        /* Selected: Electric Blue Gradient with Aura */
        .m1-selected {
          background: linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%) !important;
          border: 2px solid #1e40af !important;
          color: #ffffff !important;
          box-shadow: 0 0 0 3.5px rgba(59, 130, 246, 0.45), 0 4px 8px -2px rgba(29, 78, 216, 0.3) !important;
          transform: translateY(-2px) scale(1.08) !important;
          z-index: 20;
        }

        .m1-seat-gap {
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
        .m1-seat-unavailable {
          background: #f1f5f9 !important;
          border: 1px dashed #cbd5e1 !important;
          opacity: 0.45;
        }

        .m1-room {
          display: flex;

          align-items: center;
          justify-content: center;

          text-align: center;

          box-sizing: border-box;

          width: 82%;
          height: clamp(44px, 5vw, 64px);

          border-radius: 8px;

          font-size: clamp(9px, 0.85vw, 11.5px);
          line-height: 1.2;

          font-weight: 800;
          letter-spacing: 0.04em;
        }

        .m1-reception-room {
          background: #eff6ff;
          border: 1.5px solid #bfdbfe;
          color: #2563eb;
        }

        .m1-conference-room {
          background: #f5f3ff;
          border: 1.5px solid #ddd6fe;
          color: #7c3aed;
        }
      `}</style>
    </div>
  );
}