const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const AppVersion = new Schema({
  Version: {
    type: Number,
    requied:true
  },
  isForcedUpdate: {
    type: Boolean,
    required:true
  },
});

module.exports = mongoose.model("AppVersions", AppVersion);


