export function formatMemberDisplayName(memberOrName, members = []) {
  if (!memberOrName) {
    return "";
  }

  const member = typeof memberOrName === "string"
    ? members.find((item) => item.name === memberOrName)
    : memberOrName;

  const baseName = `${member?.name ?? memberOrName ?? ""}`.trim();
  const homeRegion = `${member?.profile?.homeRegion ?? ""}`.trim();

  if (!baseName) {
    return "";
  }

  if (!homeRegion) {
    return baseName;
  }

  if (baseName.includes(" / ")) {
    return baseName;
  }

  return `${baseName} / ${homeRegion}`;
}
