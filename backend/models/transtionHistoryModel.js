import mongoose from 'mongoose';

const transactionHistorySchema = new mongoose.Schema(
  {
    userId: {
      type: String,
      required: true,
      // trim: true
    },
    userName: {
      type: String,
      required: true,
      trim: true,
    },
    deposite: {
      type: Number,
      required: true,
    },
    withdrawl: {
      type: Number,
      required: true,
    },
    amount: {
      type: Number,
      required: true,
    },
    remark: {
      type: String,
      trim: true,
    },
    invite: {
      type: String,
      trim: true,
    },
    from: {
      type: String,
      trim: true,
    },
    to: {
      type: String,
      trim: true,
    },
    date: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
  }
);

// Indexes for Account Statement performance
transactionHistorySchema.index({ userId: 1, createdAt: -1 });
transactionHistorySchema.index({ invite: 1 });
transactionHistorySchema.index({ createdAt: -1 });

const TransactionHistory = mongoose.model(
  'TransactionHistory',
  transactionHistorySchema
);

export default TransactionHistory;
