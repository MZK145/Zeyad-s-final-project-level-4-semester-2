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

## Login flow

The login flow follows the strong parts of the companion Mohamed project while keeping Zeyad's own architecture:

1. Passenger or admin submits email and password.
2. The backend normalizes the email and validates the password length.
3. Admin is looked up first in MongoDB; passenger users are checked second.
4. The stored bcrypt hash is compared through the model's `comparePassword()` method.
5. A JWT containing the user id, role, issuer, and audience is returned.
6. The frontend saves the token and role, connects Socket.IO with the authenticated token, and opens the correct passenger/admin dashboard.
7. Refreshing the page restores the session; logout clears the token and returns to login.

For admin credentials, the account must exist in MongoDB. After changing `ADMIN_EMAIL` or `ADMIN_PASSWORD`, run `npm run seed:admin` again.

## Local setup

1. Copy `backend/.env.example` to `backend/.env`.
2. Set `MONGO_URI`, `JWT_SECRET`, `ADMIN_EMAIL`, and `ADMIN_PASSWORD`.
3. Make sure the local backend port is `5001` in `backend/.env`:

```env
PORT=5001
```

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

7. Start the API:

```bash
npm start
```

The local API listens on `http://localhost:5001` by default and the health endpoint is `/api/v1/health`.

## Frontend

Serve `frontend/` with the root launcher:

```bash
npm run dev
```

The root launcher keeps the frontend on port `8000` and the API on port `5001` so the two local services do not conflict.

The frontend now includes a guided authentication experience, password visibility controls, saved login email, session restoration, and visual MetroFlow network/station illustrations under `frontend/assets/`.

The frontend can also be served by any static host. Set `window.BACKEND_URL` to the deployed API URL when the frontend and API are hosted separately.

## Tests

Run the backend tests with:

```bash
cd backend
npm test
```

The test suite covers the rubric-required station 200 response, valid admin login token, protected announcement POST returning 401, and authentication validation.

## Postman

The rubric-aligned collection is stored at `postman/MetroSync.postman_collection.json`. Its local `baseUrl` is `http://localhost:5001`.

## Render deployment

`render.yaml` contains the backend deployment configuration. Configure these production environment variables on Render:

- `MONGO_URI`
- `JWT_SECRET`
- `ADMIN_EMAIL`
- `ADMIN_PASSWORD`
- `FRONTEND_ORIGINS`

Render supplies the production `PORT` automatically, so the local `5001` setting is only a development default. Render uses `/api/v1/health` as the health check.
