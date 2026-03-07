
import express from "express";
import cookieParser from "cookie-parser";
import paymentRoutes from "./routes/payment.route.js";


const app = express();

app.use(express.json());
app.use(cookieParser());


app.use("/api/payments", paymentRoutes);




export default app;