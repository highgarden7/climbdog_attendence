import { loadMembers, saveMembers } from "./_membersStore.js";

function normalizeMember(member) {
  if (typeof member === "string") {
    return { name: member, pinHash: null };
  }

  return {
    name: member.name,
    pinHash: member.pinHash ?? member.pin ?? null,
  };
}

export default async function handler(request, response) {
  if (request.method !== "POST") {
    response.status(405).json({ error: "Method not allowed" });
    return;
  }

  const action = request.body?.action;
  const name = `${request.body?.name ?? ""}`.trim();
  const pinHash = request.body?.pinHash ?? null;

  if (!name) {
    response.status(400).json({ error: "Missing name" });
    return;
  }

  const members = (await loadMembers()).map(normalizeMember);
  const member = members.find((item) => item.name === name);

  if (!member) {
    response.status(404).json({ error: "Member not found" });
    return;
  }

  if (action === "setup") {
    member.pinHash = pinHash;
    await saveMembers(members);
    response.status(200).json({ ok: true });
    return;
  }

  if (action === "verify") {
    response.status(200).json({ ok: member.pinHash === pinHash });
    return;
  }

  if (action === "clear") {
    member.pinHash = null;
    await saveMembers(members);
    response.status(200).json({ ok: true });
    return;
  }

  response.status(400).json({ error: "Unsupported action" });
}
