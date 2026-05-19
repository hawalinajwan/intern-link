# intern-link

Modern internship recruitment platform using Next.js, PHP, Node.js, MySQL, MongoDB, and Socket.IO.

## Getting Started

For local development with Docker:

```powershell
docker compose up -d
```

Local services:

- Frontend: `http://localhost:3001`
- PHP API: `http://localhost:8000`
- Node chat: `http://localhost:3000`
- MySQL: `localhost:3306`
- MongoDB: `localhost:27017`

For frontend-only development:

```powershell
npm install
npm run dev
```

## Environment

Frontend:

```env
NEXT_PUBLIC_API_URL=http://localhost:8000
NEXT_PUBLIC_SOCKET_URL=http://localhost:3000
```

PHP API:

```env
DB_HOST=127.0.0.1
DB_NAME=magang_db
DB_USER=root
DB_PASS=
CHAT_SERVER_URL=http://localhost:3000
```

Node chat:

```env
MONGODB_URI=mongodb://127.0.0.1:27017/magang_chat
PORT=3000
```

See [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md) for GitHub, Vercel, backend, and database setup.
