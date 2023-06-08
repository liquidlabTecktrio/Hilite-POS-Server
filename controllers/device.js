const Device = require("../models/Device");
const utils = require("./utils")
const Bluebird = require("bluebird");
const mongoose = require("mongoose");


exports.createDevice = async (req, res) => {
    try {

        const deviceName = req.body.deviceName
        const deviceType = req.body.deviceType
        const parkingId = req.body.parkingId
        const deviceNo = req.body.deviceNo
        const DeviceMacAddress = req.body.DeviceMacAddress
        
        const findSameMacAddress = await Device.findOne({ DeviceMacAddress: DeviceMacAddress })
        if (findSameMacAddress)
            utils.commonResponce(
                res,
                201,
                "Mac Address already exist",
            );
        else
        await Device.create({
            deviceName: deviceName,
            deviceType: deviceType,
            parkingId: parkingId,
            deviceNo: deviceNo,
            DeviceMacAddress: DeviceMacAddress,
            isActive: true,
        }).then(async (createdDevice) => {

            await Device.find().then(async (deviceData) => {


                utils.commonResponce(
                    res,
                    200,
                    "Successfully created Device",
                    deviceData
                );

            }).catch((err) => {
                utils.commonResponce(
                    res,
                    201,
                    "Error Occured While fetching Device",
                    err.toString()
                );
            });

        }).catch((err) => {
            utils.commonResponce(
                res,
                201,
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

exports.getDevices = async (req, res) => {
    try {

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
                    201,
                    "Error Occured While fetching Device",
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
