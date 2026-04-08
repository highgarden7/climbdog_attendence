import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import EmptyState from "../components/EmptyState";
import EventCard from "../components/EventCard";
import EventDetailModal from "../components/EventDetailModal";
import Field from "../components/Field";
import Modal from "../components/Modal";
import { useCrew } from "../state/CrewContext";

const initialForm = {
  title: "",
  location: "",
  date: "",
  note: "",
};

const DAY_RANGE = 90;
const WEEKDAYS = ["일요일", "월요일", "화요일", "수요일", "목요일", "금요일", "토요일"];

function parseIsoDate(iso) {
  return new Date(`${iso}T00:00:00`);
}

function getDayDiffFromToday(iso) {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const target = parseIsoDate(iso);
  return Math.floor((target - today) / 86400000);
}

function formatGroupDate(iso) {
  const date = parseIsoDate(iso);
  return {
    day: `${date.getMonth() + 1}.${date.getDate()}`,
    weekday: WEEKDAYS[date.getDay()],
  };
}

function groupEventsByDate(events) {
  return events.reduce((groups, event) => {
    const lastGroup = groups[groups.length - 1];
    if (lastGroup && lastGroup.date === event.date) {
      lastGroup.events.push(event);
      return groups;
    }

    groups.push({
      date: event.date,
      ...formatGroupDate(event.date),
      events: [event],
    });
    return groups;
  }, []);
}

function EventDateGroups({ groups, myName, onToggleRsvp, onSelect, past = false }) {
  return (
    <div className="event-groups">
      {groups.map((group) => (
        <section key={group.date} className="event-group">
          <div className="event-group__date">
            <strong>{group.day}</strong>
            <span>{group.weekday}</span>
          </div>
          <div className="event-group__list">
            {group.events.map((event) => (
              <EventCard
                key={event.id}
                event={event}
                myName={myName}
                onToggleRsvp={onToggleRsvp}
                onSelect={onSelect}
                past={past}
                compact
                hideDate
              />
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}

export default function EventsPage() {
  const {
    isAdmin,
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
  const [searchParams, setSearchParams] = useSearchParams();
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [form, setForm] = useState(initialForm);
  const [selectedEventId, setSelectedEventId] = useState(null);
  const [activeTab, setActiveTab] = useState("upcoming");

  const filteredEvents = useMemo(() => {
    const inRangeEvents = events.filter((event) => {
      const diff = getDayDiffFromToday(event.date);
      return diff >= -DAY_RANGE && diff <= DAY_RANGE;
    });

    const upcoming = inRangeEvents
      .filter((event) => getDayDiffFromToday(event.date) >= 0)
      .sort((left, right) => left.date.localeCompare(right.date));

    const past = inRangeEvents
      .filter((event) => getDayDiffFromToday(event.date) < 0)
      .sort((left, right) => right.date.localeCompare(left.date));

    return { upcoming, past };
  }, [events]);

  const upcomingGroups = useMemo(() => groupEventsByDate(filteredEvents.upcoming), [filteredEvents.upcoming]);
  const pastGroups = useMemo(() => groupEventsByDate(filteredEvents.past), [filteredEvents.past]);
  const selectedEvent = events.find((event) => event.id === selectedEventId) ?? null;

  useEffect(() => {
    const eventIdFromUrl = searchParams.get("event");
    if (!eventIdFromUrl) {
      setSelectedEventId(null);
      return;
    }

    const targetEvent = events.find((event) => event.id === eventIdFromUrl);
    if (!targetEvent) {
      return;
    }

    setSelectedEventId(eventIdFromUrl);
    setActiveTab(getDayDiffFromToday(targetEvent.date) >= 0 ? "upcoming" : "past");
  }, [events, searchParams]);

  function openEvent(eventId) {
    setSelectedEventId(eventId);
    setSearchParams((currentParams) => {
      const nextParams = new URLSearchParams(currentParams);
      nextParams.set("event", eventId);
      return nextParams;
    });
  }

  function closeEventModal() {
    setSelectedEventId(null);
    setSearchParams((currentParams) => {
      const nextParams = new URLSearchParams(currentParams);
      nextParams.delete("event");
      return nextParams;
    });
  }

  async function handleCopyEventLink(eventId) {
    const shareUrl = new URL(window.location.href);
    shareUrl.pathname = "/events";
    shareUrl.searchParams.set("event", eventId);
    await navigator.clipboard.writeText(shareUrl.toString());
    window.alert("벙개 링크를 복사했어요.");
  }

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
      window.alert("사진 인증샷을 먼저 올려주세요. 사진 없이 출석 체크는 할 수 없습니다.");
    }
  }

  async function handleDeleteEvent(eventId) {
    await deleteEvent(eventId);
    closeEventModal();
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
          canDelete={isAdmin || selectedEvent.createdBy === myName}
          photoUploading={photoUploading}
          photoVersion={photoVersion}
          getPhotos={getPhotos}
          onClose={closeEventModal}
          onToggleRsvp={toggleRsvp}
          onCheckIn={handleCheckIn}
          onUploadPhoto={uploadPhoto}
          onDelete={handleDeleteEvent}
          onCopyLink={handleCopyEventLink}
        />
      ) : null}

      <div className="events-tabbar">
        <button
          type="button"
          className={`events-tabbar__tab ${activeTab === "upcoming" ? "is-active" : ""}`}
          onClick={() => setActiveTab("upcoming")}
        >
          다가오는 벙개
          <span className="events-tabbar__count">{filteredEvents.upcoming.length}</span>
        </button>
        <button
          type="button"
          className={`events-tabbar__tab ${activeTab === "past" ? "is-active" : ""}`}
          onClick={() => setActiveTab("past")}
        >
          지난 벙개
          <span className="events-tabbar__count">{filteredEvents.past.length}</span>
        </button>
      </div>

      <p className="events-range-hint">오늘 기준 ±90일 벙개만 표시합니다.</p>

      {activeTab === "upcoming" ? (
        upcomingGroups.length ? (
          <EventDateGroups
            groups={upcomingGroups}
            myName={myName}
            onToggleRsvp={toggleRsvp}
            onSelect={openEvent}
          />
        ) : (
          <EmptyState icon="🗓️" title="다가오는 벙개가 없어요" description="90일 안에 잡힌 벙개가 아직 없습니다." />
        )
      ) : pastGroups.length ? (
        <EventDateGroups
          groups={pastGroups}
          myName={myName}
          onToggleRsvp={toggleRsvp}
          onSelect={openEvent}
          past
        />
      ) : (
        <EmptyState icon="📭" title="지난 벙개가 없어요" description="최근 90일 내 지난 벙개가 없습니다." />
      )}

      {events.length === 0 ? <EmptyState icon="🪨" title="아직 벙개가 없어요" description="첫 벙개를 만들어보세요!" /> : null}
    </>
  );
}
