const Transaction = require("../models/Transaction");
const Tariff = require("../models/Tariff");
const Shift = require("../models/Shift");
const Opretor = require("../models/Opretor");
const Parking = require("../models/Parking");
const utils = require("./utils")
const Bluebird = require("bluebird");
const mongoose = require("mongoose");
const moment = require("moment-timezone");
const dashboardController = require("../controllers/dashboard");

exports.createTransaction = async (req, res) => {
    try {

        const transactions = req.body.transactions
        const faildTransactions = []

        await Bluebird.each(transactions, async (transaction, index) => {

            const createTrasactionData = await createTransactionfunction(transaction)
            if (createTrasactionData.statusCode != 200) {
                transaction.message = createTrasactionData.message
                faildTransactions.push(transaction)
            }
        })

        let shiftData = await Shift.findById(transactions[0]?.shiftId)


        // web socket 
        dashboardController.getDashboardDataFunction()

        utils.commonResponce(
            res,
            transactions.length == faildTransactions.length ? 201 : 200,
            transactions.length == faildTransactions.length ? "Some transaction could'nt create" : "Successfully created Transactions",
            {
                shiftData, faildTransactions
            }
        );

    } catch (error) {
        console.log('error: ', error);
        return res.status(500).json({
            status: 500,
            message: "Unexpected server error while creating Transaction",
        });
    }
}

async function createTransactionfunction(transactionData) {
    let statusCode = 200;
    let message = '';
    try {

        const ticketId = transactionData.ticketId
        const transactionType = transactionData.transactionType
        const shiftId = transactionData.shiftId
        const vehicleType = transactionData.vehicleType
        const vehicleNo = transactionData.vehicleNo
        const amount = transactionData.amount
        const paymentType = transactionData.paymentType
        const lostTicket = transactionData.lostTicket
        const supervisorId = transactionData.supervisorId

        if (lostTicket && !supervisorId) {

            statusCode = 201
            message = 'supervisor id is must for lost ticket'
        } else {

            var currentTime = moment.unix(Date.now() / 1000).tz("Asia/Calcutta").format("DD-MM-YYYY HH:mm:ss");


            await Transaction.create({
                ticketId: ticketId,
                transactionType: transactionType,
                time: currentTime,
                shiftId: shiftId,
                amount: amount,
                paymentType: paymentType,
                vehicleType: vehicleType,
                vehicleNo: vehicleNo,
                lostTicket: lostTicket,
                supervisorId: supervisorId
            }).then(async (createdParking) => {

                // update shift and opretor here

                const findShift = await Shift.findById(shiftId)

                await Parking.findByIdAndUpdate(findShift.parkingId, {
                    $inc: {
                        currentOccupiedSpaces: transactionType == 'entry' ? 1 : -1,
                    },
                })

                let obj = {
                    $inc: {
                        totalTicketIssued: transactionType != 'exit' ? 1 : 0,
                        totalTicketCollected: transactionType == 'exit' ? 1 : 0,
                        totalLostTicketCollected: lostTicket ? transactionType == 'exit' ? 1 : 0 : 0,
                    },
                    $push: {}
                }

                if (transactionType == 'exit') {

                    if (findShift?.totalCollection?.filter(c => c.paymentType == paymentType).length <= 0)
                        obj['$push']['totalCollection'] = [{
                            paymentType: paymentType,
                            amount: amount,
                        }]
                    else
                        obj['$inc']['totalCollection.$[a].amount'] = amount
                }

                await Shift.findByIdAndUpdate(shiftId, obj,
                    {
                        arrayFilters: [
                            { "a.paymentType": paymentType },
                        ],
                    }
                )


                // update supervisor pin because lost ticket transaction is valid online
                if (lostTicket && !supervisorId) {
                    // get All pincode
                    const existingSupervisorPinParkiongWise = await Opretor.aggregate([
                        {
                            '$match': {
                                parkingId: mongoose.Types.ObjectId(findShift.parkingId),
                                isSupervisor: true
                            }
                        }, {
                            '$project': {
                                supervisorPin: 1,
                                _id: 0
                            }
                        }
                    ])

                    supervisorPin = getRandomNumber(existingSupervisorPinParkiongWise.map(o => o.supervisorPin))
                    if (supervisorPin)
                        await Opretor.findByIdAndUpdate(supervisorId, { supervisorPin })
                }


                statusCode = 200
                message = 'Successfully created transaction'

            }).catch((err) => {
                statusCode = 201
                message = err.toString()
            });
        }

    } catch (error) {
        statusCode = 201
        message = error.toString()
    }

    return {
        statusCode, message
    }
}

