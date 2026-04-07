import { useMemo, useState } from "react";
import Modal from "./Modal";

function isValidPin(pin) {
  return /^\d{4}$/.test(pin);
}

export default function MemberPinModal({ memberName, mode, onClose, onSetupPin, onVerifyPin }) {
  const [pin, setPin] = useState("");
  const [confirmPin, setConfirmPin] = useState("");
  const [error, setError] = useState("");

  const title = useMemo(() => (
    mode === "setup" ? `${memberName} PIN 설정` : `${memberName} PIN 입력`
  ), [memberName, mode]);

  async function handleSubmit() {
    setError("");

    if (!isValidPin(pin)) {
      setError("PIN은 숫자 4자리여야 합니다.");
      return;
    }

    if (mode === "setup") {
      if (!isValidPin(confirmPin)) {
        setError("확인용 PIN도 숫자 4자리여야 합니다.");
        return;
      }

      if (pin !== confirmPin) {
        setError("PIN이 일치하지 않습니다.");
        return;
      }

      await onSetupPin(memberName, pin);
      return;
    }

    const verified = await onVerifyPin(memberName, pin);
    if (!verified) {
      setError("PIN이 올바르지 않습니다.");
    }
  }

  return (
    <Modal title={title} onClose={onClose}>
      <p className="help-text">
        {mode === "setup" ? "처음 사용할 4자리 PIN을 설정해주세요." : "등록한 4자리 PIN을 입력해주세요."}
      </p>

      <div className="field">
        <span className="field__label">PIN</span>
        <input
          className="input"
          type="password"
          inputMode="numeric"
          maxLength={4}
          value={pin}
          onChange={(event) => setPin(event.target.value.replace(/\D/g, "").slice(0, 4))}
        />
      </div>

      {mode === "setup" ? (
        <div className="field">
          <span className="field__label">PIN 확인</span>
          <input
            className="input"
            type="password"
            inputMode="numeric"
            maxLength={4}
            value={confirmPin}
            onChange={(event) => setConfirmPin(event.target.value.replace(/\D/g, "").slice(0, 4))}
          />
        </div>
      ) : null}

      {error ? <div className="form-error">{error}</div> : null}

      <div className="form-actions">
        <button type="button" className="secondary-button" onClick={onClose}>
          취소
        </button>
        <button type="button" className="accent-button" onClick={handleSubmit}>
          {mode === "setup" ? "설정" : "확인"}
        </button>
      </div>
    </Modal>
  );
}
