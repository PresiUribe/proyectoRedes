const express = require('express');
const morgan = require('morgan');
const cors = require('cors');
const promClient = require('prom-client');
const usuariosRoutes = require('./controllers/usuariosController');

const app = express();

// Middlewares
app.use(cors());
app.use(express.json());
app.use(morgan('combined'));

// Prometheus metrics
promClient.collectDefaultMetrics();
app.get('/metrics', async (req, res) => {
  res.set('Content-Type', promClient.register.contentType);
  res.end(await promClient.register.metrics());
});

// Healthcheck
app.get('/health', (req, res) => res.send('OK'));

// Rutas del microservicio
app.use('/api', usuariosRoutes);

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Usuario MS running on port ${PORT}`));
