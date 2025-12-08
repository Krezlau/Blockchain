import { TxOut } from "./TxOut";

export class UnspentTxOut {
    public readonly txOutId: string; 
    public readonly txOutIndex: number; 
    public readonly address: string; 
    public readonly amount: number; 

    constructor(txOutId: string, txOutIndex: number, address: string, amount: number) {
        this.txOutId = txOutId;
        this.txOutIndex = txOutIndex;
        this.address = address;
        this.amount = amount;
    }

}
export const toUnspentTxOut = (txOut: TxOut, txId: string, txOutIndex: number): UnspentTxOut => {
    return {
        txOutId: txId,
        txOutIndex: txOutIndex,
        address: txOut.address,
        amount: txOut.amount,
    };
};