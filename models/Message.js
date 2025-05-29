const mongoose = require('mongoose');

const messageSchema = new mongoose.Schema({
  senderId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  receiverId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  text: {
    type: String,
    required: true,
    maxlength: 1000
  },
  isRead: {
    type: Boolean,
    default: false
  },
  messageType: {
    type: String,
    enum: ['text', 'system', 'reply'],
    default: 'text'
  },
  replyTo: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Message'
  }
}, { 
  timestamps: true // Automatically creates createdAt and updatedAt fields
});

// Indexes for faster querying
messageSchema.index({ senderId: 1, receiverId: 1, createdAt: -1 });
messageSchema.index({ replyTo: 1 });

// Post-save hook to create notification
messageSchema.post('save', async function(doc) {
  try {
    const Notification = mongoose.model('Notification');
    
    // Create notification for new messages
    if (doc.messageType !== 'system') {
      const notification = new Notification({
        recipientId: doc.receiverId,
        senderId: doc.senderId,
        messageId: doc._id,
        text: doc.text,
        quickReplies: ['👍', '👎', 'OK', 'Thanks!']
      });
      
      await notification.save();
    }
  } catch (error) {
    console.error('Error creating notification:', error);
  }
});

const Message = mongoose.model('Message', messageSchema);

module.exports = Message;