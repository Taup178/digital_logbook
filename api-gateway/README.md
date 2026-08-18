# API Gateway

Top-level API gateway that proxies frontend requests to backend microservices.

Defaults (see `.env.example`):
- `PORT=5050`
- `AUTH_SERVICE_URL=http://localhost:5001`
- `DASHBOARD_SERVICE_URL=http://localhost:5002`
- `PROJECT_SERVICE_URL=http://localhost:5003`
- `PROFILE_SERVICE_URL=http://localhost:5004`

Start locally:

```
cd api-gateway
npm install
npm start
```

The gateway exposes these prefixes for the frontend:
- `/auth` -> auth service
- `/dashboard` -> dashboard service
- `/projects` -> project service
- `/profile` -> profile service
