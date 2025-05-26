from pyspark.sql import SparkSession
from pyspark.sql.functions import from_json, col, window, to_date, avg, count, desc
from pyspark.sql.types import (
    StructType,
    StructField,
    StringType,
    DoubleType,
    TimestampType,
)

spark = (
    SparkSession.builder.appName("StreamingPagosReservas")
    .config("spark.jars.packages", "org.apache.spark:spark-sql-kafka-0-10_2.12:3.3.2")
    .getOrCreate()
)
spark.sparkContext.setLogLevel("WARN")

schema_pagos = StructType(
    [
        StructField("payment_id", StringType()),
        StructField("amount", DoubleType()),
        StructField("timestamp", TimestampType()),
    ]
)
schema_reservas = StructType(
    [
        StructField("reserva_id", StringType()),
        StructField("user_id", StringType()),
        StructField("fecha_reserva", TimestampType()),
    ]
)

stream_pagos = (
    spark.readStream.format("kafka")
    .option("kafka.bootstrap.servers", "kafka:9092")
    .option("subscribe", "pagos")
    .option("startingOffsets", "latest")
    .load()
    .selectExpr("CAST(value AS STRING) as json_str")
    .select(from_json(col("json_str"), schema_pagos).alias("data"))
    .select("data.*")
)
stream_reservas = (
    spark.readStream.format("kafka")
    .option("kafka.bootstrap.servers", "kafka:9092")
    .option("subscribe", "reservas")
    .option("startingOffsets", "latest")
    .load()
    .selectExpr("CAST(value AS STRING) as json_str")
    .select(from_json(col("json_str"), schema_reservas).alias("data"))
    .select("data.*")
)

promedio_precios = (
    stream_pagos.withColumn("dia", to_date("timestamp"))
    .groupBy("dia")
    .agg(avg("amount").alias("avg_price"))
    .orderBy("dia")
)
conteo_reservas = (
    stream_reservas.withColumn("dia", to_date("fecha_reserva"))
    .groupBy("dia")
    .agg(count("*").alias("reservas_count"))
)

query_avg = (
    promedio_precios.writeStream.outputMode("complete")
    .format("console")
    .option("truncate", False)
    .start()
)

query_count = (
    conteo_reservas.writeStream.outputMode("complete")
    .format("console")
    .option("truncate", False)
    .start()
)

query_top5 = (
    conteo_reservas.orderBy(desc("reservas_count"))
    .limit(5)
    .writeStream.outputMode("complete")
    .format("console")
    .start()
)

spark.streams.awaitAnyTermination()
