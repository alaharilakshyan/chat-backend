require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const { createServer } = require('http');
const { Server } = require('socket.io');

// Import routes
const authRoutes = require('./routes/auth');
const messageRoutes = require('./routes/message');
// Import models - only declare once!
const User = require('./models/User');
const Message = require('./models/Message'); // Single declaration

const app = express();
const httpServer = createServer(app);

// Database connection
mongoose.connect(process.env.MONGODB_URI)
  .then(() => console.log('Connected to MongoDB'))
  .catch(err => console.error('MongoDB connection error:', err));

// Middlewares
app.use(cors({
  origin: process.env.CORS_ORIGIN,
  credentials: true
}));
app.use(express.json());

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/messages', messageRoutes);

// Socket.IO setup
const io = new Server(httpServer, {
  cors: {
    origin: process.env.CORS_ORIGIN,
    methods: ["GET", "POST"]
  }
});

// Track online users: userId → Set of socket IDs
const onlineUsers = new Map();

// Socket.IO Authentication Middleware
io.use(async (socket, next) => {
  try {
    const token = socket.handshake.auth.token;
    if (!token) {
      return next(new Error('Authentication error: No token provided'));
    }
    
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.userId);
    if (!user) {
      return next(new Error('Authentication error: User not found'));
    }
    
    socket.userId = user._id.toString();
    next();
  } catch (error) {
    console.error('Socket authentication error:', error.message);
    next(new Error('Authentication failed'));
  }
});

// Socket.IO Connection Handler
io.on('connection', (socket) => {
  const userId = socket.userId;
  console.log(`User connected: ${userId} | Socket: ${socket.id}`);

  // Join user-specific room
  socket.join(userId);

  // Update online status
  if (!onlineUsers.has(userId)) {
    onlineUsers.set(userId, new Set());
    
    // Update DB status
    User.findByIdAndUpdate(userId, { 
      isOnline: true,
      lastSeen: null
    }).exec();
    
    // Broadcast online status
    io.emit('user_online', { userId });
  }
  
  // Add socket to user's connection set
  onlineUsers.get(userId).add(socket.id);

  // Message Handler
  socket.on('send_message', async ({ receiverId, text }, callback) => {
    try {
      if (!receiverId || !text) {
        throw new Error('Invalid message data');
      }

      const newMessage = new Message({
        senderId: userId,
        receiverId,
        text
      });

      await newMessage.save();
      
      // Populate message with user details
      const populatedMessage = await Message.findById(newMessage._id)
        .populate('senderId', 'username avatar')
        .populate('receiverId', 'username avatar');

      // Send to receiver
      io.to(receiverId).emit('receive_message', populatedMessage);
      
      // Confirm delivery to sender
      callback({ 
        success: true,
        message: populatedMessage
      });
    } catch (error) {
      console.error('Message sending error:', error);
      callback({ 
        success: false, 
        error: error.message 
      });
    }
  });

  // Disconnect Handler
  socket.on('disconnect', () => {
    console.log(`User disconnected: ${userId} | Socket: ${socket.id}`);
    
    if (!onlineUsers.has(userId)) return;

    const sockets = onlineUsers.get(userId);
    sockets.delete(socket.id);

    if (sockets.size === 0) {
      onlineUsers.delete(userId);
      User.findByIdAndUpdate(userId, { 
        isOnline: false,
        lastSeen: Date.now()
      }).exec();
      io.emit('user_offline', { userId });
    }
  });

  // Handle 
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({ 
    status: 'ok',
    onlineUsers: onlineUsers.size
  });
});

const PORT = process.env.PORT || 5000;
httpServer.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});