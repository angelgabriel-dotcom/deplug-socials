# Deplug Social

## Development

Start the API and frontend together:

```bash
npm run dev:full
```

The frontend runs at `http://localhost:5173` and the API runs at `http://localhost:3001`.

## Seeded development users

These accounts exist only in the local SQLite development database:

| Role | Email | Password |
| --- | --- | --- |
| Admin | `admin@deplugsocial.test` | `AdminTest123!` |
| Buyer | `buyer@deplugsocial.test` | `BuyerTest123!` |

Never use these credentials in production. The local database lives in `server/data/` and is excluded from Git.

## API endpoints

- `POST /api/auth/register`
- `POST /api/auth/login`
- `POST /api/auth/logout`
- `GET /api/auth/me`
- `GET /api/admin/check`

---

# React + Vite

This template provides a minimal setup to get React working in Vite with HMR and some ESLint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Oxc](https://oxc.rs)
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/)

## React Compiler

The React Compiler is not enabled on this template because of its impact on dev & build performances. To add it, see [this documentation](https://react.dev/learn/react-compiler/installation).

## Expanding the ESLint configuration

If you are developing a production application, we recommend using TypeScript with type-aware lint rules enabled. Check out the [TS template](https://github.com/vitejs/vite/tree/main/packages/create-vite/template-react-ts) for information on how to integrate TypeScript and [`typescript-eslint`](https://typescript-eslint.io) in your project.
