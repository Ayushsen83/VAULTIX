require("dotenv").config();

const {
  encryptTotpSecret,
  decryptTotpSecret,
} = require("./utils/totpEncryption");

const testSecret = "TEST_SECRET_FOR_ENCRYPTION_ONLY";

const encrypted = encryptTotpSecret(testSecret);
const decrypted = decryptTotpSecret(encrypted);

if (decrypted !== testSecret) {
  throw new Error("Encryption round-trip test failed.");
}

console.log("Encryption test: PASSED");
console.log("Decryption test: PASSED");

try {
  decryptTotpSecret(encrypted + "00");
  throw new Error("Tampering was not detected.");
} catch (error) {
  if (error.message === "Tampering was not detected.") {
    throw error;
  }

  console.log("Tampering detection test: PASSED");
}