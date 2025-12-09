const express = require('express');
const { PrismaClient } = require('@prisma/client');
const { authMiddleware } = require('../middleware/auth');

const router = express.Router();
const prisma = new PrismaClient();

// GET /users/me - Get current user profile
router.get('/me', authMiddleware, async (req, res) => {
    try {
        const user = await prisma.user.findUnique({
            where: { id: req.user.userId },
            select: {
                id: true,
                phone: true,
                name: true,
                role: true,
                pushToken: true,
                createdAt: true,
            },
        });

        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }

        res.json(user);
    } catch (error) {
        console.error('Get user error:', error);
        res.status(500).json({ error: 'Failed to get user' });
    }
});

// PUT /users/me - Update current user profile
router.put('/me', authMiddleware, async (req, res) => {
    try {
        const { name, pushToken } = req.body;

        const user = await prisma.user.update({
            where: { id: req.user.userId },
            data: {
                name: name || undefined,
                pushToken: pushToken || undefined,
            },
            select: {
                id: true,
                phone: true,
                name: true,
                role: true,
                pushToken: true,
            },
        });

        res.json(user);
    } catch (error) {
        console.error('Update user error:', error);
        res.status(500).json({ error: 'Failed to update user' });
    }
});

// GET /users/stats - Get user stats (for merchants)
router.get('/stats', authMiddleware, async (req, res) => {
    try {
        if (req.user.role !== 'MERCHANT') {
            return res.status(403).json({ error: 'Merchant access required' });
        }

        const [productCount, orderCount, totalSales] = await Promise.all([
            prisma.product.count({ where: { merchantId: req.user.userId } }),
            prisma.order.count({ where: { merchantId: req.user.userId } }),
            prisma.order.aggregate({
                where: { merchantId: req.user.userId, status: 'COMPLETED' },
                _sum: { total: true },
            }),
        ]);

        res.json({
            productCount,
            orderCount,
            totalSales: totalSales._sum.total || 0,
        });
    } catch (error) {
        console.error('Get stats error:', error);
        res.status(500).json({ error: 'Failed to get stats' });
    }
});

module.exports = router;
