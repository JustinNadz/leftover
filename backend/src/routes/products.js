const express = require('express');
const { PrismaClient } = require('@prisma/client');
const { authMiddleware, optionalAuth, merchantOnly } = require('../middleware/auth');

const router = express.Router();
const prisma = new PrismaClient();

// GET /products - List all products
router.get('/', optionalAuth, async (req, res) => {
    try {
        const { category, merchantId, search } = req.query;

        const where = {
            quantity: { gt: 0 }, // Only show in-stock items
        };

        if (category && category !== 'All') {
            where.category = category;
        }

        if (merchantId) {
            where.merchantId = merchantId;
        }

        if (search) {
            where.OR = [
                { title: { contains: search } },
                { description: { contains: search } },
            ];
        }

        const products = await prisma.product.findMany({
            where,
            include: {
                merchant: {
                    select: { id: true, name: true, phone: true },
                },
            },
            orderBy: { createdAt: 'desc' },
        });

        res.json(products);
    } catch (error) {
        console.error('Get products error:', error);
        res.status(500).json({ error: 'Failed to get products' });
    }
});

// GET /products/my - Get current merchant's products
router.get('/my', authMiddleware, async (req, res) => {
    try {
        const products = await prisma.product.findMany({
            where: { merchantId: req.user.userId },
            orderBy: { createdAt: 'desc' },
        });

        res.json(products);
    } catch (error) {
        console.error('Get my products error:', error);
        res.status(500).json({ error: 'Failed to get products' });
    }
});

// GET /products/:id - Get single product
router.get('/:id', optionalAuth, async (req, res) => {
    try {
        const product = await prisma.product.update({
            where: { id: req.params.id },
            data: { views: { increment: 1 } },
            include: {
                merchant: {
                    select: { id: true, name: true, phone: true },
                },
            },
        });

        if (!product) {
            return res.status(404).json({ error: 'Product not found' });
        }

        res.json(product);
    } catch (error) {
        console.error('Get product error:', error);
        res.status(500).json({ error: 'Failed to get product' });
    }
});

// POST /products - Create product (merchant only)
router.post('/', authMiddleware, merchantOnly, async (req, res) => {
    try {
        const {
            title,
            description,
            image,
            category,
            originalPrice,
            offerPrice,
            quantity,
            pickupTime,
        } = req.body;

        if (!title || !offerPrice) {
            return res.status(400).json({ error: 'Title and offer price required' });
        }

        const product = await prisma.product.create({
            data: {
                merchantId: req.user.userId,
                title,
                description: description || '',
                image: image || 'https://images.unsplash.com/photo-1504674900247-0877df9cc836?auto=format&fit=crop&w=1200&q=80',
                category: category || 'Fast Food',
                originalPrice: originalPrice ? parseFloat(originalPrice) : null,
                offerPrice: parseFloat(offerPrice),
                quantity: quantity ? parseInt(quantity) : 1,
                pickupTime: pickupTime || 'ASAP',
            },
            include: {
                merchant: {
                    select: { id: true, name: true },
                },
            },
        });

        res.status(201).json(product);
    } catch (error) {
        console.error('Create product error:', error);
        res.status(500).json({ error: 'Failed to create product' });
    }
});

// PUT /products/:id - Update product (owner only)
router.put('/:id', authMiddleware, async (req, res) => {
    try {
        const product = await prisma.product.findUnique({
            where: { id: req.params.id },
        });

        if (!product) {
            return res.status(404).json({ error: 'Product not found' });
        }

        if (product.merchantId !== req.user.userId) {
            return res.status(403).json({ error: 'Not authorized' });
        }

        const {
            title,
            description,
            image,
            category,
            originalPrice,
            offerPrice,
            quantity,
            pickupTime,
        } = req.body;

        const updated = await prisma.product.update({
            where: { id: req.params.id },
            data: {
                title: title || undefined,
                description: description || undefined,
                image: image || undefined,
                category: category || undefined,
                originalPrice: originalPrice ? parseFloat(originalPrice) : undefined,
                offerPrice: offerPrice ? parseFloat(offerPrice) : undefined,
                quantity: quantity !== undefined ? parseInt(quantity) : undefined,
                pickupTime: pickupTime || undefined,
            },
        });

        res.json(updated);
    } catch (error) {
        console.error('Update product error:', error);
        res.status(500).json({ error: 'Failed to update product' });
    }
});

// DELETE /products/:id - Delete product (owner only)
router.delete('/:id', authMiddleware, async (req, res) => {
    try {
        const product = await prisma.product.findUnique({
            where: { id: req.params.id },
        });

        if (!product) {
            return res.status(404).json({ error: 'Product not found' });
        }

        if (product.merchantId !== req.user.userId) {
            return res.status(403).json({ error: 'Not authorized' });
        }

        await prisma.product.delete({
            where: { id: req.params.id },
        });

        res.json({ success: true });
    } catch (error) {
        console.error('Delete product error:', error);
        res.status(500).json({ error: 'Failed to delete product' });
    }
});

module.exports = router;
