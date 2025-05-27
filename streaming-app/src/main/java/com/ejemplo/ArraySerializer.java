// src/main/java/com/ejemplo/ArraySerializer.java
package com.ejemplo;

import org.apache.kafka.common.serialization.Serializer;
import java.nio.ByteBuffer;
import java.util.Map;

public class ArraySerializer implements Serializer<double[]> {
  @Override
  public byte[] serialize(String topic, double[] data) {
    if (data == null) return null;
    // guardamos la longitud + cada double (8 bytes)
    ByteBuffer buf = ByteBuffer.allocate(4 + data.length * 8);
    buf.putInt(data.length);
    for (double d : data) buf.putDouble(d);
    return buf.array();
  }

  @Override public void configure(Map<String, ?> configs, boolean isKey) {}
  @Override public void close() {}
}