function getRandomNumber(excludedNumbers) {
    var randomNumber;

    do {
        randomNumber = Math.floor(Math.random() * 9000) + 1000;
    } while (excludedNumbers.includes(randomNumber));

    return randomNumber;
}


exports.cancelTicket = async (req, res) => {
    try {

        const transactions = req.body.transactions
        const faildTransactions = []

        await Bluebird.each(transactions, async (transaction, index) => {

            const createTrasactionData = await cancelTicketfunction(transaction)
            if (createTrasactionData.statusCode != 200) {
                transaction.message = createTrasactionData.message
                faildTransactions.push(transaction)
            }
        })

        let shiftData = await Shift.findById(transactions[0]?.shiftId)

        // web socket 
        dashboardController.getDashboardDataFunction()

        utils.commonResponce(
            res,
            200,
            "Successfully cancelled tickets",
            {
                shiftData, faildTransactions
            }
        );

    } catch (error) {
        console.log('error: ', error);
        return res.status(500).json({
            status: 500,
            message: "Unexpected server error while creating Transaction",
        });
    }
}

async function cancelTicketfunction(transactionData) {
    let statusCode = 200;
    let message = '';
    try {

        // alwasy ticket no will be there for calcelling a ticket

        const ticketId = transactionData.ticketId
        const shiftId = transactionData.shiftId

        const findEntryTicket = await Transaction.findOne({
            ticketId: ticketId,
            transactionType: 'entry'
        })

        const findExitTicket = await Transaction.findOne({
            ticketId: ticketId,
            transactionType: 'exit'
        })

        if (findEntryTicket) {
            if (findExitTicket) {

                statusCode = 201
                message = "Payment already received for Ticket ID"
            } else {

                await Transaction.findByIdAndUpdate(findEntryTicket._id, {
                    cancelledTicket: true
                }).then(async (createdParking) => {

                    // update shift and opretor here

                    const findShift = await Shift.findById(shiftId)

                    await Parking.findByIdAndUpdate(findShift.parkingId, {
                        $inc: {
                            currentOccupiedSpaces: -1,
                        },
                    })


                    await Shift.findByIdAndUpdate(shiftId,
                        {
                            $inc: {
                                totalTicketIssued: -1,
                                totalTicketCancelled: 1,
                            }
                        }
                    )

                    statusCode = 200
                    message = 'Successfully created transaction'


                }).catch((err) => {

                    statusCode = 201
                    message = err.toString()
                });

            }
        }
        else {
            statusCode = 201
            message = "Ticket ID not found"
        }

    } catch (error) {
        console.log('error: ', error);

        statusCode = 500
        message = error.toString()
    }

    return {
        statusCode, message
    }
}

