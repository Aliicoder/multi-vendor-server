import mongoose, { Schema, models, model, Types } from "mongoose";
import { IAdvertisement } from "../types/schema";

const advertisementSchema = new Schema<IAdvertisement>(
  {
    title: { type: String, trim: true, required: true },
    image: { type: String, required: true },
    dos: { type: Date, required: true },
    doe: { type: Date, required: true },
    link: { type: String, default: null },
    advertiserId: { type: mongoose.Schema.Types.ObjectId, ref: "Seller" },
  },
  {
    timestamps: true,
  }
);
advertisementSchema.index({
  name: "text",
});
const Advertisement =
  models.Advertisement ||
  model<IAdvertisement>("Advertisement", advertisementSchema);

export default Advertisement;
