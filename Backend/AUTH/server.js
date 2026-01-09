import dotenv from "dotenv";
dotenv.config();
import app from "./src/app.js";
import { connectDB } from "./src/db/db.js";


connectDB();

app.listen(3000, () => {
  console.log("Auth service is running on port 3000");
});