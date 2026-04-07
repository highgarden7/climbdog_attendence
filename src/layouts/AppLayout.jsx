import { Navigate, Outlet, useLocation } from "react-router-dom";
import AppHeader from "../components/AppHeader";
import AppNav from "../components/AppNav";
import MemberPinModal from "../components/MemberPinModal";
import PasswordGate from "../components/PasswordGate";
import { useCrew } from "../state/CrewContext";
import { isPast, isToday } from "../utils/date";

export default function AppLayout() {
  const {
    authed,
    isAdmin,
    loading,
    members,
    events,
    myName,
    memberAuthRequest,
    passGate,
    logout,
    requestMemberAuth,
    closeMemberAuth,
    setupMemberPin,
    verifyMemberPin,
  } = useCrew();
  const location = useLocation();

  const upcomingCount = events.filter((event) => !isPast(event.date) || isToday(event.date)).length;

  if (!authed) {
    return <PasswordGate onPass={passGate} />;
  }

  if (!isAdmin && location.pathname === "/members") {
    return <Navigate to="/events" replace />;
  }

  if (loading) {
    return (
      <div className="app-shell">
        <div className="loading-screen">
          <div>
            <div className="loading-screen__icon">🐾</div>
            <div>불러오는 중...</div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="app-shell">
      <div className="app-frame">
        <AppHeader
          membersCount={members.length}
          eventsCount={events.length}
          myName={myName}
          members={members}
          isAdmin={isAdmin}
          onSelectMyName={requestMemberAuth}
          onLogout={logout}
        />
        <AppNav isAdmin={isAdmin} upcomingCount={upcomingCount} />
        <main className="page">
          <Outlet />
        </main>
        {memberAuthRequest ? (
          <MemberPinModal
            memberName={memberAuthRequest.name}
            mode={memberAuthRequest.mode}
            onClose={closeMemberAuth}
            onSetupPin={setupMemberPin}
            onVerifyPin={verifyMemberPin}
          />
        ) : null}
      </div>
    </div>
  );
}
