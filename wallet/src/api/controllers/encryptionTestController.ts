import { Request, Response } from "express";
import * as crypto from "crypto";
import * as fs from "fs/promises";
import * as path from "path";

export async function encryptData(req: Request, res: Response) {
  const { publicKeyPath, textToEncrypt } = req.body;

  if (!publicKeyPath || !textToEncrypt) {
    return res
      .status(400)
      .json({ message: "Path to public key and text to encrypt are required parameters" });
  }

  try {
    const publicKey = await fs.readFile(path.resolve(publicKeyPath), "utf8");
    const encrypted = crypto.publicEncrypt(
      {
        key: publicKey,
        padding: crypto.constants.RSA_PKCS1_OAEP_PADDING,
        oaepHash: "sha256",
      },
      Buffer.from(textToEncrypt, "utf8")
    );

    res.json({
      message: "Text encrypted successfully",
      encryptedText: encrypted.toString("base64"),
    });
  } catch (error) {
    const err = error as Error;
    console.error("Error in endpoint encrypt-data:", err);
    res.status(500).json({
      message: "An error occured. Check if path to public key file is correct.",
      error: err.message,
    });
  }
}

export async function decryptData(req: Request, res: Response) {
  const { privateKeyPath, password, encryptedText } = req.body;

  if (!privateKeyPath || !password || !encryptedText) {
    return res.status(400).json({
      message: "Path to private key, password and encrypted text are required parameters.",
    });
  }

  try {
    const privateKeyPEM = await fs.readFile(path.resolve(privateKeyPath), "utf8");

    const decrypted = crypto.privateDecrypt(
      {
        key: privateKeyPEM,
        passphrase: password,
        padding: crypto.constants.RSA_PKCS1_OAEP_PADDING,
        oaepHash: "sha256",
      },
      Buffer.from(encryptedText, "base64")
    );

    res.json({
      message: "Tekst odszyfrowany pomyślnie.",
      decryptedText: decrypted.toString("utf8"),
    });
  } catch (error) {
    const err = error as Error;
    console.error("Error in endpoint decrypt-data:", err);
    const errorMessage =
      "Error in text decryption proccess. Check if the path to private key and password are correct.";
    res.status(500).json({ message: errorMessage, error: err.message });
  }
}
