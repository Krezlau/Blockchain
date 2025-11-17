import express from "express";
import dotenv from "dotenv";
import { mainRouter } from "./api/routers/mainRouter";
import swaggerJSDoc from "swagger-jsdoc";
import swaggerUi from "swagger-ui-express";
import { swaggerOptions } from "./config/swagger";

dotenv.config();

const app = express();
app.use(express.json());
app.use("/api", mainRouter);
const PORT = process.env.PORT || 8081;

const swaggerDocs = swaggerJSDoc(swaggerOptions);
app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(swaggerDocs));

app.listen(PORT, () => {
  console.log(`Server runs on http://localhost:${PORT} 🔥🔥🔥`);
});
