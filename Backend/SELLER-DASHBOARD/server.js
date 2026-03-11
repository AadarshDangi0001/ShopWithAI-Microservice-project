import dotenv from 'dotenv';
dotenv.config();

import app from './src/app.js';
import { connectDB } from './src/db/db.js';
import { connect } from './src/broker/broker.js';
import listener from './src/broker/listenser.js';

const PORT = process.env.PORT || 3007;

connectDB();

connect().then(() => {
    listener();
})

app.listen(PORT, () => {
    console.log(`Seller service is running on port ${PORT}`);
});