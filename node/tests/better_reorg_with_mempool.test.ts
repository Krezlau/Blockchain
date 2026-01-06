import { spawn, ChildProcess } from "child_process";
import * as axios from "axios";
import * as path from "path";
import { ec as EC } from "elliptic";
import * as crypto from "crypto";

const ec = new EC("secp256k1");
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

const privateKey = "0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef";
const keyPair = ec.keyFromPrivate(privateKey);
const walletAddress = keyPair.getPublic().encode("hex", false);

const NODE_A_PORT = 3005;
const NODE_B_PORT = 3006;
const HTTP_URL_A = `http://localhost:${NODE_A_PORT}`;
const HTTP_URL_B = `http://localhost:${NODE_B_PORT}`;

const createTx = (utxoId: string, utxoIndex: number, amountToSpend: number, inputAmount: number = 50) => {
    const tx: any = {
        txIns: [{ txOutId: utxoId, txOutIndex: utxoIndex, signature: "" }],
        txOuts: [
            { address: walletAddress, amount: amountToSpend },
            { address: walletAddress, amount: inputAmount - amountToSpend }
        ]
    };

    const txInContent = tx.txIns.map((i: any) => i.txOutId + i.txOutIndex).join("");
    const txOutContent = tx.txOuts.map((o: any) => o.address + o.amount).join("");
    
    tx.id = crypto.createHash("sha256").update(txInContent + txOutContent).digest("hex");
    tx.txIns[0].signature = keyPair.sign(tx.id).toDER("hex");
    return tx;
};

describe("Blockchain Advanced Reorg & Mempool Recovery", () => {
    let nodeA: ChildProcess, nodeB: ChildProcess;

    const startNode = async (port: number) => {
        const p = spawn("npx", ["ts-node", path.resolve(__dirname, "../src/node.ts")], {
            env: { ...process.env, SERVER_PORT: port.toString(), PEER_ADDRESSES: "", SERVER_NAME: "localhost" },
            shell: true,
            stdio:"inherit"
        });
        for (let i = 0; i < 20; i++) {
            try { await axios.get(`http://localhost:${port}/blocks`); return p; } 
            catch { await sleep(500); }
        }
        throw "Node failed";
    };

    afterEach(async () => {
        nodeA?.kill(); nodeB?.kill();
        await sleep(1000);
    });

    //   let nodeA: ChildProcess;
    //   let nodeB: ChildProcess;
    
    //   const execCommand = "npx";
    //   const execArgs = ["ts-node", path.resolve(__dirname, "../src/node.ts")];
    
    //   const startNode = async (port: number): Promise<ChildProcess> => {
    //     const env = {
    //       ...process.env,
    //       SERVER_PORT: port.toString(),
    //       PEER_ADDRESSES: "",
    //       SERVER_NAME: "localhost",
    //     };
    
    //     const processInstance = spawn(execCommand, execArgs, { env, stdio: "pipe" });
    
    //     //processInstance.stdout?.on("data", (d) => console.log(`[Node ${port}]: ${d}`));
    
    //     let attempts = 0;
    //     while (attempts < 20) {
    //       try {
    //         await axios.get(`http://localhost:${port}/blocks`);
    //         return processInstance;
    //       } catch (e) {
    //         await sleep(500);
    //         attempts++;
    //       }
    //     }
    //     throw new Error(`Node on port ${port} failed to start`);
    //   };
    
    //   afterEach(async () => {
    //     if (nodeA) nodeA.kill();
    //     if (nodeB) nodeB.kill();
    //     await sleep(1000);
    //   });

test("Isolated nodes with specific chain lengths and mempool", async () => {
    nodeA = await startNode(NODE_A_PORT);
    nodeB = await startNode(NODE_B_PORT);

    console.log("Setting up Node A...");
    
    await axios.post(`${HTTP_URL_A}/mine`, { minerAddress: walletAddress }); 
    await sleep(1500);
    
    let chainA_temp = (await axios.get(`${HTTP_URL_A}/blocks`)).data;
    const utxoA1 = chainA_temp[1].data[0].id; 

    const txA1 = createTx(utxoA1, 0, 10, 50);
    await axios.post(`${HTTP_URL_A}/send-transaction`, { transaction: txA1 });
    await sleep(1500);
    
    await axios.post(`${HTTP_URL_A}/mine`, { minerAddress: walletAddress });
    await sleep(1500);

    const txA_mempool = createTx(txA1.id, 1, 10, 40); 
    await axios.post(`${HTTP_URL_A}/send-transaction`, { transaction: txA_mempool });
    await sleep(1500);

    console.log("Setting up Node B...");
    
    await axios.post(`${HTTP_URL_B}/mine`, { minerAddress: walletAddress });
    await sleep(1500);
    await axios.post(`${HTTP_URL_B}/mine`, { minerAddress: walletAddress });
    await sleep(1500);
    
    let chainB_temp = (await axios.get(`${HTTP_URL_B}/blocks`)).data;
    const utxoB2 = chainB_temp[2].data[0].id;

    const txB1 = createTx(utxoB2, 0, 15,);
    await axios.post(`${HTTP_URL_B}/send-transaction`, { transaction: txB1 });
    await sleep(1500);
    
    await axios.post(`${HTTP_URL_B}/mine`, { minerAddress: walletAddress });
    await sleep(1500);
    
    console.log("✅ State verified with logs. Ready for potential connect!");

    console.log("5. Connecting Node A to Node B to trigger Reorg...");
    await axios.post(`${HTTP_URL_A}/connect`, { peer: `localhost:${NODE_B_PORT}` });
    await sleep(5000); 

    const finalBlocksA = (await axios.get(`${HTTP_URL_A}/blocks`)).data;
    const finalMempoolA = (await axios.get(`${HTTP_URL_A}/mempool`)).data;

    console.log("*** Final Blocks_A (After Reorg) ***");
    console.log(`Length: ${finalBlocksA.length}`);
    
    console.log("*** Final Mempool_A (After Reorg) ***");
    console.log(JSON.stringify(finalMempoolA, null, 2));

    expect(finalBlocksA.length).toBe(4);
    const allTxsInAChain = finalBlocksA.flatMap((b: any) => b.data).map((t: any) => t.id);
    expect(allTxsInAChain).toContain(txB1.id);
    const mempoolIds = finalMempoolA.map((t: any) => t.id);
    expect(mempoolIds).toContain(txA1.id);
    expect(mempoolIds).toContain(txA_mempool.id);
    expect(finalMempoolA.length).toBe(2);

    console.log("✅ SUCCESS: Node A adopted Node B's chain, recovered txA1 and kept txA_mempool!");
}, 800000);})