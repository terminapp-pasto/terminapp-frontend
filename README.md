<div align="center">

# 🚌 TerminAPP

**Compra tu pasaje desde la Terminal de Transportes de Pasto con solo escribir a dónde vas.**

![React](https://img.shields.io/badge/React-19-61DAFB?logo=react&logoColor=black)
![TypeScript](https://img.shields.io/badge/TypeScript-6-3178C6?logo=typescript&logoColor=white)
![Vite](https://img.shields.io/badge/Vite-8-646CFF?logo=vite&logoColor=white)
![Vercel](https://img.shields.io/badge/Desplegado_en-Vercel-000000?logo=vercel&logoColor=white)

[Ver la app](https://terminapp-frontend.vercel.app) · [API del backend](https://terminapp-backend.onrender.com/docs) · [Repositorio del backend](https://github.com/terminapp-pasto/terminapp-backend)

</div>

---

## ¿Qué es TerminAPP?

Una plataforma web para consultar y comprar pasajes de bus que salen de la Terminal de Transportes de Pasto. En lugar de llenar formularios, el usuario escribe en un chat, por ejemplo *"quiero ir a Cali esta noche, lo más barato"*, y una IA convierte esa frase en una búsqueda real de rutas, horarios y precios.

Este repositorio es el **frontend**: las pantallas que ve el usuario. Toda la lógica de búsqueda, la base de datos y la IA viven en el [backend](https://github.com/terminapp-pasto/terminapp-backend).

## Equipo

| Integrante | Rol |
|---|---|
| Juan David Moreno | Backend, base de datos y motor de búsqueda |
| Felipe Alejandro Cerón | Frontend y pagos |

Proyecto final de **Estructuras de Datos**, Universidad Cooperativa de Colombia, sede Pasto.

## Cómo se conecta

```
Usuario  →  Frontend (este repo, Vercel)  →  Backend (FastAPI, Render)  →  Base de datos y IA
```

El frontend solo habla con el backend. Las claves de la IA, de la base de datos y de los pagos nunca están aquí.

## Avance

- [x] Proyecto React + TypeScript creado
- [x] Desplegado en Vercel
- [x] Chat con IA con estados de carga, error y resultado
- [x] Buscador con filtros de destino, hora y orden
- [x] Crear cuenta e iniciar sesión
- [x] Compra: fecha, mapa de asientos y datos del pasajero
- [x] Pago en modo prueba con Stripe
- [x] Mis tiquetes
- [ ] Ajustes visuales finales

## Cómo ejecutarlo en tu computador

Necesitas [Node.js](https://nodejs.org) (versión LTS).

```bash
git clone https://github.com/terminapp-pasto/terminapp-frontend.git
cd terminapp-frontend
npm install
npm run dev
```

Luego abre `http://localhost:5173` en el navegador. Así la página usa el backend publicado en Render.

Para usar un backend que corre en tu computador (puerto 8001), copia `.env.example` como `.env.local` antes de `npm run dev`:

```powershell
Copy-Item .env.example .env.local
```

`.env.local` no se sube a Git.

## Pantallas

| Pantalla | Archivo | Qué hace |
|---|---|---|
| Chat con IA | `src/Chat.tsx` | Conversación con el asistente; las salidas aparecen como tarjetas con botón Comprar |
| Buscador | `src/Buscador.tsx` | Búsqueda con filtros, sin IA |
| Compra | `src/Compra.tsx` | Fecha, mapa del bus, pasajero y paso a Stripe |
| Cuenta | `src/Cuenta.tsx` | Crear cuenta, iniciar sesión y cerrar sesión |
| Mis tiquetes | `src/MisTiquetes.tsx` | Historial con estado de cada tiquete; pagar o cancelar los pendientes |

## Pago de prueba

En la página de Stripe usa la tarjeta `4242 4242 4242 4242`, cualquier fecha futura y cualquier CVC. No se cobra dinero real.