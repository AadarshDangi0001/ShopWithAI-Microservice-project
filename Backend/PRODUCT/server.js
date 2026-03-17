import dotenv from 'dotenv';
dotenv.config();

import app from './src/app.js';
import { connectDB } from './src/db/db.js';
import { connect } from "./src/broker/borker.js";

connectDB();
connect();

const PORT = process.env.PORT || 3001;

app.listen(PORT, () => {
  console.log(`Product service running on port ${PORT}`);
});