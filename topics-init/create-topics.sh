#!/bin/bash
set -e

echo "⏳ Esperando a que Kafka arranque…"
until kafka-topics.sh --bootstrap-server kafka:9092 --list &>/dev/null; do
  sleep 1
done

echo "✅ Creando topics de eventos…"
kafka-topics.sh --bootstrap-server kafka:9092 \
  --create --topic pagos-eventos \
  --partitions 1 --replication-factor 1 \
  --if-not-exists

kafka-topics.sh --bootstrap-server kafka:9092 \
  --create --topic fechas-eventos \
  --partitions 1 --replication-factor 1 \
  --if-not-exists

echo "✅ Creando topics de salida (opcional)…"
kafka-topics.sh --bootstrap-server kafka:9092 \
  --create --topic avg-precio-por-fecha \
  --partitions 1 --replication-factor 1 \
  --if-not-exists

kafka-topics.sh --bootstrap-server kafka:9092 \
  --create --topic conteo-reservas-por-fecha \
  --partitions 1 --replication-factor 1 \
  --if-not-exists

echo "🎉 Topics creados correctamente."
# El entrypoint original de Bitnami continúa y arranca el broker
