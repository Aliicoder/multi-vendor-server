import { Schema, models, model } from "mongoose";
import { IChat } from "../types/schema";

const ChatSchema = new Schema<IChat>(
  {
    seller_id: { type: Schema.Types.ObjectId, ref: "Buyer", required: true },
    participants: [
      {
        participant_id: {
          type: Schema.Types.ObjectId,
          ref: "Buyer",
          required: true,
        },
      },
    ],
  },
  {
    timestamps: true,
  }
);

const Chat = models.Chat || model<IChat>("Chat", ChatSchema);

export default Chat;
