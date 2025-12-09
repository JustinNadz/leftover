const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'leftuber-secret-key-change-in-production';

const authMiddleware = (req, res, next) => {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ error: 'No token provided' });
    }

    const token = authHeader.split(' ')[1];

    try {
        const decoded = jwt.verify(token, JWT_SECRET);
        req.user = decoded;
        next();
    } catch (error) {
        return res.status(401).json({ error: 'Invalid token' });
    }
};

// Optional auth - doesn't fail if no token
const optionalAuth = (req, res, next) => {
    const authHeader = req.headers.authorization;

    if (authHeader && authHeader.startsWith('Bearer ')) {
        const token = authHeader.split(' ')[1];
        try {
            const decoded = jwt.verify(token, JWT_SECRET);
            req.user = decoded;
        } catch (error) {
            // Ignore invalid token
        }
    }
    next();
};

// Merchant only middleware
const merchantOnly = (req, res, next) => {
    if (req.user.role !== 'MERCHANT') {
        return res.status(403).json({ error: 'Merchant access required' });
    }
    next();
};

module.exports = { authMiddleware, optionalAuth, merchantOnly, JWT_SECRET };
