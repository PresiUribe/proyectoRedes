const express = require('express');
const cors = require('cors');
const promClient = require('prom-client');
const propiedadesRouter = require('./controllers/propiedadesController');

const app = express();
const register = new promClient.Registry();

app.use(cors());
app.use(express.json());

// Métricas
promClient.collectDefaultMetrics({ register });
const httpHistogramProp = new promClient.Histogram({
  name: 'http_request_duration_seconds',
  help: 'Duración de las solicitudes HTTP en segundos',
  labelNames: ['method', 'route', 'status_code'],
  buckets: [0.005, 0.01, 0.05, 0.1, 0.3, 1, 5]
});
register.registerMetric(httpHistogramProp);
app.use((req, res, next) => {
  const end = httpHistogramProp.startTimer({ method: req.method, route: req.path });
  res.on('finish', () => end({ status_code: res.statusCode }));
  next();
});

// Exporter de métricas
app.get('/metrics', async (req, res) => {
  res.set('Content-Type', register.contentType);
  res.end(await register.metrics());
});

// Rutas
app.use('/', propiedadesRouter);
app.get('/propiedades/health', (req, res) => res.status(200).send('OK'));

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Propiedades service listening on ${PORT}`));
