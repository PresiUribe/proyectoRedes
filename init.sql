CREATE DATABASE IF NOT EXISTS usuariosMS;
CREATE DATABASE IF NOT EXISTS reservasMS;
CREATE DATABASE IF NOT EXISTS propiedadesMS;
CREATE DATABASE IF NOT EXISTS pagosMS;

USE usuariosMS;
CREATE TABLE IF NOT EXISTS usuarios (
  id INT AUTO_INCREMENT PRIMARY KEY,
  nombre VARCHAR(20) NOT NULL,
  email VARCHAR(30) NOT NULL,
  usuario VARCHAR(10) NOT NULL,
  password VARCHAR(200) NOT NULL,
  tipo ENUM('huesped','admin') NOT NULL,
  tipo_tarjeta ENUM('debito','credito') NOT NULL,
  numero_tarjeta CHAR(200) NOT NULL,
  cvc CHAR(200) NOT NULL,
  fecha_expiracion CHAR(200) NOT NULL
);

USE reservasMS;
CREATE TABLE IF NOT EXISTS reservas (
  id INT AUTO_INCREMENT PRIMARY KEY,
  usuario_id INT NOT NULL,
  propiedad_id INT NOT NULL,
  fecha_reserva DATE NOT NULL,
  estado VARCHAR(20) NOT NULL
);

-- Tablas para propiedadesMS
USE propiedadesMS;
CREATE TABLE IF NOT EXISTS propiedades (
  id INT AUTO_INCREMENT PRIMARY KEY,
  average_rate_per_night FLOAT NOT NULL,
  bedrooms_count INT NOT NULL,
  city VARCHAR(50) NOT NULL,
  date_of_listing VARCHAR(50) NOT NULL,
  description TEXT NOT NULL,
  latitude DECIMAL(15,13) NOT NULL,
  longitude DECIMAL(15,13) NOT NULL,
  title VARCHAR(200) NOT NULL,
  disponible TINYINT(1) NOT NULL DEFAULT 1
);

-- Tablas para pagosMS
USE pagosMS;
CREATE TABLE IF NOT EXISTS pagos (
  id INT AUTO_INCREMENT PRIMARY KEY,
  reserva_id INT NOT NULL,
  metodo_pago VARCHAR(20) NOT NULL,
  monto FLOAT NOT NULL,
  estado VARCHAR(20) NOT NULL
);
