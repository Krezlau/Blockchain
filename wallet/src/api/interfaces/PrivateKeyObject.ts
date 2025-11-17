export interface PrivateKeyObject {
  type: string;
  encryptedPrivateKey: string;
  salt: string;
  iv: string;
  authTag: string;
}
