import { useMemo, useState } from "react";
import EmptyState from "../components/EmptyState";
import EventCard from "../components/EventCard";
import EventDetailModal from "../components/EventDetailModal";
import Field from "../components/Field";
import Modal from "../components/Modal";
import { useCrew } from "../state/CrewContext";
import { isPast, isToday } from "../utils/date";

const initialForm = {
  title: "",
  location: "",
  date: "",
  note: "",
};

export default function EventsPage() {
  const {
    events,
    myName,
    photoUploading,
    photoVersion,
    createEvent,
    deleteEvent,
    toggleRsvp,
    uploadPhoto,
    checkIn,
    getPhotos,
  } = useCrew();
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [form, setForm] = useState(initialForm);
  const [selectedEventId, setSelectedEventId] = useState(null);

  const upcomingEvents = useMemo(() => events.filter((event) => !isPast(event.date) || isToday(event.date)), [events]);
  const pastEvents = useMemo(() => events.filter((event) => isPast(event.date) && !isToday(event.date)), [events]);
  const selectedEvent = events.find((event) => event.id === selectedEventId) ?? null;

  async function handleCreateEvent() {
    const created = await createEvent(form);
    if (!created) {
      return;
    }

    setForm(initialForm);
    setShowCreateModal(false);
  }

  async function handleCheckIn(eventId) {
    const result = await checkIn(eventId);
    if (!result.ok && result.reason === "missing-photo") {
      window.alert("📷 단체사진을 먼저 올려주세요! 사진 없이는 출석 체크가 안 돼요.");
    }
  }

  async function handleDeleteEvent(eventId) {
    await deleteEvent(eventId);
    setSelectedEventId(null);
  }

  return (
    <>
      <button type="button" className="primary-button" onClick={() => setShowCreateModal(true)}>
        + 새 벙개 만들기
      </button>

      {showCreateModal ? (
        <Modal title="🎯 벙개 만들기" onClose={() => setShowCreateModal(false)}>
          <Field label="제목">
            <input className="input" value={form.title} onChange={(event) => setForm({ ...form, title: event.target.value })} />
          </Field>
          <Field label="날짜">
            <input className="input" type="date" value={form.date} onChange={(event) => setForm({ ...form, date: event.target.value })} />
          </Field>
          <Field label="장소">
            <input className="input" value={form.location} onChange={(event) => setForm({ ...form, location: event.target.value })} />
          </Field>
          <Field label="메모 (선택)">
            <input className="input" value={form.note} onChange={(event) => setForm({ ...form, note: event.target.value })} />
          </Field>
          <div className="form-actions">
            <button type="button" className="secondary-button" onClick={() => setShowCreateModal(false)}>
              취소
            </button>
            <button type="button" className="accent-button" onClick={handleCreateEvent} disabled={!form.date}>
              만들기
            </button>
          </div>
        </Modal>
      ) : null}

      {selectedEvent ? (
        <EventDetailModal
          event={selectedEvent}
          myName={myName}
          photoUploading={photoUploading}
          photoVersion={photoVersion}
          getPhotos={getPhotos}
          onClose={() => setSelectedEventId(null)}
          onToggleRsvp={toggleRsvp}
          onCheckIn={handleCheckIn}
          onUploadPhoto={uploadPhoto}
          onDelete={handleDeleteEvent}
        />
      ) : null}

      {upcomingEvents.length > 0 ? <div className="section-title">다가오는 벙개</div> : null}
      {upcomingEvents.map((event) => (
        <EventCard key={event.id} event={event} myName={myName} onToggleRsvp={toggleRsvp} onSelect={setSelectedEventId} />
      ))}

      {pastEvents.length > 0 ? <div className="section-title">지난 벙개</div> : null}
      {pastEvents.slice(0, 10).map((event) => (
        <EventCard key={event.id} event={event} myName={myName} onToggleRsvp={toggleRsvp} onSelect={setSelectedEventId} past />
      ))}

      {events.length === 0 ? <EmptyState icon="🪨" title="아직 벙개가 없어요" description="첫 벙개를 만들어보세요!" /> : null}
    </>
  );
}
