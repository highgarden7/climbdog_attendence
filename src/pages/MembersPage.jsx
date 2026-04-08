import { useMemo, useState } from "react";
import EmptyState from "../components/EmptyState";
import MemberProfileModal from "../components/MemberProfileModal";
import Modal from "../components/Modal";
import { useCrew } from "../state/CrewContext";

function getDaysSince(iso) {
  if (!iso) {
    return null;
  }

  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const target = new Date(`${iso}T00:00:00`);
  return Math.max(0, Math.floor((today - target) / 86400000));
}

function toErrorMessage(error) {
  if (error instanceof Error && error.message) {
    return error.message;
  }

  return "크루원 작업에 실패했습니다.";
}

export default function MembersPage() {
  const {
    isAdmin,
    members,
    events,
    myName,
    addMembers,
    removeMember,
    clearMemberPin,
    updateMemberProfile,
  } = useCrew();
  const [showModal, setShowModal] = useState(false);
  const [newMembers, setNewMembers] = useState("");
  const [selectedMemberName, setSelectedMemberName] = useState("");
  const [actionError, setActionError] = useState("");

  const memberStats = useMemo(() => (
    members.reduce((accumulator, member) => {
      const attendedEvents = events
        .filter((event) => event.checkin.includes(member.name))
        .sort((left, right) => right.date.localeCompare(left.date));
      const lastAttendedDate = attendedEvents[0]?.date ?? null;

      accumulator[member.name] = {
        lastAttendedDate,
        lifeDays: getDaysSince(lastAttendedDate),
      };
      return accumulator;
    }, {})
  ), [events, members]);

  const selectedMember = members.find((member) => member.name === selectedMemberName) ?? null;

  async function handleAddMembers() {
    setActionError("");

    try {
      const added = await addMembers(newMembers);
      if (!added) {
        setActionError("추가할 이름을 입력해 주세요.");
        return;
      }

      setNewMembers("");
      setShowModal(false);
    } catch (error) {
      setActionError(toErrorMessage(error));
    }
  }

  async function handleSaveProfile(profile) {
    if (!selectedMember) {
      return;
    }

    setActionError("");

    try {
      await updateMemberProfile(selectedMember.name, profile);
    } catch (error) {
      setActionError(toErrorMessage(error));
      throw error;
    }
  }

  async function handleClearMemberPin() {
    if (!selectedMember) {
      return;
    }

    setActionError("");

    try {
      await clearMemberPin(selectedMember.name);
    } catch (error) {
      setActionError(toErrorMessage(error));
      throw error;
    }
  }

  async function handleRemoveMember(memberName) {
    setActionError("");

    try {
      await removeMember(memberName);
    } catch (error) {
      setActionError(toErrorMessage(error));
    }
  }

  if (!isAdmin) {
    return (
      <EmptyState
        icon="🔐"
        title="어드민 모드에서만 접근할 수 있어요"
        description="940925로 로그인하면 크루원 관리를 사용할 수 있습니다."
      />
    );
  }

  return (
    <>
      <button type="button" className="primary-button" onClick={() => setShowModal(true)}>
        + 크루원 추가
      </button>

      {actionError ? <p className="form-error">{actionError}</p> : null}

      {showModal ? (
        <Modal title="크루원 추가" onClose={() => setShowModal(false)}>
          <p className="help-text">쉼표 또는 줄바꿈으로 여러 명을 한 번에 등록할 수 있습니다.</p>
          <textarea
            className="textarea"
            rows={5}
            placeholder={"예) 고정원, 김클라\n박볼더"}
            value={newMembers}
            onChange={(event) => setNewMembers(event.target.value)}
          />
          <div className="form-actions">
            <button type="button" className="secondary-button" onClick={() => setShowModal(false)}>
              취소
            </button>
            <button type="button" className="accent-button" onClick={handleAddMembers}>
              추가
            </button>
          </div>
        </Modal>
      ) : null}

      <div className="members-count">{members.length}명</div>
      <div className="member-grid">
        {members.map((member) => (
          <div key={member.name} className={`member-chip ${member.name === myName ? "is-current" : ""}`}>
            <button
              type="button"
              className="member-chip__name"
              onClick={() => setSelectedMemberName(member.name)}
            >
              {member.name}
            </button>
            <button type="button" className="member-chip__remove" onClick={() => handleRemoveMember(member.name)}>
              ×
            </button>
          </div>
        ))}
      </div>

      {members.length === 0 ? <EmptyState icon="👥" title="크루원을 추가해 주세요" /> : null}

      {selectedMember ? (
        <MemberProfileModal
          member={selectedMember}
          lastAttendedDate={memberStats[selectedMember.name]?.lastAttendedDate ?? null}
          lifeDays={memberStats[selectedMember.name]?.lifeDays ?? null}
          onClose={() => setSelectedMemberName("")}
          onSave={handleSaveProfile}
          onClearPin={handleClearMemberPin}
        />
      ) : null}
    </>
  );
}
