const express = require('express');
const promClient = require('prom-client');

// Create an Express app
const app = express();
const port = 3000;

// Set up Prometheus to collect default metrics
const collectDefaultMetrics = promClient.collectDefaultMetrics;
collectDefaultMetrics();

// Create a custom histogram for tracking request duration
const httpRequestDurationMicroseconds = new promClient.Histogram({
  name: 'http_request_duration_ms',
  help: 'Duration of HTTP requests in ms',
  labelNames: ['method', 'route', 'status_code'],
  buckets: [50, 100, 200, 300, 400, 500] // You can adjust these to fit your needs
});

// Middleware to measure request latency
app.use((req, res, next) => {
  const end = httpRequestDurationMicroseconds.startTimer();
  res.on('finish', () => {
    end({ method: req.method, route: req.route ? req.route.path : '', status_code: res.statusCode });
  });
  next();
});

// Basic endpoint for testing the server
app.get('/', (req, res) => {
  res.send('Hello from Node.js!');
});

// Prometheus metrics endpoint
app.get('/metrics', async (req, res) => {
  try {
    res.set('Content-Type', promClient.register.contentType);
    res.end(await promClient.register.metrics());
  } catch (ex) {
    res.status(500).end(ex);
  }
});

// Start the server
app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});