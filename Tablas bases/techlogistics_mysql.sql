-- =========================================================
-- TechLogistics S.A. - Sistema de Gestión de Pedidos y Envíos
-- Script DDL para MySQL 8.x
-- =========================================================

CREATE DATABASE IF NOT EXISTS techlogistics
    CHARACTER SET utf8mb4
    COLLATE utf8mb4_unicode_ci;

USE techlogistics;

-- ---------------------------------------------------------
-- Tabla: Cliente
-- ---------------------------------------------------------
CREATE TABLE Cliente (
    id_cliente     INT AUTO_INCREMENT PRIMARY KEY,
    nom_cliente    VARCHAR(200) NOT NULL,
    email_cliente  VARCHAR(200) NOT NULL UNIQUE,
    tel_cliente    VARCHAR(10)  NOT NULL,
    direc_cliente  VARCHAR(200) NOT NULL
);

-- ---------------------------------------------------------
-- Tabla: Producto
-- ---------------------------------------------------------
CREATE TABLE Producto (
    id_producto        INT AUTO_INCREMENT PRIMARY KEY,
    nom_producto       VARCHAR(200) NOT NULL,
    categoria_producto VARCHAR(50)  NOT NULL,
    precio_producto    DECIMAL(12,2) NOT NULL DEFAULT 50000.00
);

-- ---------------------------------------------------------
-- Tabla: Transportista
-- ---------------------------------------------------------
CREATE TABLE Transportista (
    id_transportista       INT AUTO_INCREMENT PRIMARY KEY,
    nom_transportista      VARCHAR(200) NOT NULL,
    empresa_transportista  VARCHAR(200) NOT NULL,
    tel_transportista      VARCHAR(10)  NOT NULL,
    vehiculo_transportista VARCHAR(200) NOT NULL
);

-- ---------------------------------------------------------
-- Tabla: Ruta
-- ---------------------------------------------------------
CREATE TABLE Ruta (
    id_ruta      INT AUTO_INCREMENT PRIMARY KEY,
    origen_ruta  VARCHAR(200) NOT NULL,
    destino_ruta VARCHAR(200) NOT NULL,
    km_ruta      DECIMAL(8,2) NOT NULL DEFAULT 500
);

-- ---------------------------------------------------------
-- Tabla: Estado_envio
-- ---------------------------------------------------------
CREATE TABLE Estado_envio (
    id_estado  INT AUTO_INCREMENT PRIMARY KEY,
    nom_estado VARCHAR(50) NOT NULL
);

-- ---------------------------------------------------------
-- Tabla: Pedido
-- (corregido: total_pedido pasa de DATETIME a DECIMAL)
-- ---------------------------------------------------------
CREATE TABLE Pedido (
    id_pedido          INT AUTO_INCREMENT PRIMARY KEY,
    fecha_pedido       DATETIME NOT NULL,
    total_pedido       DECIMAL(12,2) NOT NULL DEFAULT 0,
    Cliente_id_cliente INT NOT NULL,
    CONSTRAINT Pedido_Cliente_FK FOREIGN KEY (Cliente_id_cliente)
        REFERENCES Cliente (id_cliente)
        ON DELETE RESTRICT ON UPDATE CASCADE
);

-- ---------------------------------------------------------
-- Tabla: Item_pedido (detalle de cada pedido)
-- ---------------------------------------------------------
CREATE TABLE Item_pedido (
    id_itempedido        INT AUTO_INCREMENT PRIMARY KEY,
    cantidad_itempedido  INT NOT NULL DEFAULT 1,
    precio_itempedido    DECIMAL(12,2) NOT NULL DEFAULT 0,
    Pedido_id_pedido     INT NOT NULL,
    Producto_id_producto INT NOT NULL,
    CONSTRAINT Item_pedido_Pedido_FK FOREIGN KEY (Pedido_id_pedido)
        REFERENCES Pedido (id_pedido)
        ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT Item_pedido_Producto_FK FOREIGN KEY (Producto_id_producto)
        REFERENCES Producto (id_producto)
        ON DELETE RESTRICT ON UPDATE CASCADE
);

-- ---------------------------------------------------------
-- Tabla: Envio
-- (un pedido tiene un único envío -> Pedido_id_pedido es UNIQUE)
-- ---------------------------------------------------------
CREATE TABLE Envio (
    id_envio                        INT AUTO_INCREMENT PRIMARY KEY,
    fechasalida_envio               DATETIME NOT NULL,
    fechaentrega_envio              DATETIME NULL,
    Ruta_id_ruta                    INT NOT NULL,
    Estado_envio_id_estado          INT NOT NULL,
    Transportista_id_transportista  INT NOT NULL,
    Pedido_id_pedido                INT NOT NULL UNIQUE,
    CONSTRAINT Envio_Ruta_FK FOREIGN KEY (Ruta_id_ruta)
        REFERENCES Ruta (id_ruta)
        ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT Envio_Estado_envio_FK FOREIGN KEY (Estado_envio_id_estado)
        REFERENCES Estado_envio (id_estado)
        ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT Envio_Transportista_FK FOREIGN KEY (Transportista_id_transportista)
        REFERENCES Transportista (id_transportista)
        ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT Envio_Pedido_FK FOREIGN KEY (Pedido_id_pedido)
        REFERENCES Pedido (id_pedido)
        ON DELETE CASCADE ON UPDATE CASCADE
);

