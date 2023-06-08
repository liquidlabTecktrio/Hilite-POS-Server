const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const Opretor = new Schema(
  {
    opretorName: {
      type: String,
      required: true,
    },
    opretorNo: {
      type: String,
      required: true,
    },
    parkingId: {
      type: mongoose.Types.ObjectId,
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
    username: {
      type: String,
      required: true,
    },
    password: {
      type: String,
      required: true,
    },
    isShiftIn: {
      type: Boolean,
      default:false
    },
    isLogedIn: {
      type: Boolean,
    },
    logedInTime: {
      type: String,
    },
    logOutTime: {
      type: String,
    },
    lastLogin: {
      type: String,
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model("Opretors", Opretor);
