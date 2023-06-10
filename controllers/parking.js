const Parking = require("../models/Parking");
const utils = require("./utils")
const Bluebird = require("bluebird");
const mongoose = require("mongoose");
const Shift = require("../models/Shift");
const Transaction = require("../models/Transaction");


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

        let totalIncome = await Shift.aggregate(
            [
                {
                    '$addFields': {
                        'totalIncome': {
                            '$sum': {
                                '$map': {
                                    'input': {
                                        '$filter': {
                                            'input': '$totalCollection',
                                            'as': 'ms',
                                            'cond': {
                                                '$ne': [
                                                    '$$ms.paymentType', 'waved off'
                                                ]
                                            }
                                        }
                                    },
                                    'as': 'payment',
                                    'in': {
                                        '$sum': [
                                            '$$payment.amount'
                                        ]
                                    }
                                }
                            }
                        }
                    }
                }, {
                    '$group': {
                        '_id': null,
                        'totalAmount': {
                            '$sum': '$totalIncome'
                        }
                    }
                }
            ]
        )

        if (totalIncome.length > 0)
            totalIncome = totalIncome[0].totalAmount
        else
            totalIncome = 0

        let shiftsDetails = []
        let entryExitDetails = []

        const dates = getDates(period)
        const weekDates = getDates('week')
        

        for (j = 0; j <= dates.length - 1; j++) {

            shiftsDetails.push(
                await this.parkingAggregateForGraph(parkingId, dates[j])
            );
        }

        for (j = 0; j <= weekDates.length - 1; j++) {

            entryExitDetails.push(
                await this.entryExitAggregateForGraph(parkingId, weekDates[j])
            );
        }

        let totalEntries = 0
        let totalExits = 0

        let activeShiftData = [
            {
                name: 'Cash',
                data: dates.map(d => 0)
            },
            {
                name: 'Card',
                data: dates.map(d => 0)
            },
            {
                name: 'Upi',
                data: dates.map(d => 0)
            },
            {
                name: 'Waved Off',
                data: dates.map(d => 0)
            }
        ]

        let paymentTypes = ['cash', 'card', 'upi', 'waved off']

        shiftsDetails.map((d, index) => {

            d.shiftData.map(shift => {
                totalEntries += shift.totalTicketIssued
                totalExits += shift.totalTicketCollected

                shift.totalCollection.map(c => {
                    activeShiftData[paymentTypes.indexOf(c.paymentType)].data[index] += c.amount
                })
            })

        })


        let entryExitData = [
            {
                name: '2 Wheeler Entry',
                data: weekDates.map(d => 0)
            },
            {
                name: '3 Wheeler Entry',
                data: weekDates.map(d => 0)
            },
            {
                name: '4 Wheeler Entry',
                data: weekDates.map(d => 0)
            },
            {
                name: '2 Wheeler Exit',
                data: weekDates.map(d => 0)
            },
            {
                name: '3 Wheeler Exit',
                data: weekDates.map(d => 0)
            },
            {
                name: '4 Wheeler Exit',
                data: weekDates.map(d => 0)
            },
            {
                name: '2 Wheeler Lost Ticket',
                data: weekDates.map(d => 0)
            },
            {
                name: '3 Wheeler Lost Ticket',
                data: weekDates.map(d => 0)
            },
            {
                name: '4 Wheeler Lost Ticket',
                data: weekDates.map(d => 0)
            },
        ]

        let entryExitTypes = entryExitData.map(d => d.name)

        let entryExitTotalEntries = 0
        let entryExitTotalExits = 0

        entryExitDetails.map((d, index) => {

            d.entryExitData.map(transaction => {

                switch (transaction.vehicleType) {
                    case '2':

                        switch (transaction.transactionType) {
                            case 'entry':
                                entryExitData[entryExitTypes.indexOf('2 Wheeler Entry')].data[index] += transaction.count
                                entryExitTotalEntries += transaction.count
                                break;
                            case 'exit':
                                entryExitTotalExits += transaction.count
                                switch (transaction.lostTicket) {
                                    case true:
                                        entryExitData[entryExitTypes.indexOf('2 Wheeler Lost Ticket')].data[index] += transaction.count
                                        break;
                                    default:
                                        entryExitData[entryExitTypes.indexOf('2 Wheeler Exit')].data[index] += transaction.count
                                        break;
                                }
                                break;
                        }


                        break;
                    case '3':

                        switch (transaction.transactionType) {
                            case 'entry':
                                entryExitData[entryExitTypes.indexOf('3 Wheeler Entry')].data[index] += transaction.count
                                entryExitTotalEntries += transaction.count
                                break;
                            case 'exit':
                                entryExitTotalExits += transaction.count
                                switch (transaction.lostTicket) {
                                    case true:
                                        entryExitData[entryExitTypes.indexOf('3 Wheeler Lost Ticket')].data[index] += transaction.count
                                        break;
                                    default:
                                        entryExitData[entryExitTypes.indexOf('3 Wheeler Exit')].data[index] += transaction.count
                                        break;
                                }
                                break;
                        }
                        break;
                    case '4':

                        switch (transaction.transactionType) {
                            case 'entry':
                                entryExitData[entryExitTypes.indexOf('4 Wheeler Entry')].data[index] += transaction.count
                                entryExitTotalEntries += transaction.count
                                break;
                            case 'exit':
                                entryExitTotalExits += transaction.count
                                switch (transaction.lostTicket) {
                                    case true:
                                        entryExitData[entryExitTypes.indexOf('4 Wheeler Lost Ticket')].data[index] += transaction.coun
                                        break;
                                    default:
                                        entryExitData[entryExitTypes.indexOf('4 Wheeler Exit')].data[index] += transaction.coun
                                        break;
                                }
                                break;
                        }
                        break;

                    default:
                        break;
                }
            })

        })

        const parkingData = await Parking.findById(parkingId)

        utils.commonResponce(
            res,
            200,
            "Successfull",
            {
                categories: dates.map(d => d.category),
                series: activeShiftData,
                totalEntries,
                totalExits,
                entryExitCategories: weekDates.map(d => d.category),
                entryExitSeries: entryExitData,
                entryExitTotalEntries,
                entryExitTotalExits,
                parkingData

            }
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
                        'totalCollectionSize': {
                            '$gt': 0
                        },
                        '$and': [
                            {
                                'dateISO': {
                                    '$gte': new Date(date.start)
                                }
                            }, {
                                'dateISO': {
                                    '$lt': new Date(date.end)
                                }
                            },
                            // {
                            //     'totalCollectionSize': {
                            //         '$gt': 0
                            //     } 
                            // }
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


exports.entryExitAggregateForGraph = async (parkingId, date) => {

    try {

        const entryExitData = await Transaction.aggregate(
            [
                {
                    '$addFields': {
                        'dateISO': {
                            '$dateFromString': {
                                'dateString': '$time',
                                'format': '%d-%m-%Y %H:%M:%S'
                            }
                        }
                    }
                }, {
                    '$lookup': {
                        'from': 'shifts',
                        'localField': 'shiftId',
                        'foreignField': '_id',
                        'pipeline': [
                            {
                                '$project': {
                                    'parkingId': 1
                                }
                            }
                        ],
                        'as': 'parkingId'
                    }
                }, {
                    '$addFields': {
                        'parkingId': {
                            '$first': '$parkingId'
                        }
                    }
                }, {
                    '$addFields': {
                        'parkingId': '$parkingId.parkingId'
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
                            }
                        ]
                    }
                }, {
                    '$group': {
                        '_id': {
                            'transactionType': '$transactionType',
                            'vehicleType': '$vehicleType',
                            'lostTicket': '$lostTicket'
                        },
                        'data': {
                            '$push': '$$ROOT'
                        }
                    }
                }, {
                    '$addFields': {
                        'transactionType': '$_id.transactionType',
                        'vehicleType': '$_id.vehicleType',
                        'lostTicket': '$_id.lostTicket',
                        'count': {
                            '$size': '$data'
                        }
                    }
                }, {
                    '$project': {
                        '_id': 0,
                        'data': 0
                    }
                }
            ]
        )
        return { date, entryExitData };

    } catch {
        return { date, entryExitData: [] };

    }
}


