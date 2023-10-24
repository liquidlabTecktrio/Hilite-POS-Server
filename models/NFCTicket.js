const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const NFCTicket = new Schema(
    {
        ticketId: {
            type: String,
        },
        entryTime: {
            type: String,
        },
        exitTime: {
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
        duration: {
            type: Number
        },
        amount: {
            type: Number,
        },
        paymentType: {
            type: String,
        },
        cancelledTicket: {
            type: Boolean,
            default: false
        },
        fraudTicket: {
            type: Boolean,
            default: false
        },
        lostTicket: {
            type: Boolean,
        },
        parkingId: {
            type: mongoose.Types.ObjectId,
        },
        supervisorId: {
            type: mongoose.Types.ObjectId,
        },
        monthlyPassUsed: {
            type: Boolean,
        },
        monthlyPassId: {
            type: mongoose.Types.ObjectId,
        },
        paymentsType: {
            type: String,
        },
        receiptNo: {
            type: Number,
        },
    },
    {
        timestamps: true,
    }
);

module.exports = mongoose.model("NFCTickets", NFCTicket);
