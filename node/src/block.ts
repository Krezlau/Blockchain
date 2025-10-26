import cryptoJs from "crypto-js";

export class Block {
  public index: number;
  public hash: string;
  public previousHash: string;
  public timestamp: number;
  public data: string;

  private constructor(
    index: number,
    hash: string,
    previousHash: string,
    timestamp: number,
    data: string
  ) {
    this.index = index;
    this.hash = hash;
    this.timestamp = timestamp;
    this.previousHash = previousHash;
    this.data = data;
  }

  public static fromJson(json: string) {
    const parsed = JSON.parse(json);

    return new Block(parsed.index, parsed.hash, parsed.previousHash, parsed.timestamp, parsed.data);
  }

  public static genesisBlock(): Block {
    return new Block(0, "genesisBlockHash", null, 1, "genesis block");
  }

  public static generateNewBlock(previousBlock: Block, blockData: string): Block {
    const index = previousBlock.index + 1;
    const previousHash = previousBlock.hash;
    const timestamp = Date.now();
    const hash = cryptoJs.SHA256(index + previousHash + timestamp + blockData).toString();
    return new Block(index, hash, previousHash, timestamp, blockData);
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
    return cryptoJs.SHA256(this.index + this.previousHash + this.timestamp + this.data).toString();
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

export default Block;