exports.calculateCharge = async (req, res) => {
    try {

        const ticketId = req.body.ticketId
        const entryTime = req.body.entryTime
        const exitTime = req.body.exitTime
        const shiftId = req.body.shiftId
        const vehicleType = req.body.vehicleType
        const vehicleNo = req.body.vehicleNo
        const lostTicket = req.body.lostTicket
        const supervisorPin = req.body.supervisorPin

        let findEntryTicket;
        if (ticketId)
            findEntryTicket = await Transaction.findOne({
                ticketId: ticketId,
                transactionType: 'entry'
            })

        let findExitTicket;
        if (ticketId)
            findExitTicket = await Transaction.findOne({
                ticketId: ticketId,
                transactionType: 'exit'
            })

        if (!ticketId && lostTicket && !vehicleNo) {
            return res.status(201).json({
                status: 201,
                message: "Ticket ID / vehicle No is must for lost ticket",
            });

        } else {

            if (lostTicket) {
                const lastTransactionByVehicleNo = await Transaction.aggregate([
                    {
                        '$match': {
                            vehicleNo
                        }
                    }, {
                        '$sort': {
                            time: -1
                        }
                    }, {
                        '$limit': 1
                    }
                ])

                if (lastTransactionByVehicleNo.length > 0) {

                    if (lastTransactionByVehicleNo[0].transactionType == 'entry') {

                        findEntryTicket = lastTransactionByVehicleNo[0]
                    }
                }
            }


            if (findEntryTicket) {

                if (findEntryTicket.cancelledTicket) {
                    return res.status(201).json({
                        status: 201,
                        message: "Fraud ticket found",
                    });
                } else {

                    if (findExitTicket) {
                        return res.status(201).json({
                            status: 201,
                            message: "Payment already received for Ticket ID",
                        });
                    } else {

                        // var currentTime = moment.unix(Date.now() / 1000).tz("Asia/Calcutta").format("DD-MM-YYYY HH:mm:ss");
                        // var mins = Math.ceil((moment(currentTime, "DD-MM-YYYY HH:mm:ss").diff(moment(entryTime, "DD-MM-YYYY HH:mm:ss"))) / 60000)

                        const findShift = await Shift.findById(shiftId)

                        if (findShift) {

                            const findParking = await Parking.findById(findShift.parkingId)

                            let findSupervisor = await Opretor.findOne({
                                parkingId: findShift.parkingId,
                                supervisorPin: supervisorPin
                            })

                            console.log('supervisorPin: ', supervisorPin);
                            console.log('findSupervisor: ', findSupervisor);

                            if (lostTicket && !findSupervisor) {

                                return res.status(201).json({
                                    status: 201,
                                    message: "Incorrect Supervisor Pin",
                                });

                            } else {

                                if (findParking) {
                                    let tariffData = []

                                    const data1 = returnTariffID(2)
                                    if (data1.tariffId) {
                                        const data_1 = await Tariff.findById(data1.tariffId)
                                        tariffData.push({
                                            tariffType: data1.tariffType,
                                            tariffData: data_1
                                        })
                                    }

                                    const data2 = returnTariffID(3)
                                    if (data2.tariffId) {
                                        const data_2 = await Tariff.findById(data2.tariffId)
                                        tariffData.push({
                                            tariffType: data2.tariffType,
                                            tariffData: data_2
                                        })
                                    }

                                    const data3 = returnTariffID(4)
                                    if (data3.tariffId) {
                                        const data_3 = await Tariff.findById(data3.tariffId)
                                        tariffData.push({
                                            tariffType: data3.tariffType,
                                            tariffData: data_3
                                        })
                                    }

                                    function returnTariffID(tariffType) {
                                        let obj = {}
                                        const dayIndex = new Date().getDay()
                                        const data = findParking.connectedTariff.filter(t => t.tariffType == tariffType)
                                        if (data.length == 1) {

                                            const data2 = data[0].tariffData.filter(t => t.dayIndex == dayIndex)
                                            if (data2.length > 0)
                                                obj = {
                                                    tariffId: data2[0].tariffId,
                                                    tariffType: tariffType
                                                }
                                        }
                                        return obj
                                    }

                                    var entryTimeISO = moment.unix(entryTime).tz("Asia/Calcutta").format("DD-MM-YYYY HH:mm:ss");
                                    var exitTimeISO = moment.unix(exitTime).tz("Asia/Calcutta").format("DD-MM-YYYY HH:mm:ss");
                                    var totalMin = Math.ceil((moment(exitTimeISO, "DD-MM-YYYY HH:mm:ss").diff(moment(entryTimeISO, "DD-MM-YYYY HH:mm:ss"))) / 60000)
                                    var mins = Math.ceil((moment(exitTimeISO, "DD-MM-YYYY HH:mm:ss").diff(moment(entryTimeISO, "DD-MM-YYYY HH:mm:ss"))) / 60000)
                                    let charge = 0
                                    var daysdiff = moment(exitTimeISO, "DD-MM-YYYY HH:mm:ss").diff(moment(entryTimeISO, "DD-MM-YYYY HH:mm:ss"), 'days')

                                    if (lostTicket) {

                                        let _entrytime = moment.unix(entryTime).tz("Asia/Calcutta")
                                        let _entryDateEndingTime = moment(_entrytime.format("DD-MM-YYYY HH:mm:ss").split(' ')[0].split('-').reverse().join('-') + ' 23:59:59')
                                        var _exitTime = moment.unix(exitTime).tz("Asia/Calcutta");

                                        for (i = 0; i <= daysdiff + 1; i++) {

                                            if (moment(_entrytime).isBefore(_exitTime, 'day')) {

                                                var prev_mins = Math.ceil((moment(_entryDateEndingTime, "DD-MM-YYYY HH:mm:ss").diff(moment(_entrytime, "DD-MM-YYYY HH:mm:ss"))) / 60000)

                                                calculateAmount(prev_mins, false)
                                                _entrytime.add(1, 'days')
                                                _entrytime = moment(_entrytime.format("DD-MM-YYYY HH:mm:ss").split(' ')[0].split('-').reverse().join('-') + ' 00:00:00')
                                                _entryDateEndingTime.add(1, 'days')

                                            }
                                            else if (moment(_entrytime).isSame(_exitTime, 'day')) {

                                                const _exitDateStaringTime = moment(_exitTime.format("DD-MM-YYYY HH:mm:ss").split(' ')[0].split('-').reverse().join('-') + ' 00:00:00').format("DD-MM-YYYY HH:mm:ss");
                                                mins = Math.ceil((moment(exitTimeISO, "DD-MM-YYYY HH:mm:ss").diff(moment(_exitDateStaringTime, "DD-MM-YYYY HH:mm:ss"))) / 60000)
                                                break
                                            }

                                        }


                                    }

                                    calculateAmount(mins, lostTicket)
                                    function calculateAmount(mins, lostTicket) {

                                        switch (vehicleType) {
                                            case 2:
                                                charge += calculateAmountBasedOnActiveTariff(mins, tariffData.filter(t => t.tariffType == 2)[0].tariffData, lostTicket)
                                                break;
                                            case 3:
                                                charge += calculateAmountBasedOnActiveTariff(mins, tariffData.filter(t => t.tariffType == 3)[0].tariffData, lostTicket)
                                                break;
                                            case 4:
                                                charge += calculateAmountBasedOnActiveTariff(mins, tariffData.filter(t => t.tariffType == 3)[0].tariffData, lostTicket)
                                                break;
                                            default:
                                                charge += calculateAmountBasedOnActiveTariff(mins, tariffData.filter(t => t.tariffType == 2)[0].tariffData, lostTicket)
                                        }
                                    }

                                    // update supervisor pin because lost ticket transaction is valid online
                                    if (lostTicket && supervisorPin) {
                                        // get All pincode
                                        const existingSupervisorPinParkiongWise = await Opretor.aggregate([
                                            {
                                                '$match': {
                                                    parkingId: mongoose.Types.ObjectId(findShift.parkingId),
                                                    isSupervisor: true
                                                }
                                            }, {
                                                '$project': {
                                                    supervisorPin: 1,
                                                    _id: 0
                                                }
                                            }
                                        ])

                                        const supervisorPin = getRandomNumber(existingSupervisorPinParkiongWise.map(o => o.supervisorPin))
                                        if (supervisorPin)
                                            await Opretor.findByIdAndUpdate(findSupervisor._id, { supervisorPin })
                                    }

                                    utils.commonResponce(
                                        res,
                                        200,
                                        "Successfully calculated charge",
                                        {
                                            stayDuration: totalMin,
                                            charge: charge,
                                            supervisorId: lostTicket ? findSupervisor._id : null
                                        }
                                    );



                                } else {
                                    return res.status(201).json({
                                        status: 201,
                                        message: "parking not found",
                                    });
                                }
                            }


                        } else {
                            return res.status(201).json({
                                status: 201,
                                message: "shift not found",
                            });
                        }

                    }
                }

            } else {
                return res.status(201).json({
                    status: 201,
                    message: "Ticket ID not found",
                });
            }

        }


    } catch (error) {
        console.log('error: ', error);
        return res.status(500).json({
            status: 500,
            message: "Unexpected server error while calculating charge",
        });
    }
}

