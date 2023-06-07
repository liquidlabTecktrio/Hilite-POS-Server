const Tariff = require("../models/Tariff");
const utils = require("../controllers/utils")
const Bluebird = require("bluebird");
const mongoose = require("mongoose");


exports.createTariff = async (req, res) => {
    try {

        const tariffData = req.body.tariffData
        const isActive = req.body.isActive
        const tariffName = req.body.tariffName
        let dailyData = []
        const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
        days.map((day, index) => {
            dailyData.push({
                dayName: day,
                dayIndex: index,
                isActive: false
            })
        })

        await Tariff.create({
            tariffName: tariffName,
            tariffData: tariffData,
            dailyData: dailyData,
            isActive: isActive,
        }).then(async (createdTariff) => {

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

        }).catch((err) => {
            utils.commonResponce(
                res,
                201,
                "Error Occured While creating tariff",
                err.toString()
            );
        });

    } catch {
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

