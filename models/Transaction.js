const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const Transaction = new Schema(
    {
        ticketId: {
            type: String,
        },
        transactionType: {
            type: String,
        },
        time: {
            type: String,
        },
        vehicleType: {
            type: String,
        },
        vehicleNo: {
            type: String,
        },
        shiftId: {
            type: mongoose.Types.ObjectId,
        },
        amount: {
            type: Number,
        },
        paymentType: {
            type: String,
        },
        cancelledTicket: {
            type: Boolean,
        },
        lostTicket: {
            type: Boolean,
        },
        supervisorId: {
            type: mongoose.Types.ObjectId,
        },
    },
    {
        timestamps: true,
    }
);

module.exports = mongoose.model("Transactions", Transaction);
