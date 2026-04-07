export default function AppHeader({
  membersCount,
  eventsCount,
  myName,
  members,
  onSelectMyName,
  onClearMyName,
}) {
  return (
    <header className="app-header">
      <div>
        <h1 className="app-header__title">🐾 클라임독</h1>
        <p className="app-header__subtitle">크루원 {membersCount}명 · 벙개 {eventsCount}회</p>
      </div>

      {myName ? (
        <button type="button" className="app-header__identity" onClick={onClearMyName}>
          👤 {myName}
        </button>
      ) : (
        <select className="app-header__select" value="" onChange={(event) => onSelectMyName(event.target.value)}>
          <option value="">내 이름 선택</option>
          {members.map((member) => (
            <option key={member.name} value={member.name}>
              {member.name}
            </option>
          ))}
        </select>
      )}
    </header>
  );
}
