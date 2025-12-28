# 🚀 Tradly Backend API

<p align="center">
  <img src="https://res.cloudinary.com/degccylgj/image/upload/v1766595409/icon_jlbymu.png" width="100" alt="Tradly Logo">
</p>

> **The intelligent backbone of the Tradly ERP ecosystem. Features AI-driven business analytics, automated invoice generation, and real-time inventory tracking.**

[![Node.js](https://img.shields.io/badge/Node.js-43853D?style=for-the-badge&logo=node.js&logoColor=white)](https://nodejs.org/)
[![Express.js](https://img.shields.io/badge/Express.js-404D59?style=for-the-badge)](https://expressjs.com/)
[![MongoDB](https://img.shields.io/badge/MongoDB-4EA94B?style=for-the-badge&logo=mongodb&logoColor=white)](https://www.mongodb.com/)
[![Gemini AI](https://img.shields.io/badge/Google_Gemini-8E75B2?style=for-the-badge&logo=googlebard&logoColor=white)](https://ai.google.dev/)

---

## 📖 Overview

This is the **RESTful API** server for the Tradly mobile application. It is built to handle complex business logic including inventory management, customer relations, and financial reporting.

The standout feature is the **AI Integration**, which uses a custom **Round-Robin Load Balancer** to rotate between multiple Google Gemini API keys, ensuring high availability and bypassing rate limits while analyzing business data.

---

## ✨ Key Features

### 🧠 Advanced AI Architecture
- **Context-Aware RAG:** Feeds real-time database summaries (low stock, pending invoices) into the LLM context window.
- **Smart Key Rotation:** Implements a fallback mechanism that shuffles and rotates through 3+ API keys (`GEMINI_API_KEY1`, `2`, `3`) to ensure zero downtime during high traffic.
- **Natural Language Chat:** Allows the frontend to query the database using plain English.

### 🧾 Invoicing & PDF Engine
- **HTML-to-PDF:** Generates professional invoice PDFs server-side.
- **Automated Emailing:** Integrated with `Nodemailer` to send invoices and payment reminders instantly.
- **Status Automation:** Background logic checks due dates and auto-updates invoices to "Overdue."

### 📦 Data & Security
- **Complex Aggregations:** Uses MongoDB Aggregation Pipelines (`$lookup`, `$group`, `$unwind`) to calculate monthly revenue and top-selling products.
- **JWT Authentication:** Secure Access & Refresh token rotation strategy.
- **Role-Based Protection:** Middleware to ensure data privacy between different business owners.

---

## 🛠️ Tech Stack

- **Runtime:** Node.js
- **Framework:** Express.js
- **Database:** MongoDB (Mongoose ODM)
- **AI Model:** Google Gemini 2.5 Flash
- **Tools:**
  - `Nodemailer` (Emails)
  - `Dotenv` (Env Management)
  - `Cors` & `Helmet` (Security)
  - `Multer` (File Uploads)

---

## 🚀 Installation & Setup

1. **Clone the Repository**
   ```bash
   git clone https://github.com/princegupta1614/tradly_backend.git
   cd tradly-backend
   ```

2. **Install Dependencies**
   ```bash
   npm install
   ```

3. **Environment Configuration**
   Create a `.env` file in the root directory and add the following:
   ```env
   # Server Config
   PORT=8000
   MONGODB_URI=mongodb+srv:/<username>:<password>@cluster.mongodb.net/tradly
   CORS_ORIGIN=*

   # JWT Secrets (Generate random strings)
   ACCESS_TOKEN_SECRET=your_complex_access_secret
   ACCESS_TOKEN_EXPIRY=1d
   REFRESH_TOKEN_SECRET=your_complex_refresh_secret
   REFRESH_TOKEN_EXPIRY=10d

   # AI Configuration (Load Balancing)
   GEMINI_API_KEY1=AIzaSy...
   GEMINI_API_KEY2=AIzaSy...
   GEMINI_API_KEY3=AIzaSy...

   # Cloudinary (Image Storage)
   CLOUDINARY_CLOUD_NAME=...
   CLOUDINARY_API_KEY=...
   CLOUDINARY_API_SECRET=...

   # Email Service
   EMAIL_HOST=smtp.gmail.com
   EMAIL_PORT=587
   EMAIL_USER=your_email@gmail.com
   EMAIL_PASS=your_app_password
   ```

4. **Run the Server**
   ```bash
   # Development Mode (Nodemon)
   npm run prince

   # Production Mode
   npm start
   ```

---

## 📡 API Endpoints Structure

| Module | Method | Endpoint | Description |
| :--- | :--- | :--- | :--- |
| **Auth** | POST | `/api/v1/users/register` | Register new business |
| | POST | `/api/v1/users/login` | Login & get Cookies |
| | POST | `/api/v1/users/refresh-token` | Rotate Access Token |
| **Dashboard** | GET | `/api/v1/dashboard/stats` | KPI Cards & Graphs |
| **AI** | GET | `/api/v1/dashboard/ai-insights` | Get Daily Suggestions |
| | POST | `/api/v1/dashboard/ai-chat` | Chat with Data |
| **Products** | GET | `/api/v1/products` | List with filters |
| | POST | `/api/v1/products` | Create Product (w/ Image) |
| **Invoices** | POST | `/api/v1/invoices` | Generate Invoice |
| | POST | `/api/v1/invoices/:id/send` | Email PDF to Customer |

---

## 📂 Project Structure

```
src/
├── controllers/    # Business logic (AI, Auth, Invoices)
├── models/         # Mongoose Schemas
├── routes/         # API Route definitions
├── middlewares/    # Auth, Multer, Error handling
├── utils/          # AsyncHandler, ApiResponse, Cloudinary
├── db/             # Database connection
└── app.js          # Express app setup
```

---

## 🤝 Related Repository

This backend powers the **Tradly Mobile App**:

👉 [Frontend Repository](https://github.com/princegupta1614/tradly-mobile)

👉 [Download tradly.apk](https://github.com/princegupta1614/tradly_backend/releases/download/v1.0.0/tradly.apk)

---

## 👨‍💻 Author

**Prince Gupta -**
*Full Stack Developer*

[![Portfolio](https://img.shields.io/badge/Portfolio-Link-blue?style=flat&logo=google-chrome&logoColor=white)](https://princegupta.vercel.app)
[![LinkedIn](https://img.shields.io/badge/LinkedIn-Connect-blue?style=flat&logo=linkedin&logoColor=white)](https://www.linkedin.com/in/prince-gupta-32a91627b/)

---

> Built with ❤️.
