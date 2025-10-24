import cryptoJs from "crypto-js";

export class Block {
  public index: number;
  public hash: string;
  public previousHash: string;
  public timestamp: number;
  public data: string;

  constructor(index: number, previousHash: string, data: string) {
    this.index = index;
    this.timestamp = Date.now();
    this.previousHash = previousHash;
    this.data = data;
    this.hash = calculateBlockHash(this);
  }

  static genesisBlock: Block = new Block(0, null, "genesis block");

  isValid(previousBlock: Block) {
    if (!this.isValidStructure) {
      console.log("new block: invalid structure!");
      return false;
    }
    if (previousBlock.index !== this.index - 1) {
      console.log(
        `new block: invalid index!
        [previousBlock.index: ${previousBlock.index},
        newBlock.index: ${this.index}]`,
      );
      return false;
    }
    if (previousBlock.hash !== this.previousHash) {
      console.log(
        `new block: invalid previousHash!
        [previousBlock.hash: ${previousBlock.hash},
        newBlock.previousHash: ${this.previousHash}]`,
      );
      return false;
    }
    const newBlockHash = calculateBlockHash(this);
    if (newBlockHash !== this.hash) {
      console.log(
        `new block: incorrect hash!
        [calculateBlockHash(newBlock): ${newBlockHash},
        newBlock.hash: ${this.hash}]`,
      );
      return false;
    }
    return true;
  }

  isValidStructure() {
    return (
      typeof this.index === "number" &&
      typeof this.hash === "string" &&
      typeof this.previousHash === "string" &&
      typeof this.timestamp === "number" &&
      typeof this.data === "string"
    );
  }
}

const calculateBlockHash = (block: Block) => {
  return cryptoJs
    .SHA256(block.index + block.previousHash + block.timestamp + block.data)
    .toString();
};

const generateNewBlock = (previousBlock: Block, blockData: string) => {
  return new Block(previousBlock.index + 1, previousBlock.hash, blockData);
};

export default Block;
