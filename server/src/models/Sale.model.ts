import mongoose, { Document, Schema } from 'mongoose';

export interface ISaleItem {
  item: mongoose.Types.ObjectId;
  quantity: number;
  unitPrice: number;
  discountType?: 'FLAT' | 'PERCENT';
  discountValue?: number;
  discountAmount: number;
  totalPrice: number;
}

export interface ISale extends Document {
  invoiceNumber: string;
  customerName?: string;
  customerMobile?: string;
  paymentMethod: 'CASH' | 'UPI' | 'CARD' | 'CREDIT' | 'OTHER';
  notes?: string;
  items: ISaleItem[];
  subtotal: number;
  itemDiscountTotal?: number;
  billDiscountType?: 'FLAT' | 'PERCENT';
  billDiscountValue?: number;
  billDiscountAmount?: number;
  totalDiscount: number;
  grandTotal: number;
  status: 'COMPLETED' | 'CANCELLED';
  cancelReason?: string;
  soldBy: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const SaleSchema = new Schema<ISale>(
  {
    invoiceNumber: { type: String, trim: true, index: true },
    customerName: { type: String, trim: true },
    customerMobile: { type: String, trim: true },
    paymentMethod: {
      type: String,
      enum: ['CASH', 'UPI', 'CARD', 'CREDIT', 'OTHER'],
      default: 'CASH',
    },
    notes: { type: String, trim: true },
    status: {
      type: String,
      enum: ['COMPLETED', 'CANCELLED'],
      default: 'COMPLETED',
      index: true,
    },
    cancelReason: { type: String, trim: true },
    items: [
      {
        item: { type: Schema.Types.ObjectId, ref: 'Item', required: true },
        quantity: { type: Number, min: 1, required: true },
        unitPrice: { type: Number, min: 0, required: true },
        discountType: { type: String, enum: ['FLAT', 'PERCENT'], default: 'FLAT' },
        discountValue: { type: Number, min: 0, default: 0 },
        discountAmount: { type: Number, min: 0, default: 0 },
        totalPrice: { type: Number, min: 0, required: true },
      },
    ],
    subtotal: { type: Number, min: 0, required: true },
    itemDiscountTotal: { type: Number, min: 0, default: 0 },
    billDiscountType: { type: String, enum: ['FLAT', 'PERCENT'], default: 'FLAT' },
    billDiscountValue: { type: Number, min: 0, default: 0 },
    billDiscountAmount: { type: Number, min: 0, default: 0 },
    totalDiscount: { type: Number, min: 0, required: true },
    grandTotal: { type: Number, min: 0, required: true },
    soldBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  },
  { timestamps: true }
);

export default mongoose.model<ISale>('Sale', SaleSchema);
