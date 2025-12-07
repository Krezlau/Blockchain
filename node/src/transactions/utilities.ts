import { createHash } from "crypto";
import { Transaction } from "./classes/Transaction";
import { TxIn } from "./classes/TxIn";
import { TxOut } from "./classes/TxOut";

export const getTransactionId = (transaction: Transaction): string => {
    
    const txInContent = transaction.txIns
        .map((txIn: TxIn) => txIn.txOutId + txIn.txOutIndex)
        .reduce((a, b) => a + b, '');
        
    const txOutContent = transaction.txOuts
        .map((txOut: TxOut) => txOut.address + txOut.amount)
        .reduce((a, b) => a + b, '');

    const contentToHash = txInContent + txOutContent;
    const hash: string = CryptoJS
    .SHA256(contentToHash)
    .toString();

    return hash;
};