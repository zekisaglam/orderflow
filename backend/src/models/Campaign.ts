import mongoose, { Schema, Document } from 'mongoose';

export interface ICampaign extends Document {
  clientId: string;
  name: string;
  budget: number;
  impressions: number;
  clicks: number;
  createdAt: Date;
}

const CampaignSchema = new Schema<ICampaign>({
  clientId: { type: String, required: true },
  name: { type: String, required: true },
  budget: { type: Number },
  impressions: { type: Number, default: 0 },
  clicks: { type: Number, default: 0 },
  createdAt: { type: Date, default: Date.now },
});

export const Campaign = mongoose.model<ICampaign>('Campaign', CampaignSchema);
