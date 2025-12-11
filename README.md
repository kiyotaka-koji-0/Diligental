# 💬 Diligental

> **A modern, open-source, self-hosted Slack alternative for team communication**

Diligental is a powerful, lightweight, and completely free team messaging platform designed for fast and organized communication. Built with privacy and flexibility in mind, it's perfect for teams that want full control over their data.

---

## ✨ Features

### 🗨️ **Real-Time Messaging**
- **WebSocket-based** instant messaging with low latency
- **Threaded conversations** with parent-child message relationships
- **Direct Messages (DMs)** for one-on-one conversations
- **Message notifications** with mentions, replies, and system alerts
- **Typing indicators** and user presence tracking

### 📁 **Workspaces & Channels**
- **Multiple workspaces** for different teams or projects
- **Public and private channels** for organized discussions
- **Invite-based workspace access** with secure invite codes
- **Channel memberships** with join tracking and last-read status
- **Voice channel support** (planned)

### 👥 **User Management**
- **Role-based access control** (Admin, User roles)
- **Workspace member management** with admin and member roles
- **User authentication** with JWT access and refresh tokens
- **Secure password hashing** with bcrypt

### 🔔 **Notifications**
- **Real-time notifications** for mentions, replies, and system events
- **Read/unread tracking** for better message management
- **Redis-powered** notification delivery

### 🔐 **Security & Privacy**
- **Self-hosted** - full control over your data
- **Tailscale integration** for secure remote access
- **JWT-based authentication** with secure token handling
- **PostgreSQL database** for reliable data storage
- **Redis caching** for performance and rate limiting

### 🤖 **AI Integration (Optional)**
- Pluggable AI features with user-defined inference servers
- Message and thread summarization
- Smart search capabilities
- Auto-reply suggestions

### 🎨 **Modern UI**
- Built with **Next.js 16** and **React 19**
- **Tailwind CSS** for beautiful, responsive design
- **Radix UI components** for accessible interfaces
- **Real-time updates** without page refreshes

---

## 🛠️ Tech Stack

### Frontend
- **Next.js 16** with TypeScript
- **React 19** with React Hook Form
- **Tailwind CSS** for styling
- **Radix UI** components (Avatar, Dialog, Dropdown, Context Menu)
- **Zod** for validation
- **Lucide React** for icons

### Backend
- **FastAPI** (Python) for high-performance REST API
- **PostgreSQL** for persistent data storage
- **Redis** for caching and real-time features
- **SQLAlchemy** for ORM
- **WebSockets** for real-time communication
- **Uvicorn** ASGI server
- **JWT** authentication with python-jose

---

## 🚀 Getting Started

### Prerequisites

Before you begin, ensure you have:
- **Node.js** (v20+)
- **Python** (v3.10+)
- **PostgreSQL** (v15+)
- **Redis** (v7+)
- **Git**
- **uv** (Python package manager) or pip

---

## 📦 Installation

### Option 1: Local Development Setup

#### 1️⃣ Clone the Repository
```bash
git clone https://github.com/kiyotaka-koji-0/Diligental.git
cd Diligental
```

#### 2️⃣ Automated Setup
Run the setup script to install all dependencies:
```bash
chmod +x setup_local.sh
./setup_local.sh
```

This will:
- Install Python dependencies with `uv`
- Install Node.js dependencies with `npm`
- Create virtual environments

#### 3️⃣ Configure Environment Variables

Create a `.env` file in the `backend` directory:
```bash
cd backend
cp .env.example .env  # If .env.example exists
```

Edit `.env` with your configuration:
```env
DATABASE_URL=postgresql://user:password@localhost:5432/diligental
REDIS_URL=redis://localhost:6379/0
JWT_SECRET=your-super-secret-jwt-key-change-this
```

#### 4️⃣ Start Required Services

Make sure PostgreSQL and Redis are running:
```bash
# Start PostgreSQL (if using system service)
sudo systemctl start postgresql

# Start Redis (if using system service)
sudo systemctl start redis

# Or use Docker for services:
docker run -d -p 5432:5432 -e POSTGRES_PASSWORD=password -e POSTGRES_DB=diligental postgres:15-alpine
docker run -d -p 6379:6379 redis:7-alpine
```

#### 5️⃣ Run the Application

Use the helper script to start both services:
```bash
chmod +x run_local.sh
./run_local.sh
```

Or start them manually in separate terminals:

**Terminal 1 - Backend:**
```bash
cd backend
uv run uvicorn main:app --reload --host 0.0.0.0 --port 8001
```

**Terminal 2 - Frontend:**
```bash
cd frontend
npm run dev
```

