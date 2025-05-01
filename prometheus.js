const express = require('express');
const promClient = require('prom-client');

// Create an Express app
const app = express();
const port = 3000;

// Set up Prometheus to collect default metrics
const collectDefaultMetrics = promClient.collectDefaultMetrics;
collectDefaultMetrics();

// Create a custom histogram for tracking request duration (<50,<100,<200)
const httpRequestDurationMicroseconds = new promClient.Histogram({
  name: 'http_request_duration_ms',
  help: 'Duration of HTTP requests in ms',
  labelNames: ['method', 'route', 'status_code'],
  buckets: [50, 100, 200, 300, 400, 500]
});

// Middleware to measure request latency
app.use((req, res, next) => {
  const end = httpRequestDurationMicroseconds.startTimer();

  res.on('finish', () => {
    const route = req.route?.path || req._parsedUrl.pathname || 'unknown';
    end({ method: req.method, route: route, status_code: res.statusCode });
  });

  next();
});

// Basic endpoint for testing the server
app.get('/', (req, res) => {
  res.send('Hi this is interview-app!');
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

  // response time between 50ms and 500ms
app.get('/lag', async (req, res) => {
  const delay = Math.floor(Math.random() * 150) + 50;

  setTimeout(() => {
    res.send(`Lag delay of ${delay}ms`);
  }, delay);
});

// Bad endpoint to simulate an error
app.get('/bad', (req, res) => {
  res.status(500).send('Internal Server Error');
});
// Start the server
app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});