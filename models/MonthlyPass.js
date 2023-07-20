const mongoose = require("mongoose");
const Schema = mongoose.Schema;


const MonthlyPass = new Schema(
    {
        passHolderName: {
            type: String,
        },
        phoneNumber: {
            type: String,
        },
        email: {
            type: String
        },
        address: {
            type: String
        },
        startDate: {
            type: String
        },
        endDate: {
            type: String
        },
        cardNumber: {
            type: String
        },
        vehicalType: {
            type: Number
        },
        parkingId: {
            type: mongoose.Types.ObjectId
        },
        packageId: {
            type: mongoose.Types.ObjectId
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
        status: {
            type: String
        },
    },
    {
        timestamps: true,
    }
)
module.exports = mongoose.model("MonthlyPass", MonthlyPass);