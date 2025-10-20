import { Request, Response, Router } from "express";
import * as fs from "fs/promises";
import * as path from "path";
import { generateKeyPairSync } from "crypto";

const createIdentityRouter: Router = Router();

const DEFAULT_PATH = path.join(process.cwd(), "keys");

interface CreateIdentityRequestDto extends Request {
  body: {
    encryptionPassword: string;
    path?: string;
  };
}

export function generateKeyPairWithEncryptedPrivateKey(password: string) {
  const { publicKey, privateKey } = generateKeyPairSync("rsa", {
    modulusLength: 2048,
    publicKeyEncoding: { type: "spki", format: "pem" },
    privateKeyEncoding: {
      type: "pkcs8",
      format: "pem",
      cipher: "aes-256-cbc",
      passphrase: password,
    },
  });
  return { publicKey, privateKey };
}

export async function createIdentity(req: CreateIdentityRequestDto, res: Response) {
  const { encryptionPassword, path: userPath } = req.body;

  if (!encryptionPassword) {
    return res.status(400).json({ message: "Encryption password is required parameter" });
  }

  const saveDir = userPath ? path.resolve(userPath) : DEFAULT_PATH;
  const publicKeyPath = path.join(saveDir, `crypto_pub_key.pem`);
  const privateKeyPath = path.join(saveDir, `crypto_priv_key.pem`);

  try {
    await fs.mkdir(saveDir, { recursive: true });

    const { publicKey, privateKey } = generateKeyPairWithEncryptedPrivateKey(encryptionPassword);

    await fs.writeFile(publicKeyPath, publicKey, "utf8");
    await fs.writeFile(privateKeyPath, privateKey, { encoding: "utf8", mode: 0o600 });

    res.status(201).json({
      message: "Identity created successfully. Keys saved in the file system.",
      paths: {
        publicKey: publicKeyPath,
        privateKey: privateKeyPath,
      },
      warning:
        "Please do not forget the password - without it you will lose access to your identity!",
    });
  } catch (error) {
    const err = error as Error;
    console.error("Error in endpoint create-identity:", err);
    res.status(500).json({
      message: "An error occurred while creating identity. Please try again later.",
      error: err.message,
    });
  }
}

export default createIdentityRouter;
