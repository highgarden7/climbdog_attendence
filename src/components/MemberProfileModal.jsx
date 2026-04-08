import { useEffect, useMemo, useState } from "react";
import Modal from "./Modal";
import { formatMemberDisplayName } from "../utils/memberDisplay";

const PROFILE_FIELDS = [
  { key: "homeRegion", label: "출몰지역" },
  { key: "level", label: "난이도" },
  { key: "instagram", label: "인스타아이디" },
  { key: "birthday", label: "생일", type: "date" },
  { key: "joinDate", label: "입장날", type: "date" },
  { key: "dday", label: "D+day" },
  { key: "surgeryPeriod", label: "수습기간" },
  { key: "mbti", label: "MBTI" },
  { key: "ment", label: "Ment", multiline: true },
  { key: "phone", label: "전화번호", type: "tel" },
];

const STATUS_OPTIONS = ["생존", "부상", "바쁨"];

function buildInitialForm(member) {
  const profile = member?.profile ?? {};
  return PROFILE_FIELDS.reduce((accumulator, field) => {
    accumulator[field.key] = profile[field.key] ?? "";
    return accumulator;
  }, {});
}

function formatSlashDate(iso) {
  if (!iso) {
    return "-";
  }

  return iso.replaceAll("-", "/");
}

export default function MemberProfileModal({
  member,
  lastAttendedDate,
  lifeDays,
  onClose,
  onSave,
  onClearPin,
}) {
  const [form, setForm] = useState(() => buildInitialForm(member));

  useEffect(() => {
    setForm(buildInitialForm(member));
  }, [member]);

  const summaryItems = useMemo(() => ([
    { label: "참석", value: formatSlashDate(lastAttendedDate) },
    {
      label: "목숨",
      value: lifeDays === null ? "-" : lifeDays >= 30 ? `😡 ${lifeDays}일 경과` : `${lifeDays}일`,
    },
  ]), [lastAttendedDate, lifeDays]);

  function handleChange(key, value) {
    setForm((current) => ({
      ...current,
      [key]: value,
    }));
  }

  async function handleSave() {
    await onSave(form);
    onClose();
  }

  async function handleClearPin() {
    await onClearPin();
    onClose();
  }

  return (
    <Modal title={formatMemberDisplayName(member) || "크루원 정보"} onClose={onClose}>
      <div className="profile-summary">
        {summaryItems.map((item) => (
          <div key={item.label} className="profile-summary__item">
            <span className="profile-summary__label">{item.label}</span>
            <strong className="profile-summary__value">{item.value}</strong>
          </div>
        ))}
      </div>

      <div className="profile-form">
        <label className="field">
          <span className="field__label">상태</span>
          <div className="radio-group">
            {STATUS_OPTIONS.map((option) => (
              <label key={option} className="radio-option">
                <input
                  type="radio"
                  name="status"
                  value={option}
                  checked={form.status === option}
                  onChange={(event) => handleChange("status", event.target.value)}
                />
                <span>{option}</span>
              </label>
            ))}
          </div>
        </label>

        {PROFILE_FIELDS.map((field) => (
          <label key={field.key} className="field">
            <span className="field__label">{field.label}</span>
            {field.multiline ? (
              <textarea
                className="textarea"
                rows={3}
                value={form[field.key]}
                onChange={(event) => handleChange(field.key, event.target.value)}
              />
            ) : (
              <input
                className="input"
                type={field.type ?? "text"}
                value={form[field.key]}
                onChange={(event) => handleChange(field.key, event.target.value)}
              />
            )}
          </label>
        ))}
      </div>

      <div className="form-actions form-actions--split">
        <button type="button" className="secondary-button" onClick={handleClearPin}>
          PIN 제거
        </button>
        <button type="button" className="secondary-button" onClick={onClose}>
          취소
        </button>
        <button type="button" className="accent-button" onClick={handleSave}>
          저장
        </button>
      </div>
    </Modal>
  );
}
