import express, { Request, Response } from "express";
import * as http from "http";
import { WebSocketServer, WebSocket } from "ws";
import { Block, isValidChain, getDifficulty } from "./block";
import * as swaggerUi from "swagger-ui-express";
import * as fs from "fs";
import * as path from "path";
import * as yaml from "js-yaml";
import NodeMessage, { NodeMessageType } from "./node-message";
import Peer from "./peer";
import { createCoinbaseTx } from "./transactions/createCoinbase";
import { Transaction } from "./transactions/classes/Transaction";
import { isValidTransactionInMempool } from "./transactions/transactionMempool";
import { UnspentTxOut } from "./transactions/classes/UnspentTxOut";
import { toUnspentTxOut } from "./transactions/classes/UnspentTxOut";
import { isValidBlockTransactions } from "./transactions/transactionValidation";

class App {
  public express: any;
  public peers: Peer[] = [];
  public blockChain: Block[] = [Block.genesisBlock()];
  public isMining: boolean = false;
  public mempool: Transaction[] = [];
  public unspentTxOuts: UnspentTxOut[] = [];

  constructor() {
    const SERVER_PORT = parseInt(process.env.SERVER_PORT || "42069");
    const SERVER_NAME = process.env.SERVER_NAME || "";
    const PEER_ADDRESSES_STRING = process.env.PEER_ADDRESSES || "";
    const PEER_ADDRESSES: string[] = PEER_ADDRESSES_STRING.split(",")
      .map((addr) => addr.trim())
      .filter((addr) => addr.length > 0);

    this.startServer(SERVER_PORT, SERVER_NAME, PEER_ADDRESSES);
  }

  private addSocket(socket: WebSocket, url?: string): void {
    this.peers.push(new Peer(socket, url));

    socket.on("message", (message: Buffer) => {
      this.handleMessage(socket, message);
    });

    socket.on("close", () => {
      this.peers = this.peers.filter((s) => s.socket !== socket);
    });

    socket.on("error", (err) => {
      console.error("Socket error, closing and removing:", err.message);
      socket.close();
      this.peers = this.peers.filter((s) => s.socket !== socket);
    });
  }

  private handleMessage(socket: WebSocket, message: Buffer): void {
    console.log(`Received message: ${message.toString()}`);

    let nodeMessage: NodeMessage;
    try {
      const plaintext = message.toString("utf-8");
      nodeMessage = NodeMessage.fromJson(plaintext);
    } catch {
      console.error("Could not parse message.");
      return;
    }
    if (nodeMessage.type === NodeMessageType.Transaction) {
      let newTx: Transaction;
      try {
        newTx = JSON.parse(nodeMessage.payload);
      } catch {
        console.error("Could not parse transaction");
        return;
      }

      if (this.addTransactionToMempool(newTx)) {
        this.broadcastNewTransaction(newTx);
      }
    }

    if (nodeMessage.type === NodeMessageType.NewBlock) {
      const newBlock: Block = Block.fromJson(nodeMessage.payload);

      const newChain = [...this.blockChain, newBlock];

      if (
        isValidChain(newChain) &&
        isValidBlockTransactions(newBlock.data, this.unspentTxOuts, newBlock.index)
      ) {
        console.log("New block is valid and new. Adding to chain.");
        this.unspentTxOuts = this.processTransactions(newBlock.data, this.unspentTxOuts);
        // when having multiple miners
        const minedTxIds = newBlock.data.map((tx: Transaction) => tx.id);
        this.mempool = this.mempool.filter((tx) => !minedTxIds.includes(tx.id));
        this.broadcastNewBlock(newBlock, socket);
      } else {
        console.log("Received invalid block, ignoring.");
      }
    }
    if (nodeMessage.type === NodeMessageType.Hello) {
      console.log("received hello message: " + nodeMessage.payload);
      const peer = this.peers.find((x) => x.socket === socket);
      peer.url = nodeMessage.payload;
    }
  }

  private async startServer(server_port: number, server_name: string, peer_addresses: string[]) {
    this.express = express();
    this.express.use(express.json());
    const router = express.Router();
    router.all("/", (req, res) => res.send("Hi there!"));
    this.express.use("/", router);
    const swaggerFilePath = path.join(__dirname, "../swagger.yaml");

    const swaggerFile = fs.readFileSync(swaggerFilePath, "utf8");
    const swaggerSpec: any = yaml.load(swaggerFile);

    swaggerSpec.servers = [
      {
        url: `http://localhost:${server_port}`,
      },
    ];

    this.express.use("/swagger", swaggerUi.serve, swaggerUi.setup(swaggerSpec));

    const server = http.createServer(this.express);
    server.listen(server_port, () => {
      console.log(`server up on port ${server_port}`);
    });

    // accept new connections
    const ws = new WebSocketServer({ server });
    ws.on("connection", (wss) => {
      this.addSocket(wss);
    });

    await sleep(2000);

    // connect to peers
    peer_addresses.forEach((port) => {
      const client = new WebSocket(`ws://${port}/`);
      client.on("open", async () => {
        this.addSocket(client, client.url);
        client.send(NodeMessage.hello(`ws://${server_name}:${server_port}/`).toJson());
      });
    });

    // expose endpoints
    this.express.get("/blocks", (req: Request, res: Response) => {
      res.send(this.blockChain);
    });

    this.express.get("/peers", (req: Request, res: Response) => {
      res.send(this.peers.map((p) => p.url));
    });

    this.express.post("/mine", async (req: Request, res: Response) => {
      // this.continuousMine(req.params.minerAdress);
      res.send(await this.mineOneBlock(req.body.minerAddress));
    });

    this.express.post("/send-transaction", (req: Request, res: Response) => {
      if (this.addTransactionToMempool(req.body.transaction))
        this.broadcastNewTransaction(req.body.transaction);

      res.send({ message: "Added transaction to mempool" });
    });
    this.express.get("/unspent-outputs", (req: Request, res: Response) => {
      res.send(this.unspentTxOuts);
    });

    this.express.get("/mempool", (req: Request, res: Response) => {
      res.send(this.mempool);
    });
  }

