import { Router } from "express";
import {makeTransaction } from "../controllers/transactionsController";

const transactionRouter: Router = Router();

transactionRouter.post("/create-transaction", makeTransaction);

export default transactionRouter;
