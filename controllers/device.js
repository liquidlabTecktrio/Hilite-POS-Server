const Device = require("../models/Device");
const Parking = require("../models/Parking");
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


exports.updateDevice = async (req, res) => {
    try {
        const deviceId = req.body.updateDeviceData.deviceObjId;
        console.log("deviceId", deviceId)
        const deviceName = req.body.updateDeviceData.updateDeviceName
        const deviceType = req.body.updateDeviceData.updateDeviceType
        const parkingId = req.body.updateDeviceData.updateParkingId
        console.log("parkingId", parkingId)
        const deviceNo = req.body.updateDeviceData.updteDeviceNo
        const DeviceMacAddress = req.body.updateDeviceData.updateDeviceMacAdress

        const parkingExist = await Parking.findById({ _id: parkingId });
        if (parkingExist) {
            const options = { useFindAndModify: false, new: true };

            await Device.findByIdAndUpdate(
                { _id: deviceId },
                {
                    deviceName: deviceName,
                    deviceType: deviceType,
                    parkingId: parkingId,
                    deviceNo: deviceNo,
                    DeviceMacAddress: DeviceMacAddress,
                },
                options

            ).then(updatedParking => {
                utils.commonResponce(
                    res,
                    200,
                    "Successfully Update device",
                    updatedParking
                );
            })
                .catch((err) => {
                    console.log("err", err)
                    utils.commonResponce(
                        res,
                        201,
                        "Error Occured While Updated device",
                        err.toString()
                    );
                });


        }
    } catch (error) {
        console.log("error", error)
        return res.status(500).json({
            status: 500,
            message: "Unexpected server error while updating device",
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
