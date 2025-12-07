import { TxIn } from "./TxIn";
import { TxOut } from "./TxOut";

export class Transaction {
    public id: string;
    public txIns: TxIn[];
    public txOuts: TxOut[];

    constructor(id: string, txIns: TxIn[], txOuts: TxOut[]) {
        this.id = id;
        this.txIns = txIns;
        this.txOuts = txOuts;
    }
}