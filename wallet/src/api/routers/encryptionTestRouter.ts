import { Router } from "express";
import { decryptData, encryptData } from "../controllers/encryptionTestController";

const encryptionTestRouter: Router = Router();

encryptionTestRouter.post("/encrypt-data", encryptData);
encryptionTestRouter.post("/decrypt-data", decryptData);

export default encryptionTestRouter;
