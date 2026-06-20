import crypto from "node:crypto";

const PBKDF2_ITERATIONS = 310000;
const PBKDF2_KEY_LENGTH = 32;
const PBKDF2_DIGEST = "sha256";

export function verifyPassword(password, salt, storedPasswordHash) {
  const candidateHash = crypto.pbkdf2Sync(
    password,
    salt,
    PBKDF2_ITERATIONS,
    PBKDF2_KEY_LENGTH,
    PBKDF2_DIGEST,
  );

  const storedHash = Buffer.from(storedPasswordHash, "hex");

  return (
    storedHash.length === candidateHash.length &&
    crypto.timingSafeEqual(storedHash, candidateHash)
  );
}
