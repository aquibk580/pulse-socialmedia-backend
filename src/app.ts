import express, { Express } from "express";
import userRoutes from "./routes/user/index.js";
import testRoutes from "./routes/test/index.js";

const PORT = 8000;
const app: Express = express();

app.use("/user", userRoutes);
app.use("/test", testRoutes);

app.listen(PORT, (err) => {
  console.log(`Server is listening on port ${PORT}`);
});
