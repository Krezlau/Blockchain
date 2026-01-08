import { spawn, ChildProcess } from "child_process";
import * as axios from "axios";
import * as path from "path";
import { ec as EC } from "elliptic";
import * as crypto from "crypto";

const ec = new EC("secp256k1");
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

const keyPairA = ec.genKeyPair();
const walletAddressA = keyPairA.getPublic().encode("hex", false);

const keyPairB = ec.genKeyPair();
const walletAddressB = keyPairB.getPublic().encode("hex", false);

const NODE_A_PORT = 3005;
const NODE_B_PORT = 3006;
const HTTP_URL_A = `http://localhost:${NODE_A_PORT}`;
const HTTP_URL_B = `http://localhost:${NODE_B_PORT}`;

const createTx = (utxoId: string, utxoIndex: number, amountToSpend: number, keyPair: any, senderAddress: string, inputAmount: number = 50) => {
    const tx: any = {
        txIns: [{ txOutId: utxoId, txOutIndex: utxoIndex, signature: "" }],
        txOuts: [
            { address: senderAddress, amount: amountToSpend },
            { address: senderAddress, amount: inputAmount - amountToSpend }
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

test("Isolated nodes with specific chain lengths and mempool", async () => {
    nodeA = await startNode(NODE_A_PORT);
    nodeB = await startNode(NODE_B_PORT);

    console.log("Setting up Node A...");
    await axios.post(`${HTTP_URL_A}/mine`, { minerAddress: walletAddressA }); 
    await sleep(1500);
    
    let chainA_temp = (await axios.get(`${HTTP_URL_A}/blocks`)).data;
    const utxoA1 = chainA_temp[1].data[0].id; 

    const txA1 = createTx(utxoA1, 0, 10, keyPairA, walletAddressA, 50);
    await axios.post(`${HTTP_URL_A}/send-transaction`, { transaction: txA1 });
    await sleep(1500);
    
    await axios.post(`${HTTP_URL_A}/mine`, { minerAddress: walletAddressA });
    await sleep(1500);

    const txA_mempool = createTx(txA1.id, 1, 10, keyPairA, walletAddressA, 40); 
    await axios.post(`${HTTP_URL_A}/send-transaction`, { transaction: txA_mempool });
    await sleep(1500);

    console.log("Setting up Node B...");
    await axios.post(`${HTTP_URL_B}/mine`, { minerAddress: walletAddressB });
    await sleep(1500);
    await axios.post(`${HTTP_URL_B}/mine`, { minerAddress: walletAddressB });
    await sleep(1500);
    
    let chainB_temp = (await axios.get(`${HTTP_URL_B}/blocks`)).data;
    const utxoB2 = chainB_temp[2].data[0].id;

    const txB1 = createTx(utxoB2, 0, 15, keyPairB, walletAddressB, 50);
    await axios.post(`${HTTP_URL_B}/send-transaction`, { transaction: txB1 });
    await sleep(1500);
    
    await axios.post(`${HTTP_URL_B}/mine`, { minerAddress: walletAddressB });
    await sleep(1500);
    
    console.log("✅ State verified. Connecting Node A to Node B...");
    await axios.post(`${HTTP_URL_A}/connect`, { peer: `localhost:${NODE_B_PORT}` });
    await sleep(2000); 

    const finalBlocksA = (await axios.get(`${HTTP_URL_A}/blocks`)).data;
    const finalMempoolA = (await axios.get(`${HTTP_URL_A}/mempool`)).data;

    expect(finalBlocksA.length).toBe(4);
    const allTxsInAChain = finalBlocksA.flatMap((b: any) => b.data).map((t: any) => t.id);
    expect(allTxsInAChain).toContain(txB1.id);
    expect(finalMempoolA.length).toBe(0);

    console.log("✅ SUCCESS: Node A rejected invalid mempool transactions after reorg!");
}, 800000);})