export interface EncryptedIdentity {
  publicKey: string;
  encryptedPrivateKey: string;
  salt: string;
  iv: string;
  authTag: string;
}
