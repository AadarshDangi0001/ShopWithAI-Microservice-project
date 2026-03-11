import express from 'express';
import cookieParser from 'cookie-parser';

const app = express();


app.use(express.json());
app.use(cookieParser());


app.get('/', (req, res) => {
    res.status(200).json({ message: 'AI-BUDDY Service is running.' });
});


export default app;