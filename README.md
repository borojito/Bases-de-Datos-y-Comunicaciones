# TechLogistics S.A. — Sistema de Gestión de Pedidos y Envíos

Aplicación web que permite registrar pedidos de clientes, generar automáticamente su envío y rastrear el estado de ese envío.

## Tecnologías

| Capa | Tecnología | Para qué se usa |
|------|-----------|-----------------|
| Base de datos | MySQL (incluido en XAMPP) | Guardar clientes, productos, pedidos y envíos |
| API (backend) | Node.js + Express | Recibir peticiones de la página web y consultar MySQL |
| Interfaz (frontend) | HTML, CSS y JavaScript | Lo que ve y usa el usuario en el navegador |

## Cómo se conectan las partes

```
 Navegador                  API (Node.js)                MySQL (XAMPP)
 interfaz-web/    ──HTTP──▶  api/server.js   ──SQL──▶   base de datos
 index.html       ◀─JSON──   puerto 3000     ◀─────     techlogistics
```

1. El usuario hace algo en la página (por ejemplo, crear un pedido).
2. La página envía una petición HTTP a la API en `http://localhost:3000/api/...`.
3. La API ejecuta las consultas SQL necesarias en MySQL.
4. MySQL devuelve los datos, la API los convierte a JSON y la página los muestra.

## Estructura del proyecto

```
TechLogistics S.A/
├── README.md                      ← este archivo
├── Tablas bases/
│   ├── techlogistics_mysql.sql    ← script que crea la base de datos con datos de ejemplo
│   └── TechLogistics.ddl          ← diseño original generado en Oracle Data Modeler (solo referencia)
├── api/
│   ├── server.js                  ← toda la API (rutas y consultas SQL)
│   ├── package.json               ← lista de librerías que usa (express, mysql2, cors)
│   ├── .gitignore                 ← evita subir node_modules a GitHub
│   └── README.md                  ← detalle de los endpoints
└── interfaz-web/
    ├── index.html                 ← estructura de la página
    ├── styles.css                 ← estilos
    ├── app.js                     ← lógica: llama a la API y pinta los datos
    └── README.md
```

## Modelo de datos

Siete tablas relacionadas:

- **Cliente** — quien hace el pedido.
- **Producto** — lo que se vende, con su precio.
- **Pedido** — encabezado del pedido: fecha, total y cliente.
- **Item_pedido** — cada producto dentro de un pedido, con cantidad y precio al momento de la compra.
- **Envio** — el despacho de un pedido. Un pedido tiene un único envío.
- **Ruta** — origen, destino y kilómetros.
- **Transportista** — quién lleva el envío y en qué vehículo.
- **Estado_envio** — Pendiente, En tránsito, Entregado, Cancelado.

## Requisitos

- [XAMPP](https://www.apachefriends.org/) (solo se usa su MySQL)
- [Node.js](https://nodejs.org/) versión 18 o superior

## Instalación (solo la primera vez)

### 1. Crear la base de datos

1. Abrir el **Panel de Control de XAMPP** y darle **Start** a **MySQL**.
2. Abrir `http://localhost/phpmyadmin` en el navegador.
3. Ir a la pestaña **Importar**, seleccionar el archivo `Tablas bases/techlogistics_mysql.sql` y darle **Continuar**.

Eso crea la base `techlogistics` con sus 7 tablas y datos de prueba (6 clientes, 7 productos,
4 transportistas, 4 rutas, 5 pedidos con sus envíos).

> Alternativa por consola (desde la carpeta del proyecto):
> `C:\xampp\mysql\bin\mysql.exe -u root < "Tablas bases\techlogistics_mysql.sql"`

### 2. Instalar las librerías de la API

Abrir una terminal en la carpeta `api/` y ejecutar:

```
npm install
```

Esto descarga Express, mysql2 y cors dentro de una carpeta llamada `node_modules`.
Esa carpeta **se genera sola, no se edita y no se sube a GitHub**; por eso está en `.gitignore`.
Cualquier persona que clone el proyecto solo tiene que correr `npm install` para recrearla.

## Ejecución (cada vez que se quiera usar)

1. En XAMPP, darle **Start** a **MySQL**.
2. En una terminal dentro de `api/`, ejecutar:
   ```
   npm start
   ```
   Debe aparecer `API funcionando en http://localhost:3000`. **Dejar esa terminal abierta**:
   si se cierra, la API se apaga.
3. Abrir `interfaz-web/index.html` en el navegador (doble clic o con Live Server).

Para comprobar que todo está conectado, abrir `http://localhost:3000/api/health` en el navegador.
Debe responder `{"status":"ok"}`.

## Qué se puede hacer en la interfaz

- **Crear un pedido**: elegir un cliente, agregar uno o más productos con su cantidad y confirmar.
  El sistema calcula el total, guarda el pedido y le genera automáticamente un envío con una
  ruta y un transportista, en estado *Pendiente*.
- **Rastrear un envío**: escribir el número de envío y ver su ruta, transportista, fechas y estado.
- **Actualizar el estado del envío**: cambiarlo a *En tránsito*, *Entregado* o *Cancelado*.
  Al marcarlo como *Entregado* se registra la fecha de entrega.
