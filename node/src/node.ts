import express, { Request, Response } from "express";
import * as http from "http";
import { WebSocketServer, WebSocket } from "ws";
import { Block, generateNewBlock, isValidChain } from "./block";
import { plainToInstance } from "class-transformer";
import * as swaggerUi from "swagger-ui-express";
import * as fs from "fs";
import * as path from "path";
import * as yaml from "js-yaml";

class App {
  public express: any;
  public peers: WebSocket[] = [];
  public blockChain: Block[] = [Block.genesisBlock()];

  constructor() {
    const SERVER_PORT = parseInt(process.env.SERVER_PORT || "42069");
    const PEER_ADDRESSES_STRING = process.env.PEER_ADDRESSES || "";
    const PEER_ADDRESSES: string[] = PEER_ADDRESSES_STRING.split(",")
      .map((addr) => addr.trim())
      .filter((addr) => addr.length > 0);

    this.startServer(SERVER_PORT, PEER_ADDRESSES);
  }

  private addSocket(socket: WebSocket): void {
    console.log("Adding new socket connection.");
    this.peers.push(socket);

    socket.on("message", (message: Buffer) => {
      this.handleMessage(socket, message);
    });

    socket.on("close", () => {
      console.log("Socket disconnected, removing from list.");
      this.peers = this.peers.filter((s) => s !== socket);
    });

    socket.on("error", (err) => {
      console.error("Socket error, closing and removing:", err.message);
      socket.close();
      this.peers = this.peers.filter((s) => s !== socket);
    });
  }

  private handleMessage(socket: WebSocket, message: Buffer): void {
    console.log(`Received message: ${message.toString()}`);

    let nodeMessage: NodeMessage;
    try {
      const plaintext = message.toString("utf-8");
      const json = JSON.parse(plaintext);
      if (json.type && json.payload) {
        nodeMessage = plainToInstance(NodeMessage, json);
      } else {
        console.log("Received a non-NodeMessage (e.g., hello):", plaintext);
        return;
      }
    } catch {
      console.log("Could not parse message.");
      return;
    }

    if (nodeMessage.type === "new-block") {
      console.log("Received new block message.");
      const newBlock: Block = plainToInstance(
        Block,
        JSON.parse(nodeMessage.payload),
      );

      const newChain = [...this.blockChain, newBlock];

      if (isValidChain(newChain)) {
        console.log("New block is valid and new. Adding to chain.");
        this.broadcastNewBlock(newBlock, socket);
      } else {
        console.log("Received invalid block, ignoring.");
      }
    }
  }

  private async startServer(server_port: number, peer_addresses: string[]) {
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
      wss.send("hi there from server!");
      this.addSocket(wss);
    });

    await sleep(2000);

    // connect to peers
    peer_addresses.forEach((port) => {
      const client = new WebSocket(`ws://${port}`);
      client.on("open", async () => {
        console.log(`Connected to the server! ${port}`);
        this.addSocket(client);
      });
    });

    // expose endpoints
    this.express.get("/blocks", (req: Request, res: Response) => {
      res.send(this.blockChain);
    });

    this.express.post("/mine", (req: Request, res: Response) => {
      const newBlock: Block = generateNewBlock(
        this.blockChain[this.blockChain.length - 1],
        req.body.data,
      );
      this.broadcastNewBlock(newBlock);
      res.send(newBlock);
    });
  }

  private broadcastNewBlock(block: Block, ignorePeer: WebSocket = null): void {
    this.blockChain.push(block);

    const nodeMessage = JSON.stringify(new NodeMessage(block));
    for (let i = 0; i < this.peers.length; i++) {
      const peer = this.peers[i];
      if (peer !== ignorePeer && peer.readyState === WebSocket.OPEN) {
        peer.send(nodeMessage);
      }
    }
  }
}
export default new App().express;

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

class NodeMessage {
  public version: string = "v1";
  public type: string;
  public payload: string;

  constructor(block: Block) {
    this.type = "new-block";
    this.payload = JSON.stringify(block);
  }
}
