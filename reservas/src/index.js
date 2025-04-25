const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const app = express();

app.use(cors());
app.use(express.json());
app.use(morgan('dev'));

const reservasController = require('./controllers/reservasController');
app.use(reservasController);

app.listen(3004, () => {
	  console.log("Servidor de Reservas corriendo en el puerto 3004");
});

