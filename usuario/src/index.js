const express = require('express');
const cors = require('cors');
const promClient = require('prom-client');
const usuariosRouter = require('./controllers/usuariosController');

const app = express();
const register = new promClient.Registry();

app.use(cors());

// Métricas por defecto del proceso (CPU, memoria, GC, event loop)
promClient.collectDefaultMetrics({ register });

// Histograma para latencias HTTP
const httpHistogram = new promClient.Histogram({
  name: 'http_request_duration_seconds',
  help: 'Duración de las solicitudes HTTP en segundos',
  labelNames: ['method', 'route', 'status_code'],
  buckets: [0.005, 0.01, 0.05, 0.1, 0.3, 1, 5]
});
register.registerMetric(httpHistogram);

// Middleware para medir latencia
app.use((req, res, next) => {
  const end = httpHistogram.startTimer({ method: req.method, route: req.path });
  res.on('finish', () => {
    end({ status_code: res.statusCode });
  });
  next();
});

app.use(express.json());

// Métricas exporters
app.get('/metrics', async (req, res) => {
  res.set('Content-Type', register.contentType);
  res.end(await register.metrics());
});

// Rutas
app.use('/', usuariosRouter);

// Healthcheck
app.get('/health', (req, res) => res.status(200).send('OK'));

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`User service listening on ${PORT}`));
