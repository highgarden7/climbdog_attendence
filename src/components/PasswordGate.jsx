import { useState } from "react";
import {
  ADMIN_PASSWORD_HASH,
  ADMIN_PREFIX_HASH,
  ADMIN_STEP5_HASH,
  CREW_PASSWORD_HASH,
} from "../config/constants";
import { hashValue } from "../utils/hash";

const VISIBLE_DOT_COUNT = 4;
const ADMIN_PASSWORD_LENGTH = 6;

export default function PasswordGate({ onPass }) {
  const [password, setPassword] = useState("");
  const [shake, setShake] = useState(false);

  const resetWithShake = () => {
    setShake(true);
    window.setTimeout(() => {
      setShake(false);
      setPassword("");
    }, 500);
  };

  const handleInput = async (digit) => {
    if (password.length >= ADMIN_PASSWORD_LENGTH) {
      return;
    }

    const next = password + digit;
    const nextHash = await hashValue(next);

    if (nextHash === CREW_PASSWORD_HASH) {
      setPassword(next);
      window.setTimeout(() => {
        onPass("member");
      }, 200);
      return;
    }

    if (nextHash === ADMIN_PASSWORD_HASH) {
      setPassword(next);
      window.setTimeout(() => {
        onPass("admin");
      }, 200);
      return;
    }

    if (next.length < VISIBLE_DOT_COUNT) {
      setPassword(next);
      return;
    }

    if (nextHash === ADMIN_PREFIX_HASH) {
      setPassword(next);
      return;
    }

    if (next.length === 5 && nextHash === ADMIN_STEP5_HASH) {
      setPassword(next);
      return;
    }

    if (next.length >= VISIBLE_DOT_COUNT) {
      resetWithShake();
      return;
    }
  };

  return (
    <div className="gate">
      <div className="gate__panel">
        <div className="gate__paw">🐾</div>
        <h1 className="gate__title">클라임독</h1>
        <p className="gate__subtitle">크루 비밀번호 4자리를 입력하세요</p>

        <div className={`gate__dots ${shake ? "is-shaking" : ""}`}>
          {Array.from({ length: VISIBLE_DOT_COUNT }, (_, index) => (
            <span key={index} className={`gate__dot ${index < Math.min(password.length, VISIBLE_DOT_COUNT) ? "is-filled" : ""}`} />
          ))}
        </div>

        <div className="gate__keypad">
          {[1, 2, 3, 4, 5, 6, 7, 8, 9, null, 0, "del"].map((keyValue, index) => {
            if (keyValue === null) {
              return <div key={index} />;
            }

            if (keyValue === "del") {
              return (
                <button
                  key={index}
                  type="button"
                  className="gate__key"
                  onClick={() => setPassword(password.slice(0, -1))}
                >
                  ⌫
                </button>
              );
            }

            return (
              <button
                key={index}
                type="button"
                className="gate__key"
                onClick={() => handleInput(String(keyValue))}
              >
                {keyValue}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
