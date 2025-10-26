import { WebSocket } from "ws";

class Peer {
  public url: string;
  public socket: WebSocket;

  constructor(socket: WebSocket, url: string) {
    this.url = url;
    this.socket = socket;
  }
}

export default Peer;
