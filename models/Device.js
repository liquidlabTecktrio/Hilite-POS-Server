const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const Device = new Schema(
  {
    deviceName: {
      type: String,
      required: true,
    },
    deviceType: {
      type: String,
      required: true,
    },
    parkingId: {
      type: mongoose.Types.ObjectId,
      required: true,
    },
    DeviceMacAddress: {
      type: String,
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

module.exports = mongoose.model("Devices", Device);
