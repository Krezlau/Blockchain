import express, { Request, Response } from "express";
import * as http from "http";
import { WebSocketServer, WebSocket } from "ws";
import { Block, generateNewBlock } from "./block";
import { plainToInstance } from "class-transformer";
import * as swaggerUi from "swagger-ui-express";
import * as fs from "fs";
import * as path from "path";
import * as yaml from "js-yaml";

class App {
  public express: any;
  public peers: WebSocket[] = [];
  public blockChain: Block[] = [Block.genesisBlock];

  constructor() {
    const SERVER_PORT = parseInt(process.env.SERVER_PORT || "42069");
    const PEER_ADDRESSES_STRING = process.env.PEER_ADDRESSES || "";
    const PEER_ADDRESSES: string[] = PEER_ADDRESSES_STRING.split(",")
      .map((addr) => addr.trim())
      .filter((addr) => addr.length > 0);

    this.startServer(SERVER_PORT, PEER_ADDRESSES);
  }

  private async startServer(server_port: number, peer_addresses: string[]) {
    this.express = express();
    this.express.use(express.json());
    const router = express.Router();
    router.all("/", (req, res) => res.send("Hi there!"));
    this.express.use("/", router);
    const swaggerFilePath = path.join(__dirname, "../swagger.yaml");

    // Read the file and parse it
    const swaggerFile = fs.readFileSync(swaggerFilePath, "utf8");
    const swaggerSpec: any = yaml.load(swaggerFile); // 'any' is fine here

    // Dynamically update the server URL based on the port
    swaggerSpec.servers = [
      {
        url: `http://localhost:${server_port}`,
      },
    ];

    // (NEW) Serve Swagger docs at /api-docs
    this.express.use("/swagger", swaggerUi.serve, swaggerUi.setup(swaggerSpec));

    const server = http.createServer(this.express);
    server.listen(server_port, () => {
      console.log(`server up on port ${server_port}`);
    });

    // accept new connections
    const ws = new WebSocketServer({ server });
    ws.on("connection", (wss) => {
      wss.send("hi there from server!");

      wss.on("message", (message: Buffer) => {
        console.log(`client send something: ${message.toString()}`);
        wss.send(`server received message: ${message.toString()}`);

        // convert to message
        let nodeMessage: NodeMessage;
        try {
          const plaintext = message.toString("utf-8");
          const json = JSON.parse(plaintext);
          nodeMessage = plainToInstance(NodeMessage, json);
        } catch {
          console.log("not able to parse message");
          return;
        }

        if (nodeMessage.type === "new-block") {
          // todo verify

          const newBlock: Block = plainToInstance(
            Block,
            JSON.parse(nodeMessage.payload),
          );
          this.broadcastNewBlock(newBlock);
          console.log(newBlock);
        }
      });

      wss.on("close", () => {
        console.log("Server: client disconnected");
      });
    });

    await sleep(2000);

    // connect to peers
    this.peers = peer_addresses.map((port) => {
      const client = new WebSocket(`ws://${port}`);
      client.on("open", async () => {
        console.log(`Connected to the server! ${port}`);

        client.send(`hello from client ${server_port}`);
      });
      return client;
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

  private broadcastNewBlock(block: Block): void {
    this.blockChain.push(block);

    const nodeMessage = JSON.stringify(new NodeMessage(block));
    for (let i = 0; i < this.peers.length; i++) {
      this.peers[i].send(nodeMessage);
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
