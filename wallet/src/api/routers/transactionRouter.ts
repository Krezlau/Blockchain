import { Router } from "express";
import {checkCredits, makeTransaction, mineBlock } from "../controllers/transactionsController";

const transactionRouter: Router = Router();

transactionRouter.post("/create-transaction", makeTransaction);
transactionRouter.post("/check-credits", checkCredits);
transactionRouter.post("/mine", mineBlock);


export default transactionRouter;
