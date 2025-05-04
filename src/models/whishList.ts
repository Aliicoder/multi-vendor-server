import { Schema, ObjectId, models, model } from "mongoose";
import { IWishList } from "../types/schema";

const wishListSchema = new Schema<IWishList>({
  userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
  products: { type: [Schema.Types.ObjectId], ref: "Product" },
});
const WishList =
  models.WishList || model<IWishList>("WishList", wishListSchema);
export default WishList;
