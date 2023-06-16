const PosHeartbeat = require("../models/PosHeartbeat");
const utils = require("./utils")
const Bluebird = require("bluebird");
const mongoose = require("mongoose");
const schedule = require('node-schedule');
const moment = require("moment-timezone");
const { WebSocket, WebSocketServer } = require('ws');
const designaPOS = require("../designaPOS");
const dashboardController = require("../controllers/dashboard");

exports.updateHeartbeat = async (req, res) => {
    try {

        const posDeviceID = req.body.posDeviceID;
        console.log('posDeviceID: ', posDeviceID);

        await PosHeartbeat.findOneAndUpdate({ posDeviceID },
            {
                isAlive: true,
                lastUpdated: moment.unix(Date.now() / 1000).tz("Asia/Calcutta").format("DD-MM-YYYY HH:mm:ss")
            }).then(async (deviceData) => {

                utils.commonResponce(
                    res,
                    200,
                    "Successfully updated PosHeartbeat",
                    deviceData
                );

            }).catch((err) => {
                utils.commonResponce(
                    res,
                    201,
                    "Error Occured While updating PosHeartbeat",
                    err.toString()
                );
            });

    } catch {
        return res.status(500).json({
            status: 500,
            message: "Unexpected server error while updating PosHeartbeat",
        });
    }
}

exports.getActivePosHeartbeats = async (req, res) => {
    try {

        await PosHeartbeat.find().then(async (PosHeartbeatData) => {

            utils.commonResponce(
                res,
                200,
                "Successfully fetched PosHeartbeat",
                PosHeartbeatData
            );

        }).catch((err) => {
            utils.commonResponce(
                res,
                201,
                "Error Occured While fetching PosHeartbeat",
                err.toString()
            );
        });

    } catch {
        return res.status(500).json({
            status: 500,
            message: "Unexpected server error while creating PosHeartbeat",
        });
    }
}

const updateHeartbeats = schedule.scheduleJob("*/1 * * * *", async function () {
    try {

        await PosHeartbeat.find().then(async (PosHeartbeatData) => {

            await Bluebird.each(PosHeartbeatData, async (ele) => {
                console.log('ele: ', ele.lastUpdated);

                // var lastUpdatedISO = moment.unix(ele.lastUpdated).tz("Asia/Calcutta").format("DD-MM-YYYY HH:mm:ss");
                // console.log('lastUpdatedISO: ', lastUpdatedISO);

                var currentTime = moment.unix(Date.now() / 1000).tz("Asia/Calcutta").format("DD-MM-YYYY HH:mm:ss")
                console.log('currentTime: ', currentTime);
                var mins = Math.ceil((moment(currentTime, "DD-MM-YYYY HH:mm:ss").diff(moment(ele.lastUpdated, "DD-MM-YYYY HH:mm:ss"))) / 60000)

                console.log('mins: ', mins);

                if (mins > 2)
                    await PosHeartbeat.findByIdAndUpdate(ele._id, { isAlive: false })

            })


            // web socket 
            dashboardController.getDashboardDataFunction()
            // // console.log('dashboardData: ', dashboardData);

            // designaPOS.wss.clients.forEach(function each(client) {

            //     if (client.readyState === WebSocket.OPEN) {
            //         // console.log(client)
            //         client.send(JSON.stringify(dashboardData));
            //     }
            // })
            // console.log('sent');

        }).catch((err) => {
            console.log('err: ', err);
        });

    } catch (error) {
        console.log('error: ', error);
    }
});