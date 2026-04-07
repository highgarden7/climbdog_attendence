import { useState } from "react";
import EmptyState from "../components/EmptyState";
import Modal from "../components/Modal";
import { useCrew } from "../state/CrewContext";

export default function MembersPage() {
  const { isAdmin, members, myName, addMembers, removeMember, clearMemberPin } = useCrew();
  const [showModal, setShowModal] = useState(false);
  const [newMembers, setNewMembers] = useState("");

  async function handleAddMembers() {
    const added = await addMembers(newMembers);
    if (!added) {
      return;
    }

    setNewMembers("");
    setShowModal(false);
  }

  if (!isAdmin) {
    return <EmptyState icon="🔒" title="어드민 모드에서만 접근할 수 있어요" description="940925로 로그인하면 크루원 관리를 사용할 수 있습니다." />;
  }

  return (
    <>
      <button type="button" className="primary-button" onClick={() => setShowModal(true)}>
        + 크루원 추가
      </button>

      {showModal ? (
        <Modal title="크루원 추가" onClose={() => setShowModal(false)}>
          <p className="help-text">쉼표나 줄바꿈으로 여러 명을 한번에 등록할 수 있습니다.</p>
          <textarea
            className="textarea"
            rows={5}
            placeholder={"홍길동, 김클라, 박볼더\n또는 한 줄에 한 명씩"}
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
            <span>{member.name}</span>
            <button type="button" className="member-chip__action" onClick={() => clearMemberPin(member.name)}>
              PIN 제거
            </button>
            <button type="button" className="member-chip__remove" onClick={() => removeMember(member.name)}>
              ×
            </button>
          </div>
        ))}
      </div>

      {members.length === 0 ? <EmptyState icon="👥" title="크루원을 추가해주세요" /> : null}
    </>
  );
}
