import React, { useState, useEffect } from 'react';
import { 
  BrowserRouter as Router, 
  Routes, 
  Route, 
  Link, 
  useNavigate, 
  useParams,
  Navigate
} from 'react-router-dom';
import { 
  Layout, 
  PlusCircle, 
  LogOut, 
  User as UserIcon, 
  BookOpen, 
  Heart, 
  MessageSquare, 
  ChevronRight,
  ChevronLeft,
  Edit,
  Trash2,
  Send,
  Sparkles,
  Loader2
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { format } from 'date-fns';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { Toaster, toast } from 'sonner';
import Markdown from 'react-markdown';

// --- Utils ---
function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// --- API Layer ---
const API_BASE = '/api';

async function apiFetch(endpoint: string, options: RequestInit = {}) {
  const token = localStorage.getItem('token');
  const headers = {
    'Content-Type': 'application/json',
    ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
    ...options.headers,
  };

  const response = await fetch(`${API_BASE}${endpoint}`, { ...options, headers });
  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Unknown error' }));
    throw new Error(error.error || 'Request failed');
  }
  if (response.status === 204) return null;
  return response.json();
}

// --- Components ---

function Navbar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  return (
    <nav className="sticky top-0 z-50 bg-white/80 backdrop-blur-md border-b border-zinc-100">
      <div className="max-w-5xl mx-auto px-4 h-16 flex items-center justify-between">
        <Link to="/" className="flex items-center gap-2 group">
          <div className="w-8 h-8 bg-black rounded-lg flex items-center justify-center text-white font-bold group-hover:scale-105 transition-transform">
            R
          </div>
          <span className="font-bold text-xl tracking-tight">RivalBlog</span>
        </Link>

        <div className="flex items-center gap-6">
          <Link to="/feed" className="text-sm font-medium text-zinc-600 hover:text-black transition-colors">Feed</Link>
          {user ? (
            <>
              <Link to="/dashboard" className="text-sm font-medium text-zinc-600 hover:text-black transition-colors">Dashboard</Link>
              <button 
                onClick={() => { logout(); navigate('/'); }}
                className="p-2 text-zinc-400 hover:text-red-500 transition-colors"
                title="Logout"
              >
                <LogOut size={20} />
              </button>
            </>
          ) : (
            <Link 
              to="/login" 
              className="px-4 py-2 bg-black text-white text-sm font-medium rounded-full hover:bg-zinc-800 transition-colors"
            >
              Sign In
            </Link>
          )}
        </div>
      </div>
    </nav>
  );
}

function BlogCard({ blog }: { blog: any, key?: any }) {
  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="group bg-white border border-zinc-100 rounded-2xl p-6 hover:shadow-xl hover:shadow-zinc-200/50 transition-all duration-300"
    >
      <div className="flex items-center gap-2 mb-4">
        <div className="w-8 h-8 bg-zinc-100 rounded-full flex items-center justify-center text-zinc-600">
          <UserIcon size={14} />
        </div>
        <div>
          <p className="text-sm font-semibold text-zinc-900">{blog.author?.name || 'Anonymous'}</p>
          <p className="text-xs text-zinc-400">{format(new Date(blog.createdAt), 'MMM d, yyyy')}</p>
        </div>
      </div>
      
      <Link to={`/blog/${blog.slug}`}>
        <h3 className="text-xl font-bold text-zinc-900 mb-2 group-hover:text-black group-hover:underline decoration-2 underline-offset-4">
          {blog.title}
        </h3>
      </Link>
      
      {blog.summary && (
        <div className="mb-4 p-3 bg-zinc-50 rounded-xl border border-zinc-100 italic text-xs text-zinc-500">
          <span className="font-bold uppercase tracking-widest mr-2 text-[9px] text-zinc-400">AI Summary:</span>
          {blog.summary}
        </div>
      )}

      <p className="text-zinc-600 line-clamp-3 mb-6 text-sm leading-relaxed">
        {blog.content}
      </p>
      
      <div className="flex items-center justify-between pt-4 border-t border-zinc-50">
        <div className="flex gap-4">
          <div className="flex items-center gap-1.5 text-zinc-400">
            <Heart size={16} />
            <span className="text-xs font-medium">{blog.likeCount || 0}</span>
          </div>
          <div className="flex items-center gap-1.5 text-zinc-400">
            <MessageSquare size={16} />
            <span className="text-xs font-medium">{blog.commentCount || 0}</span>
          </div>
        </div>
        <Link 
          to={`/blog/${blog.slug}`}
          className="text-xs font-bold uppercase tracking-wider text-zinc-900 flex items-center gap-1 hover:gap-2 transition-all"
        >
          Read More <ChevronRight size={14} />
        </Link>
      </div>
    </motion.div>
  );
}

