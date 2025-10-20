import { Router } from "express";
import { HelloDto } from "../dtos/HelloDto";
import createIdentityRouter from "./createIdentityRouter";
import encryptionTestRouter from "./encryptionTestRouter";

export const mainRouter = Router();

mainRouter.use("", createIdentityRouter);
mainRouter.use("", encryptionTestRouter);

mainRouter.get("/hello", (req, res) => {
  const helloDto = new HelloDto("hello world");
  return res.json(helloDto);
});
