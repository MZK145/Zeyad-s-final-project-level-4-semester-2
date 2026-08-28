# MetroSync

MetroSync is a Node.js/Express + Socket.io real-time metro dashboard backed by MongoDB, with passenger and admin views.

## Backend

The backend provides:

- `GET /health` and `GET /api/v1/health` health checks
- `GET /api/v1/stations` station list sorted by line and order
- `POST /api/v1/auth/login` admin/passenger authentication with bcrypt + JWT
- `POST /api/v1/auth/signup` passenger registration
- `GET /api/v1/stations/:stationId/announcements` public paginated/filterable announcements
- `POST /api/v1/stations/:stationId/announcements` admin-only announcement creation
- Admin-protected station create/edit/delete operations
- Admin waiting-room monitoring with live passenger counts
- Socket.io station rooms, presence counts, live room updates, and announcement broadcasts

## Authentication and waiting rooms

1. Passenger or admin signs in with email and password.
2. The backend validates credentials and issues a JWT containing the user id and role.
3. The frontend connects Socket.io using the authenticated token.
4. Passengers can enter a station waiting room and are counted only in that room.
5. Admins can open a waiting room as observers without increasing the passenger count.
6. Admins can edit the station from inside the opened room.
7. Station edits emit `stationsUpdated`, and open passenger/admin views refresh the station data while preserving the live room count.
8. Refreshing the page restores the authenticated session; logout clears it.

## Local setup

1. Copy `backend/.env.example` to `backend/.env`.
2. Set `MONGO_URI`, a random `JWT_SECRET` of at least 32 characters, `ADMIN_EMAIL`, and `ADMIN_PASSWORD`.
3. Keep `backend/.env` out of Git; the repository `.gitignore` already excludes it.
4. From `backend/`, install dependencies:

```bash
npm ci
```

5. Seed the station list:

```bash
npm run seed:stations
```

6. Create/update the MongoDB admin record using bcrypt:

```bash
npm run seed:admin
```

7. Start the backend:

```bash
npm start
```

The local API listens on `http://localhost:5001` by default. The root launcher starts the frontend on port `8000` and the backend on port `5001`:

```bash
npm run dev
```

## Tests

Run the backend test suite with:

```bash
cd backend
npm test
```

The repository also has GitHub Actions CI that installs dependencies, runs the backend tests, syntax-checks backend source files, syntax-checks every frontend JavaScript file, and verifies the required frontend files exist.

## Postman

The rubric-aligned collection is stored at `postman/MetroSync.postman_collection.json`. It includes health, admin login, stations, announcements, and waiting-room requests with saved example responses.

## Render deployment

`render.yaml` contains the backend deployment configuration. Configure these production environment variables on Render:

- `MONGO_URI`
- `JWT_SECRET`
- `ADMIN_EMAIL`
- `ADMIN_PASSWORD`
- `FRONTEND_ORIGINS`

Render supplies the production `PORT` automatically. The configured health check is `/api/v1/health`.
