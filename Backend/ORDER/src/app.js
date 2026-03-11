import express from "express";
import cookieParser from "cookie-parser";
import orderRouter from "./routes/order.routes.js";


const app = express();

app.use(express.json());
app.use(cookieParser());


app.get('/', (req, res) => {
    res.status(200).json({ message: 'Order Service is running.' });
});


app.use("/api/orders", orderRouter);




export default app;