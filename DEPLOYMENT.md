# Running KrushiVani locally and on Render

The same source code supports both environments.

## Local development

1. Copy `backend/.env.example` to `backend/.env` and add your MongoDB and Sarvam values.
2. Leave `ML_API_URL` unset to use the local Python image model configured in `backend/src/routes/imageRoutes.js`.
3. Run the backend from `backend` with `npm run dev`.
4. Run the frontend from `frontend` with `npm run dev`.

The frontend automatically uses `http://localhost:5000` during local development.

## Render deployment

Set `VITE_API_URL` on the `KrushiVani` frontend service to the public URL of `KrushiVani_backend`.

Set `MONGO_URL`, `SARVAM_API_KEY`, and `ML_API_URL` on `KrushiVani_backend`. `ML_API_URL` must be the public URL of `KrushiVani_ML`.

The browser calls only the backend. The backend forwards image files to the ML service, keeping the ML service independent of the frontend.
