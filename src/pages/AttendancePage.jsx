import { useMemo, useState } from "react";
import EmptyState from "../components/EmptyState";
import StatBox from "../components/StatBox";
import { useCrew } from "../state/CrewContext";
import { getTitle } from "../utils/titles";

function formatSlashDate(iso) {
  if (!iso) {
    return "-";
  }

  const [year, month, day] = iso.split("-");
  return `${year}/${month}/${day}`;
}

function getDaysSince(iso) {
  if (!iso) {
    return null;
  }

  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const target = new Date(`${iso}T00:00:00`);
  return Math.max(0, Math.floor((today - target) / 86400000));
}

function compareAttendanceDate(left, right, sortOrder) {
  if (!left.effectiveLastDate && !right.effectiveLastDate) {
    return left.name.localeCompare(right.name, "ko");
  }

  if (!left.effectiveLastDate) {
    return 1;
  }

  if (!right.effectiveLastDate) {
    return -1;
  }

  return sortOrder === "desc"
    ? right.effectiveLastDate.localeCompare(left.effectiveLastDate)
    : left.effectiveLastDate.localeCompare(right.effectiveLastDate);
}

export default function AttendancePage() {
  const { members, events } = useCrew();
  const [sortOrder, setSortOrder] = useState("desc");

  const totalCheckins = events.reduce((sum, event) => sum + event.checkin.length, 0);
  const averageAttendance = events.length ? Math.round(totalCheckins / events.length) : 0;

  const stats = useMemo(() => (
    members
      .map((member) => {
        const attendedEvents = events
          .filter((event) => event.checkin.includes(member.name))
          .sort((left, right) => right.date.localeCompare(left.date));
        const attended = attendedEvents.length;
        const rate = events.length ? Math.round((attended / events.length) * 100) : 0;
        const lastAttendedDate = attendedEvents[0]?.date ?? null;
        const joinedDate = member.profile?.joinDate || null;
        const effectiveLastDate = lastAttendedDate ?? joinedDate ?? null;
        const lifeDays = getDaysSince(effectiveLastDate);

        return {
          name: member.name,
          attended,
          rate,
          title: getTitle(rate),
          effectiveLastDate,
          lifeDays,
        };
      })
      .sort((left, right) => compareAttendanceDate(left, right, sortOrder))
  ), [events, members, sortOrder]);

  return (
    <>
      <div className="stats-grid">
        <StatBox value={members.length} label="크루원" />
        <StatBox value={events.length} label="총 벙개" />
        <StatBox value={averageAttendance} label="평균 참석" />
      </div>

      {stats.length === 0 ? (
        <EmptyState icon="🧑" title="크루원을 먼저 등록해 주세요" />
      ) : (
        <>
          <div className="stats-toolbar">
            <span className="stats-toolbar__label">참석일 정렬</span>
            <div className="stats-toolbar__actions">
              <button
                type="button"
                className={`sort-chip ${sortOrder === "asc" ? "is-active" : ""}`}
                onClick={() => setSortOrder("asc")}
              >
                ASC
              </button>
              <button
                type="button"
                className={`sort-chip ${sortOrder === "desc" ? "is-active" : ""}`}
                onClick={() => setSortOrder("desc")}
              >
                DESC
              </button>
            </div>
          </div>

          <div className="stats-list">
            {stats.map((stat, index) => (
              <div key={stat.name} className="stats-row">
                <div
                  className={`stats-row__rank ${index < 3 ? "is-top" : ""}`}
                  style={{ backgroundColor: index < 3 ? ["#ffd700", "#c0c0c0", "#cd7f32"][index] : undefined }}
                >
                  {index + 1}
                </div>
                <div className="stats-row__body">
                  <div className="stats-row__name">
                    <span>{stat.name}</span>
                    <span className="stats-row__title" style={{ color: stat.title.color, backgroundColor: `${stat.title.color}22` }}>
                      {stat.title.icon} {stat.title.label}
                    </span>
                  </div>
                  <div className="stats-row__meta">
                    <span>참석 {formatSlashDate(stat.effectiveLastDate)}</span>
                    <span>|</span>
                    <span className={stat.lifeDays >= 30 ? "is-overdue" : ""}>
                      목숨 {stat.lifeDays === null ? "-" : stat.lifeDays >= 30 ? `😡 ${stat.lifeDays}일 경과` : `${stat.lifeDays}일`}
                    </span>
                  </div>
                  <div className="stats-row__bar">
                    <div className="stats-row__bar-fill" style={{ width: `${Math.max(stat.rate, 2)}%`, backgroundColor: stat.title.color }} />
                  </div>
                </div>
                <div className="stats-row__score">
                  {stat.attended}회<span>({stat.rate}%)</span>
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </>
  );
}