  private broadcastNewBlock(block: Block, ignorePeer: WebSocket = null): void {
    this.blockChain.push(block);

    const nodeMessage = NodeMessage.newBlock(block).toJson();
    for (let i = 0; i < this.peers.length; i++) {
      const peer = this.peers[i];
      if (peer.socket !== ignorePeer && peer.socket.readyState === WebSocket.OPEN) {
        peer.socket.send(nodeMessage);
      }
    }
  }

  private async mineOneBlock(minerAdress: string): Promise<Block> {
    const lastBlock = this.blockChain[this.blockChain.length - 1];
    const difficulty = getDifficulty(this.blockChain);

    const coinbaseTx: Transaction = createCoinbaseTx(minerAdress, lastBlock.index + 1);

    const transactionsToMine: Transaction[] = [coinbaseTx, ...this.mempool];
    const newBlock: Block = Block.generateNewBlock(lastBlock, transactionsToMine, difficulty);

    this.unspentTxOuts = this.processTransactions(newBlock.data, this.unspentTxOuts);

    const minedTxIds = newBlock.data.map((tx: Transaction) => tx.id);
    this.mempool = this.mempool.filter((tx) => !minedTxIds.includes(tx.id));
    console.log(`Mempool cleared after mining block`);

    this.broadcastNewBlock(newBlock);
    console.log(`Mined and broadcasted block ${newBlock.index}`);

    return newBlock;
  }

  private async continuousMine(minerAdress: string) {
    if (this.isMining) {
      return;
    }

    while (this.isMining) {
      this.mineOneBlock(minerAdress);

      await sleep(0);
    }
  }

  private addTransactionToMempool(newTx: Transaction): boolean {
    if (!isValidTransactionInMempool(newTx, this.mempool, this.unspentTxOuts)) {
      console.error(`Transaction ${newTx.id} is not correct and was not added to Mempool.`);
      return false;
    }

    if (this.mempool.some((tx) => tx.id === newTx.id)) {
      console.log(`Transaction ${newTx.id} is already in mempool.`);
      return false;
    }

    this.mempool.push(newTx);
    console.log(`Transaction ${newTx.id} added to mempool`);
    return true;
  }

  private broadcastNewTransaction(tx: Transaction, ignorePeer: WebSocket = null): void {
    const nodeMessage = NodeMessage.transaction(tx).toJson();
    console.log(`Broadcasting transaction ${tx.id} to ${this.peers.length} peers.`);

    for (let i = 0; i < this.peers.length; i++) {
      const peer = this.peers[i];

      if (peer.socket !== ignorePeer && peer.socket.readyState === WebSocket.OPEN) {
        peer.socket.send(nodeMessage);
      }
    }
  }

  private processTransactions(
    blockTransactions: Transaction[],
    currentUnspentTxOuts: UnspentTxOut[]
  ): UnspentTxOut[] {
    // wszystkie outy
    const newUnspentTxOuts: UnspentTxOut[] = blockTransactions
      .map((tx) => tx.txOuts.map((txOut, txOutIndex) => toUnspentTxOut(txOut, tx.id, txOutIndex)))
      .flat();

    // wszystkie iny bez coinbase
    const consumedTxOuts: { txOutId: string; txOutIndex: number }[] = blockTransactions
      .map((tx) => tx.txIns)
      .flat() // txIns[]
      .map((txIn) => ({
        txOutId: txIn.txOutId,
        txOutIndex: txIn.txOutIndex,
      }))
      //filter out coinbase
      .filter((consumed) => consumed.txOutId !== "0");

    // check which utxos from unspendUtxos list are still valid (if they were not spent in new block)
    // z obecnych unspent txOuts wywalamy skonsumowane w tym bloku
    const remainingUnspentTxOuts: UnspentTxOut[] = currentUnspentTxOuts.filter(
      (uTxO) =>
        !consumedTxOuts.some(
          (consumed) => consumed.txOutId === uTxO.txOutId && consumed.txOutIndex === uTxO.txOutIndex
        )
    );

    // create new unspendUtxos list
    return [...remainingUnspentTxOuts, ...newUnspentTxOuts];
  }
}
export default new App().express;

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
