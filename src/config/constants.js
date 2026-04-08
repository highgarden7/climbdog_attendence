export const CREW_PASSWORD_HASH = "ddb1369d147b442dd34d5a1b000084cdd96f70ca6535b8d6636fe676b6248955";
export const ADMIN_PREFIX_HASH = "881c7eeb306de8a0122e5a09c7e2850466c68493a01a9bd4f3ad830880069e9e";
export const ADMIN_STEP5_HASH = "2589d4f4f6e385942a4a3c8961f34ddc91b5dde25c06fe0608ef39a42533dc23";
export const ADMIN_PASSWORD_HASH = "78ff78f31c7c0743bb0f7c24c7ecfd6e1c5958a98f1b1405c07eaf7a0f58cf43";

export const TITLES = [
  { min: 90, icon: "🏆", label: "개근왕", color: "#ffd700" },
  { min: 70, icon: "🔥", label: "핵인싸", color: "#ff6b35" },
  { min: 50, icon: "💪", label: "단골", color: "#4ecdc4" },
  { min: 30, icon: "👋", label: "가끔보는얼굴", color: "#95aebe" },
  { min: 0, icon: "👻", label: "유령회원", color: "#b0b0b0" },
];

export const NAV_ITEMS = [
  { to: "/events", label: "벙개" },
  { to: "/photos", label: "사진첩" },
  { to: "/attendance", label: "출석부" },
  { to: "/members", label: "크루원" },
];

export const STORAGE_KEYS = {
  auth: "climbdog",
  role: "climbdog-role",
  myName: "crew-myname",
  members: "crew-members",
  events: "crew-events",
  photoPrefix: "photos:",
};
