import { ec } from 'elliptic';
import { TxOut } from './classes/TxOut';
import { TxIn } from './classes/TxIn';
import { UnspentTxOut } from './UnspentTxOut';
import { Transaction } from './classes/Transaction';
import { getTransactionId } from './utilities';

const EC = new ec("secp256k1");

const getTxOutAmount = (txOuts: TxOut[]): number => {
    return txOuts.reduce((sum, txOut) => sum + txOut.amount, 0);
};

const getTxInAmount = (txIns: TxIn[], aUnspentTxOuts: UnspentTxOut[]): number => {
    let totalAmount = 0;
    for (const txIn of txIns) {
        const referencedUTXO = aUnspentTxOuts.find(uTxO => 
            uTxO.txOutId === txIn.txOutId && uTxO.txOutIndex === txIn.txOutIndex
        );
        if (referencedUTXO) {
            totalAmount += referencedUTXO.amount;
        }
    }
    return totalAmount;
};


const validateTxIn = (txIn: TxIn, tx: Transaction, aUnspentTxOuts: UnspentTxOut[]): boolean => {

    const referencedUTXO = aUnspentTxOuts.find(uTxO => 
        uTxO.txOutId === txIn.txOutId && uTxO.txOutIndex === txIn.txOutIndex
    );

    if (!referencedUTXO) {
        console.log(`No UTXO found for txIn ${txIn.txOutId}:${txIn.txOutIndex}`);
        return false;
    }

    const address = referencedUTXO.address; 
    const dataToVerify = tx.id;
    
    try {
        const key = EC.keyFromPublic(address, 'hex');
        
        const verified = key.verify(dataToVerify, txIn.signature);

        if (!verified) {
            console.log(`Signature check for TxIn with id ${txIn.txOutId} failed`);
            return false;
        }
    } catch (e) {
        console.log('Error during signature verification when validating TxIn', e.message);
        return false;
    }

    return true;
};

const isValidCoinbaseTx = (tx: Transaction, blockIndex: number): boolean => {
    
    if (tx.txIns.length !== 1) {
        console.log('Coinbase must have only 1 txIn');
        return false;
    }
    
    if (tx.txIns[0].txOutId !== '0' || tx.txIns[0].txOutIndex !== blockIndex) {
        console.log('Coinbase has invalid txOutId or txInId');
        return false;
    }
    
    if (tx.txOuts.length < 1) {
         console.log('Coinbase must have at least 1 txOut');
        return false;
    }
    
    //todo later: check if prize value (txOut) is correct
    
    return true;
};


export const isValidTransaction = (tx: Transaction, aUnspentTxOuts: UnspentTxOut[]): boolean => {

    if (getTransactionId(tx) !== tx.id) {
        console.log(`Transaction id validation failed for transaction ${tx.id}`);
        return false;
    }

    const allInputsValid = tx.txIns.every(txIn => validateTxIn(txIn, tx, aUnspentTxOuts));
    if (!allInputsValid) {
        return false;
    }
    
    const totalTxInAmount = getTxInAmount(tx.txIns, aUnspentTxOuts);
    const totalTxOutAmount = getTxOutAmount(tx.txOuts);
    
    if (totalTxInAmount < totalTxOutAmount) {
        console.log(`Transaction ${tx.id} has greater full txOut than txIn`);
        return false;
    }

    return true;
};