import { Router } from "express";
import { checkCredits, makeTransaction, mineBlock } from "../controllers/transactionsController";

const transactionRouter: Router = Router();

transactionRouter.post("/make-transaction", makeTransaction);
transactionRouter.post("/check-credits", checkCredits);
transactionRouter.post("/mine-block", mineBlock);

export default transactionRouter;