-- =========================================================
-- Datos de prueba (para la demostración del sistema)
-- Precios y totales en pesos colombianos (COP)
-- =========================================================

INSERT INTO Estado_envio (nom_estado) VALUES
('Pendiente'), ('En tránsito'), ('Entregado'), ('Cancelado');

INSERT INTO Cliente (nom_cliente, email_cliente, tel_cliente, direc_cliente) VALUES
('Laura Gómez', 'laura.gomez@mail.com', '3001234567', 'Cra 45 #12-34, Medellín'),
('Carlos Pérez', 'carlos.perez@mail.com', '3009876543', 'Calle 10 #5-67, Bogotá'),
('Andrea Salazar', 'andrea.salazar@mail.com', '3115558899', 'Av. Circunvalar #22-10, Cali'),
('Juan Ramírez', 'juan.ramirez@mail.com', '3123456780', 'Cra 7 #45-12, Bogotá'),
('Mariana Ríos', 'mariana.rios@mail.com', '3134567891', 'Calle 33 #8-20, Medellín'),
('Felipe Castro', 'felipe.castro@mail.com', '3145678912', 'Cra 15 #100-50, Barranquilla');

INSERT INTO Producto (nom_producto, categoria_producto, precio_producto) VALUES
('Caja de herramientas', 'Ferretería', 180000.00),
('Monitor 24 pulgadas', 'Tecnología', 850000.00),
('Cámara Insta360 Go Ultra', 'Tecnología', 2450000.00),
('Audífonos inalámbricos', 'Tecnología', 320000.00),
('Silla ergonómica', 'Hogar', 690000.00),
('Cafetera eléctrica', 'Hogar', 210000.00),
('Mochila antirrobo', 'Accesorios', 150000.00);

INSERT INTO Transportista (nom_transportista, empresa_transportista, tel_transportista, vehiculo_transportista) VALUES
('Andrés Torres', 'TransLog S.A.S', '3112223344', 'Camión NPR'),
('María Ruiz', 'RápidoYA', '3145556677', 'Furgón'),
('Jorge Salinas', 'Envíos del Valle', '3167778899', 'Camioneta Turbo'),
('Diana Marín', 'LogiExpress', '3178889900', 'Camión Sencillo');

INSERT INTO Ruta (origen_ruta, destino_ruta, km_ruta) VALUES
('Medellín', 'Bogotá', 415.00),
('Bogotá', 'Cali', 460.00),
('Cali', 'Barranquilla', 970.00),
('Medellín', 'Barranquilla', 700.00);

-- Pedido 1: Laura Gómez -> Caja de herramientas + Monitor
INSERT INTO Pedido (fecha_pedido, total_pedido, Cliente_id_cliente) VALUES
(NOW(), 1030000.00, 1);
INSERT INTO Item_pedido (cantidad_itempedido, precio_itempedido, Pedido_id_pedido, Producto_id_producto) VALUES
(1, 180000.00, 1, 1),
(1, 850000.00, 1, 2);

-- Pedido 2: Carlos Pérez -> Cámara Insta360 Go Ultra
INSERT INTO Pedido (fecha_pedido, total_pedido, Cliente_id_cliente) VALUES
(NOW(), 2450000.00, 2);
INSERT INTO Item_pedido (cantidad_itempedido, precio_itempedido, Pedido_id_pedido, Producto_id_producto) VALUES
(1, 2450000.00, 2, 3);

-- Pedido 3: Andrea Salazar -> Audífonos x2 + Mochila
INSERT INTO Pedido (fecha_pedido, total_pedido, Cliente_id_cliente) VALUES
(NOW(), 790000.00, 3);
INSERT INTO Item_pedido (cantidad_itempedido, precio_itempedido, Pedido_id_pedido, Producto_id_producto) VALUES
(2, 320000.00, 3, 4),
(1, 150000.00, 3, 7);

-- Pedido 4: Juan Ramírez -> Silla ergonómica
INSERT INTO Pedido (fecha_pedido, total_pedido, Cliente_id_cliente) VALUES
(NOW(), 690000.00, 4);
INSERT INTO Item_pedido (cantidad_itempedido, precio_itempedido, Pedido_id_pedido, Producto_id_producto) VALUES
(1, 690000.00, 4, 5);

-- Pedido 5: Mariana Ríos -> Cafetera + Caja de herramientas x2
INSERT INTO Pedido (fecha_pedido, total_pedido, Cliente_id_cliente) VALUES
(NOW(), 570000.00, 5);
INSERT INTO Item_pedido (cantidad_itempedido, precio_itempedido, Pedido_id_pedido, Producto_id_producto) VALUES
(1, 210000.00, 5, 6),
(2, 180000.00, 5, 1);

INSERT INTO Envio (fechasalida_envio, fechaentrega_envio, Ruta_id_ruta, Estado_envio_id_estado, Transportista_id_transportista, Pedido_id_pedido) VALUES
(NOW(), NOW(), 1, 3, 1, 1),
(NOW(), NULL, 2, 2, 2, 2),
(NOW(), NULL, 3, 1, 3, 3),
(NOW(), NULL, 4, 4, 4, 4),
(NOW(), NULL, 1, 2, 2, 5);
