# Relay

<div align="center">
  <img src="client/public/relay.png" alt="Relay logo" width="150" />
  <h1>Relay</h1>
  <p>Real-time conversations, made simple.</p>
  <p>
    <a href="https://github.com/leobertcamoro101-lab/Relay/actions/workflows/tests.yml">
      <img src="https://github.com/leobertcamoro101-lab/Relay/actions/workflows/tests.yml/badge.svg?branch=main" alt="Tests workflow status" />
    </a>
    <img src="https://img.shields.io/badge/React-19-149eca?logo=react&logoColor=white" alt="React 19" />
    <img src="https://img.shields.io/badge/TypeScript-6-3178c6?logo=typescript&logoColor=white" alt="TypeScript 6" />
    <img src="https://img.shields.io/badge/Node.js-24-339933?logo=nodedotjs&logoColor=white" alt="Node.js 24" />
  </p>
</div>

Relay is a full-stack chat app with a React and TypeScript client, an Express API, and a WebSocket server. Create an account, manage your profile, find people, and chat in real time.

## What you can do

- Sign up, sign in, and recover a forgotten password
- Search for people and start direct conversations
- Send, edit, and delete messages with real-time updates
- See conversation history and who's online
- Update your profile and upload an avatar

## How it works

```text
React client (Vite)
  |-- REST API: authentication, profiles, conversations
  |-- WebSocket: live chat, presence, typing
  v
Express + WebSocket server
  |-- MongoDB: users, conversations, messages
  |-- Cloudinary: profile images (optional)
  |-- Brevo: password-reset email (optional)
```

## Built with

| Area | Technologies |
| --- | --- |
| Client | React 19, TypeScript, Vite, Tailwind CSS, React Router |
| Server | Node.js, Express 5, TypeScript, MongoDB, Mongoose |
| Real-time | WebSocket (`ws`) |
| Validation and security | Zod, JWT, Helmet, Express rate limit |
| Tests | Vitest, Testing Library, Playwright |

## Run locally

### Prerequisites

- Node.js 24 and npm
- MongoDB, local or hosted
- Optional service credentials for Cloudinary image uploads and Brevo password-reset email

### 1. Clone and install

```bash
git clone https://github.com/leobertcamoro101-lab/Relay.git
cd Relay

cd server
npm ci
cd ../client
npm ci
cd ../e2e
npm ci
cd ..
```

### 2. Configure the server

Create `server/.env`:

```env
PORT=8080
NODE_ENV=development
JWT_KEY=replace_with_a_long_random_secret
MONGO_URI=mongodb://localhost:27017
DB_NAME=relay
FRONTEND_URL=http://localhost:5173

# Needed to send password-reset emails
GMAIL_USER=your_sender_email@example.com
BREVO_API_KEY=your_brevo_api_key

# Optional: profile image uploads
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_cloudinary_api_key
CLOUDINARY_API_SECRET=your_cloudinary_api_secret

# Optional: error reporting
SENTRY_DSN=your_sentry_dsn
```

Keep real credentials private; do not commit `.env` files. `JWT_KEY` must be a private, unpredictable secret. Set `FRONTEND_URL` to the deployed client origin when deploying.

### 3. Start the app

In separate terminals, run the server and client:

```bash
cd server
npm run dev
```

```bash
cd client
npm run dev
```

By default, Vite serves the client at `http://localhost:5173`; the server listens on port `8080` for both the API and WebSocket connections. The client needs its API base URL and defaults to `ws://localhost:8080` for WebSockets. Create `client/.env.local` with:

```env
VITE_BACKEND_URL=http://localhost:8080/api
VITE_WS_URL=ws://localhost:8080
```

## Tests and checks

### Client

```bash
cd client
npm test
npm run lint
npm run build
```

### Server

```bash
cd server
npm test
npm run build
```

### Browser end-to-end tests

Playwright starts the client and server for the test run. Install the browser once, then run the suite:

```bash
cd e2e
npx playwright install chromium
npm test
```

Use `npm run test:ui` for Playwright's interactive runner or `npm run report` to open the last test report. More detail is available in the [E2E test guide](e2e/README.md).

The GitHub Actions workflow runs client and server tests on pushes and pull requests to `main`. E2E tests also run, but are currently non-blocking.

## Contributing

Contributions and bug reports are welcome. Before opening a pull request:

1. Create a focused branch for your change.
2. Run the relevant tests and checks above.
3. Open a pull request with a clear summary and testing notes.

## License

No license is currently included. All rights are reserved unless the repository owner states otherwise. Add a `LICENSE` file before redistributing or reusing this project.
