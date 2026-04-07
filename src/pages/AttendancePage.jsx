import EmptyState from "../components/EmptyState";
import StatBox from "../components/StatBox";
import { useCrew } from "../state/CrewContext";
import { getTitle } from "../utils/titles";

export default function AttendancePage() {
  const { members, events } = useCrew();

  const totalCheckins = events.reduce((sum, event) => sum + event.checkin.length, 0);
  const averageAttendance = events.length ? Math.round(totalCheckins / events.length) : 0;

  const stats = members
    .map((member) => {
      const attended = events.filter((event) => event.checkin.includes(member.name)).length;
      const rate = events.length ? Math.round((attended / events.length) * 100) : 0;
      return { name: member.name, attended, rate, title: getTitle(rate) };
    })
    .sort((left, right) => right.attended - left.attended);

  return (
    <>
      <div className="stats-grid">
        <StatBox value={events.length} label="총 벙개" />
        <StatBox value={members.length} label="크루원" />
        <StatBox value={averageAttendance} label="평균 참석" />
      </div>

      {stats.length === 0 ? (
        <EmptyState icon="📋" title="크루원을 먼저 등록하세요" />
      ) : (
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
                <div className="stats-row__bar">
                  <div className="stats-row__bar-fill" style={{ width: `${Math.max(stat.rate, 2)}%`, backgroundColor: stat.title.color }} />
                </div>
              </div>
              <div className="stats-row__score">
                {stat.attended}회 <span>({stat.rate}%)</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </>
  );
}
