# Rival Blog Platform - Secure & AI-Enhanced

A production-ready, full-stack blog platform built for the Rival Assessment. This project features a secure authentication system, private dashboard, public social feed, and integrated AI capabilities.

## 🚀 Live Demo & Repository
- **Live Application:** [INSERT_YOUR_VERCEL_OR_RAILWAY_URL_HERE]
- **GitHub Repository:** [INSERT_YOUR_GITHUB_REPO_URL_HERE]

## 🛠 Tech Stack
- **Backend:** Node.js, Express, TypeScript, Prisma ORM
- **Frontend:** React 19, Vite, Tailwind CSS 4, Framer Motion
- **Database:** PostgreSQL (via Prisma)
- **AI:** Google Gemini API (for summaries and writing assistance)
- **Security:** JWT, Bcrypt, Express-Rate-Limit
- **Logging:** Pino (Structured Logging)

## 🏗 Architecture Decisions
- **Full-Stack Integration:** I chose an Express + Vite architecture to ensure tight coupling between the API and the Frontend while maintaining a clear separation of concerns. This allows for faster development cycles and easier deployment.
- **Prisma ORM:** Used for type-safe database interactions and efficient relational modeling. I implemented specific indexes on `slug`, `userId`, and `createdAt` to ensure high-performance queries.
- **AI-First UX:** Beyond the basic requirements, I integrated a **Gemini-powered Writing Assistant** and **Automated AI Summaries**. This aligns with Rival's vision of powering the AI supply chain.
- **State Management:** Used React Context for Authentication and local state for UI interactions to keep the application lightweight and performant.

## ⚡ Advanced Concepts (Bonus Points)
- **Asynchronous Job Processing:** When a blog is published, a background job is enqueued (simulated via `setImmediate`) to generate an AI summary. This ensures the user receives an immediate HTTP response while the "heavy" AI processing happens in the background.
- **API Rate Limiting:** Implemented `express-rate-limit` on sensitive routes (Auth, Public Feed) to prevent brute-force attacks and scraping.
- **Structured Logging:** Used `Pino` for all server-side logging, providing machine-readable logs that are essential for production monitoring and debugging.

## ⚖️ Tradeoffs
- **Async Simulation:** For this assessment, I used `setImmediate` for background jobs to avoid the overhead of setting up a Redis/BullMQ instance in a demo environment. In a 1M user production scenario, I would migrate this to **BullMQ + Redis**.
- **Client-Side Rendering:** I opted for a Single Page Application (SPA) approach for a highly interactive "app-like" feel in the dashboard, though for SEO-heavy blogs, a hybrid SSR (Next.js) approach would be the next step for scaling.

## 📈 How to Scale to 1M Users
1. **Database Scaling:** Implement Read Replicas for the PostgreSQL database to handle the high volume of public feed reads.
2. **Caching Layer:** Use **Redis** to cache the Public Feed and individual blog responses to reduce database load.
3. **Distributed Jobs:** Move the AI summary generation to a dedicated worker service using **BullMQ** or **RabbitMQ**.
4. **CDN:** Serve all static assets and uploaded images via a Content Delivery Network (Cloudfront/Cloudinary).
5. **Load Balancing:** Deploy the Express backend across multiple containers using a Load Balancer (NGINX or AWS ALB).

## 🛠 Setup Instructions
1. Clone the repository.
2. Install dependencies: `npm install`
3. Set up your `.env` file (see `.env.example`):
   - `DATABASE_URL`, `JWT_SECRET`, `GEMINI_API_KEY`
4. Initialize the database: `npx prisma db push`
5. Start development server: `npm run dev`
