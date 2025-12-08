import { ec } from "elliptic";
import { TxOut } from "./classes/TxOut";
import { TxIn } from "./classes/TxIn";
import { UnspentTxOut } from "./classes/UnspentTxOut";
import { Transaction } from "./classes/Transaction";
import { getTransactionId } from "./utilities";
import { COINBASE_AMOUNT } from "./createCoinbase";

const EC = new ec("secp256k1");

const getTxOutAmount = (txOuts: TxOut[]): number => {
  return txOuts.reduce((sum, txOut) => sum + txOut.amount, 0);
};

const getTxInAmount = (txIns: TxIn[], aUnspentTxOuts: UnspentTxOut[]): number => {
  let totalAmount = 0;
  for (const txIn of txIns) {
    const referencedUTXO = aUnspentTxOuts.find(
      (uTxO) => uTxO.txOutId === txIn.txOutId && uTxO.txOutIndex === txIn.txOutIndex
    );
    if (referencedUTXO) {
      totalAmount += referencedUTXO.amount;
    }
  }
  return totalAmount;
};

const validateTxIn = (txIn: TxIn, tx: Transaction, aUnspentTxOuts: UnspentTxOut[]): boolean => {
  const referencedUTXO: UnspentTxOut = aUnspentTxOuts.find(
    (uTxO) => uTxO.txOutId === txIn.txOutId && uTxO.txOutIndex === txIn.txOutIndex
  );

  if (!referencedUTXO) {
    console.log(`No UTXO found for txIn ${txIn.txOutId}:${txIn.txOutIndex}`);
    return false;
  }

  const address = referencedUTXO.address;

  try {
    const key = EC.keyFromPublic(address, "hex");

    const verified = key.verify(tx.id, txIn.signature);

    if (!verified) {
      console.log(`Signature check for TxIn with id ${txIn.txOutId} failed`);
      return false;
    }
  } catch (e) {
    console.log("Error during signature verification when validating TxIn", e.message);
    return false;
  }

  return true;
};

const isValidCoinbaseTx = (tx: Transaction, blockIndex: number): boolean => {
  if (tx.txIns.length !== 1) {
    console.log("Coinbase must have only 1 txIn");
    return false;
  }

  if (tx.txIns[0].txOutId !== "0" || tx.txIns[0].txOutIndex !== blockIndex) {
    console.log("Coinbase has invalid txOutId or txInId");
    return false;
  }

  if (tx.txOuts.length !== 1) {
    console.log("Coinbase must have exactly 1 txOut");
    return false;
  }

  if (tx.txOuts[0].amount !== COINBASE_AMOUNT) {
    console.log("Coinbase amount incorrect");
    return false;
  }

  return true;
};

export const isValidTransaction = (tx: Transaction, aUnspentTxOuts: UnspentTxOut[]): boolean => {
  if (getTransactionId(tx) !== tx.id) {
    console.log(`Transaction id validation failed for transaction ${tx.id}`);
    return false;
  }

  const allInputsValid = tx.txIns.every((txIn) => validateTxIn(txIn, tx, aUnspentTxOuts));
  if (!allInputsValid) {
    return false;
  }

  const totalTxInAmount = getTxInAmount(tx.txIns, aUnspentTxOuts);
  const totalTxOutAmount = getTxOutAmount(tx.txOuts);

  if (totalTxInAmount !== totalTxOutAmount) {
    console.log(`Transaction ${tx.id} has greater full txOut than txIn`);
    return false;
  }

  return true;
};

export const isValidBlockTransactions = (
  aTransactions: Transaction[],
  aUnspentTxOuts: UnspentTxOut[],
  blockIndex: number
): boolean => {
  const coinbaseTx = aTransactions[0];
  if (isValidCoinbaseTx(coinbaseTx, blockIndex)) {
    console.error("Wrong Coinbase");
    return false;
  }

  const consumedTxOuts = aTransactions
    .map((tx) => tx.txIns)
    .flat()
    .filter((txIn) => txIn.txOutId !== "0");
  const consumedTxOutsIds = consumedTxOuts.map((txIn) => txIn.txOutId + txIn.txOutIndex);
  const uniqueConsumedTxOutsIds = [...new Set(consumedTxOutsIds)];

  if (consumedTxOutsIds.length !== uniqueConsumedTxOutsIds.length) {
    console.error("Double spending detected");
    return false;
  }

  const standardTransactions = aTransactions.slice(1);
  const allStandardValid = standardTransactions.every((tx) =>
    isValidTransaction(tx, aUnspentTxOuts)
  );

  if (!allStandardValid) {
    console.error("One of transactions is ivalid - check failed on isValidTransaction");
    return false;
  }

  return true;
};
