import Block from "./block";

class NodeMessage {
  public version: string = "v1";
  public type: NodeMessageType;
  public payload: string;

  private constructor(version: string, type: NodeMessageType, payload: any) {
    this.version = version;
    this.type = type;
    this.payload = payload;
  }

  public static newBlock(block: Block) {
    return new NodeMessage("v1", NodeMessageType.NewBlock, JSON.stringify(block));
  }

  public static hello(message: string) {
    return new NodeMessage("v1", NodeMessageType.Hello, message);
  }

  public static fromJson(json: string) {
    const parsed = JSON.parse(json);

    return new NodeMessage(parsed.version, parsed.type, parsed.payload);
  }

  public toJson() {
    return JSON.stringify(this);
  }
}

enum NodeMessageType {
  NewBlock = "new-block",
  Hello = "hello",
}

export default NodeMessage;
