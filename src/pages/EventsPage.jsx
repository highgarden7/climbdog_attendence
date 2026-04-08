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

function EventFormModal({ mode, form, onChange, onClose, onSubmit }) {
  const isEdit = mode === "edit";

  return (
    <Modal title={isEdit ? "벙개 수정" : "🎯 벙개 만들기"} onClose={onClose}>
      <Field label="제목">
        <input className="input" value={form.title} onChange={(event) => onChange({ ...form, title: event.target.value })} />
      </Field>
      <Field label="날짜">
        <input className="input" type="date" value={form.date} onChange={(event) => onChange({ ...form, date: event.target.value })} />
      </Field>
      <Field label="장소">
        <input className="input" value={form.location} onChange={(event) => onChange({ ...form, location: event.target.value })} />
      </Field>
      <Field label="메모 (선택)">
        <input className="input" value={form.note} onChange={(event) => onChange({ ...form, note: event.target.value })} />
      </Field>
      <div className="form-actions">
        <button type="button" className="secondary-button" onClick={onClose}>
          취소
        </button>
        <button type="button" className="accent-button" onClick={onSubmit} disabled={!form.date}>
          {isEdit ? "수정하기" : "만들기"}
        </button>
      </div>
    </Modal>
  );
}

export default function EventsPage() {
  const {
    isAdmin,
    events,
    members,
    myName,
    photoUploading,
    photoVersion,
    createEvent,
    updateEvent,
    refreshEvents,
    deleteEvent,
    toggleRsvp,
    uploadPhoto,
    checkIn,
    getPhotos,
  } = useCrew();
  const [searchParams, setSearchParams] = useSearchParams();
  const [modalMode, setModalMode] = useState("create");
  const [showFormModal, setShowFormModal] = useState(false);
  const [form, setForm] = useState(initialForm);
  const [editingEventId, setEditingEventId] = useState(null);
  const [selectedEventId, setSelectedEventId] = useState(null);
  const [activeTab, setActiveTab] = useState("upcoming");
  const [refreshing, setRefreshing] = useState(false);

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

  function openCreateModal() {
    setModalMode("create");
    setEditingEventId(null);
    setForm(initialForm);
    setShowFormModal(true);
  }

  function openEditModal() {
    if (!selectedEvent) {
      return;
    }

    setModalMode("edit");
    setEditingEventId(selectedEvent.id);
    setForm({
      title: selectedEvent.title ?? "",
      location: selectedEvent.location ?? "",
      date: selectedEvent.date ?? "",
      note: selectedEvent.note ?? "",
    });
    setShowFormModal(true);
  }

  function closeFormModal() {
    setShowFormModal(false);
    setEditingEventId(null);
    setForm(initialForm);
  }

  async function handleCopyEventLink(eventId) {
    const shareUrl = new URL(window.location.href);
    shareUrl.pathname = "/events";
    shareUrl.searchParams.set("event", eventId);
    await navigator.clipboard.writeText(shareUrl.toString());
    window.alert("벙개 링크를 복사했어요.");
  }

  async function handleRefreshEvents() {
    setRefreshing(true);
    try {
      await refreshEvents();
    } finally {
      setRefreshing(false);
    }
  }

  async function handleSubmitEventForm() {
    if (modalMode === "edit" && editingEventId) {
      const updated = await updateEvent(editingEventId, form);
      if (!updated) {
        return;
      }
    } else {
      const created = await createEvent(form);
      if (!created) {
        return;
      }
    }

    closeFormModal();
  }

  async function handleCheckIn(eventId) {
    const result = await checkIn(eventId);
    if (!result.ok && result.reason === "missing-photo") {
      window.alert("사진 인증샷을 먼저 올려주세요. 사진 없이 출석 체크는 할 수 없습니다.");
      return;
    }

    if (!result.ok && result.reason === "insufficient-attendees") {
      window.alert("출석 체크는 참가자가 2명 이상일 때만 가능합니다.");
    }
  }

  async function handleDeleteEvent(eventId) {
    await deleteEvent(eventId);
    closeEventModal();
  }

  return (
    <>
      <div className="page-toolbar">
        <button type="button" className="primary-button page-toolbar__primary" onClick={openCreateModal}>
          + 새 벙개 만들기
        </button>
        <button type="button" className="refresh-button" onClick={handleRefreshEvents} disabled={refreshing}>
          {refreshing ? "불러오는 중..." : "새로고침"}
        </button>
      </div>

      {showFormModal ? (
        <EventFormModal
          mode={modalMode}
          form={form}
          onChange={setForm}
          onClose={closeFormModal}
          onSubmit={handleSubmitEventForm}
        />
      ) : null}

      {selectedEvent ? (
        <EventDetailModal
          event={selectedEvent}
          myName={myName}
          members={members}
          canManage={isAdmin || selectedEvent.createdBy === myName}
          photoUploading={photoUploading}
          photoVersion={photoVersion}
          getPhotos={getPhotos}
          onClose={closeEventModal}
          onToggleRsvp={toggleRsvp}
          onCheckIn={handleCheckIn}
          onUploadPhoto={uploadPhoto}
          onEdit={openEditModal}
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
          <EmptyState icon="📆" title="다가오는 벙개가 없어요" description="90일 안에 잡힌 벙개가 아직 없습니다." />
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
        <EmptyState icon="🗂" title="지난 벙개가 없어요" description="최근 90일의 지난 벙개가 없습니다." />
      )}

      {events.length === 0 ? <EmptyState icon="🪨" title="아직 벙개가 없어요" description="첫 벙개를 만들어보세요!" /> : null}
    </>
  );
}
