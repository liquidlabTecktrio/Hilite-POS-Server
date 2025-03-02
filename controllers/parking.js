const Parking = require("../models/Parking");
const utils = require("./utils")
const Bluebird = require("bluebird");
const mongoose = require("mongoose");
const Shift = require("../models/Shift");
const Transaction = require("../models/Transaction");
const Ticket = require("../models/Ticket");
const PosHeartbeat = require("../models/PosHeartbeat")

exports.createParking = async (req, res) => {
    try {

        const parkingName = req.body.parkingName
        const parkingNo = req.body.parkingNo
        const totalSpaces = req.body.totalSpaces
        const totalEntries = req.body.totalEntries
        const totalExits = req.body.totalExits
        const connectedTariff = req.body.connectedTariff
        const address = req.body.address
        const isAutoCloseBarrier = req.body.isAutoCloseBarrier
        const closeBarrierAfter = req.body.closeBarrierAfter
        const startingOperationalHours = req.body.startingOperationalHours
        const endingOperationalHours = req.body.endingOperationalHours
        const startingNonOperationalHours = req.body.startingNonOperationalHours
        const endingNonOperationalHours = req.body.endingNonOperationalHours
        // const vehicles = req.body.vehicles
        const gstNo = req.body.gstNo

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
                isAutoCloseBarrier: isAutoCloseBarrier,
                closeBarrierAfter: closeBarrierAfter,
                startingOperationalHours: startingOperationalHours,
                endingOperationalHours: endingOperationalHours,
                startingNonOperationalHours: startingNonOperationalHours,
                endingNonOperationalHours: endingNonOperationalHours,
                gstNo,
                // vehicles: vehicles,
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

    } catch (error) {
        console.log(error)
        return res.status(500).json({
            status: 500,
            message: "Unexpected server error while creating Parking",
        });
    }
}

