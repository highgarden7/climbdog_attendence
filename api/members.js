import { loadMembers, saveMembers } from "./_membersStore.js";

function normalizeMember(member) {
  if (typeof member === "string") {
    return { name: member, pinHash: null, profile: {} };
  }

  return {
    name: member.name,
    pinHash: member.pinHash ?? member.pin ?? null,
    profile: typeof member.profile === "object" && member.profile ? member.profile : {},
  };
}

function serializeMembers(members) {
  return members.map((member) => ({
    name: member.name,
    hasPin: Boolean(member.pinHash),
    profile: member.profile ?? {},
  }));
}

function getErrorMessage(error) {
  const message = error instanceof Error ? error.message : "Unknown error";
  if (/BLOB_READ_WRITE_TOKEN/i.test(message)) {
    return "BLOB_READ_WRITE_TOKEN is missing or invalid.";
  }

  return message;
}

export default async function handler(request, response) {
  try {
    if (request.method === "GET") {
      const members = (await loadMembers()).map(normalizeMember);
      response.status(200).json({ members: serializeMembers(members) });
      return;
    }

    if (request.method === "POST") {
      const names = Array.isArray(request.body?.names) ? request.body.names : [];
      const existingMembers = (await loadMembers()).map(normalizeMember);
      const uniqueNames = names
        .map((name) => `${name}`.trim())
        .filter((name) => name && !existingMembers.some((member) => member.name === name));

      if (!uniqueNames.length) {
        response.status(200).json({ created: 0, members: serializeMembers(existingMembers) });
        return;
      }

      const nextMembers = [
        ...existingMembers,
        ...uniqueNames.map((name) => ({ name, pinHash: null, profile: {} })),
      ].sort((left, right) => left.name.localeCompare(right.name, "ko"));

      await saveMembers(nextMembers);
      response.status(200).json({ created: uniqueNames.length, members: serializeMembers(nextMembers) });
      return;
    }

    if (request.method === "PATCH") {
      const name = `${request.body?.name ?? ""}`.trim();
      const profile = typeof request.body?.profile === "object" && request.body.profile ? request.body.profile : null;

      if (!name || !profile) {
        response.status(400).json({ error: "Missing name or profile" });
        return;
      }

      const members = (await loadMembers()).map(normalizeMember);
      const member = members.find((item) => item.name === name);

      if (!member) {
        response.status(404).json({ error: "Member not found" });
        return;
      }

      member.profile = profile;
      await saveMembers(members);
      response.status(200).json({ members: serializeMembers(members) });
      return;
    }

    if (request.method === "DELETE") {
      const name = `${request.query?.name ?? ""}`.trim();
      if (!name) {
        response.status(400).json({ error: "Missing name" });
        return;
      }

      const members = (await loadMembers()).map(normalizeMember);
      const nextMembers = members.filter((member) => member.name !== name);
      await saveMembers(nextMembers);
      response.status(200).json({ members: serializeMembers(nextMembers) });
      return;
    }

    response.status(405).json({ error: "Method not allowed" });
  } catch (error) {
    response.status(500).json({
      error: "Member storage unavailable",
      detail: getErrorMessage(error),
    });
  }
}
