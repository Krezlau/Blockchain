import { Router } from "express";
import { HelloDto } from "./dto/HelloDto";

export const router = Router();

router.get("/hello", (req, res) => {
  const helloDto = new HelloDto("hello world");
  return res.json(helloDto);
});
