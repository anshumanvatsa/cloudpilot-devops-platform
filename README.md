# 🚀 CloudPilot – DevOps Deployment & Monitoring Platform

🌐 **Live Demo:**
👉 http://cloudpilot.13.60.57.168.sslip.io/

---

## 🧠 Overview

CloudPilot is a full-stack DevOps platform that enables users to **deploy applications, monitor infrastructure, and analyze system behavior in real-time**.

It replicates core functionalities of modern cloud platforms like **Vercel / Render / AWS dashboards**, built from scratch using a scalable microservices-style architecture.

---

## ✨ Key Features

### 🔐 Authentication

* JWT-based login system
* CSRF protection
* Token refresh & session handling

### 🚀 Deployment Management

* Create and manage deployments
* Restart and rollback functionality
* Deployment status tracking:

  * `building`
  * `success`
  * `failed`
  * `pending`

### 📊 Real-Time Monitoring

* CPU usage tracking
* Memory utilization
* Request throughput & latency
* Network metrics
* Live updates via **WebSockets**

### 📜 Logs System

* Real-time log streaming
* Pagination and filtering
* Supports multiple log levels:

  * info / warn / error / debug

### 🚨 Alerts System

* View system alerts
* Acknowledge alerts
* Severity-based classification

---

## 🏗️ Architecture

```id="arch02"
User (Browser)
      ↓
   Nginx (Reverse Proxy)
      ↓
Frontend (React + Vite)
      ↓
Backend (FastAPI)
      ↓
PostgreSQL + Redis
```

---

## 🛠️ Tech Stack

### Frontend

* React (Vite)
* TypeScript
* Zustand (state management)
* Tailwind CSS

### Backend

* FastAPI
* PostgreSQL
* Redis
* JWT Authentication

### DevOps / Infrastructure

* Docker & Docker Compose
* Nginx Reverse Proxy
* AWS EC2 Deployment

---

## 📁 Project Structure

```id="struct02"
cloudpilot-devops-platform/
│
├── backend/
│   ├── app/
│   │   ├── api/          # API routes
│   │   ├── core/         # Config, security, middleware
│   │   ├── models/       # Database models
│   │   ├── services/     # Business logic
│   │   └── main.py
│
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   ├── pages/
│   │   ├── services/
│   │   └── store/
│
├── infra/
│   └── nginx.conf        # Reverse proxy setup
│
├── docker-compose.yml
└── README.md
```

---

## ⚙️ How It Works

1. User interacts with the frontend UI
2. Requests are routed via **Nginx**
3. API calls go to **FastAPI backend**
4. Backend interacts with:

   * PostgreSQL (data storage)
   * Redis (caching / real-time support)
5. Real-time updates are pushed using **WebSockets**

---

## ⚙️ Local Setup

### 1. Clone the Repository

```bash id="run11"
git clone https://github.com/your-username/cloudpilot-devops-platform.git
cd cloudpilot-devops-platform
```

---

### 2. Configure Environment

Create `.env` in backend:

```env id="env11"
POSTGRES_USER=postgres
POSTGRES_PASSWORD=postgres
POSTGRES_DB=appdb
DATABASE_URL=postgresql://postgres:postgres@postgres:5432/appdb
SECRET_KEY=your_secret_key
```

---

### 3. Run with Docker

```bash id="run12"
docker-compose up -d --build
```

---

### 4. Access Application

* Frontend: http://localhost
* API Docs: http://localhost:8000/docs

---

## 🔄 Routing (Nginx)

```id="route02"
/        → Frontend (React)
/api/    → Backend (FastAPI)
```

---

## 🔌 WebSocket Endpoints

```id="ws02"
/ws/metrics → Real-time metrics
/ws/logs    → Real-time logs
```

---

## 🔐 Authentication Flow

1. Login → `/api/auth/login`
2. Backend returns:

   * access_token
   * csrf_token
3. Tokens stored in frontend
4. Used for authenticated API calls

---

## ☁️ Deployment

Deployed on **AWS EC2** using Docker:

```bash id="aws11"
docker-compose up -d --build
```

Access:
👉 http://cloudpilot.13.60.57.168.sslip.io/

---

## ⚠️ Limitations

* HTTPS not configured (requires SSL setup)
* No Kubernetes orchestration (Docker Compose only)
* Basic authentication (no OAuth)

---

## 🚀 Future Enhancements

* HTTPS (Let's Encrypt)
* CI/CD pipeline automation
* Kubernetes deployment
* Advanced analytics dashboard

---

## 👨‍💻 Author

**Anshuman**

---

## ⭐ Support

If you found this useful, consider giving it a ⭐ on GitHub!

