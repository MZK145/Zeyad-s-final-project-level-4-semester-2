# MetroSync

MetroSync is a Node.js/Express + Socket.io real-time metro dashboard backed by MongoDB, with passenger and admin views.

## Backend

The backend provides:

- `GET /api/v1/health` health check
- `GET /api/v1/stations` station list sorted by line and order
- `POST /api/v1/auth/login` admin/user authentication with JWT
- `POST /api/v1/auth/signup` passenger registration
- `GET /api/v1/stations/:stationId/announcements` public paginated/filterable announcements
- `POST /api/v1/stations/:stationId/announcements` admin-only announcement creation
- Socket.io station rooms, presence counts, and live announcement broadcasts

## Local setup

1. Copy `backend/.env.example` to `backend/.env`.
2. Set `MONGO_URI`, `JWT_SECRET`, `ADMIN_EMAIL`, and `ADMIN_PASSWORD`.
3. From `backend/`, install dependencies:

```bash
npm ci
```

4. Seed the station list:

```bash
npm run seed:stations
```

5. Create/update the MongoDB admin record using bcrypt:

```bash
npm run seed:admin
```

6. Start the API:

```bash
npm start
```

The API listens on `http://localhost:5000` by default and the health endpoint is `/api/v1/health`.

## Frontend

Serve `frontend/` with the root launcher:

```bash
npm run dev
```

The frontend can also be served by any static host. Set `window.BACKEND_URL` to the deployed API URL when the frontend and API are hosted separately.

## Tests

Run the backend tests with:

```bash
cd backend
npm test
```

The test suite covers the rubric-required station 200 response, valid admin login token, protected announcement POST returning 401, and authentication validation.

## Postman

The rubric-aligned collection is stored at `postman/MetroSync.postman_collection.json`. It includes login, stations, announcement list, and announcement create requests with saved example responses.

## Render deployment

`render.yaml` contains the backend deployment configuration. Configure these production environment variables on Render:

- `MONGO_URI`
- `JWT_SECRET`
- `ADMIN_EMAIL`
- `ADMIN_PASSWORD`
- `FRONTEND_ORIGINS`

Render uses `/api/v1/health` as the health check. After deployment, verify the public API health endpoint and update the Postman `baseUrl` variable to the deployed URL.
