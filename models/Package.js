const mongoose = require("mongoose");
const Schema = mongoose.Schema;


const Package = new Schema(
    {
        packageName: {
            type: String,
        },
        validityType: {
            type: String
        },
        validity: {
            type: Number
        },
        vehicleType: {
            type: Number
        },
        amount: {
            type: Number
        },
        fromTime: {
            type: String
        },
        toTime: {
            type: String
        },
    },
    {
        timestamps: true,
    }
)
module.exports = mongoose.model("Packages", Package);