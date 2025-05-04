import { Schema, models, model } from "mongoose";
import { IMessage } from "../types/schema";

const MessageSchema = new Schema<IMessage>(
  {
    chat_id: { type: Schema.Types.ObjectId, ref: "Chat", required: true },
    buyer_id: { type: Schema.Types.ObjectId, ref: "Buyer", required: true },
    seller_id: { type: Schema.Types.ObjectId, ref: "Seller", required: true },
    message: {
      type: String,
      trim: true,
      minlength: 1,
      maxlength: 100,
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

const Message = models.Message || model<IMessage>("Message", MessageSchema);

export default Message;
