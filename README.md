# MetroSync – Alternate Flow

A redesigned MetroSync application with a different frontend flow from the original project.

## New flow
- Landing dashboard → choose **Plan Journey** or **Admin Console**.
- Journey planner uses a step-by-step route card instead of the original stacked forms.
- Passenger waiting rooms update live through Socket.IO.
- Admin station editor uses a drawer-style editor and refreshes all open views after changes.

## Run
1. Create `backend/.env` from `backend/.env.example`.
2. Run `npm install` inside `backend`.
3. Run `npm start`.
4. Serve `frontend/` from the same host or configure `BACKEND_URL` in `frontend/index.html`.
