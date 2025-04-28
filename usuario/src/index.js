// src/index.js
const express = require('express');
const promClient = require('prom-client');
const usuariosRouter = require('./controllers/usuariosController');

const app = express();
const register = new promClient.Registry();

// Middlewares
app.use(express.json());

// Métricas Prometheus (si usas prom-client)
promClient.collectDefaultMetrics({ register });
app.get('/metrics', async (req, res) => {
  res.set('Content-Type', register.contentType);
  res.end(await register.metrics());
});

// Rutas de usuario
app.use('/', usuariosRouter);

// Healthcheck
app.get('/health', (req, res) => {
  res.status(200).send('OK');
});

// Arrancar servidor
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Usuario service listening on port ${PORT}`);
});
