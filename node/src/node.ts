import express from "express";
import * as http from "http";
import { WebSocketServer, WebSocket } from "ws";
import Block from "./block";

class App {
  public express: any;
  public peers: WebSocket[] = [];
  public blocks: Block[] = [Block.genesisBlock];

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

    // connect as to peers
    this.peers = peer_addresses.map((port) => {
      const client = new WebSocket(`ws://${port}`);
      client.on("open", () => {
        console.log(`Connected to the server! ${port}`);

        client.send(`hello from client ${server_port}`);
      });
      return client;
    });
  }
}
export default new App().express;

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
