import mongoose, { Document, Schema } from 'mongoose';

export interface ISale extends Document {
  customerName?: string;
  customerMobile?: string;
  items: Array<{ item: mongoose.Types.ObjectId; quantity: number; unitPrice: number; discountAmount: number; totalPrice: number }>;
  subtotal: number;
  totalDiscount: number;
  grandTotal: number;
  soldBy: mongoose.Types.ObjectId;
}

const SaleSchema = new Schema<ISale>({
  customerName: { type: String, trim: true }, customerMobile: { type: String, trim: true },
  items: [{ item: { type: Schema.Types.ObjectId, ref: 'Item', required: true }, quantity: { type: Number, min: 1, required: true }, unitPrice: { type: Number, min: 0, required: true }, discountAmount: { type: Number, min: 0, default: 0 }, totalPrice: { type: Number, min: 0, required: true } }],
  subtotal: { type: Number, min: 0, required: true }, totalDiscount: { type: Number, min: 0, required: true }, grandTotal: { type: Number, min: 0, required: true },
  soldBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
}, { timestamps: true });

export default mongoose.model<ISale>('Sale', SaleSchema);
