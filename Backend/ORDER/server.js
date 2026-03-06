import dotenv from "dotenv";
dotenv.config();

import app from "./src/app.js";
import {connectDB} from "./src/db/db.js";


const PORT = process.env.PORT || 3003;

connectDB();



app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});

