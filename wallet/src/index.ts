import express from "express";
import dotenv from "dotenv";
import { mainRouter } from "./api/routers/mainRouter";

dotenv.config();

const app = express();
app.use(express.json());
app.use("/api", mainRouter);

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server runs on http://localhost:${PORT} 🔥🔥🔥`);
});
