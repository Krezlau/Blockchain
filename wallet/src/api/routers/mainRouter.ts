import { Router } from "express";
import { HelloDto } from "../dtos/HelloDto";
import createIdentityRouter from "./createIdentityRouter";
import encryptionTestRouter from "./encryptionTestRouter";
import transactionRouter from "./transactionRouter";

export const mainRouter = Router();

mainRouter.use("", createIdentityRouter);
mainRouter.use("", encryptionTestRouter);
mainRouter.use("", transactionRouter)

mainRouter.get("/hello", (req, res) => {
  const helloDto = new HelloDto("hello world");
  return res.json(helloDto);
});
