import { Transaction } from "./classes/Transaction";
import { isValidTransaction } from "./transactionValidation";
import { UnspentTxOut } from "./UnspentTxOut";

export const isValidTransactionInMempool = (
    tx: Transaction,
    mempool: Transaction[],
    aUnspentTxOuts: UnspentTxOut[]
): boolean => {

    if (!isValidTransaction(tx, aUnspentTxOuts)) {
        console.error(`Error during transaction basic validation`);
        return false;
    }

    const consumedUtxosInMempool: { txOutId: string, txOutIndex: number }[] = mempool
        .map(mempoolTx => mempoolTx.txIns)
        .flat()
        .map(txIn => ({
            txOutId: txIn.txOutId,
            txOutIndex: txIn.txOutIndex
        }));

    //check if there is no double spending in mempool
    for (const txIn of tx.txIns) {
        if (consumedUtxosInMempool.some(consumed => 
            consumed.txOutId === txIn.txOutId && consumed.txOutIndex === txIn.txOutIndex
        )) {
            console.error(`Error - double spending in mempool was indicated`);
            return false;
        }
    }
    return true;
};