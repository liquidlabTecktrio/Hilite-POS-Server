const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const PosHeartbeat = new Schema(
  {
    posDeviceID: {
      type: String,
      // required: true,
    },
    newPosDeviceID: {
      type: String,
      // required: true,
    },
    opretorId: {
      type: String,
      required: true,
    },
    opretorNo: {
      type: String,
      required: true,
    },
    opretorName: {
      type: String,
      required: true,
    },
    mobileNo: {
      type: Number,
      required: true,
    },
    opretorEmail: {
      type: String,
      required: true,
    },
    parkingId: {
      type: mongoose.Types.ObjectId,
      required: true,
    },
    parkingNo: {
      type: String,
      required: true,
    },
    parkingName: {
      type: String,
      required: true,
    },
    loginTime: {
      type: String,
      required: true,
    },
    lastUpdated: {
      type: String,
      required: true,
    },
    isAlive:{
      type:Boolean
    },
    isActive:{
      type:Boolean
    }
  },
  {
    timestamps: true,
  }
);

// PosHeartbeat.index({ createdAt: 1 }, { expireAfterSeconds: 60*720 });

module.exports = mongoose.model("PosHeartbeat", PosHeartbeat);
