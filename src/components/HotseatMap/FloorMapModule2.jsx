const SECTION_A = [
  [1, 2, 3, 4, 5, 6, 7],
  [14, 13, 12, 11, 10, 9, 8],
  [15, 16, 17, 18, 19, null, 20],
  [26, 25, 24, 23, 22, null, 21],
  [27, 28, 29, 30, 31, 32, 33],
  [40, 39, 38, 37, 36, 35, 34],
  [41, 42, 43, 44, 45, 46, 47],
  [54, 53, 52, 51, 50, 49, 48],
  [55, 56, 57, 58, 59, null, null],
];

const SECTION_B = [
  [60, 61, 62, 63, 64],
  [69, 68, 67, 66, 65],
  [70, 71, 72, 73, 74],
  [79, 78, 77, 76, 75],
];

const SECTION_C = [
  [null, 80, 81, 82, 83, 84, 85, null],
  [93, 92, 91, 90, 89, 88, 87, 86],
  [94, 95, 96, 97, 98, 99, 100, 101],
  [109, 108, 107, 106, 105, 104, 103, 102],
  [110, 111, 112, 113, 114, 115, 116, null],
  [121, 120, 119, 118, 117, null, null, null],
  [122, 123, 124, 125, 126, null, null, null],
  [131, 130, 129, 128, 127, null, null, null],
];

function Seat({ seat, selected, onClick }) {
  if (!seat) {
    return <div className="m2-seat-gap" />;
  }

  // Normalize status to support both parent and internal variations
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

  let statusClass = "m2-vacant";
  if (selected || rawStatus === "selected") {
    statusClass = "m2-selected";
  } else if (isMyBooked) {
    statusClass = "m2-my-booked";
  } else if (isOccupied) {
    statusClass = "m2-occupied";
  } else if (isReserved) {
    statusClass = "m2-reserved";
  } else {
    statusClass = "m2-vacant";
  }

  // Available seats and user's own booking are clickable.
  const isBookable = isAvailable || isMyBooked;

  const is3Digit = Number(seat.number) >= 100;

  return (
    <button
      type="button"
      id={`seat-${seat.id || `EO2-${seat.number}`}`}
      data-seat-id={seat.id || `EO2-${seat.number}`}
      data-seat-num={seat.number}
      className={`m2-seat ${statusClass} ${
        selected ? "m2-selected" : ""
      } ${is3Digit ? "m2-seat-3digit" : ""} ${!isBookable ? "m2-disabled" : ""}`}
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
    <section className="m2-section">
      <div className="m2-section-title">
        {title}
      </div>

      <div
        className="m2-column-labels"
        style={{
          gridTemplateColumns:
            `var(--m2-label) repeat(${columns}, var(--m2-seat))`,
        }}
      >
        <span />

        {Array.from(
          { length: columns },
          (_, index) => (
            <b key={index}>
              {index + 1}
            </b>
          )
        )}
      </div>

      <div className="m2-rows">
        {rows.map(
          (row, rowIndex) => (
            <div
              className="m2-row"
              key={`${title}-${rowIndex}`}
              style={{
                gridTemplateColumns:
                  `var(--m2-label) repeat(${columns}, var(--m2-seat))`,
              }}
            >
              <strong className="m2-row-label">
                {rowPrefix}
                {rowIndex + 1}
              </strong>

              {row.map(
                (
                  number,
                  columnIndex
                ) => {
                  if (number === null) {
                    return (
                      <div
                        className="m2-seat-cell"
                        key={`gap-${rowIndex}-${columnIndex}`}
                      >
                        <div 
                          className="m2-seat-gap m2-seat-unavailable" 
                          title="Unavailable"
                        />
                      </div>
                    );
                  }

                  const seat =
                    seatsByNumber[number];

                  return (
                    <div
                      className="m2-seat-cell"
                      key={number}
                    >
                      {seat && (
                        <Seat
                          seat={seat}
                          selected={
                            seat.id ===
                            activeSeatId
                          }
                          onClick={onSelect}
                        />
                      )}
                    </div>
                  );
                }
              )}
            </div>
          )
        )}
      </div>
    </section>
  );
}

