const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const NFCCard = new Schema(
    {
        cardNumber: {
            type: String,
        },
        nfcNumber: {
            type: String,
        },
    },
    {
        timestamps: true,
    }
);

module.exports = mongoose.model("NFCCards", NFCCard);
