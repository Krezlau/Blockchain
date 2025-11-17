import { Router } from "express";
import { signData, verifySignature } from "../controllers/encryptionTestController";

const encryptionTestRouter: Router = Router();

encryptionTestRouter.post("/sign-data", signData);
encryptionTestRouter.post("/decrypt-data", verifySignature);

export default encryptionTestRouter;
