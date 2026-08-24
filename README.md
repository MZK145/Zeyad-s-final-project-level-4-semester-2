# MetroFlow

MetroFlow is a metro journey assistant with a Node.js/Express API, MongoDB persistence, Socket.IO live waiting rooms, and a static browser frontend.

## Requirements

- Node.js 18+
- MongoDB database

## Local setup

1. Install backend dependencies:
   `npm install --prefix backend`
2. Copy `backend/.env.example` to `backend/.env` and set at least `MONGO_URI` and a strong `JWT_SECRET`.
3. Start the complete app from the repository root:
   `npm run dev`
4. Open `http://localhost:8000` in your browser.

The root launcher starts the API on port 5000 and serves `frontend/` on port 8000. You can also run the backend alone with `npm start --prefix backend`.

## Frontend deployment

The frontend uses `window.BACKEND_URL` when provided. Otherwise it uses `http://localhost:5000` for local/file-based use and the current origin for a same-origin deployment. For a separately hosted frontend, set `window.BACKEND_URL` before `script.js` loads and add that site to `FRONTEND_ORIGINS` in the backend environment.

## Environment variables

See `backend/.env.example`. Never commit `backend/.env` or real credentials.

## Tests

Run the backend smoke tests with:

`npm test --prefix backend`

## Project structure

```text
backend/
  controllers/
  data/
  middleware/
  models/
  routes/
  services/
  sockets/
  server.js
frontend/
  index.html
  script.js
  style.css
start.js
```
