const express = require('express');
const mysql = require('mysql2/promise');
const cors = require('cors');

const app = express();
const PORT = 3000;

app.use(cors());
app.use(express.json());

// Base de datos
const db = mysql.createPool({
  host: 'localhost',
  user: 'root',
  password: '',
  database: 'techlogistics'
});

// Ayudas
const ruta = (fn) => (req, res, next) => fn(req, res, next).catch(next);

function validar(body, campos) {
  const faltan = campos.filter((campo) => !body[campo]);
  if (faltan.length > 0) {
    const error = new Error(`Faltan datos: ${faltan.join(', ')}`);
    error.status = 400;
    throw error;
  }
}

app.get('/api/health', ruta(async (req, res) => {
  await db.query('SELECT 1');
  res.json({ status: 'ok' });
}));

// Clientes

app.get('/api/clientes', ruta(async (req, res) => {
  const [clientes] = await db.query('SELECT * FROM Cliente ORDER BY nom_cliente');
  res.json(clientes);
}));

app.post('/api/clientes', ruta(async (req, res) => {
  validar(req.body, ['nom_cliente', 'email_cliente', 'tel_cliente', 'direc_cliente']);
  const { nom_cliente, email_cliente, tel_cliente, direc_cliente } = req.body;

  const [result] = await db.query(
    'INSERT INTO Cliente (nom_cliente, email_cliente, tel_cliente, direc_cliente) VALUES (?, ?, ?, ?)',
    [nom_cliente, email_cliente, tel_cliente, direc_cliente]
  );
  res.json({ id_cliente: result.insertId });
}));

// Productos

app.get('/api/productos', ruta(async (req, res) => {
  const [productos] = await db.query('SELECT * FROM Producto ORDER BY nom_producto');
  res.json(productos);
}));

app.post('/api/productos', ruta(async (req, res) => {
  validar(req.body, ['nom_producto', 'categoria_producto', 'precio_producto']);
  const { nom_producto, categoria_producto, precio_producto } = req.body;

  const [result] = await db.query(
    'INSERT INTO Producto (nom_producto, categoria_producto, precio_producto) VALUES (?, ?, ?)',
    [nom_producto, categoria_producto, precio_producto]
  );
  res.json({ id_producto: result.insertId });
}));

// Pedidos

app.get('/api/pedidos', ruta(async (req, res) => {
  const [pedidos] = await db.query(`
    SELECT p.id_pedido, p.fecha_pedido, p.total_pedido, c.nom_cliente
    FROM Pedido p
    JOIN Cliente c ON c.id_cliente = p.Cliente_id_cliente
    ORDER BY p.id_pedido DESC
  `);
  res.json(pedidos);
}));

app.get('/api/pedidos/:id', ruta(async (req, res) => {
  const [pedidos] = await db.query(`
    SELECT p.id_pedido, p.fecha_pedido, p.total_pedido, c.id_cliente, c.nom_cliente, c.email_cliente
    FROM Pedido p
    JOIN Cliente c ON c.id_cliente = p.Cliente_id_cliente
    WHERE p.id_pedido = ?
  `, [req.params.id]);

  if (pedidos.length === 0) return res.status(404).json({ error: 'Pedido no encontrado' });

  const [items] = await db.query(`
    SELECT ip.cantidad_itempedido, ip.precio_itempedido, pr.id_producto, pr.nom_producto
    FROM Item_pedido ip
    JOIN Producto pr ON pr.id_producto = ip.Producto_id_producto
    WHERE ip.Pedido_id_pedido = ?
  `, [req.params.id]);

  res.json({ ...pedidos[0], items });
}));

