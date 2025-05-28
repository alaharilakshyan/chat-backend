const express = require('express');
const router = express.Router();
const authCheck = require('../middlewares/authMiddleware');
const Message = require('../models/Message');

// Get messages between current user and specific user
router.get('/:userId', authCheck, async (req, res) => {
  try {
    const { userId } = req.params;
    const currentUser = req.userId;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const skip = (page - 1) * limit;

    const messages = await Message.find({
      $or: [
        { senderId: currentUser, receiverId: userId },
        { senderId: userId, receiverId: currentUser }
      ]
    })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit + 1) // Fetch one extra to check hasMore
      .populate('senderId', 'username avatar')
      .populate('receiverId', 'username avatar');

    const hasMore = messages.length > limit;
    if (hasMore) messages.pop();

    res.json({
      messages: messages.reverse(), // Return oldest first for current page
      hasMore
    });
  } catch (error) {
    console.error('Error fetching messages:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Send new message
router.post('/', authCheck, async (req, res) => {
  try {
    const { receiverId, text } = req.body;
    const newMessage = new Message({
      senderId: req.userId,
      receiverId,
      text
    });

    await newMessage.save();
    const populatedMessage = await Message.populate(newMessage, {
      path: 'senderId receiverId',
      select: 'username avatar'
    });

    res.status(201).json(populatedMessage);
  } catch (error) {
    console.error('Error sending message:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;