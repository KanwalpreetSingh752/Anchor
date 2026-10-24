import express from 'express';
import { createProxyMiddleware } from 'http-proxy-middleware';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.FRONTEND_PORT || 5173;
const API_URL = process.env.API_URL || 'http://api:3001';

// Proxy /api requests to backend API server (preserving /api path)
app.use(
  createProxyMiddleware({
    target: API_URL,
    changeOrigin: true,
    pathFilter: ['/api/**', '/socket.io/**'],
    ws: true,
  })
);

// Serve static build files
const distPath = path.join(__dirname, 'dist');
app.use(express.static(distPath));

// Fallback all other GET routes to index.html for client-side routing
app.use((req, res, next) => {
  if (req.method === 'GET' && !req.path.startsWith('/api') && !req.path.startsWith('/socket.io')) {
    return res.sendFile(path.join(distPath, 'index.html'));
  }
  next();
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Anchor Frontend running on http://0.0.0.0:${PORT} (proxying /api & /socket.io to ${API_URL})`);
});
