# intern-link Deployment Setup

This repo is a three-service app:

- Next.js frontend: deploy to Vercel.
- PHP REST API: deploy to a Docker-capable host.
- Node.js Socket.IO chat server: deploy to a Docker-capable host.
- MySQL and MongoDB: use managed database providers or Docker on a VPS.

Vercel should host only the Next.js frontend. The PHP API, Socket.IO server, MySQL, and MongoDB need their own hosting because the app uses long-running backend services and WebSocket connections.

## 1. Databases

### MySQL

Create a MySQL database named `magang_db`, then import:

```bash
mysql -u USER -p magang_db < backend-php/config/schema.sql
```

Set these environment variables on the PHP API host:

```env
DB_HOST=your-mysql-host
DB_NAME=magang_db
DB_USER=your-mysql-user
DB_PASS=your-mysql-password
CHAT_SERVER_URL=https://your-node-chat-domain
```

### MongoDB

Create a MongoDB database named `magang_chat`.

Set this environment variable on the Node chat host:

```env
MONGODB_URI=mongodb+srv://USER:PASSWORD@HOST/magang_chat
PORT=3000
```

Mongoose creates the chat collections automatically when rooms/messages are created.

## 2. Deploy Backend PHP API

Deploy `backend-php` as a Docker service using [backend-php/Dockerfile](../backend-php/Dockerfile).

Required environment variables:

```env
DB_HOST=your-mysql-host
DB_NAME=magang_db
DB_USER=your-mysql-user
DB_PASS=your-mysql-password
CHAT_SERVER_URL=https://your-node-chat-domain
```

After deploy, the API should answer:

```text
https://your-php-api-domain/lowongan
```

## 3. Deploy Backend Node Chat

Deploy `backend-node` as a Docker service using [backend-node/Dockerfile](../backend-node/Dockerfile).

Required environment variables:

```env
MONGODB_URI=mongodb+srv://USER:PASSWORD@HOST/magang_chat
PORT=3000
```

After deploy, the chat server should answer:

```text
https://your-node-chat-domain/health
```

## 4. Deploy Frontend to Vercel

Connect this GitHub repository to Vercel.

Use these Vercel settings:

```text
Framework Preset: Next.js
Root Directory: ./
Build Command: npm run build
Install Command: npm ci
```

Set these Vercel environment variables:

```env
NEXT_PUBLIC_API_URL=https://your-php-api-domain
NEXT_PUBLIC_SOCKET_URL=https://your-node-chat-domain
```

Then redeploy the Vercel project.

## 5. Local Docker Setup

For local development:

```bash
docker compose up -d
```

Local ports:

- Frontend: `http://localhost:3001`
- PHP API: `http://localhost:8000`
- Node chat: `http://localhost:3000`
- MySQL: `localhost:3306`
- MongoDB: `localhost:27017`

## Production Checklist

- MySQL schema imported from `backend-php/config/schema.sql`.
- PHP API has `DB_*` and `CHAT_SERVER_URL`.
- Node chat has `MONGODB_URI`.
- Vercel has `NEXT_PUBLIC_API_URL` and `NEXT_PUBLIC_SOCKET_URL`.
- Frontend URL is allowed by any production CORS policy if CORS is tightened later.
- CV upload storage is persistent on the PHP host. For production scale, move CV files to object storage.
