# BarberFlow

<p align="center">
  <strong>Manage your barbershop with greater clarity, control, and efficiency.</strong>
</p>

<p align="center">
  BarberFlow centralizes your barbershop's daily operations, team, and finances in one place.
</p>

<p align="center">
  <img src="https://img.shields.io/badge/Python-3.12%2B-3776AB?style=for-the-badge&logo=python&logoColor=white" alt="Python" />
  <img src="https://img.shields.io/badge/FastAPI-0.136%2B-009688?style=for-the-badge&logo=fastapi&logoColor=white" alt="FastAPI" />
  <img src="https://img.shields.io/badge/React-18-61DAFB?style=for-the-badge&logo=react&logoColor=20232A" alt="React" />
  <img src="https://img.shields.io/badge/Vite-5-646CFF?style=for-the-badge&logo=vite&logoColor=white" alt="Vite" />
  <img src="https://img.shields.io/badge/Tailwind_CSS-3-06B6D4?style=for-the-badge&logo=tailwindcss&logoColor=white" alt="Tailwind CSS" />
  <img src="https://img.shields.io/badge/PostgreSQL-compatible-4169E1?style=for-the-badge&logo=postgresql&logoColor=white" alt="PostgreSQL" />
</p>

## About the Project

BarberFlow is a management system for barbershops, designed to help owners and managers run their business and team more efficiently. The platform brings together, in one experience, information that is often scattered across appointment books, spreadsheets, and manual records.

The system helps organize daily operations, manage appointments and shifts, oversee barbers and services, record completed services, and track payments. It also provides a clearer view of business performance through reports and centralized data, so decisions do not have to rely on incomplete or outdated information.

BarberFlow aims to reduce administrative work, improve service tracking, and make team coordination easier. This allows users to spend more time taking care of their clients while relying on a tool that helps them understand how their barbershop is performing and evolving.

## Features

- Administrator authentication using JWT.
- Dashboard with an overview of daily operations.
- Barbershop staff management and team availability status.
- Service types and pricing management.
- Appointment and shift registration and tracking.
- Completed service records.
- Payment and revenue management.
- Sales history.
- Reports for reviewing financial and operational performance.
- Business rule and validation error handling in the API.
- Responsive interface for daily use on desktop and smaller screens.

## Technologies Used

### Frontend

- **React 18** for building the user interface.
- **Vite** as the development and build tool.
- **Tailwind CSS** for styling and the visual system.
- **Lucide React** for interface icons.

### Backend

- **Python 3.12+** as the main programming language.
- **FastAPI** for the REST API and OpenAPI documentation.
- **SQLAlchemy** for data access and modeling.
- **Pydantic Settings** for environment-based configuration.
- **PyJWT** and **bcrypt** for authentication and credential security.
- **Uvicorn** as the ASGI server.
- **asyncpg** for the PostgreSQL connection.
- **Alembic** for database migrations.

## Project Structure

```text
BarberFlow/
├── backend/
│   ├── app/
│   │   ├── api/          # Dependencies, authentication, and routers
│   │   ├── core/         # Configuration and security
│   │   ├── crud/         # Business operations and data access
│   │   ├── db/           # Sessions and database configuration
│   │   ├── models/       # SQLAlchemy models
│   │   └── schemas/      # Pydantic validation schemas
│   ├── pyproject.toml
│   └── README.md
└── frontend/
    ├── src/
    │   ├── components/   # Dashboard components and views
    │   └── lib/          # API client, authentication, and utilities
    ├── package.json
    └── vite.config.js
```

## Requirements

- Python 3.12 or higher.
- Node.js 18 or higher and npm.
- PostgreSQL running locally or remotely.
- A database created for BarberFlow.

## Backend Setup

From the `backend` directory, create a virtual environment and install the dependencies:

```bash
cd backend
python -m venv .venv
```

On Windows PowerShell:

```powershell
.venv\Scripts\Activate.ps1
pip install -e .
```

Create a `backend/.env` file with a configuration similar to this:

```env
DATABASE_URL=postgresql+asyncpg://username:password@localhost:5432/barberflow
APP_ENV=development
DEBUG=true
ADMIN_USERNAME=admin
ADMIN_PASSWORD_HASH=paste_the_admin_password_hash_here
SECRET_KEY=replace_with_a_secure_private_key
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=120
CORS_ORIGINS=http://localhost:5173
```

To generate the administrator password hash, use the script included in the backend:

```bash
python generar_hash_admin.py
```

Start the API with:

```bash
uvicorn app.main:app --reload
```

The API will be available at `http://localhost:8000`. FastAPI's interactive documentation is available at:

- Swagger UI: `http://localhost:8000/docs`
- ReDoc: `http://localhost:8000/redoc`

## Frontend Setup

In another terminal, install the dependencies and start the development server:

```bash
cd frontend
npm install
npm run dev
```

By default, the frontend runs at `http://localhost:5173` and uses `http://localhost:8000` as the API URL. To change it, create `frontend/.env`:

```env
VITE_API_URL=http://localhost:8000
```

## Available Scripts

### Frontend

```bash
npm run dev       # Starts Vite in development mode
npm run build     # Generates the production build
npm run preview   # Serves the generated build locally
```

### Backend

```bash
uvicorn app.main:app --reload  # Starts the API with auto-reload
```

## General Flow

1. The administrator logs in through the frontend.
2. The backend validates the credentials and returns a JWT token.
3. The frontend stores the token and sends it with protected requests.
4. The API processes barbershop operations and persists the information in PostgreSQL.
5. The dashboard displays activity, records, and available reports.
