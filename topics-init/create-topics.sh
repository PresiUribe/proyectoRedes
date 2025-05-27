#!/bin/bash
set -e

echo "⏳ Esperando a que Kafka arranque…"
until kafka-topics.sh --bootstrap-server localhost:9092 --list &>/dev/null; do
  sleep 1
done

echo "✅ Creando topics…"
kafka-topics.sh --bootstrap-server localhost:9092 \
  --create --topic pagos \
  --partitions 1 --replication-factor 1 \
  --if-not-exists

kafka-topics.sh --bootstrap-server localhost:9092 \
  --create --topic reservas \
  --partitions 1 --replication-factor 1 \
  --if-not-exists

echo "🎉 Topics creados."
# el entrypoint original de Bitnami continúa y arranca el broker
