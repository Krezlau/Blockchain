import express from "express";
import * as http from "http";
import { WebSocketServer, WebSocket } from "ws";
import Block from "./block";

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
    const IS_MINER: boolean = parseInt(process.env.IS_MINER || "0") === 1;

    this.startServer(SERVER_PORT, PEER_ADDRESSES, IS_MINER);
  }

  private async startServer(
    server_port: number,
    peer_addresses: string[],
    is_miner: boolean,
  ) {
    this.express = express();
    const router = express.Router();
    router.all("/", (req, res) => res.send("Hi there!"));
    this.express.use("/", router);
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

    while (is_miner) {
      await sleep(5000);

      // create new block
      console.log("creating new block...");

      // broadcast new block
      this.peers[0].send("created");
    }
  }
}
export default new App().express;

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
