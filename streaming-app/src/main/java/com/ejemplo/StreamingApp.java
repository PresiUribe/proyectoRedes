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
        final String pagosTopic    = "pagos";
        final String reservasTopic = "reservas";
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

        // 1) Precio promedio por fecha
        KStream<String,String> pagos = builder.stream(pagosTopic);
        KTable<String, Double> avgByDate = pagos
          .map((key, v) -> {
              String date;
              double amount;
              try {
                  JsonNode j = mapper.readTree(v);
                  long ts = Instant.parse(j.get("fecha_pago").asText()).toEpochMilli();
                  date = fmt.format(Instant.ofEpochMilli(ts));
                  amount = j.get("monto").asDouble();
              } catch (Exception e) {
                  throw new RuntimeException("Error parsing mensaje de pagos", e);
              }
              return KeyValue.pair(date, amount);
          })
          .groupByKey(Grouped.with(Serdes.String(), Serdes.Double()))
  .aggregate(
    () -> new double[]{0.0, 0.0},                    // acumulador [suma, conteo]
    (date, amt, agg) -> new double[]{ agg[0] + amt, agg[1] + 1 },
    Materialized
      .<String, double[], KeyValueStore<Bytes, byte[]>>as("avg-store")  // nombre del state store
      .withKeySerde(Serdes.String())
      .withValueSerde(Serdes.serdeFrom(new ArraySerializer(), new ArrayDeserializer()))
  )
  .mapValues(arr -> arr[1] == 0.0 ? 0.0 : arr[0] / arr[1]);


        avgByDate.toStream()
                 .mapValues(Object::toString)
                 .to(avgTopic, Produced.with(Serdes.String(), Serdes.String()));

        // 2) Conteo de reservas por fecha
        KStream<String,String> reservas = builder.stream(reservasTopic);
        KTable<String, Long> cntByDate = reservas
          .map((key, v) -> {
              String date;
              try {
                  JsonNode j = mapper.readTree(v);
                  long ts = Instant.parse(j.get("fecha_reserva").asText()).toEpochMilli();
                  date = fmt.format(Instant.ofEpochMilli(ts));
              } catch (Exception e) {
                  throw new RuntimeException("Error parsing mensaje de reservas", e);
              }
              return KeyValue.pair(date, date);
          })
          .groupByKey(Grouped.with(Serdes.String(), Serdes.String()))
          .count();

        cntByDate.toStream()
                  .mapValues(Object::toString)
                  .to(cntTopic, Produced.with(Serdes.String(), Serdes.String()));

        // 3) Arrancar el motor
        KafkaStreams streams = new KafkaStreams(builder.build(), props);
        streams.start();
        Runtime.getRuntime().addShutdownHook(new Thread(streams::close));
        CountDownLatch latch = new CountDownLatch(1);
try {
  latch.await();
} catch (InterruptedException e) {
  streams.close();
}
    }
}
