const express = require('express');
const jwt = require('jsonwebtoken');
const { PrismaClient } = require('@prisma/client');
const { JWT_SECRET } = require('../middleware/auth');

const router = express.Router();
const prisma = new PrismaClient();

// Generate random 4-digit OTP
const generateOtp = () => Math.floor(1000 + Math.random() * 9000).toString();

// POST /auth/send-otp
router.post('/send-otp', async (req, res) => {
    try {
        const { phone } = req.body;

        if (!phone || phone.trim().length < 7) {
            return res.status(400).json({ error: 'Valid phone number required' });
        }

        const code = generateOtp();
        const expiresAt = new Date(Date.now() + 5 * 60 * 1000); // 5 minutes

        // Save OTP to database
        await prisma.otpCode.create({
            data: {
                phone: phone.trim(),
                code,
                expiresAt,
            },
        });

        // In production, send SMS here (Twilio, etc.)
        // For MVP, we return the OTP in response (simulated)
        console.log(`📱 OTP for ${phone}: ${code}`);

        res.json({
            success: true,
            message: 'OTP sent successfully',
            // Remove this line in production!
            otp: code, // For testing only
        });
    } catch (error) {
        console.error('Send OTP error:', error);
        res.status(500).json({ error: 'Failed to send OTP' });
    }
});

// POST /auth/verify-otp
router.post('/verify-otp', async (req, res) => {
    try {
        const { phone, otp } = req.body;

        if (!phone || !otp) {
            return res.status(400).json({ error: 'Phone and OTP required' });
        }

        // Find valid OTP
        const otpRecord = await prisma.otpCode.findFirst({
            where: {
                phone: phone.trim(),
                code: otp,
                used: false,
                expiresAt: { gt: new Date() },
            },
            orderBy: { createdAt: 'desc' },
        });

        if (!otpRecord) {
            return res.status(400).json({ error: 'Invalid or expired OTP' });
        }

        // Mark OTP as used
        await prisma.otpCode.update({
            where: { id: otpRecord.id },
            data: { used: true },
        });

        // Check if user exists
        let user = await prisma.user.findUnique({
            where: { phone: phone.trim() },
        });

        const isNewUser = !user;

        if (!user) {
            // Create new user with default role
            user = await prisma.user.create({
                data: {
                    phone: phone.trim(),
                    name: `User${phone.slice(-4)}`,
                    role: 'BUYER',
                },
            });
        }

        // Generate JWT
        const token = jwt.sign(
            { userId: user.id, phone: user.phone, role: user.role },
            JWT_SECRET,
            { expiresIn: '30d' }
        );

        res.json({
            success: true,
            token,
            user: {
                id: user.id,
                phone: user.phone,
                name: user.name,
                role: user.role,
            },
            isNewUser,
        });
    } catch (error) {
        console.error('Verify OTP error:', error);
        res.status(500).json({ error: 'Failed to verify OTP' });
    }
});

// POST /auth/update-role
router.post('/update-role', async (req, res) => {
    try {
        const authHeader = req.headers.authorization;
        if (!authHeader) {
            return res.status(401).json({ error: 'No token provided' });
        }

        const token = authHeader.split(' ')[1];
        const decoded = jwt.verify(token, JWT_SECRET);

        const { role, name } = req.body;

        if (!['BUYER', 'MERCHANT'].includes(role)) {
            return res.status(400).json({ error: 'Invalid role' });
        }

        const user = await prisma.user.update({
            where: { id: decoded.userId },
            data: {
                role,
                name: name || undefined,
            },
        });

        // Generate new token with updated role
        const newToken = jwt.sign(
            { userId: user.id, phone: user.phone, role: user.role },
            JWT_SECRET,
            { expiresIn: '30d' }
        );

        res.json({
            success: true,
            token: newToken,
            user: {
                id: user.id,
                phone: user.phone,
                name: user.name,
                role: user.role,
            },
        });
    } catch (error) {
        console.error('Update role error:', error);
        res.status(500).json({ error: 'Failed to update role' });
    }
});

module.exports = router;
