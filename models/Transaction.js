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
        shiftId: {
            type: mongoose.Types.ObjectId,
        },
        amount: {
            type: Number,
        },
        paymentType: {
            type: String,
        },
        lostTicket: {
            type: Boolean,
        }
    },
    {
        timestamps: true,
    }
);

module.exports = mongoose.model("Transactions", Transaction);
