import { Router } from "express";
import { createIdentity } from "../controllers/createIndentityController";

const createIdentityRouter: Router = Router();

createIdentityRouter.post("/create-identity", createIdentity);

export default createIdentityRouter;
