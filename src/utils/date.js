const WEEKDAYS = ["일", "월", "화", "수", "목", "금", "토"];

function todayIso() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function formatDate(iso) {
  const date = new Date(`${iso}T00:00:00`);
  return `${date.getMonth() + 1}/${date.getDate()}(${WEEKDAYS[date.getDay()]})`;
}

export function isToday(iso) {
  return iso === todayIso();
}

export function isPast(iso) {
  return iso < todayIso();
}
