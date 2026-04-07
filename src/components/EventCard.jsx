import { formatDate, isToday } from "../utils/date";

export default function EventCard({ event, myName, onToggleRsvp, onSelect, past = false }) {
  const joined = event.rsvp.includes(myName);
  const today = isToday(event.date);
  const accent = past ? "#999" : today ? "#ff6b35" : "#4ecdc4";

  return (
    <article
      className={`event-card ${past ? "is-past" : ""}`}
      style={{ borderLeftColor: accent }}
      onClick={() => onSelect(event.id)}
      role="button"
      tabIndex={0}
      onKeyDown={(eventKey) => {
        if (eventKey.key === "Enter" || eventKey.key === " ") {
          onSelect(event.id);
        }
      }}
    >
      <div className="event-card__top">
        <div>
          <div className="event-card__title">
            <span>{event.title}</span>
            {today ? <span className="event-card__today">TODAY</span> : null}
          </div>
          <div className="event-card__meta">
            <span>{formatDate(event.date)}</span>
            {event.location ? <span>· {event.location}</span> : null}
            {event.photoCount > 0 ? <span className="event-card__photos">📷 {event.photoCount}</span> : null}
          </div>
        </div>

        <div className="event-card__count">
          <strong>{event.rsvp.length}명</strong>
        </div>
      </div>

      {event.note ? <div className="event-card__note">{event.note}</div> : null}

      {myName && !past ? (
        <div className="event-card__actions" onClick={(eventClick) => eventClick.stopPropagation()} role="presentation">
          <button type="button" className={`chip-button ${joined ? "is-active" : ""}`} onClick={() => onToggleRsvp(event.id)}>
            {joined ? "✓ 참가" : "참가"}
          </button>
        </div>
      ) : null}
    </article>
  );
}
