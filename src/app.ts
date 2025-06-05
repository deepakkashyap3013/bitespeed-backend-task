import express, { NextFunction, Request, Response } from 'express';
import dotenv from 'dotenv';
import routes from './routes/index';

dotenv.config();

const app = express();

app.use(express.json());

app.get('/health', (req, res) => {
    res.json({ status: 'OK', message: 'Bitespeed Identity Service is running!' });
});

app.use('/api/v1', routes);

app.use((err: any, req: Request, res: Response, next: NextFunction) => {
    console.error(err.stack);
    res.status(500).send('Unexpected error');
});


export default app;
