import cryptoJs from "crypto-js";
import { hexToBinary } from "./utils";
import { Transaction } from "./transactions/classes/Transaction";

const BLOCK_GENERATION_INTERVAL_SECONDS: number = 10;
const DIFFICULTY_ADJUSTMENT_INTERVAL_BLOCKS: number = 10;

export class Block {
  public index: number;
  public hash: string;
  public previousHash: string;
  public timestamp: number;
  public data: string;
  public difficulty: number;
  public nonce: number;
  public transactions: Transaction[];


  private constructor(
    index: number,
    hash: string,
    previousHash: string,
    timestamp: number,
    data: string,
    difficulty: number,
    nonce: number
  ) {
    this.index = index;
    this.hash = hash;
    this.timestamp = timestamp;
    this.previousHash = previousHash;
    this.data = data;
    this.difficulty = difficulty;
    this.nonce = nonce;
  }

  public static fromJson(json: string) {
    const parsed = JSON.parse(json);

    return new Block(
      parsed.index,
      parsed.hash,
      parsed.previousHash,
      parsed.timestamp,
      parsed.data,
      parsed.difficulty,
      parsed.nonce
    );
  }

  public static genesisBlock(): Block {
    return new Block(0, "genesisBlockHash", null, 1, "genesis block", 20, 0);
  }

  public static generateNewBlock(
    previousBlock: Block,
    blockData: string,
    difficulty: number
  ): Block {
    const index = previousBlock.index + 1;
    const previousHash = previousBlock.hash;
    const timestamp = Date.now();
    let nonce = 0;
    while (true) {
      const hash: string = cryptoJs
        .SHA256(index + previousHash + timestamp + blockData + difficulty + nonce)
        .toString();

      const hashInBinary: string = hexToBinary(hash);
      const requiredPrefix: string = "0".repeat(difficulty);
      if (hashInBinary.startsWith(requiredPrefix)) {
        return new Block(index, hash, previousHash, timestamp, blockData, difficulty, nonce);
      }
      nonce++;
    }
  }

  public isValid(previousBlock: Block) {
    if (!this.isValidStructure()) {
      console.log("new block: invalid structure!");
      return false;
    }
    if (previousBlock.index !== this.index - 1) {
      console.log(
        `new block: invalid index! [previousBlock.index: ${previousBlock.index}, newBlock.index: ${this.index}]`
      );
      return false;
    }
    if (previousBlock.hash !== this.previousHash) {
      console.log(
        `new block: invalid previousHash! [previousBlock.hash: ${previousBlock.hash}, newBlock.previousHash: ${this.previousHash}]`
      );
      return false;
    }
    const newBlockHash = this.calculateBlockHash();
    if (newBlockHash !== this.hash) {
      console.log(
        `new block: incorrect hash! [calculateBlockHash(newBlock): ${newBlockHash}, newBlock.hash: ${this.hash}]`
      );
      return false;
    }
    return true;
  }

  private isValidStructure() {
    return (
      typeof this.index === "number" &&
      typeof this.hash === "string" &&
      typeof this.previousHash === "string" &&
      typeof this.timestamp === "number" &&
      typeof this.data === "string"
    );
  }

  private calculateBlockHash() {
    return cryptoJs
      .SHA256(
        this.index + this.previousHash + this.timestamp + this.data + this.difficulty + this.nonce
      )
      .toString();
  }
}

export const isValidChain = (blockChain: Block[]) => {
  if (blockChain.length === 0) {
    console.log("chain: invalid length");
    return false;
  }

  if (JSON.stringify(blockChain[0]) !== JSON.stringify(Block.genesisBlock())) {
    console.log("chain: invalid genesis block");
    return false;
  }

  for (let i = 1; i < blockChain.length; i++) {
    if (!blockChain[i].isValid(blockChain[i - 1])) {
      console.log("chain: invalid element " + i);
      return false;
    }
  }

  return true;
};

export function getDifficulty(blockchain: Block[]): number {
  const latestBlock: Block = blockchain[blockchain.length - 1];
  if (latestBlock.index % DIFFICULTY_ADJUSTMENT_INTERVAL_BLOCKS === 0 && latestBlock.index !== 0) {
    return getAdjustedDifficulty(latestBlock, blockchain);
  } else {
    return latestBlock.difficulty;
  }
}

function getAdjustedDifficulty(latestBlock: Block, blockchain: Block[]) {
  const prevAdjustmentBlock: Block =
    blockchain[blockchain.length - DIFFICULTY_ADJUSTMENT_INTERVAL_BLOCKS];
  const timeExpected_ms: number =
    BLOCK_GENERATION_INTERVAL_SECONDS * DIFFICULTY_ADJUSTMENT_INTERVAL_BLOCKS * 1000;
  const timeTaken_ms: number = latestBlock.timestamp - prevAdjustmentBlock.timestamp;
  if (timeTaken_ms < timeExpected_ms / 2) {
    return prevAdjustmentBlock.difficulty + 1;
  } else if (timeTaken_ms > timeExpected_ms * 2) {
    return prevAdjustmentBlock.difficulty - 1;
  } else {
    return prevAdjustmentBlock.difficulty;
  }
}

export default Block;