function calculateAmountBasedOnActiveTariff(duration, tariffData, lostTicket) {
    console.log('lostTicket: ', lostTicket);
    console.log('duration: ', duration);
    let amount = 0

    // if lost ticket then check all trasactions of vehicle to apply each day tariff

    if (tariffData)
        if (lostTicket)
            amount += tariffData.lostTicket
        else
            tariffData.tariffData.map(tariffData => {

                if (duration >= tariffData.starting) {
                    if (tariffData.isInfinite == true) {
                        if (tariffData.isIterate == true) {
                            iterateFunction(tariffData.starting, duration, tariffData.iterateEvery, tariffData.price)
                        } else {
                            amount += tariffData.price
                        }
                    } else {
                        if (tariffData.isIterate == true) {
                            iterateFunction(tariffData.starting, tariffData.ending, tariffData.iterateEvery, tariffData.price)
                        } else {
                            amount += tariffData.price
                        }
                    }
                }

            })

    function iterateFunction(starting, ending, iterateEvery, price) {
        for (let i = starting; i <= ending; i += iterateEvery) {
            if (duration >= i) {
                amount += price
            }
        }
    }
    console.log('amount: ', amount);
    return amount
}

exports.getReceipts = async (req, res) => {
    try {

        const ticketId = req.body.ticketId
        const vehicleNo = req.body.vehicleNo

        await Transaction.aggregate([
            {
                '$match': {
                    '$and': [
                        {
                            'transactionType': 'exit'
                        }, {
                            '$or': [
                                {
                                    ticketId: ticketId,
                                }, {
                                    vehicleNo: vehicleNo,
                                }
                            ]
                        }
                    ]
                }
            }, {
                '$sort': {
                    'time': -1
                }
            }, {
                '$limit': 10
            }
        ]).then(async (receipts) => {

            utils.commonResponce(
                res,
                200,
                "Successfully fetched receipts",
                receipts
            );

        }).catch((err) => {
            console.log('err: ', err);
            utils.commonResponce(
                res,
                201,
                err.toString()
            );
        });

    } catch (error) {
        console.log('error: ', error);
        return res.status(500).json({
            status: 500,
            message: "Unexpected server error while creating Transaction",
        });
    }
}