const mongoose = require("mongoose");
const Schema = mongoose.Schema;

// const dailyObj = new Schema({

//     dayName: {
//         type: String
//     },
//     dayIndex: {
//         type: Number
//     },
//     isActive: {
//         type: Boolean,
//         default: false,
//     }

// })

const tariffObj = new Schema({

    starting: {
        type: Number
    },
    ending: {
        type: Number
    },
    price: {
        type: Number,
        required: true,
    },
    isIterate: {
        type: Boolean,
    },
    iterateEvery: {
        type: Number
    },
    isInfinite: {
        type: Boolean,
        required: true,
    },

})

const Tariff = new Schema(
    {
        tariffName: {
            type: String
        },
        tariffData: {
            type: [tariffObj]
        },
        // dailyData:[dailyObj],
        lostTicket: {
            type: Number,
            required: true,
        },
        isActive: {
            type: Boolean,
            required: true,
        },
    },
    {
        timestamps: true,
    }
);

module.exports = mongoose.model("Tariffs", Tariff);
