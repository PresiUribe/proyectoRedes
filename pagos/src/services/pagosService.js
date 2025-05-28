const PagoModel   = require('../models/pagosModel');
const { sendPago } = require('../kafka/producer');

async function crearPago(data) {
  // 1) guardo en BD
  const pago = await PagoModel.create(data);
  // 2) publico en Kafka
  await sendPago(pago);
  return pago;
}

module.exports = { crearPago };
