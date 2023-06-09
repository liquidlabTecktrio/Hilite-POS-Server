const Parking = require("../models/Parking");
const utils = require("./utils")
const Bluebird = require("bluebird");
const mongoose = require("mongoose");
const Shift = require("../models/Shift");


exports.createParking = async (req, res) => {
    try {

        const parkingName = req.body.parkingName
        const parkingNo = req.body.parkingNo
        const totalSpaces = req.body.totalSpaces
        const totalEntries = req.body.totalEntries
        const totalExits = req.body.totalExits
        const connectedTariff = req.body.connectedTariff
        const address = req.body.address

        const findParkingWithSameNo = await Parking.findOne({ parkingNo: parkingNo })
        if (findParkingWithSameNo)
            utils.commonResponce(
                res,
                201,
                "Parking No already exist",
            );
        else
            await Parking.create({
                parkingName: parkingName,
                parkingNo: parkingNo,
                totalSpaces: totalSpaces,
                totalEntries: totalEntries,
                totalExits: totalExits,
                connectedTariff: connectedTariff,
                address: address,
                isActive: true,
            }).then(async (createdParking) => {

                await Parking.find().then(async (parkingData) => {


                    utils.commonResponce(
                        res,
                        200,
                        "Successfully created Parking",
                        parkingData
                    );

                }).catch((err) => {
                    utils.commonResponce(
                        res,
                        201,
                        "Error Occured While fetching Parking",
                        err.toString()
                    );
                });

            }).catch((err) => {
                utils.commonResponce(
                    res,
                    201,
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

exports.getParkings = async (req, res) => {
    try {

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
                201,
                "Error Occured While fetching Parking",
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

exports.getParkingDataForGraph = async (req, res) => {
    try {

        const parkingId = req.body.parkingId
        const period = req.body.period

        let shiftsDate = []

        const dates = getDates(period)
        console.log('dates: ', dates);
        for (j = 1; j <= dates.length; j++) {

            shiftsDate.push(
                await this.parkingAggregateForGraph(parkingId, dates[j])
            );
        }



        let activeShiftData = [
            {
                name: 'Cash',
                data: shiftsDate.map(d => 0)
            },
            {
                name: 'Card',
                data: shiftsDate.map(d => 0)
            },
            {
                name: 'Upi',
                data: shiftsDate.map(d => 0)
            },
            {
                name: 'Waved Off',
                data: shiftsDate.map(d => 0)
            }
        ]

        let paymentTypes = ['cash', 'card', 'upi', 'waved off']

        shiftsDate.reverse().map((d, index) => {
            let activePaymentType = []

            d.shiftData.map(shift => {
                shift.totalCollection.map(c => {
                    activeShiftData[paymentTypes.indexOf(c.paymentType)].data[index] += c.amount
                })
            })

        })

        var months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'June', 'July', 'Aug', 'Sept', 'Oct', 'Nov', 'Dec'];

        utils.commonResponce(
            res,
            200,
            "Successfull",
            { categories: dates.map(d => months[parseInt(d.start.split('-')[1]) - 1] + ' ' + d.start.split('-')[2]), series: activeShiftData }
        );

    } catch (error) {
        console.log('error: ', error);
        return res.status(500).json({
            status: 500,
            message: "Unexpected server error while creating Parking",
        });
    }
}


exports.parkingAggregateForGraph = async (parkingId, date) => {
    try {

        const shiftData = await Shift.aggregate(
            [
                {
                    '$addFields': {
                        'dateISO': {
                            '$dateFromString': {
                                'dateString': '$shiftStartTime',
                                'format': '%d-%m-%Y %H:%M:%S'
                            }
                        },
                        'totalCollectionSize': {
                            '$size': '$totalCollection'
                        }
                    }
                }, {
                    '$match': {
                        'parkingId': mongoose.Types.ObjectId(parkingId),
                        '$and': [
                            {
                                'dateISO': {
                                    '$gte': new Date(date.start)
                                }
                            }, {
                                'dateISO': {
                                    '$lt': new Date(date.end)
                                }
                            }, {
                                'totalCollectionSize': {
                                    '$gt': 0
                                }
                            }
                        ]
                    }
                },
                // {
                //     '$group': {
                //         '_id': '$isActive',
                //         'data': {
                //             '$push': '$$ROOT'
                //         }
                //     }
                // }
            ]
        )


        return { date, shiftData };

    } catch {
        return { date, shiftData: [] };

    }
}


function getDates(period) {
    let dates = []

    const date = new Date()
    switch (period) {

        case 'today':
            for (d = 0; d < 1; d++) {
                let obj = {
                    start: formateDate(date)
                }
                date.setDate(date.getDate() + 1)
                obj.end = formateDate(date)
                date.setDate(date.getDate() - 2)
                dates.push(obj)
            }
            break
        case 'week':
            for (d = 0; d < 7; d++) {
                let obj = {
                    start: formateDate(date)
                }
                date.setDate(date.getDate() + 1)
                obj.end = formateDate(date)
                date.setDate(date.getDate() - 2)
                dates.push(obj)
            }
            break
    }

    function addZero(n) {
        return n.toString().length == 1 ? '0' + n : n
    }

    function formateDate(d) {
        return d.getFullYear() + '-' + addZero(d.getMonth() + 1) + '-' + addZero(d.getDate())
    }

    return dates
}
