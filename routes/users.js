const express = require('express');
const router = express.Router();
const User = require('../models/User');
const authCheck = require('../middlewares/authMiddleware.js');

// Get all users (protected route)
router.get('/', authCheck, async (req, res) => {
    try {
        // Find all users but exclude sensitive information
        const users = await User.find({})
            .select('-passwordHash -email')
            .lean();

        res.json(users);
    } catch (error) {
        console.error('Error fetching users:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

module.exports = router; 