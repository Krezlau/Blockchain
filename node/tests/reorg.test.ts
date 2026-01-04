import { spawn, ChildProcess } from "child_process";
import * as axios from "axios";
import * as path from "path";

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

const NODE_A_PORT = 3001;
const NODE_B_PORT = 3002;
const HTTP_URL_A = `http://localhost:${NODE_A_PORT}`;
const HTTP_URL_B = `http://localhost:${NODE_B_PORT}`;

describe("Blockchain Network Integration Tests", () => {
  let nodeA: ChildProcess;
  let nodeB: ChildProcess;

  const execCommand = "npx";
  const execArgs = ["ts-node", path.resolve(__dirname, "../src/node.ts")];

  const startNode = async (port: number): Promise<ChildProcess> => {
    const env = {
      ...process.env,
      SERVER_PORT: port.toString(),
      PEER_ADDRESSES: "",
      SERVER_NAME: "localhost",
    };

    const processInstance = spawn(execCommand, execArgs, { env, stdio: "pipe" });

    // processInstance.stdout?.on("data", (d) => console.log(`[Node ${port}]: ${d}`));

    let attempts = 0;
    while (attempts < 20) {
      try {
        await axios.get(`http://localhost:${port}/blocks`);
        return processInstance;
      } catch (e) {
        await sleep(500);
        attempts++;
      }
    }
    throw new Error(`Node on port ${port} failed to start`);
  };

  afterEach(async () => {
    if (nodeA) nodeA.kill();
    if (nodeB) nodeB.kill();
    await sleep(1000);
  });

  test("Should resolve a fork using Longest Chain Rule (Reorg in memory)", async () => {
    console.log("Starting nodes...");
    nodeA = await startNode(NODE_A_PORT);
    nodeB = await startNode(NODE_B_PORT);

    console.log("Creating Fork...");
    await axios.post(`${HTTP_URL_A}/mine`, { minerAddress: "MinerA" });
    await axios.post(`${HTTP_URL_B}/mine`, { minerAddress: "MinerB" });

    const chainA = (await axios.get(`${HTTP_URL_A}/blocks`)).data;
    const chainB = (await axios.get(`${HTTP_URL_B}/blocks`)).data;

    expect(chainA.length).toBe(2);
    expect(chainB.length).toBe(2);
    expect(chainA[1].hash).not.toBe(chainB[1].hash);

    console.log(
      `Fork active. A-Tip: ${chainA[1].hash.substring(0, 5)}, B-Tip: ${chainB[1].hash.substring(0, 5)}`
    );

    console.log("Extending chain A...");
    await axios.post(`${HTTP_URL_A}/mine`, { minerAddress: "MinerA" });

    const chainA_Updated = (await axios.get(`${HTTP_URL_A}/blocks`)).data;
    expect(chainA_Updated.length).toBe(3);

    console.log("Connecting Node B -> Node A...");
    await axios.post(`${HTTP_URL_B}/connect`, { peer: `localhost:${NODE_A_PORT}` });

    await sleep(2000);

    const chainB_Final = (await axios.get(`${HTTP_URL_B}/blocks`)).data;

    console.log("Verifying convergence...");

    expect(chainB_Final.length).toBe(3);

    expect(chainB_Final[2].hash).toBe(chainA_Updated[2].hash);

    expect(chainB_Final[1].hash).toBe(chainA_Updated[1].hash);
    expect(chainB_Final[1].hash).not.toBe(chainB[1].hash);
  }, 30000);
});
