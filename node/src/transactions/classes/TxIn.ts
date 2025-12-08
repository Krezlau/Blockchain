export class TxIn {
  public readonly txOutId: string;
  public readonly txOutIndex: number;
  public readonly signature: string;

  constructor(txOutId: string, txOutIndex: number, signature: string) {
    this.txOutId = txOutId;
    this.txOutIndex = txOutIndex;
    this.signature = signature;
  }
}
