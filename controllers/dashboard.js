const Parking = require("../models/Parking");
const Opretor = require("../models/Opretor");
const Shift = require("../models/Shift");
const utils = require("./utils")
const Bluebird = require("bluebird");
const mongoose = require("mongoose");


exports.getDashboardData = async (req, res) => {
    try {

        const parkings = await Parking.find()
        const opretors = await Opretor.find()
        // const totalIncome = await Opretor.find()


        utils.commonResponce(
            res,
            200,
            "Successfully fetched data",
            { parkings, opretors }
        );


    } catch {
        return res.status(500).json({
            status: 500,
            message: "Unexpected server error while creating Parking",
        });
    }
}
