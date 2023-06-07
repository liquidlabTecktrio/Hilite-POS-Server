const mongoose = require("mongoose");
const Schema = mongoose.Schema;


const tariff = new Schema({

    tariffId: {
        type: mongoose.Types.ObjectId
    },
    dayIndex: {
        type: Number,
        required: true,
    }

})
const tariffObj = new Schema({

    tariffType: {
        type: Number
    },
    tariffData: {
        type: [tariff]
    },

})

const Parking = new Schema(
    {
        parkingName: {
            type: String
        },
        parkingNo: {
            type: String
        },
        totalSpaces: {
            type: Number
        },
        totalEntries: {
            type: Number
        },
        address: {
            type: String
        },
        totalExits: {
            type: Number
        },
        // connectedTariff:[tariffObj],
        // isActive: {
        //     type: Boolean,
        //     required: true,
        // },
    },
    {
        timestamps: true,
    }
);

module.exports = mongoose.model("Parkings", Parking);