exports.updateParking = async (req, res) => {
    try {
        const parkingId = req.body.updateParkingData.parkingId;
        const parkingName = req.body.updateParkingData.updateParkingName
        const parkingNo = req.body.updateParkingData.updateParkingNumber
        const totalSpaces = req.body.updateParkingData.updateTotalSpaces
        const totalEntries = req.body.updateParkingData.updateTotalEntries
        const totalExits = req.body.updateParkingData.updateTotalExits
        const connectedTariff = req.body.connectedTariff
        const address = req.body.updateParkingData.updateAddress
        const isAutoCloseBarrier = req.body.updateParkingData.updateIsAutoCloseBarrier
        const closeBarrierAfter = req.body.updateParkingData.updateAutoCloseBarrierAfter

        const startingOperationalHours = req.body.updateParkingData.updateStartingOperationalHours
        const endingOperationalHours = req.body.updateParkingData.updateEndingOperationalHours
        const startingNonOperationalHours = req.body.updateParkingData.updateStartingNonOperationalHours
        const endingNonOperationalHours = req.body.updateParkingData.updateEndingNonOperationalHours
        const gstNo = req.body.updateParkingData.updateGSTNumber

        const parkingExist = await Parking.findById({ _id: parkingId });
        if (parkingExist) {
            const options = { useFindAndModify: false, new: true };

            await Parking.findByIdAndUpdate(
                { _id: parkingId },
                {
                    parkingName: parkingName,
                    parkingNo: parkingNo,
                    totalSpaces: totalSpaces,
                    totalEntries: totalEntries,
                    totalExits: totalExits,
                    connectedTariff: connectedTariff,
                    address: address,
                    isAutoCloseBarrier: isAutoCloseBarrier,
                    closeBarrierAfter: closeBarrierAfter,
                    startingOperationalHours: startingOperationalHours,
                    endingOperationalHours: endingOperationalHours,
                    startingNonOperationalHours: startingNonOperationalHours,
                    endingNonOperationalHours: endingNonOperationalHours,
                    gstNo,
                },
                options

            ).then(updatedParking => {
                utils.commonResponce(
                    res,
                    200,
                    "Successfully Update Parking",
                    updatedParking
                );
            })
                .catch((err) => {
                    console.log("err", err)
                    utils.commonResponce(
                        res,
                        201,
                        "Error Occured While Updated Parking",
                        err.toString()
                    );
                });


        }
    } catch (error) {
        console.log("error", error)
        return res.status(500).json({
            status: 500,
            message: "Unexpected server error while updating Parking",
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
            },
            {
                name: 'NFC',
                data: dates.map(d => 0)
            }
        ]

        let paymentTypes = ['cash', 'card', 'upi', 'waved off', 'NFC']

        shiftsDetails.map((d, index) => {

            d.shiftData.map(shift => {
                totalEntries += shift.totalTicketIssued
                totalExits += shift.totalTicketCollected

                shift.totalCollection.map(c => {
                    if (c.paymentType != '' && c.paymentType)
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

                        // switch (transaction.transactionType) {
                        //     case 'entry':
                        //         entryExitData[entryExitTypes.indexOf('2 Wheeler Entry')].data[index] += transaction.count
                        //         entryExitTotalEntries += transaction.count
                        //         break;
                        //     case 'exit':
                        //         entryExitTotalExits += transaction.count
                        //         switch (transaction.lostTicket) {
                        //             case true:
                        //                 entryExitData[entryExitTypes.indexOf('2 Wheeler Lost Ticket')].data[index] += transaction.count
                        //                 break;
                        //             default:
                        //                 entryExitData[entryExitTypes.indexOf('2 Wheeler Exit')].data[index] += transaction.count
                        //                 break;
                        //         }
                        //         break;
                        // }

                        if(transaction.entryDateISO){
                            entryExitData[entryExitTypes.indexOf('2 Wheeler Entry')].data[index] += 1
                                    entryExitTotalEntries += 1
                        }

                        if(transaction.exitDateISO){
                            entryExitData[entryExitTypes.indexOf('2 Wheeler Exit')].data[index] += 1
                            entryExitTotalExits +=1

                            if(transaction.lostTicket)
                             entryExitData[entryExitTypes.indexOf('2 Wheeler Lost Ticket')].data[index] += 1
                        }


                        break;
                    case '3':

                        // switch (transaction.transactionType) {
                        //     case 'entry':
                        //         entryExitData[entryExitTypes.indexOf('3 Wheeler Entry')].data[index] += transaction.count
                        //         entryExitTotalEntries += transaction.count
                        //         break;
                        //     case 'exit':
                        //         entryExitTotalExits += transaction.count
                        //         switch (transaction.lostTicket) {
                        //             case true:
                        //                 entryExitData[entryExitTypes.indexOf('3 Wheeler Lost Ticket')].data[index] += transaction.count
                        //                 break;
                        //             default:
                        //                 entryExitData[entryExitTypes.indexOf('3 Wheeler Exit')].data[index] += transaction.count
                        //                 break;
                        //         }
                        //         break;
                        // }

                        if(transaction.entryDateISO){
                            entryExitData[entryExitTypes.indexOf('3 Wheeler Entry')].data[index] += 1
                                    entryExitTotalEntries += 1
                        }

                        if(transaction.exitDateISO){
                            entryExitData[entryExitTypes.indexOf('3 Wheeler Exit')].data[index] += 1
                            entryExitTotalExits +=1

                            if(transaction.lostTicket)
                             entryExitData[entryExitTypes.indexOf('3 Wheeler Lost Ticket')].data[index] += 1
                        }
                        break;
                    case '4':

                        // switch (transaction.transactionType) {
                        //     case 'entry':
                        //         entryExitData[entryExitTypes.indexOf('4 Wheeler Entry')].data[index] += transaction.count
                        //         entryExitTotalEntries += transaction.count
                        //         break;
                        //     case 'exit':
                        //         entryExitTotalExits += transaction.count
                        //         switch (transaction.lostTicket) {
                        //             case true:
                        //                 entryExitData[entryExitTypes.indexOf('4 Wheeler Lost Ticket')].data[index] += transaction.coun
                        //                 break;
                        //             default:
                        //                 entryExitData[entryExitTypes.indexOf('4 Wheeler Exit')].data[index] += transaction.coun
                        //                 break;
                        //         }
                        //         break;
                        // }

                        if(transaction.entryDateISO){
                            entryExitData[entryExitTypes.indexOf('4 Wheeler Entry')].data[index] += 1
                                    entryExitTotalEntries += 1
                        }

                        if(transaction.exitDateISO){
                            entryExitData[entryExitTypes.indexOf('4 Wheeler Exit')].data[index] += 1
                            entryExitTotalExits +=1

                            if(transaction.lostTicket)
                             entryExitData[entryExitTypes.indexOf('4 Wheeler Lost Ticket')].data[index] += 1
                        }
                        break;

                    default:
                        break;
                }
            })

        })

        const parkingData = await Parking.findById(parkingId)
        const posHeartbeats = await PosHeartbeat.find({
            $and: [
                {
                    $or: [
                        { isActive: true },
                        { isAlive: true }
                    ]
                },
                {
                    parkingId: mongoose.Types.ObjectId(parkingId)
                }
            ]
        })

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
                // parkingData,
                totalSpaces: parkingData.totalSpaces,
                currentOccupiedSpaces: parkingData.currentOccupiedSpaces,
                posHeartbeats

            }
        );

    } catch (error) {
        console.log('error: ', error);
        return res.status(500).json({
            status: 500,
            message: "Unexpected server error while generating revenue Parking",
        });
    }
}

