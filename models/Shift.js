const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const paymentObj = new Schema(
    {
        paymentType: {
            type: String,
        },
        amount: {
            type: Number,
        },
    }
)

const Shift = new Schema(
    {
        opretorId: {
            type: mongoose.Types.ObjectId,
        },
        parkingId: {
            type: mongoose.Types.ObjectId,
        },
        shiftStartTime: {
            type: String,
        },
        shiftStopTime: {
            type: String,
        },
        totalCollection: [paymentObj],
        totalTicketIssued: {
            type: Number,
            default: 0
        },
        totalTicketCollected: {
            type: Number,
            default: 0

        },
        isActive: {
            type: Boolean
        }
    },
    {
        timestamps: true,
    }
);

module.exports = mongoose.model("Shifts", Shift);
