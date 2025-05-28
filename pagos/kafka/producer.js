// producer.js
const { Kafka } = require('kafkajs');

const kafka = new Kafka({
  brokers: [ process.env.KAFKA_BROKER || 'kafka:9092' ]
});
const producer = kafka.producer();

async function sendPago(pago) {
  // conecta solo la primera vez
  if (!producer.isConnected) {
    await producer.connect();
    producer.isConnected = true;
  }
  await producer.send({
    topic: 'pagos',
    messages: [
      { key: pago.payment_id, value: JSON.stringify(pago) }
    ]
  });
}

module.exports = { sendPago };
