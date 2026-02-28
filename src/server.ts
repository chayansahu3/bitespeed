import express from 'express';
import cors from 'cors';
import { identifyRouter } from './routes/identify';
import { initDb } from './db';

export function createServer() {
  const app = express();

  // Initialize database (runs migrations if needed)
  initDb();

  app.use(cors());
  app.use(express.json());

  app.get('/', (_req, res) => {
    res.json({ status: 'ok', message: 'Bitespeed Identity Reconciliation API' });
  });

  app.use('/identify', identifyRouter);

  return app;
}

