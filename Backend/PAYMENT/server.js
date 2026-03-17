import dotenv from 'dotenv';
dotenv.config();


import app from './src/app.js';
import { connectDB } from './src/db/db.js';

import { connect } from "./src/broker/borker.js";

connect();



 
const PORT = process.env.PORT || 3004;

connectDB();

app.listen(PORT, () => {
  console.log(`Payment service running on port ${PORT}`);
});