// --- Pages ---

function FeedPage() {
  const [blogs, setBlogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  useEffect(() => {
    setLoading(true);
    apiFetch(`/public/feed?page=${page}`)
      .then(data => {
        setBlogs(data.blogs);
        setTotalPages(data.pagination.pages);
      })
      .finally(() => setLoading(false));
  }, [page]);

  if (loading && page === 1) return <div className="max-w-5xl mx-auto px-4 py-20 text-center">Loading feed...</div>;

  return (
    <div className="max-w-3xl mx-auto px-4 py-12">
      <header className="mb-12">
        <h1 className="text-4xl font-black tracking-tight text-zinc-900 mb-2 italic">The Public Feed</h1>
        <p className="text-zinc-500">Discover stories from our community.</p>
      </header>

      <div className="space-y-8">
        {blogs.length === 0 ? (
          <div className="py-20 text-center border-2 border-dashed border-zinc-100 rounded-3xl">
            <BookOpen className="mx-auto text-zinc-200 mb-4" size={48} />
            <p className="text-zinc-400">No blogs published yet.</p>
          </div>
        ) : (
          blogs.map(blog => <BlogCard key={blog.id} blog={blog} />)
        )}
      </div>

      {totalPages > 1 && (
        <div className="mt-12 flex items-center justify-center gap-4">
          <button 
            disabled={page === 1}
            onClick={() => setPage(p => p - 1)}
            className="p-2 rounded-full border border-zinc-200 disabled:opacity-30 hover:bg-zinc-50 transition-colors"
          >
            <ChevronLeft size={20} />
          </button>
          <span className="text-sm font-medium">Page {page} of {totalPages}</span>
          <button 
            disabled={page === totalPages}
            onClick={() => setPage(p => p + 1)}
            className="p-2 rounded-full border border-zinc-200 disabled:opacity-30 hover:bg-zinc-50 transition-colors"
          >
            <ChevronRight size={20} />
          </button>
        </div>
      )}
    </div>
  );
}

function BlogDetailPage() {
  const { slug } = useParams();
  const { user } = useAuth();
  const [blog, setBlog] = useState<any>(null);
  const [comments, setComments] = useState<any[]>([]);
  const [newComment, setNewComment] = useState('');
  const [loading, setLoading] = useState(true);
  const [isLiked, setIsLiked] = useState(false);

  useEffect(() => {
    apiFetch(`/public/blogs/${slug}`)
      .then(data => {
        setBlog(data);
        return apiFetch(`/blogs/${data.id}/comments`);
      })
      .then(setComments)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [slug]);

  const handleLike = async () => {
    if (!user) return alert('Please sign in to like');
    const method = isLiked ? 'DELETE' : 'POST';
    try {
      const data = await apiFetch(`/blogs/${blog.id}/like`, { method });
      setBlog({ ...blog, likeCount: data.likeCount });
      setIsLiked(!isLiked);
    } catch (err) {
      console.error(err);
    }
  };

  const handleComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newComment.trim()) return;
    try {
      const comment = await apiFetch(`/blogs/${blog.id}/comments`, {
        method: 'POST',
        body: JSON.stringify({ content: newComment }),
      });
      setComments([comment, ...comments]);
      setNewComment('');
      setBlog({ ...blog, commentCount: blog.commentCount + 1 });
    } catch (err) {
      alert(err);
    }
  };

  if (loading) return <div className="py-20 text-center">Loading story...</div>;
  if (!blog) return <div className="py-20 text-center">Story not found.</div>;

  return (
    <div className="max-w-2xl mx-auto px-4 py-12">
      <motion.article 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
      >
        <header className="mb-12">
          <h1 className="text-5xl font-black tracking-tight text-zinc-900 mb-6 leading-tight">
            {blog.title}
          </h1>

          {blog.summary && (
            <div className="mb-8 p-6 bg-indigo-50/50 rounded-3xl border border-indigo-100/50 flex gap-4 items-start">
              <Sparkles className="text-indigo-500 shrink-0 mt-1" size={20} />
              <div>
                <span className="block text-[10px] font-bold uppercase tracking-widest text-indigo-400 mb-1">AI Generated Summary</span>
                <p className="text-indigo-900/80 text-sm italic leading-relaxed">{blog.summary}</p>
              </div>
            </div>
          )}

          <div className="flex items-center justify-between py-6 border-y border-zinc-100">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-black rounded-full flex items-center justify-center text-white font-bold">
                {blog.author?.name?.[0] || 'A'}
              </div>
              <div>
                <p className="text-sm font-bold text-zinc-900">{blog.author?.name || 'Anonymous'}</p>
                <p className="text-xs text-zinc-400">{format(new Date(blog.createdAt), 'MMMM d, yyyy')}</p>
              </div>
            </div>
            <button 
              onClick={handleLike}
              className={cn(
                "flex items-center gap-2 px-4 py-2 rounded-full border transition-all",
                isLiked ? "bg-red-50 border-red-100 text-red-500" : "border-zinc-100 text-zinc-400 hover:border-zinc-200"
              )}
            >
              <Heart size={18} fill={isLiked ? "currentColor" : "none"} />
              <span className="text-sm font-bold">{blog.likeCount}</span>
            </button>
          </div>
        </header>

        <div className="prose prose-zinc max-w-none mb-16 text-lg leading-relaxed text-zinc-800 whitespace-pre-wrap">
          <Markdown>{blog.content}</Markdown>
        </div>

        <section className="border-t border-zinc-100 pt-12">
          <h3 className="text-2xl font-bold text-zinc-900 mb-8 flex items-center gap-2">
            Comments <span className="text-zinc-300 font-normal">{blog.commentCount}</span>
          </h3>

          {user ? (
            <form onSubmit={handleComment} className="mb-12">
              <div className="relative">
                <textarea 
                  value={newComment}
                  onChange={(e) => setNewComment(e.target.value)}
                  placeholder="What are your thoughts?"
                  className="w-full p-4 bg-zinc-50 border-none rounded-2xl focus:ring-2 focus:ring-black transition-all min-h-[120px] resize-none"
                />
                <button 
                  type="submit"
                  className="absolute bottom-4 right-4 p-2 bg-black text-white rounded-xl hover:scale-105 transition-transform"
                >
                  <Send size={18} />
                </button>
              </div>
            </form>
          ) : (
            <div className="p-6 bg-zinc-50 rounded-2xl text-center mb-12">
              <p className="text-sm text-zinc-500">
                Please <Link to="/login" className="text-black font-bold underline">sign in</Link> to join the conversation.
              </p>
            </div>
          )}

          <div className="space-y-6">
            {comments.map(comment => (
              <div key={comment.id} className="flex gap-4">
                <div className="w-8 h-8 bg-zinc-100 rounded-full flex-shrink-0 flex items-center justify-center text-zinc-500 font-bold text-xs uppercase">
                  {comment.user?.name?.[0] || 'U'}
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-sm font-bold text-zinc-900">{comment.user?.name || 'User'}</span>
                    <span className="text-[10px] text-zinc-400 uppercase tracking-widest">{format(new Date(comment.createdAt), 'MMM d')}</span>
                  </div>
                  <p className="text-zinc-600 text-sm leading-relaxed">{comment.content}</p>
                </div>
              </div>
            ))}
          </div>
        </section>
      </motion.article>
    </div>
  );
}

