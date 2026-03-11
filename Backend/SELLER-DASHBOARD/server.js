import dotenv from 'dotenv';
dotenv.config();

import app from './src/app.js';
import { connectDB } from './src/db/db.js';

const PORT = process.env.PORT || 3007;

connectDB();

connect().then(() => {
    listener();
})

app.listen(PORT, () => {
    console.log(`Seller service is running on port ${PORT}`);
});