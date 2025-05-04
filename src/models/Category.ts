import { Schema, model } from "mongoose";
import { ICategory } from "../types/schema";

const categorySchema = new Schema<ICategory>(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    parentId: {
      type: Schema.Types.ObjectId,
      ref: "Category",
      default: null,
    },
    path: {
      type: [String],
      default: [],
    },
    level: {
      type: Number,
      required: true,
      default: 1,
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

categorySchema.virtual("children", {
  ref: "Category",
  localField: "_id",
  foreignField: "parentId",
  justOne: false,
});

const Category = model<ICategory>("Category", categorySchema);

export default Category;
