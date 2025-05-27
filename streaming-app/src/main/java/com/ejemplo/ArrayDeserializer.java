// src/main/java/com/ejemplo/ArrayDeserializer.java
package com.ejemplo;

import org.apache.kafka.common.serialization.Deserializer;
import java.nio.ByteBuffer;
import java.util.Map;

public class ArrayDeserializer implements Deserializer<double[]> {
  @Override
  public double[] deserialize(String topic, byte[] bytes) {
    if (bytes == null) return null;
    ByteBuffer buf = ByteBuffer.wrap(bytes);
    int len = buf.getInt();
    double[] arr = new double[len];
    for (int i = 0; i < len; i++) {
      arr[i] = buf.getDouble();
    }
    return arr;
  }

  @Override public void configure(Map<String, ?> configs, boolean isKey) {}
  @Override public void close() {}
}
