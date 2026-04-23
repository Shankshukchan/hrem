import mongoose from "mongoose";

const citieSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
  },
  isTopCity: {
    type: Boolean,
    default: false,
  },
  seo: {
    title: {
      type: String,
      default: "",
    },
    description: {
      type: String,
      default: "",
    },
    keywords: {
      type: String,
      default: "",
    },
    htmlSnippet: {
      type: String,
      default: "",
    },
  },
});

const stateSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    unique: true,
  },
  cities: [citieSchema],
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

export const State = mongoose.model("State", stateSchema);
