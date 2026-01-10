import mongoose from 'mongoose';

const sweetCoinTransactionSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    // Signed integer delta (positive = credit, negative = debit)
    amount: {
      type: Number,
      required: true,
      validate: {
        validator: (v) => Number.isFinite(v) && Number.isInteger(v),
        message: 'amount must be an integer',
      },
    },
    kind: {
      type: String,
      enum: ['admin_gift', 'admin_adjustment'],
      required: true,
    },
    note: {
      type: String,
      default: '',
      trim: true,
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

sweetCoinTransactionSchema.index({ user: 1, createdAt: -1 });

const SweetCoinTransaction = mongoose.model('SweetCoinTransaction', sweetCoinTransactionSchema);

export default SweetCoinTransaction;
