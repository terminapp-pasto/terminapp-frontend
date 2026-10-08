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
- [ ] Pantalla de chat
- [ ] Pantalla de resultados de búsqueda
- [ ] Pantalla del pasaje
- [ ] Pago en modo prueba con Stripe

## Cómo ejecutarlo en tu computador

Necesitas [Node.js](https://nodejs.org) (versión LTS).

```bash
git clone https://github.com/terminapp-pasto/terminapp-frontend.git
cd terminapp-frontend
npm install
npm run dev
```

Luego abre `http://localhost:5173` en el navegador.