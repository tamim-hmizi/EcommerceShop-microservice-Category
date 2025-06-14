// src/server.js
import express from 'express';
import dotenv from 'dotenv';
import mongoose from 'mongoose';
import categoryRoutes from './routes/categoryRoutes.js';
import { client, httpRequestDurationMicroseconds } from './utils/metrics.js';

dotenv.config();
const app = express();
app.use(express.json());

// Connect to MongoDB
mongoose
  .connect(process.env.MONGO_URI)
  .then(() => console.log('MongoDB connected'))
  .catch((err) => console.log(err));

// Metrics middleware
app.use((req, res, next) => {
  const startHrTime = process.hrtime();

  res.on('finish', () => {
    const elapsedHrTime = process.hrtime(startHrTime);
    const elapsedMs = elapsedHrTime[0] * 1000 + elapsedHrTime[1] / 1e6;

    httpRequestDurationMicroseconds
      .labels(req.method, req.route?.path || req.path, res.statusCode)
      .observe(elapsedMs);
  });

  next();
});

// Route for Prometheus to scrape metrics
app.get('/api/categories/metrics', async (req, res) => {
  res.set('Content-Type', client.register.contentType);
  res.end(await client.register.metrics());
});

// Categories API routes
app.use('/api/categories', categoryRoutes);

// Start server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
