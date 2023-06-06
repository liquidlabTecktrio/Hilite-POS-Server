const Parking = require("../models/Parking");
const utils = require("./utils")
const Bluebird = require("bluebird");
const mongoose = require("mongoose");


exports.createParking = async (req, res) => {
    try {

        const parkingName = req.body.parkingName
        const parkingNo = req.body.parkingNo
        const totalSpaces = req.body.totalSpaces
        const totalEntries = req.body.totalEntries
        const totalExits = req.body.totalExits
        const connectedTariff = req.body.connectedTariff


        await Parking.create({
            parkingName: parkingName,
            parkingNo: parkingNo,
            totalSpaces: totalSpaces,
            totalEntries: totalEntries,
            totalExits: totalExits,
            connectedTariff: connectedTariff,
            isActive: true,
        }).then(async (createdParking) => {

            await Parking.find().then(async (parkingData) => {


                utils.commonResponce(
                    res,
                    200,
                    "Successfully fetched Parking",
                    parkingData
                );

            }).catch((err) => {
                utils.commonResponce(
                    res,
                    202,
                    "Error Occured While fetching Parking",
                    err.toString()
                );
            });

        }).catch((err) => {
            utils.commonResponce(
                res,
                202,
                "Error Occured While creating Parking",
                err.toString()
            );
        });

    } catch {
        return res.status(500).json({
            status: 500,
            message: "Unexpected server error while creating Parking",
        });
    }
}
