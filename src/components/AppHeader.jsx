import { useMemo, useState } from "react";
import Modal from "./Modal";

export default function AppHeader({
  membersCount,
  eventsCount,
  myName,
  members,
  isAdmin,
  onSelectMyName,
  onLogout,
}) {
  const [showLogoutModal, setShowLogoutModal] = useState(false);

  const displayName = useMemo(() => {
    if (isAdmin) {
      return "어드민";
    }

    return myName;
  }, [isAdmin, myName]);

  return (
    <>
      <header className="app-header">
        <div className="app-header__main">
          <div className="app-header__branding">
            <h1 className="app-header__title">클라임독 🐾</h1>
            <p className="app-header__subtitle">크루원 {membersCount}명 · 벙개 {eventsCount}회</p>
          </div>

          <div className="app-header__controls">
            <div className="app-header__identity-row">
              {displayName ? (
                <button type="button" className="app-header__identity" onClick={() => setShowLogoutModal(true)}>
                  👤 {displayName}
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
            </div>
          </div>
        </div>
      </header>

      {showLogoutModal ? (
        <Modal title={displayName || "로그아웃"} onClose={() => setShowLogoutModal(false)}>
          <p className="help-text">지금 계정에서 로그아웃할까요?</p>
          <div className="form-actions">
            <button type="button" className="secondary-button" onClick={() => setShowLogoutModal(false)}>
              취소
            </button>
            <button
              type="button"
              className="accent-button"
              onClick={() => {
                setShowLogoutModal(false);
                onLogout();
              }}
            >
              로그아웃
            </button>
          </div>
        </Modal>
      ) : null}
    </>
  );
}
