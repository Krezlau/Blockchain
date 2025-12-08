import * as fs from "fs/promises";
import * as path from "path";
import { ec } from "elliptic";
import {
  createTxOuts,
  findUnspentTxOutsForGivenAmount,
  getTransactionId,
  signTxIn,
  sumAmounts,
} from "../services/transactionsService";
import { UnspentTxOut } from "../classes/UnspentTxOut";
import { TxOut } from "../classes/TxOut";
import { Transaction } from "../classes/Transaction";
import { TxIn } from "../classes/TxIn";
import { Request, Response } from "express";

const EC = new ec("secp256k1");
import dotenv from "dotenv";
dotenv.config();
export const NODE_URL: string = process.env.NODE_URL || "";

export async function makeTransaction(req: Request, res: Response) {
  const { publicKeyPath, amount, privateKeyObjectPath, password, receiverAddress } = req.body;
  if (!publicKeyPath || !amount || !privateKeyObjectPath || !password || !receiverAddress) {
    return res.status(400).json({ message: "All parameters are required." });
  }
  try {
    const transaction: Transaction = await createTransaction(
      publicKeyPath,
      amount,
      privateKeyObjectPath,
      password,
      receiverAddress
    );
    res.json({
      message: "Successfully signed data",
      transaction: JSON.stringify(transaction),
    });
  } catch (e) {
    const err = e as Error;
    res.status(500).json({ message: "Error when creating transaction", error: err.message });
  }
}

export async function checkCredits(req: Request, res: Response) {
  const { myAddress } = req.body;
  let allUnspentTxOuts: UnspentTxOut[];
  try {
    const response = await fetch(NODE_URL + "/unspent-outputs");
    if (!response.ok) {
      throw new Error(`Error when requesting transaction outputs list: ${response.status}`);
    }
    allUnspentTxOuts = await response.json();
  } catch (error) {
    console.error(error);
    throw new Error("Can not connect with node and fetch utxos list");
  }

  const myUnspentTxOuts = allUnspentTxOuts.filter((uTxO) => uTxO.address === myAddress);

  res.json({
    availableCredits: sumAmounts(myUnspentTxOuts),
  });
}

export async function mineBlock(req: Request, res: Response) {
  const { minerAdress } = req.body;

  if (!minerAdress) {
    return res.status(400).json({ message: "Miner address is required" });
  }

  try {
    const response = await fetch(NODE_URL + "/mine", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ minerAddress: minerAdress }),
    });

    const minedBlock = await response.json();

    res.status(200).json({
      message: `Pomyślnie wydobyto blok ${minedBlock.index}`,
      block: minedBlock,
    });
  } catch (e) {
    const err = e as Error;
    res.status(500).json({ message: "Error in mining block", error: err.message});
  }
}

const createTransaction = async (
  publicKeyPath: string,
  amount: number,
  privateKeyObjectPath: string,
  password: string,
  receiverAddress: string
): Promise<Transaction> => {
  const publicKeyHex = await fs.readFile(path.resolve(publicKeyPath), "utf8");

  const publicKey = EC.keyFromPublic(publicKeyHex, "hex");
  const myAddress = publicKey.getPublic().encode("hex", false);

  const { collectedAmount, includedUnspentTxOuts } = await findUnspentTxOutsForGivenAmount(
    amount,
    myAddress
  );

  const txOuts: TxOut[] = createTxOuts(receiverAddress, myAddress, amount, collectedAmount);

  const transaction: Transaction = {
    txIns: [],
    txOuts: txOuts,
    id: "",
  };

  const txIns: TxIn[] = includedUnspentTxOuts.map((uTxO: UnspentTxOut) => {
    return new TxIn(uTxO.txOutId, uTxO.txOutIndex, "");
  });

  transaction.txIns = txIns;

  transaction.id = getTransactionId(transaction);

  const signedTxIns: TxIn[] = [];

  for (let i = 0; i < transaction.txIns.length; i++) {
    const txIn = transaction.txIns[i];
    const signature: string = await signTxIn(transaction, privateKeyObjectPath, password);

    signedTxIns.push(new TxIn(txIn.txOutId, txIn.txOutIndex, signature));
  }

  transaction.txIns = signedTxIns;

  try {
    const response = await fetch(NODE_URL + "/send-transaction", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ transaction: transaction }),
    });

    const responseData = await response.json();
    console.log("Transaction send to node, node response: ", responseData);
  } catch (error) {
    const err = error as Error;
    console.error("Error when sending transaction to node");
    throw new Error("Failed to send transaction to node" + err.message);
  }

  return transaction;
};