function Room({
  children,
  className = "",
}) {
  return (
    <div
      className={`m2-room ${className}`}
    >
      {children}
    </div>
  );
}

export default function FloorMapModule2({
  seats = [],
  onSelect,
  activeSeatId,
  filterSection = "ALL",
}) {
  // Strictly filter seats for Module 2 (EO2) so they never cross-contaminate with Module 1
  const seatsByNumber = Object.fromEntries(
    seats
      .filter((seat) => !seat.id || seat.id.includes("EO2"))
      .map((seat) => [seat.number, seat])
  );

  const showA = filterSection === "ALL" || filterSection === "A";
  const showB = filterSection === "ALL" || filterSection === "B";
  const showC = filterSection === "ALL" || filterSection === "C";

  return (
    <div className="m2-map-wrapper">
      <div className={`m2-floor-map ${filterSection !== "ALL" ? "m2-single-section" : ""}`}>
        {/* SECTION C */}
        {showC && (
          <div className="m2-c">
            <Section
              title="SECTION C (Seats 80 – 131)"
              rows={SECTION_C}
              seatsByNumber={seatsByNumber}
              onSelect={onSelect}
              activeSeatId={activeSeatId}
              columns={8}
              rowPrefix="C"
            />
          </div>
        )}

        {/* SECTION A */}
        {showA && (
          <div className="m2-a">
            <Section
              title="SECTION A (Seats 1 – 59)"
              rows={SECTION_A}
              seatsByNumber={seatsByNumber}
              onSelect={onSelect}
              activeSeatId={activeSeatId}
              columns={7}
              rowPrefix="A"
            />
          </div>
        )}

        {/* SECTION B */}
        {showB && (
          <div className="m2-b">
            <Section
              title="SECTION B (Seats 60 – 79)"
              rows={SECTION_B}
              seatsByNumber={seatsByNumber}
              onSelect={onSelect}
              activeSeatId={activeSeatId}
              columns={5}
              rowPrefix="B"
            />
          </div>
        )}

        {/* TRAINING ROOM */}
        {filterSection === "ALL" && (
          <div className="m2-training">
            <Room className="m2-training-room">
              TRAINING
              <br />
              ROOM
            </Room>
          </div>
        )}
      </div>

      <style>{`
        .m2-map-wrapper {
          --m2-seat: clamp(21px, 2.1vw, 32px);
          --m2-label: clamp(12px, 1.2vw, 16px);

          width: 100%;
          min-width: 0;
          box-sizing: border-box;

          margin: 0;
          padding: 4px 8px;

          display: flex;
          flex-direction: column;

          background: transparent;
        }

        .m2-title {
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

        .m2-floor-map {
          width: 100%;
          min-width: 0;

          display: grid;

          grid-template-columns: 50% 50%;
          grid-template-rows: auto auto;

          grid-template-areas:
            "c a"
            "b training";

          gap: 4px;

          padding: 8px;

          box-sizing: border-box;

          background: #ffffff;

          border: 1px solid #e2e8f0;

          border-radius: 10px;
        }

        .m2-c {
          grid-area: c;

          min-width: 0;

          display: flex;
          justify-content: center;

          border-right: 1px solid #e2e8f0;
          border-bottom: 1px solid #e2e8f0;
          padding: 4px;
        }

        .m2-a {
          grid-area: a;

          min-width: 0;

          display: flex;
          justify-content: center;

          border-bottom: 1px solid #e2e8f0;
          padding: 4px;
        }

        .m2-b {
          grid-area: b;

          min-width: 0;

          display: flex;
          justify-content: center;
          align-items: flex-start;

          border-right: 1px solid #e2e8f0;

          padding: 4px;
        }

        .m2-training {
          grid-area: training;

          min-width: 0;

          display: flex;
          align-items: center;
          justify-content: center;

          padding: 4px;
        }

        .m2-section {
          width: 100%;
          min-width: 0;

          box-sizing: border-box;

          padding: 2px;

          background: transparent;
        }

        .m2-section-title {
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

        .m2-column-labels {
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

        .m2-column-labels b {
          font-weight: 700;
        }

        .m2-rows {
          width: 100%;

          display: flex;
          flex-direction: column;

          gap: 3px;
        }

        .m2-row {
          display: grid;

          justify-content: center;
          align-items: center;

          gap: 3px;
        }

        .m2-row-label {
          color: #071d61;

          font-size: clamp(8px, 0.72vw, 10px);

          line-height: 1;

          text-align: left;

          font-weight: 700;
          padding-right: 3px;
        }

        .m2-seat-cell {
          width: var(--m2-seat);
          height: var(--m2-seat);

          min-width: 0;
          min-height: 0;

          display: flex;

          align-items: center;
          justify-content: center;

          box-sizing: border-box;
        }

        .m2-seat {
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

        .m2-seat:hover:not(.m2-disabled) {
          transform: translateY(-2px) scale(1.06);
          box-shadow: 0 4px 10px -2px rgba(16, 185, 129, 0.4);
          z-index: 10;
        }

        .m2-seat-3digit {
          font-size: clamp(8.5px, 0.8vw, 11px) !important;
          letter-spacing: -0.03em !important;
          font-variant-numeric: tabular-nums;
        }

        .m2-disabled {
          cursor: not-allowed !important;
          opacity: 0.85;
        }

        /* Available: Soft emerald gradient with dark green monospace */
        .m2-vacant {
          background: linear-gradient(180deg, #ecfdf5 0%, #d1fae5 100%);
          border: 1.5px solid #10b981;
          color: #065f46;
          box-shadow: 0 1px 2px rgba(16, 185, 129, 0.12);
        }

        .m2-vacant:hover {
          background: #10b981 !important;
          color: #ffffff !important;
          border-color: #059669 !important;
        }

        /* Occupied: Muted soft rose desk */
        .m2-occupied {
          background: #fef2f2 !important;
          border: 1.5px solid #fecaca !important;
          color: #b91c1c !important;
          box-shadow: none !important;
        }

        .m2-reserved {
          background: #fffbeb !important;
          border: 1.5px solid #fde68a !important;
          color: #b45309 !important;
        }

        /* Your Booking: Royal Indigo/Violet Gradient with glow */
        .m2-my-booked {
          background: linear-gradient(135deg, #6366f1 0%, #4f46e5 100%) !important;
          border: 2px solid #3730a3 !important;
          color: #ffffff !important;
          box-shadow: 0 0 0 4px rgba(99, 102, 241, 0.45) !important;
          animation: m2-my-seat-pulse 2s infinite !important;
          z-index: 10;
        }

        @keyframes m2-my-seat-pulse {
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
        .m2-selected {
          background: linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%) !important;
          border: 2px solid #1e40af !important;
          color: #ffffff !important;
          box-shadow: 0 0 0 3.5px rgba(59, 130, 246, 0.45), 0 4px 8px -2px rgba(29, 78, 216, 0.3) !important;
          transform: translateY(-2px) scale(1.08) !important;
          z-index: 20;
        }

        .m2-seat-gap {
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
        .m2-seat-unavailable {
          background: #f1f5f9 !important;
          border: 1px dashed #cbd5e1 !important;
          opacity: 0.45;
        }

        .m2-room {
          display: flex;

          align-items: center;
          justify-content: center;

          text-align: center;

          box-sizing: border-box;

          width: 82%;
          height: clamp(48px, 5.5vw, 68px);

          border-radius: 8px;

          font-size: clamp(9px, 0.85vw, 11.5px);

          line-height: 1.2;

          font-weight: 800;

          letter-spacing: 0.04em;
        }

        .m2-training-room {
          background: #fffbeb;

          border: 1px solid #fde68a;

          color: #b45309;
        }
      `}</style>
    </div>
  );
}