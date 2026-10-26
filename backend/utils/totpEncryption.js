const crypto = require("crypto");

const ALGORITHM = "aes-256-gcm";
const IV_LENGTH = 12;
const AUTH_TAG_LENGTH = 16;
// Retrieves the encryption key from the environment variable and validates its format.
function getEncryptionKey() {
  const keyHex = process.env.TOTP_ENCRYPTION_KEY;

  if (
    typeof keyHex !== "string" ||
    !/^[0-9a-fA-F]{64}$/.test(keyHex)
  ) {
    throw new Error(
      "TOTP_ENCRYPTION_KEY must be a 64-character hexadecimal key."
    );
  }

  return Buffer.from(keyHex, "hex");
}
// Encrypts a TOTP secret using AES-256-GCM and returns a string containing the IV, authentication tag, and ciphertext in hexadecimal format.
function encryptTotpSecret(secret) {
  if (typeof secret !== "string" || !secret.trim()) {
    throw new Error("A valid TOTP secret is required.");
  }

  const key = getEncryptionKey();
  const iv = crypto.randomBytes(IV_LENGTH);

  const cipher = crypto.createCipheriv(ALGORITHM, key, iv, {
    authTagLength: AUTH_TAG_LENGTH,
  });

  const encrypted = Buffer.concat([
    cipher.update(secret, "utf8"),
    cipher.final(),
  ]);

  const authTag = cipher.getAuthTag();

  // Store IV, authentication tag, and ciphertext together.
  return [
    iv.toString("hex"),
    authTag.toString("hex"),
    encrypted.toString("hex"),
  ].join(":");
}
// Decrypts an encrypted TOTP secret string and returns the original secret. Throws an error if the input format is invalid or if decryption fails.
function decryptTotpSecret(encryptedValue) {
  if (typeof encryptedValue !== "string") {
    throw new Error("Invalid encrypted TOTP secret.");
  }

  const parts = encryptedValue.split(":");

  if (
    parts.length !== 3 ||
    !/^[0-9a-fA-F]{24}$/.test(parts[0]) ||
    !/^[0-9a-fA-F]{32}$/.test(parts[1]) ||
    !/^(?:[0-9a-fA-F]{2})+$/.test(parts[2])
  ) {
    throw new Error("Invalid encrypted TOTP secret format.");
  }

  const [ivHex, authTagHex, ciphertextHex] = parts;

  const decipher = crypto.createDecipheriv(
    ALGORITHM,
    getEncryptionKey(),
    Buffer.from(ivHex, "hex"),
    { authTagLength: AUTH_TAG_LENGTH }
  );

  decipher.setAuthTag(Buffer.from(authTagHex, "hex"));

  const decrypted = Buffer.concat([
    decipher.update(Buffer.from(ciphertextHex, "hex")),
    decipher.final(),
  ]);

  return decrypted.toString("utf8");
}

module.exports = {
  encryptTotpSecret,
  decryptTotpSecret,
};
