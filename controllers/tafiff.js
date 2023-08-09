const Tariff = require("../models/Tariff");
const utils = require("../controllers/utils")
const Bluebird = require("bluebird");
const mongoose = require("mongoose");


exports.createTariff = async (req, res) => {
    try {

        const hourlyRate = req.body.hourlyRate
        const isActive = req.body.isActive
        const lostTicket = req.body.lostTicket
        const tariffName = req.body.tariffName
        const isTariffInHour = req.body.isTariffInHour
        const dailyRate = req.body.dailyRate
        const weeklyRate = req.body.weeklyRate
        const monthlyRate = req.body.monthlyRate
        // if (dailyRate !== undefined) {
        //     dailyRate = req.body.dailyRate
        // }
        // let weeklyRate;
        // if (weeklyRate !== undefined) {
        //     weeklyRate = req.body.weeklyRate
        // }
        // let monthlyRate;
        // if (monthlyRate !== undefined) {
        //     monthlyRate = req.body.monthlyRate

        // }

        // let dailyData = []
        // const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

        // days.map((day, index) => {
        //     dailyData.push({
        //         dayName: day,
        //         dayIndex: index,
        //         isActive: false
        //     })
        // })

        const createdTariffObj = {
            tariffName: tariffName,
            hourlyRate: hourlyRate,
            lostTicket: lostTicket,
            isTariffInHour: isTariffInHour,
            isActive: isActive,
            // dailyRate: dailyRate,
            // weeklyRate: weeklyRate,
            // monthlyRate: monthlyRate


        }
        if (lostTicket.amount !== "") {
            createdTariffObj.lostTicket = lostTicket
        }
        if (dailyRate.amount != "") {
            createdTariffObj.dailyRate = dailyRate
        }
        if (weeklyRate.amount != "") {
            createdTariffObj.weeklyRate = weeklyRate
        }
        if (monthlyRate.amount != "") {
            createdTariffObj.monthlyRate = monthlyRate
        }
        await Tariff.create(createdTariffObj)
            .then(async (createdTariff) => {

                await Tariff.find().then(async (TariffData) => {


                    utils.commonResponce(
                        res,
                        200,
                        "Successfully fetched tariff",
                        TariffData
                    );

                }).catch((err) => {
                    console.log("err", err)
                    utils.commonResponce(
                        res,
                        201,
                        "Error Occured While fetching tariff",
                        err.toString()
                    );
                });

            }).catch((err) => {
                console.log("err", err)
                utils.commonResponce(
                    res,
                    201,
                    "Error Occured While creating tariff",
                    err.toString()
                );
            });

    } catch (error) {
        console.log("error", error)
        return res.status(500).json({
            status: 500,
            message: "Unexpected server error while creating tariff",
        });
    }
}

exports.getTariffs = async (req, res) => {



    try {

        await Tariff.find().then(async (TariffData) => {


            utils.commonResponce(
                res,
                200,
                "Successfully fetched tariff",
                TariffData
            );

        }).catch((err) => {
            utils.commonResponce(
                res,
                201,
                "Error Occured While fetching tariff",
                err.toString()
            );
        });

    } catch {
        return res.status(500).json({
            status: 500,
            message: "Unexpected server error while fetching tariff",
        });
    }
}

exports.getTariffForParking = async (req, res) => {



    try {

        await Tariff.aggregate([{ $project: { tariffName: 1 } }]).then(async (TariffData) => {


            utils.commonResponce(
                res,
                200,
                "Successfully fetched tariff",
                TariffData
            );

        }).catch((err) => {
            utils.commonResponce(
                res,
                201,
                "Error Occured While fetching tariff",
                err.toString()
            );
        });

    } catch {
        return res.status(500).json({
            status: 500,
            message: "Unexpected server error while fetching tariff",
        });
    }
}

// {
//     "hourlyRate": [
//       {
//         "starting": 0,
//         "ending": 120,
//         "price": 200,
//         "isIterate": false,
//         "iterateEvery": 0,
//         "isInfinite": false
//       },
//       {
//         "starting": 121,
//         "ending": 121,
//         "price": 80,
//         "isIterate": true,
//         "iterateEvery": 60,
//         "isInfinite": true
//       }
//     ],
//     "dailyRate": {
//       "amount": 1000
//     },
//     "lostTicket": {
//       "amount": 200
//     }
//   }