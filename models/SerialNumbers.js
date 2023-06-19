const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const SerialNumber = new Schema({
    parkingId: {
        type: mongoose.Types.ObjectId,
        required: true,
    },
    shiftNo: {
        type: Number,
        required: true,
    },
},
    {
        timestamps: true
    })

module.exports = mongoose.model("SerialNumber", SerialNumber);