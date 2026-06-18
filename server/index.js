import express from "express";

import { getNetwork } from "./dao/networkDao.js";

const app = express();
const port = 3001;

app.use(express.json());

app.get("/api/network", async (req, res, next) => {
  try {
    const network = await getNetwork();
    res.json(network)
  }
  catch (err) {
    next(err)
}});

app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({
    error: "INTERNAL_SERVER_ERROR",
    message: "Unexpected server error.",
  });
});

app.listen(port, () => {
  console.log(`Server listening at http://localhost:${port}`);
});