app.post('/api/pedidos', ruta(async (req, res) => {
  const { Cliente_id_cliente, items } = req.body;
  if (!Cliente_id_cliente || !Array.isArray(items) || items.length === 0) {
    return res.status(400).json({ error: 'Se requiere un cliente y al menos un producto' });
  }

  const [pedido] = await db.query(
    'INSERT INTO Pedido (fecha_pedido, total_pedido, Cliente_id_cliente) VALUES (NOW(), 0, ?)',
    [Cliente_id_cliente]
  );
  const idPedido = pedido.insertId;

  let total = 0;
  for (const item of items) {
    const [productos] = await db.query(
      'SELECT precio_producto FROM Producto WHERE id_producto = ?',
      [item.Producto_id_producto]
    );
    if (productos.length === 0) {
      return res.status(400).json({ error: `El producto ${item.Producto_id_producto} no existe` });
    }

    const precio = Number(productos[0].precio_producto);
    const cantidad = item.cantidad_itempedido || 1;
    total += precio * cantidad;

    await db.query(
      'INSERT INTO Item_pedido (cantidad_itempedido, precio_itempedido, Pedido_id_pedido, Producto_id_producto) VALUES (?, ?, ?, ?)',
      [cantidad, precio, idPedido, item.Producto_id_producto]
    );
  }

  await db.query('UPDATE Pedido SET total_pedido = ? WHERE id_pedido = ?', [total, idPedido]);
  const id_envio = await crearEnvio(idPedido);

  res.json({ id_pedido: idPedido, total_pedido: total, id_envio });
}));

async function crearEnvio(idPedido) {
  const [rutas] = await db.query('SELECT id_ruta FROM Ruta ORDER BY RAND() LIMIT 1');
  const [transportistas] = await db.query('SELECT id_transportista FROM Transportista ORDER BY RAND() LIMIT 1');
  const [estados] = await db.query("SELECT id_estado FROM Estado_envio WHERE nom_estado = 'Pendiente' LIMIT 1");

  if (rutas.length === 0 || transportistas.length === 0 || estados.length === 0) return null;

  const [envio] = await db.query(`
    INSERT INTO Envio (fechasalida_envio, Ruta_id_ruta, Estado_envio_id_estado, Transportista_id_transportista, Pedido_id_pedido)
    VALUES (NOW(), ?, ?, ?, ?)
  `, [rutas[0].id_ruta, estados[0].id_estado, transportistas[0].id_transportista, idPedido]);

  return envio.insertId;
}

// Envios

const SQL_ENVIO = `
  SELECT
    e.id_envio, e.fechasalida_envio, e.fechaentrega_envio,
    r.origen_ruta, r.destino_ruta, r.km_ruta,
    es.id_estado, es.nom_estado,
    t.nom_transportista, t.empresa_transportista, t.vehiculo_transportista,
    p.id_pedido, p.total_pedido, p.fecha_pedido,
    c.nom_cliente
  FROM Envio e
  JOIN Ruta r ON r.id_ruta = e.Ruta_id_ruta
  JOIN Estado_envio es ON es.id_estado = e.Estado_envio_id_estado
  JOIN Transportista t ON t.id_transportista = e.Transportista_id_transportista
  JOIN Pedido p ON p.id_pedido = e.Pedido_id_pedido
  JOIN Cliente c ON c.id_cliente = p.Cliente_id_cliente
`;

app.get('/api/envios/estados', ruta(async (req, res) => {
  const [estados] = await db.query('SELECT * FROM Estado_envio ORDER BY id_estado');
  res.json(estados);
}));

app.get('/api/envios/:id', ruta(async (req, res) => {
  const [envios] = await db.query(`${SQL_ENVIO} WHERE e.id_envio = ?`, [req.params.id]);
  if (envios.length === 0) return res.status(404).json({ error: 'Envío no encontrado' });
  res.json(envios[0]);
}));

app.patch('/api/envios/:id/estado', ruta(async (req, res) => {
  validar(req.body, ['id_estado']);
  const { id_estado } = req.body;

  const [estados] = await db.query('SELECT nom_estado FROM Estado_envio WHERE id_estado = ?', [id_estado]);
  if (estados.length === 0) return res.status(400).json({ error: 'Estado inválido' });

  const entregado = /entregado/i.test(estados[0].nom_estado);
  const [result] = await db.query(`
    UPDATE Envio
    SET Estado_envio_id_estado = ?, fechaentrega_envio = ${entregado ? 'NOW()' : 'NULL'}
    WHERE id_envio = ?
  `, [id_estado, req.params.id]);

  if (result.affectedRows === 0) return res.status(404).json({ error: 'Envío no encontrado' });

  const [envios] = await db.query(`${SQL_ENVIO} WHERE e.id_envio = ?`, [req.params.id]);
  res.json(envios[0]);
}));

// Errores
app.use((err, req, res, next) => {
  console.error(err);
  res.status(err.status || 500).json({ error: err.message });
});

app.listen(PORT, () => {
  console.log(`API funcionando en http://localhost:${PORT}`);
});
