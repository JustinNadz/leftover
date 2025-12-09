const express = require('express');
const { PrismaClient } = require('@prisma/client');
const { authMiddleware } = require('../middleware/auth');

const router = express.Router();
const prisma = new PrismaClient();

const DELIVERY_FEE = 30;

// GET /orders - List orders
router.get('/', authMiddleware, async (req, res) => {
    try {
        const { status } = req.query;
        const where = {};

        // Buyers see their orders, merchants see incoming orders
        if (req.user.role === 'MERCHANT') {
            where.merchantId = req.user.userId;
        } else {
            where.buyerId = req.user.userId;
        }

        if (status) {
            where.status = status;
        }

        const orders = await prisma.order.findMany({
            where,
            include: {
                product: {
                    select: { id: true, title: true, image: true, offerPrice: true },
                },
                buyer: {
                    select: { id: true, name: true, phone: true },
                },
                merchant: {
                    select: { id: true, name: true, phone: true },
                },
            },
            orderBy: { createdAt: 'desc' },
        });

        res.json(orders);
    } catch (error) {
        console.error('Get orders error:', error);
        res.status(500).json({ error: 'Failed to get orders' });
    }
});

// GET /orders/:id - Get single order
router.get('/:id', authMiddleware, async (req, res) => {
    try {
        const order = await prisma.order.findUnique({
            where: { id: req.params.id },
            include: {
                product: true,
                buyer: {
                    select: { id: true, name: true, phone: true },
                },
                merchant: {
                    select: { id: true, name: true, phone: true },
                },
            },
        });

        if (!order) {
            return res.status(404).json({ error: 'Order not found' });
        }

        // Check access
        if (order.buyerId !== req.user.userId && order.merchantId !== req.user.userId) {
            return res.status(403).json({ error: 'Not authorized' });
        }

        res.json(order);
    } catch (error) {
        console.error('Get order error:', error);
        res.status(500).json({ error: 'Failed to get order' });
    }
});

// POST /orders - Create new order
router.post('/', authMiddleware, async (req, res) => {
    try {
        const {
            productId,
            deliveryType,
            addressText,
            latitude,
            longitude,
            scheduledDate,
            scheduledTime,
            note,
        } = req.body;

        if (!productId) {
            return res.status(400).json({ error: 'Product ID required' });
        }

        // Get product
        const product = await prisma.product.findUnique({
            where: { id: productId },
        });

        if (!product) {
            return res.status(404).json({ error: 'Product not found' });
        }

        if (product.quantity <= 0) {
            return res.status(400).json({ error: 'Product is sold out' });
        }

        // Check delivery address for delivery orders
        if (deliveryType === 'DELIVERY' && !addressText && !latitude) {
            return res.status(400).json({ error: 'Delivery address required' });
        }

        const subtotal = product.offerPrice;
        const total = subtotal + DELIVERY_FEE;

        // Create order and decrement product quantity in transaction
        const [order] = await prisma.$transaction([
            prisma.order.create({
                data: {
                    buyerId: req.user.userId,
                    merchantId: product.merchantId,
                    productId,
                    deliveryType: deliveryType || 'PICKUP',
                    addressText,
                    latitude,
                    longitude,
                    scheduledDate,
                    scheduledTime,
                    note,
                    deliveryFee: DELIVERY_FEE,
                    subtotal,
                    total,
                },
                include: {
                    product: {
                        select: { id: true, title: true, image: true },
                    },
                    merchant: {
                        select: { id: true, name: true, phone: true },
                    },
                },
            }),
            prisma.product.update({
                where: { id: productId },
                data: {
                    quantity: { decrement: 1 },
                    salesCount: { increment: 1 },
                },
            }),
        ]);

        // Update hot/bestseller flags
        const updatedProduct = await prisma.product.findUnique({
            where: { id: productId },
        });

        if (updatedProduct) {
            await prisma.product.update({
                where: { id: productId },
                data: {
                    hot: updatedProduct.salesCount > 10,
                    bestSeller: updatedProduct.salesCount > 25,
                },
            });
        }

        res.status(201).json(order);
    } catch (error) {
        console.error('Create order error:', error);
        res.status(500).json({ error: 'Failed to create order' });
    }
});

// PUT /orders/:id/status - Update order status (merchant only)
router.put('/:id/status', authMiddleware, async (req, res) => {
    try {
        const { status } = req.body;

        if (!['PENDING', 'CONFIRMED', 'COMPLETED', 'CANCELLED'].includes(status)) {
            return res.status(400).json({ error: 'Invalid status' });
        }

        const order = await prisma.order.findUnique({
            where: { id: req.params.id },
        });

        if (!order) {
            return res.status(404).json({ error: 'Order not found' });
        }

        // Only merchant can update status
        if (order.merchantId !== req.user.userId) {
            return res.status(403).json({ error: 'Only merchant can update order status' });
        }

        // If cancelling, restore product quantity
        if (status === 'CANCELLED' && order.status !== 'CANCELLED') {
            await prisma.product.update({
                where: { id: order.productId },
                data: {
                    quantity: { increment: 1 },
                    salesCount: { decrement: 1 },
                },
            });
        }

        const updated = await prisma.order.update({
            where: { id: req.params.id },
            data: { status },
            include: {
                product: {
                    select: { id: true, title: true },
                },
                buyer: {
                    select: { id: true, name: true, phone: true },
                },
            },
        });

        res.json(updated);
    } catch (error) {
        console.error('Update order status error:', error);
        res.status(500).json({ error: 'Failed to update order status' });
    }
});

module.exports = router;
