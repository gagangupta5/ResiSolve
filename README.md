# ResiSolve - Society Maintenance Tracker

ResiSolve is a backend-driven platform designed for apartment societies to log, track, and resolve maintenance complaints efficiently. It features dynamic overdue flag updates based on configurable settings, status updates with historical logging, notice board announcements (with automatic important notice email broadcasts), and structured report exporting.

---

## Technical Stack
- **Runtime Environment**: Node.js (ES Modules syntax)
- **Framework**: Express.js
- **Database**: MongoDB (via Mongoose ORM)
- **Authentication**: JWT (JSON Web Tokens) with Bcrypt password hashing
- **File Uploads**: Multer (configured for image filters and 5MB limits)
- **Emails**: Nodemailer (supporting SMTP integration and simulated local console fallback)

---

## Getting Started

### Prerequisites
- Node.js (v16.x or higher)
- MongoDB running locally or a remote MongoDB Atlas URI

### Installation & Setup

1. **Clone the Repository** and navigate to the project directory:
   ```bash
   cd ResiSolve
   ```

2. **Install Dependencies** for the backend:
   ```bash
   cd backend
   npm install
   ```

3. **Configure Environment Variables**:
   Copy the template file to `.env`:
   ```bash
   cp ../.env.example .env
   ```
   Edit the `.env` file and replace the placeholder credentials (e.g., your `MONGO_URI`, custom `JWT_SECRET`, and optional `SMTP` settings). If no SMTP configurations are set, emails will print to the backend console terminal for testing convenience.

4. **Run the Application**:
   - Start the server in Development mode (with live reload via nodemon):
     ```bash
     npm run dev
     ```
   - Start the server in Production mode:
     ```bash
     npm run start
     ```

The server will initialize and begin listening on the port specified (default: `5000`). You can test it by visiting `http://localhost:5000/api/ping` in your browser.

---

## Database Schemas

### 1. User (`User.js`)
Stores account credentials, role types, and association records.
- `name` (String, required): Full name.
- `email` (String, required, unique): Work/personal email address.
- `password` (String, required): Bcrypt-hashed password.
- `role` (String, enum: `['resident', 'admin']`, default: `'resident'`).
- `flatNo` (String, required): Apartment/flat designation.
- `phone` (String, required): Contact number.
- `timestamps`: Automatically logs creation and modification times.

### 2. Complaint (`Complaint.js`)
Tracks specific resident requests, lifecycle status history, and overdue flags.
- `title` (String, required): Summary of the problem.
- `description` (String, required): Full details.
- `category` (String, enum: `['Plumbing', 'Electrical', 'Carpentry', 'Security', 'Cleanliness', 'Elevator', 'Other']`).
- `resident` (ObjectId, ref: `User`, required): The resident who logged the complaint.
- `photoUrl` (String): Relative path to uploaded file.
- `status` (String, enum: `['Open', 'In Progress', 'Resolved']`, default: `'Open'`).
- `priority` (String, enum: `['Low', 'Medium', 'High']`, default: `'Medium'`).
- `overdue` (Boolean, default: `false`).
- `statusHistory`: Nested array of status updates:
  - `status` (String, required)
  - `changedAt` (Date, default: `Date.now`)
  - `changedBy` (ObjectId, ref: `User`, required)
  - `note` (String, default: `""`)

### 3. Notice (`Notice.js`)
Manages notice board broadcasts.
- `title` (String, required): Notice subject.
- `content` (String, required): Full announcement text.
- `postedBy` (ObjectId, ref: `User`, required): The administrator posting the notice.
- `isImportant` (Boolean, default: `false`): Pinned to top. If `true`, sends broadcast email to all residents.

### 4. Settings (`Settings.js`)
Global configurations.
- `overdueThresholdDays` (Number, default: `5`): Threshold in days before active complaints are dynamically marked as overdue.

---

## API Documentation

