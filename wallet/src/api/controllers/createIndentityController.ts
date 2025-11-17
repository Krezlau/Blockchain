import { ec } from "elliptic";
import { randomBytes, createCipheriv, scryptSync } from "crypto";
import * as fs from "fs/promises";
import * as path from "path";
import { Response } from "express";
import { CreateIdentityRequestDto } from "../interfaces/CreateIdentityRequest";
import { PrivateKeyObject } from "../interfaces/PrivateKeyObject";
import { EncryptedIdentity } from "../interfaces/EncryptedIdentity";

const EC = new ec("secp256k1");
const DEFAULT_IDENTITY_FOLDER_PATH = "keys";

export async function createIdentity(req: CreateIdentityRequestDto, res: Response) {
  const { encryptionPassword, path: userPath } = req.body;

  if (!encryptionPassword) {
    return res.status(400).json({ message: "Encryption password is required!" });
  }

  const saveDir = userPath ? path.resolve(userPath) : DEFAULT_IDENTITY_FOLDER_PATH;
  const publicKeyPath = path.join(saveDir, `ecc_pub_key.txt`);
  const privateKeyPath = path.join(saveDir, `ecc_priv_key.json`);

  try {
    await fs.mkdir(saveDir, { recursive: true });

    const encryptedData = generateAndEncryptECCKey(encryptionPassword);

    const privateKeyObject: PrivateKeyObject = {
      type: "secp256k1-encrypted-with-AES-256-GCM",
      encryptedPrivateKey: encryptedData.encryptedPrivateKey,
      salt: encryptedData.salt,
      iv: encryptedData.iv,
      authTag: encryptedData.authTag,
    };
    const privateKeyObjectString = JSON.stringify(privateKeyObject, null, 2);

    await fs.writeFile(publicKeyPath, encryptedData.publicKey, "utf8");
    await fs.writeFile(privateKeyPath, privateKeyObjectString, { encoding: "utf8", mode: 0o600 });

    res.status(201).json({
      message: "Identity created successfully using ECC (secp256k1) and AES-256-GCM.",
      paths: {
        publicKey: publicKeyPath,
        privateKey: privateKeyPath,
      },
    });
  } catch (error) {
    const err = error as Error;
    console.error("Error in endpoint create-identity:", err);
    res.status(500).json({
      message: "An error occurred while creating identity.",
      error: err.message,
    });
  }
}

function generateAndEncryptECCKey(passphrase: string): EncryptedIdentity {
  const keyPair = EC.genKeyPair();
  const publicKey = keyPair.getPublic().encode("hex", false);

  const privateKeyHex = keyPair.getPrivate().toString("hex");
  const privateKeyBuffer = Buffer.from(privateKeyHex, "hex");

  const salt = randomBytes(16);
  const iv = randomBytes(16);

  const key = scryptSync(passphrase, salt, 32);

  const cipher = createCipheriv("aes-256-gcm", key, iv);

  const encryptedPrivateKey = Buffer.concat([cipher.update(privateKeyBuffer), cipher.final()]);

  const authTag = cipher.getAuthTag();

  return {
    publicKey: publicKey,
    encryptedPrivateKey: encryptedPrivateKey.toString("hex"),
    salt: salt.toString("hex"),
    iv: iv.toString("hex"),
    authTag: authTag.toString("hex"),
  };
}
