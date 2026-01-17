# iTeam - One Person, One Team

> AI-Powered Multi-Device Collaboration Management System

A modern web-based team collaboration platform designed for solo developers managing multiple AI-powered development devices. Coordinate different IDEs and devices through a unified command center.

## ✨ Core Concept

**One Person · Multiple Devices · Full Collaboration**

iTeam treats a single developer's multiple AI devices/agents as a virtual team:

- Assign different "roles" to each device (Frontend, Backend, DevOps, etc.)
- Allocate different task modules to each device
- Real-time monitoring of all device status and work progress
- Unified management of project progress, code commits, and documentation

## 🚀 Features

### Device Management
- Real-time device status monitoring (online/offline/working/idle)
- Detailed hardware information display (CPU, GPU, Memory, Disk)
- Device role assignment (Frontend, Backend, DevOps, QA, etc.)
- Device heartbeat with API Key authentication

### Dashboard
- Overview statistics (total devices, online count, active projects)
- Real-time device list with status indicators
- Beautiful animated UI with glassmorphism design

### Project Management
- Project tracking and status management
- Code contribution statistics
- Task assignment to devices

### Document Center
- Knowledge base management
- Category-based organization (Standards, Tech Notes, Bug Fixes)
- Full-text search functionality

### Authentication
- JWT-based user authentication
- API Key authentication for device agents
- Protected routes and secure API endpoints

## 🛠 Tech Stack

### Frontend
- React 18 + TypeScript
- Tailwind CSS (Modern UI design)
- React Router (Routing)
- Lucide Icons

### Backend
- Node.js + Express
- Prisma ORM
- SQLite (Development) / PostgreSQL (Production ready)
- WebSocket (Real-time communication)
- JWT + bcrypt (Authentication)

## 📁 Project Structure

```
iteam/
├── client/                 # Frontend application
│   ├── src/
│   │   ├── components/    # Reusable components
│   │   ├── contexts/      # React Context (Auth)
│   │   ├── pages/         # Page components
│   │   └── types/         # TypeScript types
│   └── package.json
│
├── server/                 # Backend service
│   ├── src/
│   │   ├── middleware/    # Express middleware
│   │   ├── routes/        # API routes
│   │   ├── utils/         # Utilities
│   │   └── websocket/     # WebSocket handlers
│   ├── prisma/            # Database schema
│   └── package.json
│
├── docs/                   # Project documentation
│   ├── features/          # Feature specifications
│   ├── api/               # API documentation
│   └── database/          # Database design
│
├── simulate-devices.sh     # Device simulation script
└── start-dev.sh           # Development startup script
```

## 🏃 Quick Start

### Prerequisites
- Node.js 18+
- npm or yarn

### Installation

```bash
# Clone the repository
git clone https://github.com/yourusername/iteam.git
cd iteam

# Install dependencies
cd server && npm install
cd ../client && npm install
```

### Development

```bash
# Start both frontend and backend (recommended)
./start-dev.sh

# Or start separately:
# Backend (port 3000)
cd server && npm run dev

# Frontend (port 5173)
cd client && npm run dev
```

### Simulate Devices

```bash
# Run the device simulation script
./simulate-devices.sh
```

## 📖 Documentation

Full documentation is available in the `/docs` directory:

- [Project Overview](./docs/overview/README.md)
- [Feature Specifications](./docs/features/README.md)
- [API Reference](./docs/api/README.md)
- [Database Design](./docs/database/README.md)
- [Changelog](./docs/CHANGELOG.md)

## 🗺 Roadmap

- [x] User authentication (Register/Login/Logout)
- [x] Device management with real-time status
- [x] Team role assignment
- [x] Dashboard with statistics
- [x] Device details modal (hardware info)
- [x] API Key authentication for devices
- [x] Project documentation
- [ ] Full project management UI
- [ ] Markdown document editor
- [ ] Real-time notifications
- [ ] Task assignment and tracking
- [ ] Code contribution analytics

## 🔐 API Authentication

### User Authentication (JWT)
```bash
curl -H "Authorization: Bearer <token>" \
  http://localhost:3000/api/devices
```

### Device Authentication (API Key)
```bash
curl -H "X-API-Key: iteam-device-key" \
  -X PUT http://localhost:3000/api/devices/:id \
  -d '{"status": "working"}'
```

## 📝 License

MIT

---

<p align="center">
  <strong>iTeam</strong> - Empower one person to work like a team
</p>
