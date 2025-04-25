const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const app = express();

app.use(cors());
app.use(express.json());
app.use(morgan('dev'));

const usuariosController = require('./controllers/usuariosController');
app.use(usuariosController);

app.listen(3001, () => {
	  console.log("Servidor de Usuarios corriendo en el puerto 3001");
});
