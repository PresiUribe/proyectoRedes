package com.ejemplo;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.apache.kafka.common.serialization.Serdes;
import org.apache.kafka.streams.*;
import org.apache.kafka.streams.kstream.*;
import org.apache.kafka.streams.state.KeyValueStore;
import org.apache.kafka.common.utils.Bytes;

import java.time.Instant;
import java.time.ZoneId;
import java.time.format.DateTimeFormatter;
import java.util.Properties;
import java.util.concurrent.CountDownLatch;

public class StreamingApp {
    public static void main(String[] args) {
        final String pagosTopic    = "pagos-eventos";
        final String reservasTopic = "fechas-eventos";
        final String avgTopic      = "avg-precio-por-fecha";
        final String cntTopic      = "conteo-reservas-por-fecha";

        Properties props = new Properties();
        props.put(StreamsConfig.APPLICATION_ID_CONFIG, System.getenv("APPLICATION_ID"));
        props.put(StreamsConfig.BOOTSTRAP_SERVERS_CONFIG, System.getenv("BOOTSTRAP_SERVERS"));
        props.put(StreamsConfig.DEFAULT_KEY_SERDE_CLASS_CONFIG, Serdes.StringSerde.class);
        props.put(StreamsConfig.DEFAULT_VALUE_SERDE_CLASS_CONFIG, Serdes.StringSerde.class);

        StreamsBuilder builder = new StreamsBuilder();
        ObjectMapper mapper = new ObjectMapper();
        DateTimeFormatter fmt = DateTimeFormatter.ofPattern("yyyy-MM-dd")
                                                 .withZone(ZoneId.of("UTC"));

        // 1) Promedio de pagos por fecha
        KStream<String, String> pagos = builder.stream(pagosTopic);
        KTable<String, Double> avgByDate = pagos
            .map((key, value) -> {
                try {
                    JsonNode j = mapper.readTree(value);
                    // Extrae fecha del timestamp del evento
                    String date = fmt.format(Instant.parse(j.get("timestamp").asText()));
                    double amount = j.get("monto").asDouble();
                    return KeyValue.pair(date, amount);
                } catch (Exception e) {
                    throw new RuntimeException("Error parsing mensaje de pagos", e);
                }
            })
            .groupByKey(Grouped.with(Serdes.String(), Serdes.Double()))
            .aggregate(
                () -> new double[]{0.0, 0.0},                   // [suma, conteo]
                (date, amt, agg) -> new double[]{agg[0] + amt, agg[1] + 1},
                Materialized
                  .<String, double[], KeyValueStore<Bytes, byte[]>>as("avg-store")
                  .withKeySerde(Serdes.String())
                  .withValueSerde(Serdes.serdeFrom(new ArraySerializer(), new ArrayDeserializer()))
            )
            .mapValues(arr -> arr[1] == 0.0 ? 0.0 : arr[0] / arr[1]);

        avgByDate.toStream()
                 .mapValues(Object::toString)
                 .to(avgTopic, Produced.with(Serdes.String(), Serdes.String()));

        // 2) Conteo de reservas por fecha
        KStream<String, String> reservas = builder.stream(reservasTopic);
        KTable<String, Long> cntByDate = reservas
            .map((key, value) -> {
                try {
                    JsonNode j = mapper.readTree(value);
                    // Extrae la fecha elegida directamente
                    String date = j.get("fecha_elegida").asText();
                    return KeyValue.pair(date, date);
                } catch (Exception e) {
                    throw new RuntimeException("Error parsing mensaje de reservas", e);
                }
            })
            .groupByKey(Grouped.with(Serdes.String(), Serdes.String()))
            .count(Materialized
                .<String, Long, KeyValueStore<Bytes, byte[]>>as("cnt-store")
                .withKeySerde(Serdes.String())
                .withValueSerde(Serdes.Long())
            );

        cntByDate.toStream()
                  .mapValues(Object::toString)
                  .to(cntTopic, Produced.with(Serdes.String(), Serdes.String()));

        // 3) Arrancar el motor de Streams
        KafkaStreams streams = new KafkaStreams(builder.build(), props);
        streams.start();
        Runtime.getRuntime().addShutdownHook(new Thread(streams::close));

        // Mantiene la app activa
        CountDownLatch latch = new CountDownLatch(1);
        try {
            latch.await();
        } catch (InterruptedException e) {
            streams.close();
        }
    }
}
