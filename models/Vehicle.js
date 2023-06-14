const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const Vehicle = new Schema(
  {
    vehicleName: {
      type: String,
      required: true,
    },
    vehicleWheels: {
      type: Number,
      required: true,
    },
    isActive:{
      type:Boolean
    }
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model("Vehicles", Vehicle);