function getDates(period) {
    let dates = []
    var months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'June', 'July', 'Aug', 'Sept', 'Oct', 'Nov', 'Dec'];

    const date = new Date()
    const startingMonth = new Date(date.getFullYear(), date.getMonth(), 1)
    const endingMonth = new Date(date.getFullYear(), date.getMonth() + 1, 0)

    switch (period) {

        case 'day':
            for (d = 0; d < 1; d++) {
                let obj = {
                    start: formateDate(date),
                    category: months[parseInt(formateDate(date).split('-')[1]) - 1] + ' ' + formateDate(date).split('-')[2]
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
                    start: formateDate(date),
                    category: months[parseInt(formateDate(date).split('-')[1]) - 1] + ' ' + formateDate(date).split('-')[2]
                }
                date.setDate(date.getDate() + 1)
                obj.end = formateDate(date)
                date.setDate(date.getDate() - 2)
                dates.push(obj)
            }
            break
        case 'twoWeeks':
            for (d = 0; d < 14; d++) {
                let obj = {
                    start: formateDate(date),
                    category: months[parseInt(formateDate(date).split('-')[1]) - 1] + ' ' + formateDate(date).split('-')[2]
                }
                date.setDate(date.getDate() + 1)
                obj.end = formateDate(date)
                date.setDate(date.getDate() - 2)
                dates.push(obj)
            }
            break

        case 'month':
            let obj = {
                start: formateDate(startingMonth),
                category: months[parseInt(formateDate(date).split('-')[1]) - 1]
            }
            obj.end = formateDate(endingMonth)
            dates.push(obj)

            break

        case 'threeMonths':
            for (d = 0; d < 3; d++) {

                startingMonth.setMonth(startingMonth.getMonth() - 1)
                endingMonth.setMonth(endingMonth.getMonth() - 1)
                let obj = {
                    start: formateDate(startingMonth),
                    category: months[parseInt(formateDate(startingMonth).split('-')[1]) - 1]
                }
                obj.end = formateDate(endingMonth)
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

    return dates.reverse()
}