function DashboardPage() {
  const { user } = useAuth();
  const [blogs, setBlogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    apiFetch('/blogs/me')
      .then(setBlogs)
      .finally(() => setLoading(false));
  }, []);

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this blog?')) return;
    try {
      await apiFetch(`/blogs/${id}`, { method: 'DELETE' });
      setBlogs(blogs.filter(b => b.id !== id));
    } catch (err) {
      alert(err);
    }
  };

  if (loading) return <div className="py-20 text-center">Loading your stories...</div>;

  return (
    <div className="max-w-5xl mx-auto px-4 py-12">
      <header className="flex items-center justify-between mb-12">
        <div>
          <h1 className="text-4xl font-black tracking-tight text-zinc-900 mb-2">Your Dashboard</h1>
          <p className="text-zinc-500">Manage your stories and drafts.</p>
        </div>
        <Link 
          to="/editor" 
          className="flex items-center gap-2 px-6 py-3 bg-black text-white rounded-full font-bold hover:bg-zinc-800 transition-all hover:scale-105"
        >
          <PlusCircle size={20} /> Write New Story
        </Link>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {blogs.length === 0 ? (
          <div className="col-span-full py-20 text-center border-2 border-dashed border-zinc-100 rounded-3xl">
            <p className="text-zinc-400">You haven't written any stories yet.</p>
          </div>
        ) : (
          blogs.map(blog => (
            <div key={blog.id} className="bg-white border border-zinc-100 rounded-2xl p-6 flex flex-col">
              <div className="flex items-center justify-between mb-4">
                <span className={cn(
                  "text-[10px] font-bold uppercase tracking-widest px-2 py-1 rounded-md",
                  blog.isPublished ? "bg-emerald-50 text-emerald-600" : "bg-zinc-100 text-zinc-500"
                )}>
                  {blog.isPublished ? 'Published' : 'Draft'}
                </span>
                <div className="flex gap-2">
                  <button 
                    onClick={() => navigate(`/editor/${blog.id}`)}
                    className="p-2 text-zinc-400 hover:text-black transition-colors"
                  >
                    <Edit size={18} />
                  </button>
                  <button 
                    onClick={() => handleDelete(blog.id)}
                    className="p-2 text-zinc-400 hover:text-red-500 transition-colors"
                  >
                    <Trash2 size={18} />
                  </button>
                </div>
              </div>
              <h3 className="text-lg font-bold text-zinc-900 mb-2 line-clamp-2">{blog.title}</h3>
              <p className="text-zinc-500 text-sm line-clamp-3 mb-6 flex-1">{blog.content}</p>
              <div className="text-[10px] text-zinc-400 uppercase tracking-widest">
                Last updated {format(new Date(blog.updatedAt), 'MMM d, yyyy')}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

function EditorPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [isPublished, setIsPublished] = useState(false);
  const [loading, setLoading] = useState(!!id);
  const [aiPrompt, setAiPrompt] = useState('');
  const [isAiLoading, setIsAiLoading] = useState(false);

  useEffect(() => {
    if (id) {
      apiFetch('/blogs/me')
        .then(blogs => {
          const blog = blogs.find((b: any) => b.id === id);
          if (blog) {
            setTitle(blog.title);
            setContent(blog.content);
            setIsPublished(blog.isPublished);
          }
        })
        .finally(() => setLoading(false));
    }
  }, [id]);

  const handleAiAssist = async () => {
    if (!aiPrompt.trim()) return;
    setIsAiLoading(true);
    try {
      const data = await apiFetch('/ai/assist', {
        method: 'POST',
        body: JSON.stringify({ prompt: aiPrompt, context: content }),
      });
      setContent(prev => prev + '\n\n' + data.text);
      setAiPrompt('');
      toast.success('AI Assistant added content!');
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setIsAiLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const method = id ? 'PATCH' : 'POST';
    const endpoint = id ? `/blogs/${id}` : '/blogs';
    try {
      await apiFetch(endpoint, {
        method,
        body: JSON.stringify({ title, content, isPublished }),
      });
      toast.success(id ? 'Story updated!' : 'Story saved!');
      navigate('/dashboard');
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  if (loading) return <div className="py-20 text-center">Loading editor...</div>;

  return (
    <div className="max-w-4xl mx-auto px-4 py-12">
      <form onSubmit={handleSubmit}>
        <header className="flex items-center justify-between mb-12">
          <Link to="/dashboard" className="text-sm font-bold text-zinc-400 hover:text-black flex items-center gap-1">
            <ChevronLeft size={16} /> Back
          </Link>
          <div className="flex items-center gap-4">
            <label className="flex items-center gap-2 cursor-pointer">
              <input 
                type="checkbox" 
                checked={isPublished}
                onChange={(e) => setIsPublished(e.target.checked)}
                className="w-4 h-4 rounded border-zinc-300 text-black focus:ring-black"
              />
              <span className="text-sm font-medium text-zinc-600">Publish immediately</span>
            </label>
            <button 
              type="submit"
              className="px-6 py-2 bg-black text-white rounded-full font-bold hover:bg-zinc-800 transition-all"
            >
              {id ? 'Update Story' : 'Save Story'}
            </button>
          </div>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
          <div className="lg:col-span-2">
            <input 
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Title of your story..."
              className="w-full text-5xl font-black tracking-tight border-none focus:ring-0 placeholder:text-zinc-100 mb-8"
              required
            />

            <textarea 
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="Start writing your masterpiece..."
              className="w-full min-h-[500px] text-xl leading-relaxed border-none focus:ring-0 placeholder:text-zinc-100 resize-none"
              required
            />
          </div>

          <div className="lg:col-span-1">
            <div className="sticky top-24 p-6 bg-zinc-50 rounded-3xl border border-zinc-100">
              <div className="flex items-center gap-2 mb-4 text-zinc-900">
                <Sparkles size={20} className="text-indigo-500" />
                <h3 className="font-bold">AI Writing Assistant</h3>
              </div>
              <p className="text-xs text-zinc-500 mb-4 leading-relaxed">
                Ask the AI to help you expand your ideas, fix grammar, or suggest conclusions.
              </p>
              <textarea 
                value={aiPrompt}
                onChange={(e) => setAiPrompt(e.target.value)}
                placeholder="e.g., 'Write a conclusion for this post'"
                className="w-full p-3 bg-white border border-zinc-200 rounded-xl text-sm mb-3 focus:ring-2 focus:ring-indigo-500 transition-all min-h-[100px] resize-none"
              />
              <button 
                type="button"
                onClick={handleAiAssist}
                disabled={isAiLoading || !aiPrompt.trim()}
                className="w-full py-3 bg-indigo-600 text-white rounded-xl font-bold text-sm hover:bg-indigo-700 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {isAiLoading ? <Loader2 size={18} className="animate-spin" /> : <Sparkles size={18} />}
                {isAiLoading ? 'Thinking...' : 'Ask AI'}
              </button>
            </div>
          </div>
        </div>
      </form>
    </div>
  );
}

function AuthPage({ type }: { type: 'login' | 'register' }) {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    try {
      const data = await apiFetch(`/auth/${type}`, {
        method: 'POST',
        body: JSON.stringify({ email, password, ...(type === 'register' ? { name } : {}) }),
      });
      login(data.token, data.user);
      navigate('/dashboard');
    } catch (err: any) {
      setError(err.message);
    }
  };

  return (
    <div className="min-h-[calc(100vh-64px)] flex items-center justify-center p-4 bg-zinc-50">
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="w-full max-w-md bg-white p-10 rounded-3xl shadow-2xl shadow-zinc-200/50"
      >
        <h2 className="text-3xl font-black tracking-tight text-zinc-900 mb-2">
          {type === 'login' ? 'Welcome Back' : 'Join the Community'}
        </h2>
        <p className="text-zinc-500 mb-8">
          {type === 'login' ? "Don't have an account?" : "Already have an account?"}
          <Link to={type === 'login' ? '/register' : '/login'} className="text-black font-bold ml-1 hover:underline">
            {type === 'login' ? 'Sign Up' : 'Sign In'}
          </Link>
        </p>

        {error && (
          <div className="mb-6 p-4 bg-red-50 text-red-500 text-sm rounded-xl font-medium">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {type === 'register' && (
            <div>
              <label className="block text-xs font-bold uppercase tracking-widest text-zinc-400 mb-2">Full Name</label>
              <input 
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full p-4 bg-zinc-50 border-none rounded-2xl focus:ring-2 focus:ring-black transition-all"
                placeholder="John Doe"
                required
              />
            </div>
          )}
          <div>
            <label className="block text-xs font-bold uppercase tracking-widest text-zinc-400 mb-2">Email Address</label>
            <input 
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full p-4 bg-zinc-50 border-none rounded-2xl focus:ring-2 focus:ring-black transition-all"
              placeholder="you@example.com"
              required
            />
          </div>
          <div>
            <label className="block text-xs font-bold uppercase tracking-widest text-zinc-400 mb-2">Password</label>
            <input 
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full p-4 bg-zinc-50 border-none rounded-2xl focus:ring-2 focus:ring-black transition-all"
              placeholder="••••••••"
              required
            />
          </div>
          <button 
            type="submit"
            className="w-full py-4 bg-black text-white rounded-2xl font-bold hover:bg-zinc-800 transition-all hover:scale-[1.02] active:scale-[0.98] mt-4"
          >
            {type === 'login' ? 'Sign In' : 'Create Account'}
          </button>
        </form>
      </motion.div>
    </div>
  );
}

function LandingPage() {
  return (
    <div className="max-w-5xl mx-auto px-4 py-24 text-center">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <h1 className="text-7xl md:text-8xl font-black tracking-tighter text-zinc-900 mb-8 leading-none italic">
          Write. Share.<br />Inspire.
        </h1>
        <p className="text-xl text-zinc-500 max-w-2xl mx-auto mb-12 leading-relaxed">
          A minimalist platform for thinkers, creators, and storytellers. 
          Secure, fast, and built for the modern web.
        </p>
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
          <Link 
            to="/feed" 
            className="px-8 py-4 bg-black text-white rounded-full font-bold text-lg hover:bg-zinc-800 transition-all hover:scale-105"
          >
            Read Stories
          </Link>
          <Link 
            to="/register" 
            className="px-8 py-4 bg-white border border-zinc-200 text-zinc-900 rounded-full font-bold text-lg hover:bg-zinc-50 transition-all"
          >
            Start Writing
          </Link>
        </div>
      </motion.div>
    </div>
  );
}

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, isLoading } = useAuth();
  if (isLoading) return null;
  if (!user) return <Navigate to="/login" />;
  return <>{children}</>;
}

export default function App() {
  return (
    <AuthProvider>
      <Toaster position="top-center" richColors />
      <Router>
        <div className="min-h-screen bg-white font-sans selection:bg-black selection:text-white">
          <Navbar />
          <main>
            <Routes>
              <Route path="/" element={<LandingPage />} />
              <Route path="/feed" element={<FeedPage />} />
              <Route path="/blog/:slug" element={<BlogDetailPage />} />
              <Route path="/login" element={<AuthPage type="login" />} />
              <Route path="/register" element={<AuthPage type="register" />} />
              
              <Route path="/dashboard" element={
                <ProtectedRoute>
                  <DashboardPage />
                </ProtectedRoute>
              } />
              <Route path="/editor" element={
                <ProtectedRoute>
                  <EditorPage />
                </ProtectedRoute>
              } />
              <Route path="/editor/:id" element={
                <ProtectedRoute>
                  <EditorPage />
                </ProtectedRoute>
              } />
            </Routes>
          </main>
          
          <footer className="py-20 border-t border-zinc-100 mt-20">
            <div className="max-w-5xl mx-auto px-4 flex flex-col md:flex-row items-center justify-between gap-8">
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 bg-black rounded flex items-center justify-center text-white text-xs font-bold">R</div>
                <span className="font-bold text-zinc-900">RivalBlog</span>
              </div>
              <p className="text-sm text-zinc-400">© 2026 Rival Assessment. Built with NestJS spirit & React.</p>
              <div className="flex gap-6">
                <a href="#" className="text-xs font-bold uppercase tracking-widest text-zinc-400 hover:text-black">Privacy</a>
                <a href="#" className="text-xs font-bold uppercase tracking-widest text-zinc-400 hover:text-black">Terms</a>
                <a href="#" className="text-xs font-bold uppercase tracking-widest text-zinc-400 hover:text-black">Contact</a>
              </div>
            </div>
          </footer>
        </div>
      </Router>
    </AuthProvider>
  );
}