#### 6️⃣ Access the Application
- **Frontend:** http://localhost:3000
- **Backend API:** http://localhost:8001
- **API Docs:** http://localhost:8001/docs

**Default Admin Credentials:**
- Username: `admin`
- Password: `admin123`

---

### Option 2: Docker Compose (Recommended for Production)

#### 1️⃣ Clone the Repository
```bash
git clone https://github.com/kiyotaka-koji-0/Diligental.git
cd Diligental
```

#### 2️⃣ Start All Services
```bash
docker-compose up -d
```

This will start:
- Frontend (Next.js) on port `3001`
- Backend (FastAPI) on port `8001`
- PostgreSQL on port `5433`
- Redis on port `6380`

#### 3️⃣ Access the Application
- **Frontend:** http://localhost:3001
- **Backend API:** http://localhost:8001
- **API Docs:** http://localhost:8001/docs

#### 4️⃣ View Logs
```bash
docker-compose logs -f
```

#### 5️⃣ Stop Services
```bash
docker-compose down
```

---

## 🔒 Secure Remote Access with Tailscale

For secure remote access to your self-hosted Diligental instance without exposing it to the public internet:

1. **Install Tailscale** on your server and client devices:
   ```bash
   curl -fsSL https://tailscale.com/install.sh | sh
   ```

2. **Connect to your Tailnet:**
   ```bash
   sudo tailscale up
   ```

3. **Access Diligental** using your server's Tailscale IP address or machine name

4. **Optional:** Configure HTTPS with your Tailscale certificate for encrypted traffic:
   - Certificates are included in the repo: `kiyotaka.starling-kanyu.ts.net.crt` and `kiyotaka.starling-kanyu.ts.net.key`
   - Configure your web server (Nginx, Caddy) to use these certificates

---

## 🧪 Development

### Running Tests
```bash
# Backend tests
cd backend
uv run pytest

# Frontend tests (if available)
cd frontend
npm test
```

### Building for Production

**Frontend:**
```bash
cd frontend
npm run build
npm start
```

**Backend:**
```bash
cd backend
uv run uvicorn main:app --host 0.0.0.0 --port 8001
```

### Database Management
```bash
# Reset database (development only)
cd backend
python reset_db.py
```

---

## 📚 API Documentation

Once the backend is running, visit:
- **Swagger UI:** http://localhost:8001/docs
- **ReDoc:** http://localhost:8001/redoc

---

## 🏗️ Project Structure

```
Diligental/
├── frontend/              # Next.js React application
│   ├── src/
│   │   ├── app/          # Next.js app router pages
│   │   ├── components/   # React components
│   │   ├── hooks/        # Custom React hooks
│   │   └── lib/          # Utility functions
│   └── package.json
├── backend/               # FastAPI Python application
│   ├── routes/           # API route handlers
│   │   ├── auth.py      # Authentication endpoints
│   │   ├── channels.py  # Channel management
│   │   ├── users.py     # User management
│   │   ├── workspaces.py # Workspace management
│   │   ├── notifications.py # Notifications
│   │   └── ws.py        # WebSocket handlers
│   ├── models.py         # SQLAlchemy models
│   ├── schemas.py        # Pydantic schemas
│   ├── crud.py           # Database operations
│   ├── security.py       # Auth & security
│   ├── main.py           # FastAPI application
│   └── requirements.txt
├── docker-compose.yml     # Docker orchestration
├── setup_local.sh         # Local setup script
└── run_local.sh          # Local run script
```

---

## 🤝 Contributing

We welcome contributions! Here's how you can help:

1. **Fork** the repository
2. **Create** a feature branch (`git checkout -b feature/amazing-feature`)
3. **Commit** your changes (`git commit -m 'Add some amazing feature'`)
4. **Push** to the branch (`git push origin feature/amazing-feature`)
5. **Open** a Pull Request

---

## 🐛 Issues & Support

Found a bug or have a feature request? Please open an issue on [GitHub Issues](https://github.com/kiyotaka-koji-0/Diligental/issues).

---

## 📄 License

This project is licensed under the **MIT License** - see the [LICENSE](LICENSE) file for details.

---

## 🌟 Why Choose Diligental?

✅ **100% Free & Open Source** - No hidden costs or licensing fees  
✅ **Self-Hosted** - Your data stays with you  
✅ **Modern Stack** - Built with latest technologies  
✅ **Real-Time** - WebSocket-based instant messaging  
✅ **Scalable** - Redis and PostgreSQL for production use  
✅ **Extensible** - Clean API for integrations  
✅ **Privacy-Focused** - Tailscale integration for secure access  

---

<div align="center">
  <strong>Made with ❤️ by the Diligental community</strong>
  <br>
  <sub>Star ⭐ this repo if you find it useful!</sub>
</div>
