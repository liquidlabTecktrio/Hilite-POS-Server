const Device = require("../models/Device");
const utils = require("./utils")
const Bluebird = require("bluebird");
const mongoose = require("mongoose");


exports.createDevice = async (req, res) => {
    try {

        const deviceName = req.body.deviceName
        const deviceType = req.body.deviceType
        const parkingId = req.body.parkingId
        const DeviceMacAddress = req.body.DeviceMacAddress
        

        await Device.create({
            deviceName: deviceName,
            deviceType: deviceType,
            parkingId: parkingId,
            DeviceMacAddress: DeviceMacAddress,
            isActive: true,
        }).then(async (createdDevice) => {

            await Device.find().then(async (deviceData) => {


                utils.commonResponce(
                    res,
                    200,
                    "Successfully fetched Device",
                    deviceData
                );

            }).catch((err) => {
                utils.commonResponce(
                    res,
                    202,
                    "Error Occured While fetching Device",
                    err.toString()
                );
            });

        }).catch((err) => {
            utils.commonResponce(
                res,
                202,
                "Error Occured While creating Device",
                err.toString()
            );
        });

    } catch {
        return res.status(500).json({
            status: 500,
            message: "Unexpected server error while creating Device",
        });
    }
}

