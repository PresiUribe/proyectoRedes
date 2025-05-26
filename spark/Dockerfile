FROM bitnami/spark:3.3.2

USER root
RUN pip install --no-cache pyspark kafka-python

# Copiamos el script
COPY streaming_job.py /opt/bitnami/spark/app/streaming_job.py
WORKDIR /opt/bitnami/spark

USER 1001
