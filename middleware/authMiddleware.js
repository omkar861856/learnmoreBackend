import { JWT_SECRET } from "../index.js";

// Middleware to protect routes
const authMiddleware = (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader) {
    return res.status(401).send('Authorization header required');
  }

  const token = authHeader.split(' ')[1];
  if (!token) {
    return res.status(401).send('Token required');
  }

  try {
    const payload = jwt.verify(token, JWT_SECRET);
    req.userId = payload.userId;
    next();
  } catch (err) {
    res.status(401).send('Invalid token');
  }
};
