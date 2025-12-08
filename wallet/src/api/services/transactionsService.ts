import { createHash } from "crypto";
import { Transaction } from "../classes/Transaction";
import { TxIn } from "../classes/TxIn";
import { TxOut } from "../classes/TxOut";
import { UnspentTxOut } from "../classes/UnspentTxOut";
import { getPrivateKeyFromPrivateKeyObject } from "../controllers/encryptionTestController";
import { ec } from "elliptic";
import { NODE_URL } from "../controllers/transactionsController";

const EC = new ec("secp256k1");

interface FindUnspentTxOutsResult {
  collectedAmount: number;
  includedUnspentTxOuts: UnspentTxOut[];
}

export const sumAmounts = (utxos: UnspentTxOut[]): number => {
  return utxos.reduce((sum, utxo) => sum + utxo.amount, 0);
};

export const findUnspentTxOutsForGivenAmount = async (
  amount: number,
  myAddress: string
): Promise<FindUnspentTxOutsResult> => {
  let allUnspentTxOuts: UnspentTxOut[];
  try {
    const response = await fetch(NODE_URL);
    if (!response.ok) {
      throw new Error(`Error when requesting transaction outputs list: ${response.status}`);
    }
    allUnspentTxOuts = await response.json();
  } catch (error) {
    console.error(error);
    throw new Error("Can not connect with node and fetch utxos list");
  }

  const myUnspentTxOuts = allUnspentTxOuts.filter((uTxO) => uTxO.address === myAddress);

  myUnspentTxOuts.sort((a, b) => a.amount - b.amount);

  const includedUnspentTxOuts: UnspentTxOut[] = [];
  let totalAmountIn: number = 0;
  for (const uTxO of myUnspentTxOuts) {
    includedUnspentTxOuts.push(uTxO);
    totalAmountIn = sumAmounts(includedUnspentTxOuts);

    if (totalAmountIn >= amount) {
      return {
        collectedAmount: totalAmountIn,
        includedUnspentTxOuts: includedUnspentTxOuts,
      };
    }
  }

  if (totalAmountIn < amount) {
    throw new Error(`Not enough credits: required ${amount}, available ${totalAmountIn}.`);
  }

  return {
    collectedAmount: 0,
    includedUnspentTxOuts: [],
  };
};

export const createTxOuts = (
  receiverAddress: string,
  myAddress: string,
  requiredAmount: number,
  collectedAmount: number
): TxOut[] => {
  const txOuts: TxOut[] = [];
  const receiverTxOut: TxOut = new TxOut(receiverAddress, requiredAmount);
  txOuts.push(receiverTxOut);
  const changeAmount = collectedAmount - requiredAmount;

  if (changeAmount > 0) {
    const changeTxOut: TxOut = new TxOut(myAddress, changeAmount);
    txOuts.push(changeTxOut);
  }
  return txOuts;
};

export const getTransactionId = (transaction: Transaction): string => {
  const txInContent = transaction.txIns
    .map((txIn: TxIn) => txIn.txOutId + txIn.txOutIndex)
    .reduce((a, b) => a + b, "");

  const txOutContent = transaction.txOuts
    .map((txOut: TxOut) => txOut.address + txOut.amount)
    .reduce((a, b) => a + b, "");

  const contentToHash = txInContent + txOutContent;
  return createHash("sha256").update(contentToHash).digest("hex");
};

export const signTxIn = async (
  transaction: Transaction,
  privateKeyObjectPath: string,
  password: string
): Promise<string> => {
  let rawPrivateKey: Buffer;
  try {
    rawPrivateKey = await getPrivateKeyFromPrivateKeyObject(privateKeyObjectPath, password);
  } catch (e) {
    console.error("Error getting private key from file:", e);
    throw new Error("Error getting private key from file.");
  }
  const key = EC.keyFromPrivate(rawPrivateKey);

  const dataToSign = transaction.id;

  const signature = key.sign(dataToSign);

  return signature.toDER("hex");
};
