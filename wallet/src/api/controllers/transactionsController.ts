import * as fs from "fs/promises";
import * as path from "path";
import { ec } from 'elliptic';
import { createTxOuts, findUnspentTxOutsForGivenAmount, getTransactionId, signTxIn, sumAmounts } from '../services/transactionsService';
import { UnspentTxOut } from "../classes/UnspentTxOut";
import { TxOut } from "../classes/TxOut";
import { Transaction } from "../classes/Transaction";
import { TxIn } from "../classes/TxIn";
import { Request, Response } from "express";

const EC = new ec("secp256k1");

const NODE_API_GET_UTXOS_LIST_URL: string = process.env.NODE_API_URL + '/utxos' || 'http://localhost:3001/utxos';

export async function makeTransaction(req: Request, res: Response) {
    const { publicKeyPath, amount, privateKeyObjectPath, password, receiverAddress } = req.body;
    if (!publicKeyPath || !amount || !privateKeyObjectPath || !password || !receiverAddress) {
        return res.status(400).json({ message: "All parameters are required." });
    }

    let transaction;

    try {
        transaction = await createTransaction(publicKeyPath, amount, privateKeyObjectPath, password, receiverAddress);
        res.json({
            message: "Successfully signed data (ECC/secp256k1).",
            transaction: JSON.stringify(transaction),
        });
    } catch (e) {
        const err = e as Error;
        res.status(500).json({ message: "Error when creating transaction", error: err.message });
    }
}

export async function checkCredits(req: Request, res: Response){
    const { myAddress } = req.body;
    let allUnspentTxOuts: UnspentTxOut[];
        try {
            const response = await fetch(NODE_API_GET_UTXOS_LIST_URL);
            if (!response.ok) {
                throw new Error(`Error when requesting transaction outputs list: ${response.status}`);
            }
            allUnspentTxOuts = await response.json();
        } catch (error) {
            throw new Error("Can not connect with node and fetch utxos list");
        }

        const myUnspentTxOuts = allUnspentTxOuts.filter((uTxO) => uTxO.address === myAddress);

        sumAmounts(myUnspentTxOuts);
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

    const {
        collectedAmount,
        includedUnspentTxOuts
    } = await findUnspentTxOutsForGivenAmount(amount, myAddress);

    const txOuts: TxOut[] = createTxOuts(receiverAddress, myAddress, amount, collectedAmount);
    
    let transaction: Transaction = {
        txIns: [], 
        txOuts: txOuts,
        id: ''
    };
    
    const txIns: TxIn[] = includedUnspentTxOuts.map((uTxO: UnspentTxOut) => {
        return new TxIn(uTxO.txOutId, uTxO.txOutIndex, ''); 
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
    //send request to node to broadcast the transaction
    return transaction; 
};