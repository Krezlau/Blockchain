import express, { Request, Response } from "express";
import * as http from "http";
import { WebSocketServer, WebSocket } from "ws";
import { Block, isValidChain, getDifficulty } from "./block";
import * as swaggerUi from "swagger-ui-express";
import * as fs from "fs";
import * as path from "path";
import * as yaml from "js-yaml";
import NodeMessage from "./node-message";
import Peer from "./peer";
import { createCoinbaseTx } from "./transactions/createCoinbase";
import { Transaction } from "./transactions/classes/Transaction";
import {isValidTransactionInMempool } from "./transactions/transactionMempool";
import { UnspentTxOut } from "./transactions/UnspentTxOut";

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
    if (nodeMessage.type === "new-transaction") {
        let newTx: Transaction;
        try {
            newTx = JSON.parse(nodeMessage.payload); 
        } catch {
            console.error("Could not parse transaction");
            return;
        }

        //add transaction to mempool
        if (this.addTransactionToMempool(newTx)) {
            //if transaction is correct and new brodcast it
            this.broadcastNewTransaction(newTx);
        }
    }

    if (nodeMessage.type === "new-block") {
      const newBlock: Block = Block.fromJson(nodeMessage.payload);

      const newChain = [...this.blockChain, newBlock];

      if (isValidChain(newChain)) {
        console.log("New block is valid and new. Adding to chain.");
        this.broadcastNewBlock(newBlock, socket);
      } else {
        console.log("Received invalid block, ignoring.");
      }
    }
    if (nodeMessage.type === "hello") {
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

    this.express.post("/mine", (req: Request, res: Response) => {
      this.continuousMine(req.body.data, req.params.minerAdress);
      res.send("Mining started");
    });

    this.express.post("/send-transaction", (req: Request, res: Response) => {
      this.addTransactionToMempool(req.body.transaction);
      res.send("Added transaction to mempool");
    });
    this.express.get("/unspentTxOuts", (req: Request, res: Response) => {
      this.addTransactionToMempool(req.body.transaction);
      res.send("Added transaction to mempool");
    });
    
  }

  private broadcastNewBlock(block: Block, ignorePeer: WebSocket = null): void {
    this.blockChain.push(block);

    const minedTxIds = block.transactions.map((tx: Transaction) => tx.id);
    this.mempool = this.mempool.filter((tx) => !minedTxIds.includes(tx.id));
    console.log(`Mempool cleared after mining block`);

    const nodeMessage = NodeMessage.newBlock(block).toJson();
    for (let i = 0; i < this.peers.length; i++) {
      const peer = this.peers[i];
      if (peer.socket !== ignorePeer && peer.socket.readyState === WebSocket.OPEN) {
        peer.socket.send(nodeMessage);
      }
    }
  }

  private async continuousMine(initialData: string, minerAdress: string) {
    if (this.isMining) {
      return;
    }

    this.isMining = true;
    let blockData = initialData;

    while (this.isMining) {
      const lastBlock = this.blockChain[this.blockChain.length - 1];
      const difficulty = getDifficulty(this.blockChain);

      const transactionsToMine: Transaction[] = [...this.mempool]
      const coinbaseTx: Transaction = createCoinbaseTx(
                minerAdress, 
                lastBlock.index + 1
            );

      const newBlock: Block = Block.generateNewBlock(lastBlock, blockData, difficulty);

      this.broadcastNewBlock(newBlock);
      console.log(`Mined and broadcasted block ${newBlock.index}`);

      await sleep(0);
    }
  }


  private addTransactionToMempool(newTx: Transaction): boolean {
    
    //check if transaction is valid
    if (!isValidTransactionInMempool(newTx, this.mempool, this.unspentTxOuts)) {
        console.error(`Transaction ${newTx.id} is not corrected and was not added to Mempool.`);
        return false;
    }
    
    //check if transaction is not already in mempool
    if (this.mempool.some(tx => tx.id === newTx.id)) {
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

}
export default new App().express;

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
