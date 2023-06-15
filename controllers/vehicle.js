const Vehicle = require("../models/Vehicle");
const utils = require("./utils")
const Bluebird = require("bluebird");
const mongoose = require("mongoose");


exports.createVehicle = async (req, res) => {
    try {

        const vehicleName = req.body.vehicleName
        const vehicleWheels = req.body.vehicleWheels
        
        const findSameMacvehicle = await Vehicle.findOne({ vehicleWheels: vehicleWheels, vehicleName:vehicleName })
        if (findSameMacvehicle)
            utils.commonResponce(
                res,
                201,
                "Same vehicle Address already exist",
            );
        else
        await Vehicle.create({
            vehicleName: vehicleName,
            vehicleWheels: vehicleWheels,
            isActive: true,
        }).then(async (createdVehicle) => {

            await Vehicle.find().then(async (VehicleData) => {


                utils.commonResponce(
                    res,
                    200,
                    "Successfully created Vehicle",
                    VehicleData
                );

            }).catch((err) => {
                utils.commonResponce(
                    res,
                    201,
                    "Error Occured While fetching Vehicle",
                    err.toString()
                );
            });

        }).catch((err) => {
            utils.commonResponce(
                res,
                201,
                "Error Occured While creating Vehicle",
                err.toString()
            );
        });

    } catch {
        return res.status(500).json({
            status: 500,
            message: "Unexpected server error while creating Vehicle",
        });
    }
}

exports.getVehicles = async (req, res) => {
    try {

            await Vehicle.find().then(async (VehicleData) => {
                utils.commonResponce(
                    res,
                    200,
                    "Successfully fetched Vehicle",
                    VehicleData
                );

            }).catch((err) => {
                utils.commonResponce(
                    res,
                    201,
                    "Error Occured While fetching Vehicle",
                    err.toString()
                );
            });

    } catch {
        return res.status(500).json({
            status: 500,
            message: "Unexpected server error while creating Vehicle",
        });
    }
}