All routes require requests to include an `Authorization: Bearer <JWT_TOKEN>` header except for Login and Register endpoints.

### Authentication Endpoints (`/api/auth`)

#### `POST /register`
- **Access**: Public
- **Body Parameters**:
  ```json
  {
    "name": "Jane Doe",
    "email": "jane@example.com",
    "password": "securepassword123",
    "flatNo": "B-402",
    "phone": "+919876543210",
    "role": "resident"
  }
  ```
- **Success Response** (201 Created): Returns registration details and JWT access token.

#### `POST /login`
- **Access**: Public
- **Body Parameters**:
  ```json
  {
    "email": "jane@example.com",
    "password": "securepassword123"
  }
  ```
- **Success Response** (200 OK): Returns user info and JWT access token.

---

### Complaint Endpoints (`/api/complaints`)

#### `POST /`
- **Access**: Private (Resident only)
- **Body Parameters** (Multipart Form Data):
  - `title` (Text): Problem title
  - `description` (Text): Description details
  - `category` (Text): e.g., "Plumbing"
  - `photo` (File, Optional): Selected image file (JPEG, PNG, WebP; max size 5MB)
- **Success Response** (201 Created): Returns created complaint entry.

#### `GET /`
- **Access**: Private (Residents see only their complaints; Admins see all)
- **Query Parameters (Filters)**:
  - `category` (Plumbing, Electrical, etc.)
  - `status` (Open, In Progress, Resolved)
  - `priority` (Low, Medium, High)
  - `startDate` (YYYY-MM-DD)
  - `endDate` (YYYY-MM-DD)
  - `search` (Admins only: matches resident name, email, or flat number)
- **Success Response** (200 OK): Returns list of filtered complaints (automatically recalculates and surface overdue complaints first).

#### `GET /:id`
- **Access**: Private (Access control enforced for non-owner residents)
- **Success Response** (200 OK): Returns detailed complaint record with populated resident details and full status timeline history.

#### `PUT /:id/status`
- **Access**: Private (Admin only)
- **Body Parameters**:
  ```json
  {
    "status": "In Progress",
    "note": "Technician has been assigned and will visit on Saturday morning."
  }
  ```
- **Success Response** (200 OK): Returns updated complaint object and triggers automated status update notification email.

#### `PUT /:id/priority`
- **Access**: Private (Admin only)
- **Body Parameters**:
  ```json
  {
    "priority": "High"
  }
  ```
- **Success Response** (200 OK): Returns updated complaint object.

#### `GET /stats`
- **Access**: Private (Admin only)
- **Success Response** (200 OK): Returns aggregated counts by category, status, and count of overdue complaints.

#### `GET /export`
- **Access**: Private (Admin only)
- **Success Response** (200 OK): Downloads file `society-complaints-report.csv` containing full complaint lists.

---

### Notice Endpoints (`/api/notices`)

#### `GET /`
- **Access**: Private
- **Success Response** (200 OK): Returns all announcements (important pinned notices sorted to top).

#### `POST /`
- **Access**: Private (Admin only)
- **Body Parameters**:
  ```json
  {
    "title": "Water Shutdown Notice",
    "content": "Water supply will be unavailable this Tuesday between 1:00 PM and 4:00 PM due to overhead tank repairs.",
    "isImportant": true
  }
  ```
- **Success Response** (201 Created): Returns notice object (if `isImportant`, broadcasts notice details via email to all residents).

#### `DELETE /:id`
- **Access**: Private (Admin only)
- **Success Response** (200 OK): Confirms removal of notice.

---

### Settings Endpoints (`/api/settings`)

#### `GET /`
- **Access**: Private
- **Success Response** (200 OK): Returns current overdue threshold in days.

#### `PUT /`
- **Access**: Private (Admin only)
- **Body Parameters**:
  ```json
  {
    "overdueThresholdDays": 7
  }
  ```
- **Success Response** (200 OK): Updates threshold settings in DB.
