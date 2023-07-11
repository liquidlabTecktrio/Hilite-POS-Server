const mongoose = require("mongoose");
const Schema = mongoose.Schema;
const MonthlyPass = new Schema(
    {
        name: {
            type: String,
        },
        phoneNumber: {
            type: Number,
        },
        email: {
            type: String
        },
        address: {
            type: String
        },
        passDuration: {
            type: String
        },
        startMonth: {
            type: String
        },
        endMonth: {
            type: String
        },
        cardNumber: {
            type: String
        },
        vehicalModel: {
            type: Number
        },
        vehicalColor: {
            type: String
        },
        cardType: {
            type: String
        },
        amount: {
            type: String
        },
        licenseNumber: {
            type: String
        }
    },
    {
        timestamps: true,
    }
)
module.exports = mongoose.model("MonthlyPass", MonthlyPass);