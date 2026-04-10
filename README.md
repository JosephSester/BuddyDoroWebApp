# BuddyDoro
A web app combining Pomodoro productivity with a virtual companion.

## Prerequisites

Before running the project, make sure you have the following installed:

- **Node.js** (v16 or higher) - [Download here](https://nodejs.org/)
- **MongoDB Community Edition** - [Download here](https://www.mongodb.com/try/download/community)

## Setup Instructions

### 1. Install MongoDB

**Windows:**
1. Download MongoDB Community Edition from the link above
2. Run the installer with default settings
3. During installation, select "Install MongoDB as a Service" (recommended)
4. MongoDB will automatically start as a Windows service
5. Verify installation: Open PowerShell and run `mongod --version`

**Mac:**
```bash
# Using Homebrew
brew tap mongodb/brew
brew install mongodb-community
brew services start mongodb-community
```

**Linux:**
```bash
# Ubuntu/Debian
sudo apt-get install -y mongodb-org
sudo systemctl start mongod
sudo systemctl enable mongod
```

### 2. Install Dependencies

Navigate to the server directory and install packages:

```bash
cd buddydoro/server
npm install
```

### 3. Configure Environment Variables

Create a `.env` file in the `buddydoro/server` directory:

```bash
# buddydoro/server/.env
JWT_SECRET=your_secret_key_change_this_in_production_12345
MONGO_URI=mongodb://localhost:27017/buddydoro
```

**Important:** Change the `JWT_SECRET` to a secure random string in production.

### 4. Start the Server

From the `buddydoro/server` directory:

```bash
node server.js
```

The server will start on `http://localhost:3000`

You should see:
```
[dotenv] injecting env from .env
Server listening on port 3000
MongoDB connected
```

### 5. Open the Frontend

Open `buddydoro/apps/web/public/login.html` in your browser or use a local development server.

If you have VS Code with Live Server extension:
1. Right-click on `login.html`
2. Select "Open with Live Server"

## Project Structure

```
buddydoro/
├── server/               # Express.js backend
│   ├── models/          # MongoDB models (User, Task)
│   ├── routes/          # API endpoints (auth, tasks)
│   ├── authMiddleware.js
│   └── server.js
├── apps/
│   └── web/             # Frontend application
│       ├── js/
│       │   ├── api/     # API client & services
│       │   ├── features/# Task management, timer, etc.
│       │   └── utils/   # Shared utilities (notifications)
│       ├── styles/      # CSS files
│       └── public/      # HTML pages
```

## Available Features

- ✅ User authentication (signup/login)
- ✅ Task management (create, update, delete)
- ✅ Protected routes with JWT
- ✅ Toast notifications system
- 🚧 Timer/Pomodoro functionality
- 🚧 Doro currency system
- 🚧 Virtual pet/companion

## Troubleshooting

**MongoDB connection refused:**
- Make sure MongoDB service is running
- Windows: Check Services app for "MongoDB" service
- Mac/Linux: Run `sudo systemctl status mongod` or `brew services list`

**Port 3000 already in use:**
- Change the port in `server.js`
- Or kill the process using port 3000

**JWT authentication errors:**
- Clear browser localStorage
- Check that `.env` file exists with `JWT_SECRET`

## Moving to Cloud Database

Currently using local MongoDB. Will migrate to MongoDB Atlas soon for team collaboration.

## API Endpoints

### Authentication
- `POST /api/auth/signup` - Create new user
- `POST /api/auth/login` - Login and get JWT token

### Tasks (requires authentication)
- `GET /api/tasks` - Get all user tasks
- `POST /api/tasks` - Create a new task
- `PUT /api/tasks/:id` - Update a task
- `DELETE /api/tasks/:id` - Delete a task

## Team Setup (Stripe Test Mode)

Use these steps so each teammate can run payments locally with their own Stripe test account.

### 1. Create env file from example

From `buddydoro/`:

```bash
copy .env.example .env
```

Fill these values in `buddydoro/.env`:

- `MONGO_URI`
- `JWT_SECRET`
- `STRIPE_SECRET_KEY` (from Stripe test mode)
- `STRIPE_PUBLISHABLE_KEY` (from Stripe test mode)

### 2. Install dependencies

```bash
cd buddydoro
npm install
```

### 3. Start backend API

```bash
node server/server.js
```

### 4. Start frontend static server (repo root)

```bash
node serve.mjs
```

Open: `http://localhost:9090/public/login.html`

### 5. Test a transaction

1. Sign up or log in.
2. Open Buy Diamonds.
3. Use Stripe test card `4242 4242 4242 4242`.
4. Use any future expiry, any CVC, and valid ZIP/postal code.

You should see the in-app confirmation page and a test payment in Stripe Dashboard (Test mode).
