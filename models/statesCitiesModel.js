import mongoose from "mongoose";

const citieSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
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
