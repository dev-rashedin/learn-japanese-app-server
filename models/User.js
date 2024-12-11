const mongoose = require('mongoose');

const userSchema = new mongoose.Schema(
  {
    displayName: {
      type: String,
    },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
    },
    photoURL: {
      type: String,
    },
    role: {
      type: String,
      enum: ['user', 'admin'],
      default: 'user',
    },
    status: {
      type: String,
      enum: ['requested', 'verified', 'remove-admin'],
      default: 'verified',
    },
  },
  {
    timestamps: true, // Automatically adds `createdAt` and `updatedAt` fields
  }
);

module.exports = mongoose.model('User', userSchema);
