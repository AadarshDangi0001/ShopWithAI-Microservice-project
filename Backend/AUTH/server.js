import dotenv from "dotenv";
dotenv.config();
import app from "./src/app.js";
import { connectDB } from "./src/db/db.js";
import { connect } from "./src/broker/borker.js";

connect();


connectDB();

app.listen(3000, () => {
  console.log("Auth service is running on port 3000");
});