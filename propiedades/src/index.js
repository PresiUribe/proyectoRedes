const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const app = express();

app.use(cors());
app.use(express.json());
app.use(morgan('dev'));

const propiedadesController = require('./controllers/propiedadesController');
app.use(propiedadesController);

app.listen(3002, () => {
	  console.log("Servidor de Propiedades corriendo en el puerto 3002");
});
