
import express from "express";
import cookieParser from "cookie-parser";
import paymentRoutes from "./routes/payment.route.js";


const app = express();

app.use(express.json());
app.use(cookieParser());


app.get('/', (req, res) => {
    res.status(200).json({ message: 'Payment Service is running.' });
});


app.use("/api/payments", paymentRoutes);




export default app;