# Scalable Task Manager API & Frontend UI

A secure, role-based task management application built using Python (FastAPI), SQLAlchemy ORM (SQLite), and a responsive glassmorphic HTML/JS single-page frontend.

## Features

- **JWT Authentication**: User registration and login with password hashing using bcrypt and stateless token authorization.
- **Role-Based Access Control (RBAC)**: Enforces access layers for standard users and admins. Standard users can only perform CRUD operations on their own tasks, while administrators have access to global metrics, user lists, and role management.
- **RESTful Task CRUD**: Full CRUD support for tasks, including pagination, filtering by task status, and user-scoping.
- **Validation & Error Handling**: Pydantic schemas validate input payloads (such as email formatting and title length checks), returning clean error structures.
- **Postman & Swagger Integration**: Includes a pre-configured Postman Collection (api_documentation.json) and auto-generated Swagger UI.

---

## Directory Structure

```text
scalble api/
├── backend/
│   ├── app/
│   │   ├── config.py         # Application configurations (JWT, database connection)
│   │   ├── database.py       # DB engine creation and session scoping
│   │   ├── models.py         # SQLAlchemy schemas (Users, Tasks)
│   │   ├── main.py           # FastAPI entrypoint, error mapping, static serving
│   │   ├── schemas/          # Pydantic schemas (auth, task)
│   │   ├── routers/          # Modular routes (auth, tasks, admin)
│   │   └── utils/            # JWT and security helpers
│   └── static/               # HTML/CSS/JS frontend files served at /
├── api_documentation.json    # Postman collection
├── requirements.txt          # Python dependencies
└── README.md
```

---

## Getting Started

### 1. Setup Virtual Environment
Run the following in the project root:
```bash
# Create venv
python -m venv .venv

# Activate venv (Windows)
.venv\Scripts\activate

# Install requirements
pip install -r requirements.txt
```

### 2. Run the Application
Start the development server with Uvicorn:
```bash
python -m uvicorn backend.app.main:app --reload
```
The application will start at: `http://127.0.0.1:8000` (or `http://127.0.0.1:8001` if port 8000 is occupied).

- **Web UI**: Open `http://127.0.0.1:8000/` (or `8001`) in your browser.
- **Swagger Docs**: Open `http://127.0.0.1:8000/api/v1/docs` (or `8001`).

**Seed Credentials**:
On startup, the database automatically creates a default administrator:
- **Email**: admin@example.com
- **Password**: admin123

You can register standard users from the UI and log in as the administrator to toggle roles or view stats.

---

## API Endpoints

All endpoints are versioned under `/api/v1/`.

| Endpoint | Method | Auth Required | Description |
| :--- | :---: | :---: | :--- |
| `/auth/register` | `POST` | No | Registers a new account. |
| `/auth/login` | `POST` | No | Validates credentials and returns JWT. |
| `/auth/login/swagger`| `POST` | No | Form-data login for Swagger UI authorization flow. |
| `/auth/me` | `GET` | Yes | Retrieves current user profile. |
| `/tasks/` | `POST` | Yes | Creates a new task. |
| `/tasks/` | `GET` | Yes | Retrieves tasks (supports status filters and skip/limit pagination). |
| `/tasks/{id}` | `GET` | Yes | Retrieves task details. |
| `/tasks/{id}` | `PUT` | Yes | Updates task details/status. |
| `/tasks/{id}` | `DELETE`| Yes | Deletes a task. |
| `/admin/stats` | `GET` | Yes (Admin) | Returns system-wide statistics. |
| `/admin/users` | `GET` | Yes (Admin) | Lists all registered user accounts. |
| `/admin/users/{id}/role`| `PUT`| Yes (Admin) | Updates role of a user (admin or user). |

---

## Scalability and Production Architecture

To scale this system horizontally for production environments, the following changes are recommended:

1. **Database Tier**: Migrate from SQLite to PostgreSQL. Use PgBouncer for connection pooling and deploy read-replicas to handle query loads, separating them from the master write database.
2. **Caching**: Integrate Redis to cache database queries (e.g., user tasks rosters) and handle token blacklists/revocation checks, reducing database strain.
3. **Application Scaling**: Deploy the FastAPI monolith in Docker containers across multiple nodes using Gunicorn process manager with Uvicorn workers. Use an NGINX or ALB reverse proxy as a load balancer.
4. **Orchestration**: Deploy container images on Kubernetes (EKS/GKE) with Horizontal Pod Autoscalers to handle traffic spikes.
