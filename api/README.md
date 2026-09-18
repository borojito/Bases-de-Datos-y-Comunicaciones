# API TechLogistics S.A.

API REST que conecta la interfaz web con la base de datos MySQL `techlogistics`.

## Requisitos

- XAMPP con MySQL encendido
- La base de datos creada con `Tablas bases/techlogistics_mysql.sql`
- Node.js instalado

## Cómo ejecutarla

```
npm install
npm start
```

Queda funcionando en `http://localhost:3000`.

`npm install` descarga las librerías en la carpeta `node_modules`. Esa carpeta se crea sola,
no se edita y no se sube a GitHub (por eso está en el `.gitignore`).

## Endpoints

| Método | Ruta | Qué hace |
|--------|------|----------|
| GET | `/api/health` | Verifica que la API y la base de datos respondan |
| GET | `/api/clientes` | Lista los clientes |
| POST | `/api/clientes` | Registra un cliente |
| GET | `/api/productos` | Lista los productos |
| POST | `/api/productos` | Registra un producto |
| GET | `/api/pedidos` | Lista todos los pedidos |
| GET | `/api/pedidos/:id` | Consulta un pedido con sus productos |
| POST | `/api/pedidos` | Crea un pedido y le genera el envío |
| GET | `/api/envios/estados` | Lista los estados posibles de un envío |
| GET | `/api/envios/:id` | Rastrea un envío |
| PATCH | `/api/envios/:id/estado` | Cambia el estado de un envío |

## Archivos

- `server.js` — toda la API
- `package.json` — las librerías que usa
- `.gitignore` — evita subir `node_modules` a GitHub
