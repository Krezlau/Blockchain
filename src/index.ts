import express from "express";
import dotenv from "dotenv";
import { router } from "./api/router";

dotenv.config();

const app = express();
app.use(express.json());
app.use("/api", router);

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🚀 Server runs on http://localhost:${PORT}`);
});
