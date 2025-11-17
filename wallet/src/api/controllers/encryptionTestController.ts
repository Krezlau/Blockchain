import { ec } from "elliptic";
import { createDecipheriv, createHash, scryptSync } from "crypto";
import * as fs from "fs/promises";
import * as path from "path";
import { Request, Response } from "express";
import { PrivateKeyObject } from "../interfaces/PrivateKeyObject";

const EC = new ec("secp256k1");

async function getPrivateKeyFromPrivateKeyObject(
  privateKeyObjectPath: string,
  passphrase: string
): Promise<Buffer> {
  const rawContent = await fs.readFile(path.resolve(privateKeyObjectPath), "utf8");
  const walletData: PrivateKeyObject = JSON.parse(rawContent);

  const salt = Buffer.from(walletData.salt, "hex");
  const iv = Buffer.from(walletData.iv, "hex");
  const encryptedPrivateKeyBuffer = Buffer.from(walletData.encryptedPrivateKey, "hex");
  const authTag = Buffer.from(walletData.authTag, "hex");

  const key = scryptSync(passphrase, salt, 32);

  const decipher = createDecipheriv("aes-256-gcm", key, iv);
  decipher.setAuthTag(authTag);

  const decryptedPrivateKey = Buffer.concat([
    decipher.update(encryptedPrivateKeyBuffer),
    decipher.final(),
  ]);

  return decryptedPrivateKey;
}

export async function signData(req: Request, res: Response) {
  const { privateKeyObjectPath, password, dataToSign } = req.body;

  if (!privateKeyObjectPath || !password || !dataToSign) {
    return res.status(400).json({ message: "All parameters are required." });
  }

  try {
    const rawPrivateKey = await getPrivateKeyFromPrivateKeyObject(privateKeyObjectPath, password);

    const key = EC.keyFromPrivate(rawPrivateKey);

    const dataHash = createHash("sha256").update(dataToSign).digest("hex");

    const signature = key.sign(dataHash);

    res.json({
      message: "Successfully signed data (ECC/secp256k1).",
      signature: signature.toDER("hex"),
    });
  } catch (error) {
    const err = error as Error;
    console.error("Error in endpoint sign-data:", err);
    const errorMessage = "Error during creating signature. Check path and other params.";
    res.status(500).json({ message: errorMessage, error: err.message });
  }
}

export async function verifySignature(req: Request, res: Response) {
  const { publicKeyPath, signature, dataToSign } = req.body;

  if (!publicKeyPath || !signature) {
    return res.status(400).json({ message: "All parameters are required." });
  }

  try {
    const publicKeyHex = await fs.readFile(path.resolve(publicKeyPath), "utf8");

    const publicKey = EC.keyFromPublic(publicKeyHex, "hex");

    const dataHash = createHash("sha256").update(dataToSign).digest("hex");
    const buffSig = Buffer.from(signature, "hex");

    const isValid = publicKey.verify(dataHash, buffSig);

    res.json({
      message: "Verification proccess completed",
      isValid: isValid,
      status: isValid ? "Signature is valid" : "Signature is not valid",
    });
  } catch (error) {
    const err = error as Error;
    console.error("Error in endpoint verify-signature:", err);
    res.status(500).json({
      message: "An error occurred during verification.",
      error: err.message,
    });
  }
}
