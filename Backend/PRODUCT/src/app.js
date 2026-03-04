import express from 'express';
import cookieParser from 'cookie-parser';
import productRoutes from './routes/product.routes.js';


const app = express();


app.use(express.json());
app.use(cookieParser());


app.use('/api/products', productRoutes);



export default app;