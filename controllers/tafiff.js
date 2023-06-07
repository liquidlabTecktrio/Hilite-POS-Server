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

exports.getTariff = async (req, res) => {



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

exports.connectTariff = async (req, res) => {

    const tariffObjID = req.body.tariffObjID
    const dailyData = req.body.dailyData

    try {

        // const activeDays = dailyData.filter(d=> d.isActive)
        // if(activeDays.length>0){

        await Bluebird.each(dailyData, async (day, index) => {

            if (day.isActive) {
                await Tariff.updateMany(
                    // {
                    //     dailyData: {
                    //         $elemMatch: {
                    //             dayIndex: day.dayIndex,
                    //             isActive: true
                    //         }
                    //     }
                    // }, {
                    // "timeSheet.$.dailyData.$.isActive": false,
                    // }
                    {
                        "dailyData.$[a].isActive": true
                    },
                    {
                        "dailyData.$[a].isActive": false
                    },
                    {
                        arrayFilters: [
                            {
                                "a.dayIndex": day.dayIndex,
                                "a.isActive": true,
                            }
                        ],
                    }
                ).then(async (TariffData) => {

                    await Tariff.findByIdAndUpdate(
                        // {
                        //     _id: mongoose.Types.ObjectId(tariffObjID),
                        //     dailyData: {
                        //         $elemMatch: {
                        //             dayIndex: day.dayIndex,
                        //         }
                        //     }
                        // }, {
                        // "isActive": true,
                        // "timeSheet.$.dailyData.$.isActive": true,
                        // }
                        {
                            _id: mongoose.Types.ObjectId(tariffObjID),
                        },
                        {
                            "isActive": true,
                            "dailyData.$[a].isActive": true
                        },
                        {
                            arrayFilters: [
                                {
                                    "a.dayIndex": day.dayIndex,
                                }
                            ],
                        }
                    )

                }).catch((err) => {
                    utils.commonResponce(
                        res,
                        201,
                        "Error Occured While fetching tariff",
                        err.toString()
                    );
                });
            }

        })

        // }else{

        //     await Tariff.findByIdAndUpdate(
        //         {
        //             _id: mongoose.Types.ObjectId(tariffObjID),
        //         }, {
        //         "isActive": false,
        //         "timeSheet.$.dailyData.$.isActive": true,
        //         }
        //     )
        // }

        const allInActiveTariff = await Tariff.aggregate(
            [
                {
                    '$addFields': {
                        'activeDailyData': {
                            '$filter': {
                                'input': '$dailyData',
                                'as': 'data',
                                'cond': {
                                    '$eq': [
                                        '$$data.isActive', true
                                    ]
                                }
                            }
                        }
                    }
                }, {
                    '$addFields': {
                        'activeDailyDataCount': {
                            '$size': '$activeDailyData'
                        }
                    }
                }, {
                    '$match': {
                        'activeDailyDataCount': {
                            '$lte': 0
                        }
                    }
                }, {
                    '$project': {
                        '_id': 1
                    }
                }, {
                    '$group': {
                        '_id': null,
                        'inActiveTariffIds': {
                            '$push': '$_id'
                        }
                    }
                }
            ]
        )

        console.log('allInActiveTariff: ', allInActiveTariff);
        if(allInActiveTariff.length>0){

            if(allInActiveTariff[0].inActiveTariffIds.length>0){

                await Tariff.updateMany(
                    {
                        _id : {
                            $in: allInActiveTariff[0].inActiveTariffIds
                        }
                    },{
                        isActive:false
                    }
                )
            }
        }

        await Tariff.find().then(async (TariffData) => {

            utils.commonResponce(
                res,
                200,
                "Successfully updated tariff",
                TariffData
            );

        }).catch((err) => {
            utils.commonResponce(
                res,
                201,
                "Error Occured While updating tariff",
                err.toString()
            );
        });

    } catch (error) {
        console.log('error: ', error);
        return res.status(500).json({
            status: 500,
            message: "Unexpected server error while updating tariff",
        });
    }
}