"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const http = __importStar(require("http"));
const ws_1 = require("ws");
class App {
    express;
    peers = [];
    constructor() {
        const SERVER_PORT = parseInt(process.env.SERVER_PORT || "42069");
        const PEER_ADDRESSES_STRING = process.env.PEER_ADDRESSES || "";
        const PEER_ADDRESSES = PEER_ADDRESSES_STRING.split(",")
            .map((addr) => addr.trim())
            .filter((addr) => addr.length > 0);
        this.startServer(SERVER_PORT, PEER_ADDRESSES);
    }
    startServer(port, peer_addresses) {
        this.express = (0, express_1.default)();
        const router = express_1.default.Router();
        router.all("/", (req, res) => res.send("Hi there!"));
        this.express.use("/", router);
        const server = http.createServer(this.express);
        server.listen(port, () => {
            console.log("lmao");
        });
        // connect as to peers
        this.peers = peer_addresses.map((port) => {
            const client = new ws_1.WebSocket(`ws://${port}`);
            client.on("open", () => {
                console.log("Connected to the server!");
                client.send("hello!");
            });
            return client;
        });
        // accept new connections
        const ws = new ws_1.WebSocketServer({ server });
        ws.on("connection", (wss) => {
            console.log("client connected");
            wss.send("hi there!");
            wss.on("message", (message) => {
                console.log(`client send something: ${message.toString()}`);
                wss.send(`received message: ${message.toString()}`);
            });
            wss.on("close", () => {
                console.log("Server: client disconnected");
            });
        });
    }
}
exports.default = new App().express;
