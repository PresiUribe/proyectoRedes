const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const app = express();

app.use(cors());
app.use(express.json());
app.use(morgan('dev'));

const pagosController = require('./controllers/pagosController');
app.use(pagosController);

app.listen(3003, () => {
	  console.log("Servidor de Pagos corriendo en el puerto 3003");
});
