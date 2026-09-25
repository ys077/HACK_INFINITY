# Continuous Classroom Presence Attendance System

This repository contains the monorepo for the Continuous Classroom Presence Attendance System.

## Project Structure

- `frontend/`: React + Vite + TypeScript web application
- `backend/`: Node.js + Express + TypeScript + Socket.IO server
- `shared/`: Shared types and utilities
- `mobile/`: Mobile application (placeholder)
- `docs/`: Project documentation

## Setup Instructions

### Prerequisites
- Node.js (v18+)
- PostgreSQL

### 1. Database Setup
Ensure PostgreSQL is running and create a database named `attendance`.

### 2. Backend Setup
1. Navigate to the backend directory:
   ```bash
   cd backend
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Set up environment variables:
   Create a `.env` file in the `backend` directory with the following variables:
   ```env
   PORT=5000
   FRONTEND_URL=http://localhost:5173
   DATABASE_URL="postgresql://postgres:password@localhost:5432/attendance?schema=public"
   ```
4. Start the backend server:
   ```bash
   npm run dev
   ```

### 3. Frontend Setup
1. Navigate to the frontend directory:
   ```bash
   cd frontend
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Start the frontend development server:
   ```bash
   npm run dev
   ```

## API Endpoints
- `GET /api/health`: Health check endpoint returns `{"status": "ok", "service": "attendance-backend"}`
