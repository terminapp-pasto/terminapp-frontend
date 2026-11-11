<div align="center">

# 🚌 TerminAPP

**Buy your bus ticket from the Pasto bus terminal just by typing where you are going.**

![React](https://img.shields.io/badge/React-19-61DAFB?logo=react&logoColor=black)
![TypeScript](https://img.shields.io/badge/TypeScript-6-3178C6?logo=typescript&logoColor=white)
![Vite](https://img.shields.io/badge/Vite-8-646CFF?logo=vite&logoColor=white)
![Vercel](https://img.shields.io/badge/Deployed_on-Vercel-000000?logo=vercel&logoColor=white)

[Open the app](https://terminapp-frontend.vercel.app) · [Backend API](https://terminapp-backend.onrender.com/docs) · [Backend repository](https://github.com/terminapp-pasto/terminapp-backend)

</div>

---

## What is TerminAPP?

A web platform to look up and buy tickets for the buses leaving the Pasto bus terminal (Terminal de Transportes de Pasto, Colombia). Instead of filling in forms, the user types in a chat, for example *"quiero ir a Cali esta noche, lo más barato"*, and an AI turns that sentence into a real search of routes, schedules and prices.

This repository is the **frontend**: the screens the user sees. All the search logic, the database and the AI live in the [backend](https://github.com/terminapp-pasto/terminapp-backend).

All code (folders, files, components, functions, variables, CSS classes and comments) is in English. Only the text
the user reads on screen is in Spanish, because TerminAPP is used by travellers in Colombia.

## Team

| Member | Role |
|---|---|
| Juan David Moreno | Backend, database and search engine |
| Felipe Alejandro Cerón | Frontend and payments |

Final project for **Data Structures** (Estructuras de Datos), Universidad Cooperativa de Colombia, Pasto campus.

## How it connects

```
User  →  Frontend (this repo, Vercel)  →  Backend (FastAPI, Render)  →  Database and AI
```

The frontend only talks to the backend. The AI, database and payment secret keys are never here.

## Progress

- [x] React + TypeScript project
- [x] Deployed on Vercel
- [x] AI chat with loading, error and result states
- [x] Search form with destination, date, time and sort filters
- [x] Sign up and log in
- [x] Step-by-step purchase: seats → each passenger's details → summary → payment
- [x] Stripe test payment, embedded inside the page
- [x] My trips: upcoming and past trips, with the amount paid
- [x] Forms validated with regular expressions and length limits
- [x] All code in English

## Running it on your computer

You need [Node.js](https://nodejs.org) (LTS version).

```bash
git clone https://github.com/terminapp-pasto/terminapp-frontend.git
cd terminapp-frontend
npm install
npm run dev
```

Then open `http://localhost:5173`. By default the page uses the backend published on Render.

To use a backend running on your computer (port 8001), copy `.env.example` to `.env.local` before `npm run dev`:

```powershell
Copy-Item .env.example .env.local
```

`.env.local` is never committed.

## Screens

| Screen | File | What it does |
|---|---|---|
| AI chat | `src/Chat.tsx` | Conversation with the assistant; departures appear as cards with a Buy button |
| Search | `src/SearchForm.tsx` | Search with filters, without AI |
| Purchase | `src/Purchase.tsx` | Full screen in 4 steps: seats, one passenger per seat, summary and payment |
| Payment | `src/EmbeddedPayment.tsx`, `src/stripe.ts` | Stripe form drawn inside the page (the user never leaves the site) |
| Account | `src/Account.tsx` | Sign up, log in and log out |
| My trips | `src/MyTickets.tsx` | History: upcoming and past trips, passengers, seats, total paid; finish paying or cancel |
| Validation | `src/validation.ts` | Regular expressions for name, document, email and password (the same as the backend) |

## Environment variables

They go in `.env.local` (on your computer) and in Vercel → Settings → Environment Variables. Never commit them.

| Variable | Purpose |
|---|---|
| `VITE_API_URL` | Backend address (defaults to the one on Render) |
| `VITE_STRIPE_PUBLISHABLE_KEY` | Stripe **publishable** test key (`pk_test_...`), needed for the embedded payment |
| `VITE_TEST_ACCOUNT_EMAIL`, `VITE_TEST_ACCOUNT_PASSWORD` | Test account shown on the login screen (optional) |

## Test payment

In the payment form use the card `4242 4242 4242 4242`, any future date and any CVC. No real money is charged.
