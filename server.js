const express = require('express');
const promClient = require('prom-client');
const axios = require('axios');
require('dotenv').config();
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
  buckets: [1, 50, 100, 200, 300, 400, 500]
});

// Middleware to measure request latency, includes metrics for dynatrace
app.use((req, res, next) => {
  const end = httpRequestDurationMicroseconds.startTimer();

  res.on('finish', () => {
    const route = req.route?.path || req._parsedUrl.pathname || 'unknown';
    end({ method: req.method, route: route, status_code: res.statusCode });

    // Push metrics to Dynatrace (Custom Metric)
    pushMetricsToDynatrace(route, req.method, res.statusCode);
  });

  next();
});

// Basic endpoint for testing the server
app.get('/', (req, res) => {
  res.send('Hi this is interview-app!');
});

// 1. Prometheus default metrics endpoint
app.get('/metrics', async (req, res) => {
  try {
    res.set('Content-Type', promClient.register.contentType);
    res.end(await promClient.register.metrics());
  } catch (ex) {
    res.status(500).end(ex);
  }
});

// 2. response time between 50ms and 200ms
app.get('/lag', async (req, res) => {
  const delay = Math.floor(Math.random() * 150) + 50;
  setTimeout(() => {
    res.send(`Lag delay of ${delay}ms`);
    sendBusinessEvent(
      'Laggy endpoint: /lag',
      'HIGH', 
      `Lag delay of ${delay}ms observed at endpoint /lag`
    );
  }, delay);
});

// 3. Bad endpoint to simulate an error
app.get('/bad', (req, res) => {
  res.status(500).send('Internal Server Error');
  sendBusinessEvent('Internal Server Error', 'ERROR', 'Issue with /bad');
});

async function pushMetricsToDynatrace(route, method, statusCode) {
  const dtApiUrl = process.env.DYNATRACE_API_URL;
  const apiToken = process.env.DYNATRACE_API_TOKEN;

  // Build metric in Dynatrace line protocol format
  const metricLine = `custom.http_request_duration_ms,method=${method},route=${route},status_code=${statusCode} gauge,5`;

  try {
    const response = await axios.post(`${dtApiUrl}/api/v2/metrics/ingest`, metricLine, {
      headers: {
        'Authorization': `Api-Token ${apiToken}`,
        'Content-Type': 'text/plain'
      }
    });

    console.log('Metric successfully pushed to Dynatrace');
    console.log('Response Status:', response.status);
  } catch (error) {
    console.error('Error pushing metric to Dynatrace:', error.message);
    if (error.response) {
      console.error('Error Response Status:', error.response.status);
      console.error('Error Response Data:', error.response.data);
    }
  }
}


// Function to send a Business Event to Dynatrace (for errors, high latency, etc.)
async function sendBusinessEvent(eventName, severity, description) {
  const dtApiUrl = process.env.DYNATRACE_API_URL; // Use environment variable for Dynatrace API URL
  const apiToken = process.env.DYNATRACE_API_TOKEN; // Use environment variable for Dynatrace API token

  const eventData = {
    eventType: 'CUSTOM_ANNOTATION', // Event type (can be customized)
    source: 'interview-app',
    start: Date.now(),
    end: Date.now(),
    severity: severity, //'ERROR', 'INFO', 'HIGH'
    title: eventName,
    description: description,
  };

  try {
    await axios.post(`${dtApiUrl}/api/v2/events/ingest`, eventData, {
      headers: {
        'Authorization': `Api-Token ${apiToken}`,
        'Content-Type': 'application/json'
      }
    });
    console.log('Business event successfully sent to Dynatrace');
  } catch (error) {
    console.error('Error sending business event to Dynatrace:', error.message);
  }
}

// Start the server
app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});