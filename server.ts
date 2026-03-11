import express, { Request, Response, NextFunction } from "express";
import { createServer as createViteServer } from "vite";
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { z } from "zod";
import path from "path";
import dotenv from "dotenv";
import { rateLimit } from "express-rate-limit";
import pino from "pino";
import { GoogleGenAI } from "@google/genai";

dotenv.config();

const logger = pino({
  transport: {
    target: "pino-pretty",
    options: { colorize: true },
  },
});

const prisma = new PrismaClient();
const JWT_SECRET = process.env.JWT_SECRET || "fallback-secret";
const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || "" });

// --- Rate Limiting ---
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 20, // Limit each IP to 20 requests per windowMs
  message: { error: "Too many authentication attempts, please try again later." },
});

const publicLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 60,
  message: { error: "Rate limit exceeded." },
});

async function startServer() {
  const app = express();
  app.use(express.json());

  // Logging Middleware
  app.use((req, res, next) => {
    logger.info(`${req.method} ${req.url}`);
    next();
  });

  // --- Middleware ---
  const authenticate = (req: any, res: Response, next: NextFunction) => {
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith("Bearer ")) {
      return res.status(401).json({ error: "Unauthorized" });
    }
    const token = authHeader.split(" ")[1];
    try {
      const payload = jwt.verify(token, JWT_SECRET) as { userId: string };
      req.userId = payload.userId;
      next();
    } catch (err) {
      res.status(401).json({ error: "Invalid token" });
    }
  };

  // --- Auth Routes ---
  const registerSchema = z.object({
    email: z.string().email(),
    password: z.string().min(6),
    name: z.string().optional(),
  });

  app.post("/api/auth/register", authLimiter, async (req, res) => {
    try {
      const { email, password, name } = registerSchema.parse(req.body);
      const existing = await prisma.user.findUnique({ where: { email } });
      if (existing) return res.status(400).json({ error: "Email already in use" });

      const passwordHash = await bcrypt.hash(password, 10);
      const user = await prisma.user.create({
        data: { email, passwordHash, name },
      });

      const token = jwt.sign({ userId: user.id }, JWT_SECRET, { expiresIn: "7d" });
      logger.info({ userId: user.id }, "User registered");
      res.json({ token, user: { id: user.id, email: user.email, name: user.name } });
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  });

  app.post("/api/auth/login", authLimiter, async (req, res) => {
    try {
      const { email, password } = z.object({ email: z.string(), password: z.string() }).parse(req.body);
      const user = await prisma.user.findUnique({ where: { email } });
      if (!user || !(await bcrypt.compare(password, user.passwordHash))) {
        return res.status(401).json({ error: "Invalid credentials" });
      }

      const token = jwt.sign({ userId: user.id }, JWT_SECRET, { expiresIn: "7d" });
      logger.info({ userId: user.id }, "User logged in");
      res.json({ token, user: { id: user.id, email: user.email, name: user.name } });
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  });

  // --- AI Assistant Route ---
  app.post("/api/ai/assist", authenticate, async (req: any, res) => {
    try {
      const { prompt, context } = z.object({ prompt: z.string(), context: z.string().optional() }).parse(req.body);
      
      const response = await ai.models.generateContent({
        model: "gemini-2.0-flash",
        contents: `Context: ${context || "None"}\n\nUser Request: ${prompt}`,
        config: {
          systemInstruction: "You are a professional blog writing assistant. Help the user expand their ideas, fix grammar, or suggest titles. Keep responses concise and formatted in Markdown.",
        }
      });

      res.json({ text: response.text });
    } catch (err: any) {
      logger.error(err, "AI Assist failed");
      res.status(500).json({ error: "AI Assistant failed" });
    }
  });

  // --- Blog Routes (Private) ---
  const blogSchema = z.object({
    title: z.string().min(1),
    content: z.string().min(1),
    isPublished: z.boolean().optional(),
  });

  app.post("/api/blogs", authenticate, async (req: any, res) => {
    try {
      const { title, content, isPublished } = blogSchema.parse(req.body);
      const slug = title.toLowerCase().replace(/ /g, "-").replace(/[^\w-]+/g, "") + "-" + Date.now();
      
      const blog = await prisma.blog.create({
        data: {
          title,
          content,
          isPublished: isPublished ?? false,
          slug,
          userId: req.userId,
        },
      });

      // Async Job: AI Summary Generation
      if (blog.isPublished) {
        setImmediate(async () => {
          try {
            logger.info({ blogId: blog.id }, "Starting AI summary generation job");
            const response = await ai.models.generateContent({
              model: "gemini-2.0-flash",
              contents: `Summarize this blog post in one sentence: ${content}`,
            });
            const summary = response.text?.trim() || content.substring(0, 150) + "...";
            await prisma.blog.update({
              where: { id: blog.id },
              data: { summary },
            });
            logger.info({ blogId: blog.id }, "AI summary generation job completed");
          } catch (err) {
            logger.error(err, "AI summary generation job failed");
          }
        });
      }

      res.status(201).json(blog);
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  });

  app.get("/api/blogs/me", authenticate, async (req: any, res) => {
    const blogs = await prisma.blog.findMany({
      where: { userId: req.userId },
      orderBy: { createdAt: "desc" },
    });
    res.json(blogs);
  });

  app.patch("/api/blogs/:id", authenticate, async (req: any, res) => {
    try {
      const { title, content, isPublished } = blogSchema.partial().parse(req.body);
      const blog = await prisma.blog.findUnique({ where: { id: req.params.id } });
      
      if (!blog) return res.status(404).json({ error: "Blog not found" });
      if (blog.userId !== req.userId) return res.status(403).json({ error: "Forbidden" });

      const updated = await prisma.blog.update({
        where: { id: req.params.id },
        data: { title, content, isPublished },
      });
      res.json(updated);
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  });

  app.delete("/api/blogs/:id", authenticate, async (req: any, res) => {
    const blog = await prisma.blog.findUnique({ where: { id: req.params.id } });
    if (!blog) return res.status(404).json({ error: "Blog not found" });
    if (blog.userId !== req.userId) return res.status(403).json({ error: "Forbidden" });

    await prisma.blog.delete({ where: { id: req.params.id } });
    res.status(204).send();
  });

  // --- Public Routes ---
  app.get("/api/public/feed", publicLimiter, async (req, res) => {
    const page = parseInt(req.query.page as string) || 1;
    const limit = 10;
    const skip = (page - 1) * limit;

    try {
      const [blogs, total] = await Promise.all([
        prisma.blog.findMany({
          where: { isPublished: true },
          include: {
            user: { select: { name: true, email: true } },
            _count: { select: { likes: true, comments: true } },
          },
          orderBy: { createdAt: "desc" },
          skip,
          take: limit,
        }),
        prisma.blog.count({ where: { isPublished: true } }),
      ]);

      res.json({
        blogs: blogs.map(b => ({
          ...b,
          author: b.user,
          likeCount: b._count.likes,
          commentCount: b._count.comments,
        })),
        pagination: {
          total,
          page,
          pages: Math.ceil(total / limit),
        },
      });
    } catch (err) {
      logger.error(err, "Feed fetch failed");
      res.status(500).json({ error: "Internal server error" });
    }
  });

  app.get("/api/public/blogs/:slug", publicLimiter, async (req, res) => {
    const blog = await prisma.blog.findUnique({
      where: { slug: req.params.slug },
      include: {
        user: { select: { name: true, email: true } },
        _count: { select: { likes: true, comments: true } },
      },
    });

    if (!blog || !blog.isPublished) {
      return res.status(404).json({ error: "Blog not found" });
    }

    res.json({
      ...blog,
      author: blog.user,
      likeCount: blog._count.likes,
      commentCount: blog._count.comments,
    });
  });

  // --- Like & Comment System ---
  app.post("/api/blogs/:id/like", authenticate, async (req: any, res) => {
    try {
      await prisma.like.create({
        data: { blogId: req.params.id, userId: req.userId },
      });
      const count = await prisma.like.count({ where: { blogId: req.params.id } });
      res.json({ likeCount: count });
    } catch (err) {
      // Handle duplicate like
      const count = await prisma.like.count({ where: { blogId: req.params.id } });
      res.json({ likeCount: count });
    }
  });

  app.delete("/api/blogs/:id/like", authenticate, async (req: any, res) => {
    await prisma.like.deleteMany({
      where: { blogId: req.params.id, userId: req.userId },
    });
    const count = await prisma.like.count({ where: { blogId: req.params.id } });
    res.json({ likeCount: count });
  });

  app.get("/api/blogs/:id/comments", async (req, res) => {
    const comments = await prisma.comment.findMany({
      where: { blogId: req.params.id },
      include: { user: { select: { name: true } } },
      orderBy: { createdAt: "desc" },
    });
    res.json(comments);
  });

  app.post("/api/blogs/:id/comments", authenticate, async (req: any, res) => {
    try {
      const { content } = z.object({ content: z.string().min(1) }).parse(req.body);
      const comment = await prisma.comment.create({
        data: {
          content,
          blogId: req.params.id,
          userId: req.userId,
        },
        include: { user: { select: { name: true } } },
      });
      res.status(201).json(comment);
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  });

  // --- Vite Middleware ---
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.join(__dirname, "dist")));
    app.get("*", (req, res) => {
      res.sendFile(path.join(__dirname, "dist", "index.html"));
    });
  }

  const PORT = 3000;
  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer().catch(console.error);
