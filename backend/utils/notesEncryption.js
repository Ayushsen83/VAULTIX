
const crypto = require("crypto");

const ALGORITHM = "aes-256-gcm";
const VERSION = "v1";

const keyString = process.env.NOTES_ENCRYPTION_KEY;

if (!keyString) {
  throw new Error("NOTES_ENCRYPTION_KEY is missing.");
}

const KEY = Buffer.from(keyString, "base64");

if (KEY.length !== 32) {
  throw new Error(
    "NOTES_ENCRYPTION_KEY must decode to exactly 32 bytes."
  );
}

const encryptNoteField = (value) => {
  if (typeof value !== "string") {
    throw new TypeError("Note field must be a string.");
  }

  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv(ALGORITHM, KEY, iv);

  const encrypted = Buffer.concat([
    cipher.update(value, "utf8"),
    cipher.final(),
  ]);

  const authTag = cipher.getAuthTag();

  return [
    VERSION,
    iv.toString("base64url"),
    authTag.toString("base64url"),
    encrypted.toString("base64url"),
  ].join(":");
};

const decryptNoteField = (value) => {
  if (typeof value !== "string") {
    return value;
  }

  // Temporary backward compatibility for existing plaintext notes.
  if (!value.startsWith(`${VERSION}:`)) {
    return value;
  }

  const parts = value.split(":");

  if (parts.length !== 4 || parts[0] !== VERSION) {
    throw new Error("Invalid encrypted note format.");
  }

  const [, ivString, tagString, encryptedString] = parts;

  const iv = Buffer.from(ivString, "base64url");
  const authTag = Buffer.from(tagString, "base64url");
  const encrypted = Buffer.from(encryptedString, "base64url");

  if (iv.length !== 12 || authTag.length !== 16) {
    throw new Error("Invalid encrypted note data.");
  }

  const decipher = crypto.createDecipheriv(ALGORITHM, KEY, iv);
  decipher.setAuthTag(authTag);

  return Buffer.concat([
    decipher.update(encrypted),
    decipher.final(),
  ]).toString("utf8");
};

const encryptNote = (note) => ({
  ...note,
  title: encryptNoteField(note.title),
  content: encryptNoteField(note.content ?? ""),
});

const decryptNote = (note) => ({
  ...note,
  title: decryptNoteField(note.title),
  content: decryptNoteField(note.content ?? ""),
});

module.exports = {
  encryptNoteField,
  decryptNoteField,
  encryptNote,
  decryptNote,
};
