# MetroFlow

A restructured MetroSync implementation with the same core output and behavior, but a different frontend flow and code organization.

## Features
- Passenger signup/login
- Governorate → city → station journey flow
- Live station waiting rooms with Socket.IO presence
- Station announcements
- Admin station add/edit/delete
- Real-time station synchronization after changes
- Separate controllers/services/routes/models on the backend

## Run backend
1. Copy `backend/.env.example` to `backend/.env`.
2. Set `MONGO_URI` and `JWT_SECRET`.
3. Run `npm install` then `npm start` from `backend`.
4. Serve `frontend/` with any static host, setting `window.BACKEND_URL` when backend is hosted separately.
