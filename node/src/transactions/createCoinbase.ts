import { Transaction } from "./classes/Transaction";
import { TxIn } from "./classes/TxIn";
import { TxOut } from "./classes/TxOut";
import { getTransactionId } from "./utilities";

export const COINBASE_AMOUNT = 50;

export function createCoinbaseTx(receiverAddress: string, blockIndex: number): Transaction {
  const reward: number = COINBASE_AMOUNT;

  const txIn: TxIn = {
    txOutId: "0",
    txOutIndex: blockIndex,
    signature: "",
  };

  const txOut: TxOut = {
    address: receiverAddress,
    amount: reward,
  };

  let tx: Transaction = {
    txIns: [txIn],
    txOuts: [txOut],
    id: "",
  };

  tx.id = getTransactionId(tx);

  return tx;
}
