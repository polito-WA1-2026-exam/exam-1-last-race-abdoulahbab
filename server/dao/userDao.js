import { get } from "../db/database.js";

function toSafeUser(row) {
  if (!row) {
    return undefined;
  }

  return {
    id: row.id,
    username: row.username,
    name: row.name,
  };
}

export async function getUserForAuthentication(username) {
  return get(
    `
      SELECT id, username, name, password_hash AS passwordHash, salt
      FROM users
      WHERE username = ?
    `,
    [username],
  );
}

export async function getSafeUserById(id) {
  const row = await get(
    `
      SELECT id, username, name
      FROM users
      WHERE id = ?
    `,
    [id],
  );

  return toSafeUser(row);
}
