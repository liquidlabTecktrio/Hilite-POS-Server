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
    iterrateType: {
        type: String
    },
    isInfinite: {
        type: Boolean,
        required: true,
    },

})
const dailyRateSchema = new mongoose.Schema({
    amount: { type: Number },
});
const weeklyRateSchema = new mongoose.Schema({
    amount: { type: Number },
})
const monthlyRateSchema = new mongoose.Schema({
    amount: { type: Number }
})
const lostTicketSchema = new mongoose.Schema({
    amount: { type: Number }
})


const Tariff = new Schema(
    {
        tariffName: {
            type: String
        },
        hourlyRate: {
            type: [tariffObj]
        },
        isTariffInHour: {
            type: Boolean
        },
        // dailyData: [dailyObj],
        // tariffData: [tariffObj],
        // lostTicket: {
        //     type: lostTicketSchema,
        // },
        isActive: {
            type: Boolean,
            required: true,
        },
        lostTicket: {
            type: Number
        },
        dailyRate: {
            type: dailyRateSchema,

        },
        weeklyRate: {
            type: weeklyRateSchema,
        },
        monthlyRate: {
            type: monthlyRateSchema,
        },


    },
    {
        timestamps: true,
    }
);

module.exports = mongoose.model("Tariffs", Tariff);