async function getParkingDataForGraphFunction(requestData) {
    try {

        const parkingId = requestData.parkingId
        const period = requestData.period
        const cancelIncomeGraphData = requestData.cancelIncomeGraph


        let shiftsDetails = []
        let entryExitDetails = []

        const dates = getDates(period)
        const weekDates = getDates('week')

        if (!cancelIncomeGraphData)
            for (j = 0; j <= dates.length - 1; j++) {

                shiftsDetails.push(
                    await this.parkingAggregateForGraph(parkingId, dates[j])
                );
            }

        if (!cancelIncomeGraphData)
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
            },
            {
                name: 'NFC',
                data: dates.map(d => 0)
            }
        ]

        let paymentTypes = ['cash', 'card', 'upi', 'waved off', 'NFC']
        if (!cancelIncomeGraphData)
            shiftsDetails.map((d, index) => {

                d.shiftData.map(shift => {
                    totalEntries += shift.totalTicketIssued
                    totalExits += shift.totalTicketCollected

                    shift.totalCollection.map(c => {
                        if (c.paymentType != '' && c.paymentType != 'NFC' && c.paymentType)
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
        if (!cancelIncomeGraphData)
            entryExitDetails.map((d, index) => {

                d.entryExitData.map(transaction => {

                    switch (transaction.vehicleType) {
                        case '2':

                            // switch (transaction.transactionType) {
                            //     case 'entry':
                            //         entryExitData[entryExitTypes.indexOf('2 Wheeler Entry')].data[index] += transaction.count
                            //         entryExitTotalEntries += transaction.count
                            //         break;
                            //     case 'exit':
                            //         entryExitTotalExits += transaction.count
                            //         switch (transaction.lostTicket) {
                            //             case true:
                            //                 entryExitData[entryExitTypes.indexOf('2 Wheeler Lost Ticket')].data[index] += transaction.count
                            //                 break;
                            //             default:
                            //                 entryExitData[entryExitTypes.indexOf('2 Wheeler Exit')].data[index] += transaction.count
                            //                 break;
                            //         }
                            //         break;
                            // }

                            if(transaction.entryDateISO){
                                entryExitData[entryExitTypes.indexOf('2 Wheeler Entry')].data[index] += 1
                                        entryExitTotalEntries += 1
                            }

                            if(transaction.exitDateISO){
                                entryExitData[entryExitTypes.indexOf('2 Wheeler Exit')].data[index] += 1
                                entryExitTotalExits +=1

                                if(transaction.lostTicket)
                                 entryExitData[entryExitTypes.indexOf('2 Wheeler Lost Ticket')].data[index] += 1
                            }


                            break;
                        case '3':

                            // switch (transaction.transactionType) {
                            //     case 'entry':
                            //         entryExitData[entryExitTypes.indexOf('3 Wheeler Entry')].data[index] += transaction.count
                            //         entryExitTotalEntries += transaction.count
                            //         break;
                            //     case 'exit':
                            //         entryExitTotalExits += transaction.count
                            //         switch (transaction.lostTicket) {
                            //             case true:
                            //                 entryExitData[entryExitTypes.indexOf('3 Wheeler Lost Ticket')].data[index] += transaction.count
                            //                 break;
                            //             default:
                            //                 entryExitData[entryExitTypes.indexOf('3 Wheeler Exit')].data[index] += transaction.count
                            //                 break;
                            //         }
                            //         break;
                            // }

                            if(transaction.entryDateISO){
                                entryExitData[entryExitTypes.indexOf('3 Wheeler Entry')].data[index] += 1
                                        entryExitTotalEntries += 1
                            }

                            if(transaction.exitDateISO){
                                entryExitData[entryExitTypes.indexOf('3 Wheeler Exit')].data[index] += 1
                                entryExitTotalExits +=1

                                if(transaction.lostTicket)
                                 entryExitData[entryExitTypes.indexOf('3 Wheeler Lost Ticket')].data[index] += 1
                            }
                            break;
                        case '4':

                            // switch (transaction.transactionType) {
                            //     case 'entry':
                            //         entryExitData[entryExitTypes.indexOf('4 Wheeler Entry')].data[index] += transaction.count
                            //         entryExitTotalEntries += transaction.count
                            //         break;
                            //     case 'exit':
                            //         entryExitTotalExits += transaction.count
                            //         switch (transaction.lostTicket) {
                            //             case true:
                            //                 entryExitData[entryExitTypes.indexOf('4 Wheeler Lost Ticket')].data[index] += transaction.coun
                            //                 break;
                            //             default:
                            //                 entryExitData[entryExitTypes.indexOf('4 Wheeler Exit')].data[index] += transaction.coun
                            //                 break;
                            //         }
                            //         break;
                            // }

                            if(transaction.entryDateISO){
                                entryExitData[entryExitTypes.indexOf('4 Wheeler Entry')].data[index] += 1
                                        entryExitTotalEntries += 1
                            }

                            if(transaction.exitDateISO){
                                entryExitData[entryExitTypes.indexOf('4 Wheeler Exit')].data[index] += 1
                                entryExitTotalExits +=1

                                if(transaction.lostTicket)
                                 entryExitData[entryExitTypes.indexOf('4 Wheeler Lost Ticket')].data[index] += 1
                            }
                            break;

                        default:
                            break;
                    }
                })

            })

        // const parkingData = await Parking.findById(parkingId)
        const posHeartbeats = await PosHeartbeat.find({
            $and: [
                {
                    $or: [
                        { isActive: true },
                        { isAlive: true }
                    ]
                },
                {
                    parkingId: mongoose.Types.ObjectId(parkingId)
                }
            ]
        })

        // utils.commonResponce(
        //     res,
        //     200,
        //     "Successfull",
        return {
            categories: dates.map(d => d.category),
            series: activeShiftData,
            totalEntries,
            totalExits,
            entryExitCategories: weekDates.map(d => d.category),
            entryExitSeries: entryExitData,
            entryExitTotalEntries,
            entryExitTotalExits,
            // parkingData,
            posHeartbeats

        }
        // );

    } catch (error) {
        console.log('error: ', error);
        // return res.status(500).json({
        //     status: 500,
        //     message: "Unexpected server error while creating Parking",
        // });
        return {
            categories: [],
            series: [],
            totalEntries: 0,
            totalExits: 0,
            entryExitCategories: [],
            entryExitSeries: [],
            entryExitTotalEntries: 0,
            entryExitTotalExits: 0,
            parkingData: [],
            PosHeartbeat: []
        }
    }
}

async function getParkingMonthlyAndDailyRevenueDataForGraphFunction(requestData) {
    try {

        const parkingId = requestData.parkingId


        let monthly_shiftsDetails = []
        let daily_shiftsDetails = []

        const monthsDates = getDates('month')
        const dailyDates = getDates('day')

        for (j = 0; j <= monthsDates.length - 1; j++) {

            monthly_shiftsDetails.push(
                await this.parkingAggregateForGraph(parkingId, monthsDates[j])
            );
        }

        for (j = 0; j <= dailyDates.length - 1; j++) {

            daily_shiftsDetails.push(
                await this.parkingAggregateForGraph(parkingId, dailyDates[j])
            );
        }

        totalMonthlyRevenue = monthly_shiftsDetails.map(d => d.shiftData.map(shift => shift.totalCollection.filter(c => c.paymentType != '' && c.paymentType != 'NFC' && c.paymentType).reduce((acc, collected) => acc + collected.amount, 0)).reduce((a, b) => a + b, 0)).reduce((a, b) => a + b, 0)
        totalDailyRevenue = daily_shiftsDetails.map(d => d.shiftData.map(shift => shift.totalCollection.filter(c => c.paymentType != '' && c.paymentType != 'NFC' && c.paymentType).reduce((acc, collected) => acc + collected.amount, 0)).reduce((a, b) => a + b, 0)).reduce((a, b) => a + b, 0)


        return {
            totalMonthlyRevenue, totalDailyRevenue
        }
        // );

    } catch (error) {
        console.log('error: ', error);
        return {
            totalMonthlyRevenue: 0,
            totalDailyRevenue: 0
        }
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

        // const entryExitData = await Transaction.aggregate(
        //     [
        //         {
        //             '$addFields': {
        //                 'dateISO': {
        //                     '$dateFromString': {
        //                         'dateString': '$time',
        //                         'format': '%d-%m-%Y %H:%M:%S'
        //                     }
        //                 }
        //             }
        //         }, {
        //             '$lookup': {
        //                 'from': 'shifts',
        //                 'localField': 'shiftId',
        //                 'foreignField': '_id',
        //                 'pipeline': [
        //                     {
        //                         '$project': {
        //                             'parkingId': 1
        //                         }
        //                     }
        //                 ],
        //                 'as': 'parkingId'
        //             }
        //         }, {
        //             '$addFields': {
        //                 'parkingId': {
        //                     '$first': '$parkingId'
        //                 }
        //             }
        //         }, {
        //             '$addFields': {
        //                 'parkingId': '$parkingId.parkingId'
        //             }
        //         }, {
        //             '$match': {
        //                 'parkingId': mongoose.Types.ObjectId(parkingId),
        //                 '$and': [
        //                     {
        //                         'dateISO': {
        //                             '$gte': new Date(date.start)
        //                         }
        //                     }, {
        //                         'dateISO': {
        //                             '$lt': new Date(date.end)
        //                         }
        //                     }
        //                 ]
        //             }
        //         }, {
        //             '$group': {
        //                 '_id': {
        //                     'transactionType': '$transactionType',
        //                     'vehicleType': '$vehicleType',
        //                     'lostTicket': '$lostTicket'
        //                 },
        //                 'data': {
        //                     '$push': '$$ROOT'
        //                 }
        //             }
        //         }, {
        //             '$addFields': {
        //                 'transactionType': '$_id.transactionType',
        //                 'vehicleType': '$_id.vehicleType',
        //                 'lostTicket': '$_id.lostTicket',
        //                 'count': {
        //                     '$size': '$data'
        //                 }
        //             }
        //         }, {
        //             '$project': {
        //                 '_id': 0,
        //                 'data': 0
        //             }
        //         }
        //     ]
        // )

        const entryExitData = await Ticket.aggregate(
            [
                {
                    '$addFields': {
                        entryDateISO: {
                            $toDate:
                                { $multiply: [{ $toInt: '$entryTime' }, 1000] }
                        },
                        exitDateISO: {
                            $toDate:
                                { $multiply: [{ $toInt: '$exitTime' }, 1000] }
                        }
                    }
                }, 
                {
                    '$addFields': {
                        entryDateISO: {
                            $cond: {
                                if: {
                                    '$and': [
                                        {
                                            '$gte': [
                                                '$entryDateISO', new Date(date.start)
                                            ]
                                        }, {
                                            '$lte': [
                                                '$entryDateISO', new Date(date.end)
                                            ]
                                        }
                                    ]
                                },
                                then: true,
                                else: false
                            }
                        },
                        exitDateISO: {
                            $cond: {
                                if: {
                                    '$and': [
                                        {
                                            '$gte': [
                                                '$exitDateISO', new Date(date.start)
                                            ]
                                        }, {
                                            '$lte': [
                                                '$exitDateISO', new Date(date.end)
                                            ]
                                        }
                                    ]
                                },
                                then: true,
                                else: false
                            }
                        }
                    }
                },
                {

                    '$match': {
                        'parkingId': mongoose.Types.ObjectId(parkingId),
                        '$or': [
                            {
                                entryDateISO: true
                            }, {
                                exitDateISO: true

                            }
                        ]
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


exports.getParkingDataForGraphFunction = getParkingDataForGraphFunction
exports.getParkingMonthlyAndDailyRevenueDataForGraphFunction = getParkingMonthlyAndDailyRevenueDataForGraphFunction