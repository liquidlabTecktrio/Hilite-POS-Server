const Ticket = require("../models/Ticket");
const Tariff = require("../models/Tariff");
const Shift = require("../models/Shift");
const Opretor = require("../models/Opretor");
const Parking = require("../models/Parking");
const utils = require("./utils")
const Bluebird = require("bluebird");
const mongoose = require("mongoose");
const moment = require("moment-timezone");
const dashboardController = require("../controllers/dashboard");
const MonthlyPass = require("../models/MonthlyPass")
const SerialNumbers = require("../models/SerialNumbers")
const NFCTransaction = require("../models/NFCTicket");
const NFCCard = require("../models/NFCCard");


exports.createTransaction = async (req, res) => {
    try {
        // "ticketId": "01010521687461962",
        // "transactionType": "exit",
        // "shiftId": "6496cc1d2c8f63e5a40756dc",
        // "vehicleType": 2,
        // "vehicleNo":"87654321",
        // "paymentType":"upi",
        // "amount":200,
        // "lostTicket":false,
        // "supervisorId":"6493f7f6dd2c362985776664"

        const transactions = req.body.transactions
        const faildTransactions = [];

        await Bluebird.each(transactions, async (transaction, index) => {

            const createTrasactionData = await createTransactionfunction(transaction)
            if (createTrasactionData.statusCode != 200) {
                transaction.message = createTrasactionData.message
                faildTransactions.push(transaction)
            }
        })

        let shiftData = await Shift.findById(transactions[0].shiftId)

        utils.commonResponce(
            res,
            transactions.length == faildTransactions.length ? 201 : 200,
            transactions.length == faildTransactions.length ? "Some transaction could'nt create" : "Successfully created Transactions",
            {
                shiftData, faildTransactions
            }
        );

    } catch (error) {
        return res.status(500).json({
            status: 500,
            message: "Unexpected server error while creating Transaction",
        });

    }
}

async function createTransactionfunction(transactionData) {
    console.log('createTransactionfunction: ', transactionData);
    let statusCode = 200;
    let message = '';
    try {

        const ticketId = transactionData.ticketId
        const transactionType = transactionData.transactionType
        const shiftId = transactionData.shiftId
        const vehicleType = transactionData.vehicleType
        const vehicleNo = transactionData.vehicleNo
        const cancelledTicket = transactionData.cancelledTicket
        const fraudTicket = transactionData.fraudTicket
        const monthlyPassUsed = transactionData.monthlyPassUsed
        const monthlyPassId = transactionData.monthlyPassId

        let shiftData = await Shift.findById(shiftId)

        // if (lostTicket && !supervisorId) {

        //     statusCode = 201
        //     message = 'supervisor id is must for lost ticket'
        //     return {
        //         statusCode, message
        //     }
        // } 

        // if(!lostTicket)
        // {
        // var currentTime = moment.unix(Date.now() / 1000).tz("Asia/Calcutta").format("DD-MM-YYYY HH:mm:ss");
        // var currentTime = Math.floor(Date.now() / 1000)
        entryTime = ticketId.slice(-10);

        if (transactionType == 'entry') {

            await Ticket.create({
                ticketId: ticketId,

                entryTime: entryTime,
                shiftId: shiftId,
                parkingId: shiftData.parkingId,
                // amount: amount,
                // paymentType: paymentType,
                vehicleType: vehicleType,
                vehicleNo: vehicleNo,
                // lostTicket: lostTicket,
                // supervisorId: supervisorId
                monthlyPassUsed: monthlyPassUsed,
                monthlyPassId: monthlyPassId,
            })
            //increment parking ocuupancy
            await Parking.findByIdAndUpdate(shiftData.parkingId, {
                $inc: {
                    currentOccupiedSpaces: 1
                },
            })
            //increement issued tickets count in  the shift data
            await Shift.findByIdAndUpdate(shiftId, {
                $inc: {
                    totalTicketIssued: 1
                }
            })


            let isChecked = true
            console.log('cancelledTicket: ', cancelledTicket);
            if (cancelledTicket == 1)
                isChecked = await cancelTicketfunction(transactionData)

            console.log('fraudTicket: ', fraudTicket);
            if (fraudTicket == 1)
                isChecked = await fraudTicketfunction(transactionData)



            if (isChecked) {

                statusCode = 200
                message = 'Successfully created transaction'
                return {
                    statusCode, message
                }
            } else {
                statusCode = 201
                message = 'Server issue while updating cancel or fraud ticket'
                return {
                    statusCode, message
                }
            }


        }

        if (transactionType == 'exit') {

            const amount = transactionData.amount;
            const paymentType = transactionData.paymentType;
            const lostTicket = transactionData.lostTicket;
            const supervisorId = transactionData.supervisorId;
            const exitTime = transactionData.exitTime;
            const supervisorPin = transactionData.supervisorPin;
            // const exitTime = transactionData.exitTime.substring(7);
            const remark = transactionData.remark;

            var entryTimeISO = moment.unix(entryTime).tz("Asia/Calcutta").format("DD-MM-YYYY HH:mm:ss");
            var exitTimeISO = moment.unix(exitTime).tz("Asia/Calcutta").format("DD-MM-YYYY HH:mm:ss");
            var duration = Math.ceil((moment(exitTimeISO, "DD-MM-YYYY HH:mm:ss").diff(moment(entryTimeISO, "DD-MM-YYYY HH:mm:ss"))) / 60000)

            const findSerialNumbers = await SerialNumbers.findOne({ parkingId: shiftData.parkingId })

            let findSupervisor = await Opretor.findOne({
                parkingId: shiftData.parkingId,
                supervisorPin: supervisorPin
            })


            if (lostTicket && !findSupervisor) {

                statusCode = 201;
                message = "Incorrect Supervisor Pin";

                return {
                    statusCode, message
                }

            } else {


                await Ticket.findOneAndUpdate({ ticketId: ticketId }, {
                    exitTime, amount, duration, receiptNo: findSerialNumbers.receiptNo, paymentType, lostTicket, exitShiftId: shiftId,
                    remark
                })

                // started from here // mustaqeem

                await SerialNumbers.findOneAndUpdate({ parkingId: shiftData.parkingId }, {
                    $inc: { receiptNo: 1 }
                }, { returnNewDocument: true })



                await Parking.findByIdAndUpdate(shiftData.parkingId, {
                    $inc: {
                        currentOccupiedSpaces: -1
                    },
                })

                let obj = {
                    $inc: {
                        totalTicketCollected: 1,
                        totalLostTicketCollected: lostTicket ? 1 : 0,
                    }, $push: {}
                }

                if (shiftData.totalCollection.filter(c => c.paymentType == paymentType).length <= 0)
                    obj['$push']['totalCollection'] = [{
                        paymentType: paymentType,
                        amount: amount,
                    }]
                else
                    obj['$inc']['totalCollection.$[a].amount'] = amount

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
                                parkingId: mongoose.Types.ObjectId(shiftData.parkingId),
                                isSupervisor: true
                            }
                        }, {
                            '$project': {
                                supervisorPin: 1,
                                _id: 0
                            }
                        }
                    ])

                    let supervisorPin = getRandomNumber(existingSupervisorPinParkiongWise.map(o => o.supervisorPin))
                    if (supervisorPin)
                        await Opretor.findByIdAndUpdate(findSupervisor._id, { supervisorPin })
                }



                // update nfc card
                if (monthlyPassUsed) {
                    const passData = await MonthlyPass.findOne({ cardNumber, isActive: true, parkingId })

                    if (passData) {

                        await MonthlyPass.findOneAndUpdate({ cardNumber, isActive: true, parkingId }, { status: 'in' })
                    }
                }


                statusCode = 200
                message = 'Successfully created transaction'
                return {
                    statusCode, message
                }
            }

        }


    } catch (error) {
        console.log('error: ', error);
        statusCode = 201
        message = error.toString()
        return {
            statusCode, message
        }
    }


}

// This controller is used for manually updating the exit - please exercise caution when making modifications
exports.createManualExit = async (req, res) => {
    try {

        // // removing manual Exit
        // await Ticket.updateMany({
        //     manualExit: true
        // }, {
        //     amount: 0
        // })


        const TicketsFourWheeler = await Ticket.aggregate(
            [
                {
                    '$addFields': {
                        'entryDateISO': {
                            '$toDate': {
                                '$multiply': [
                                    {
                                        '$add': [
                                            {
                                                '$toInt': '$entryTime'
                                            }, 19800
                                        ]
                                    }, 1000
                                ]
                            }
                        },
                        'typeOfExitTime': {
                            '$type': '$exitTime'
                        }
                    }
                }, {
                    '$match': {
                        // 'entryDateISO': {
                        //     '$lte': new Date('Tue, 31 Oct 2023 23:59:59 GMT')
                        // },
                        // 'typeOfExitTime': 'missing',
                        'manualExit': true,
                        'vehicleType': "4"
                    }
                }
            ]
        )

        await Bluebird.each(TicketsFourWheeler, async (transaction, index) => {
            console.log('4 wheeler index: ', index);

            // const amount = index < 210 ? 25 : 0;
            // const paymentType = 'cash';
            let amount = index < 201 ? 25 : 0;
            const paymentType = index < 140 ? 'cash' : 'upi';
            if (paymentType == 'cash' && index == 139)
                amount = 29
            // const lostTicket = false;
            let exitTime = parseInt(transaction.entryTime);
            if (index < 201)
                exitTime += 19800
            else
                exitTime += 480


            var entryTimeISO = moment.unix(transaction.entryTime).tz("Asia/Calcutta").format("DD-MM-YYYY HH:mm:ss");
            var exitTimeISO = moment.unix(exitTime).tz("Asia/Calcutta").format("DD-MM-YYYY HH:mm:ss");
            var duration = Math.ceil((moment(exitTimeISO, "DD-MM-YYYY HH:mm:ss").diff(moment(entryTimeISO, "DD-MM-YYYY HH:mm:ss"))) / 60000)

            const findSerialNumbers = await SerialNumbers.findOne({ parkingId: transaction.parkingId })


            await Ticket.findOneAndUpdate({ _id: transaction._id }, {
                // exitTime, amount, duration, receiptNo: findSerialNumbers.receiptNo, paymentType, lostTicket, manualExit: true
                exitTime, amount, paymentType, duration
            })

            // await SerialNumbers.findOneAndUpdate({ parkingId: transaction.parkingId }, {
            //     $inc: { receiptNo: 1 }
            // }, { returnNewDocument: true })

            // await Parking.findByIdAndUpdate(transaction.parkingId, {
            //     $inc: {
            //         currentOccupiedSpaces: -1
            //     },
            // })
        })

        const TicketsTwoWheeler = await Ticket.aggregate(
            [
                {
                    '$addFields': {
                        'entryDateISO': {
                            '$toDate': {
                                '$multiply': [
                                    {
                                        '$add': [
                                            {
                                                '$toInt': '$entryTime'
                                            }, 19800
                                        ]
                                    }, 1000
                                ]
                            }
                        },
                        'typeOfExitTime': {
                            '$type': '$exitTime'
                        }
                    }
                }, {
                    '$match': {
                        // 'entryDateISO': {
                        //     '$lte': new Date('Tue, 31 Oct 2023 23:59:59 GMT')
                        // },
                        // 'typeOfExitTime': 'missing',
                        'manualExit': true,
                        'vehicleType': "2"
                    }
                }
            ]
        )

        await Bluebird.each(TicketsTwoWheeler, async (transaction, index) => {
            console.log('2 wheeler index: ', index);

            // const amount = index < 312 ? 10 : 0;
            // const paymentType = 'cash';
            const amount = index < 332 ? 10 : 0;
            const paymentType = index < 172 ? 'cash' : 'upi';
            // const lostTicket = false;
            let exitTime = parseInt(transaction.entryTime);
            if (index < 332)
                exitTime += 19800
            else
                exitTime += 480

            var entryTimeISO = moment.unix(transaction.entryTime).tz("Asia/Calcutta").format("DD-MM-YYYY HH:mm:ss");
            var exitTimeISO = moment.unix(exitTime).tz("Asia/Calcutta").format("DD-MM-YYYY HH:mm:ss");
            var duration = Math.ceil((moment(exitTimeISO, "DD-MM-YYYY HH:mm:ss").diff(moment(entryTimeISO, "DD-MM-YYYY HH:mm:ss"))) / 60000)

            // const findSerialNumbers = await SerialNumbers.findOne({ parkingId: transaction.parkingId })

            await Ticket.findOneAndUpdate({ _id: transaction._id }, {
                // exitTime, amount, duration, receiptNo: findSerialNumbers.receiptNo, paymentType, lostTicket, manualExit: true
                exitTime, amount, paymentType, duration
            })

            // await SerialNumbers.findOneAndUpdate({ parkingId: transaction.parkingId }, {
            //     $inc: { receiptNo: 1 }
            // }, { returnNewDocument: true })

            // await Parking.findByIdAndUpdate(transaction.parkingId, {
            //     $inc: {
            //         currentOccupiedSpaces: -1
            //     },
            // })
        })

        return res.status(200).json({
            status: 200,
            message: "success",
            data: { TicketsFourWheeler, TicketsTwoWheeler }
        });


    } catch (error) {
        console.log('error: ', error);
        return res.status(500).json({
            status: 500,
            message: "Unexpected server error while creating Transaction",
        });
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
        console.log('transactions: ', transactions);
        const faildTransactions = []

        await Bluebird.each(transactions, async (transaction, index) => {

            const createTrasactionData = await cancelTicketfunction(transaction)
            if (createTrasactionData.statusCode != 200) {
                transaction.message = createTrasactionData.message
                faildTransactions.push(transaction)
            }
        })

        let shiftData = await Shift.findById(transactions[0].shiftId)

        // web socket 
        dashboardController.getDashboardDataFunction()

        utils.commonResponce(
            res,
            200,
            "cancelled ticket",
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

        const findTicket = await Ticket.findOne({ ticketId: ticketId })

        // const findEntryTicket = await Transaction.findOne({
        //     ticketId: ticketId,
        //     transactionType: 'entry'
        // })

        // const findExitTicket = await Transaction.findOne({
        //     ticketId: ticketId,
        //     transactionType: 'exit'
        // })

        if (findTicket) {
            if (findTicket.exitTime) {

                statusCode = 201
                message = "Payment already received for Ticket ID"
            } else {

                await Ticket.findByIdAndUpdate(findTicket._id, {
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
                                // totalTicketIssued: -1,
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

exports.registerFraudTicket = async (req, res) => {
    try {

        const transactions = req.body.transactions
        console.log('transactions: ', transactions);
        const faildTransactions = []

        await Bluebird.each(transactions, async (transaction, index) => {

            const createTrasactionData = await fraudTicketfunction(transaction)
            if (createTrasactionData.statusCode != 200) {
                transaction.message = createTrasactionData.message
                faildTransactions.push(transaction)
            }
        })

        let shiftData = await Shift.findById(transactions[0].shiftId)

        // web socket 
        dashboardController.getDashboardDataFunction()

        utils.commonResponce(
            res,
            200,
            "fraurd ticket updated",
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

async function fraudTicketfunction(transactionData) {
    let statusCode = 200;
    let message = '';
    try {

        // alwasy ticket no will be there for calcelling a ticket

        const ticketId = transactionData.ticketId
        console.log('ticketId: ', ticketId);
        const shiftId = transactionData.shiftId
        console.log('shiftId: ', shiftId);

        const findTicket = await Ticket.findOne({ ticketId: ticketId })

        if (findTicket) {
            if (findTicket.exitTime) {

                statusCode = 201
                message = "Payment already received for Ticket ID"
            } else {

                await Ticket.findByIdAndUpdate(findTicket._id, {
                    fraudTicket: true
                }).then(async (createdParking) => {

                    // update shift and opretor here

                    const findShift = await Shift.findById(shiftId)

                    await Parking.findByIdAndUpdate(findShift.parkingId, {
                        $inc: {
                            currentOccupiedSpaces: -1,
                        },
                    })


                    statusCode = 200
                    message = 'fraurd ticket updated'


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

exports.calculateChargeOldTariff = async (req, res) => {
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
        // if (ticketId)
        //     findEntryTicket = await Transaction.findOne({
        //         ticketId: ticketId,
        //         transactionType: 'entry'
        //     })

        let findExitTicket;
        // if (ticketId)
        //     findExitTicket = await Transaction.findOne({
        //         ticketId: ticketId,
        //         transactionType: 'exit'
        //     })

        const findTicket = await Ticket.findOne({ ticketId: ticketId })
        if (findTicket)
            findEntryTicket = findTicket
        if (findTicket && findTicket.exitTime)
            findExitTicket = findTicket


        if (!ticketId && lostTicket && !vehicleNo) {
            return res.status(201).json({
                status: 201,
                message: "Ticket ID / vehicle No is must for lost ticket",
            });

        } else {

            if (lostTicket) {
                const lastTransactionByVehicleNo = await Ticket.aggregate([
                    {
                        '$match': {
                            vehicleNo
                        }
                    },
                    // {
                    //     '$sort': {
                    //         time: -1
                    //     }
                    // },
                    {
                        '$sort': {
                            'createdAt': -1
                        }
                    },
                    {
                        '$limit': 1
                    }
                ])

                if (lastTransactionByVehicleNo.length > 0) {

                    // if (lastTransactionByVehicleNo[0].transactionType == 'entry') {
                    //     findEntryTicket = lastTransactionByVehicleNo[0]
                    // }
                    if (!lastTransactionByVehicleNo[0].exitTime)
                        findEntryTicket = lastTransactionByVehicleNo[0]
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
                                            stayDuration:
                                                totalMin,
                                            charge: charge,
                                            supervisorId: lostTicket ? findSupervisor._id : null,
                                            entryTicket: findEntryTicket, exitTime
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

// new tariff
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

        let findExitTicket;

        const findTicket = await Ticket.findOne({ ticketId: ticketId })
        if (findTicket)
            findEntryTicket = findTicket
        if (findTicket && findTicket.exitTime)
            findExitTicket = findTicket


        if (!ticketId && lostTicket && !vehicleNo) {
            return res.status(201).json({
                status: 201,
                message: "Ticket ID / vehicle No is must for lost ticket",
            });

        } else {

            if (lostTicket) {
                const lastTransactionByVehicleNo = await Ticket.aggregate([
                    {
                        '$match': {
                            vehicleNo
                        }
                    },
                    // {
                    //     '$sort': {
                    //         time: -1
                    //     }
                    // },
                    {
                        '$sort': {
                            'createdAt': -1
                        }
                    },
                    {
                        '$limit': 1
                    }
                ])

                if (lastTransactionByVehicleNo.length > 0) {

                    // if (lastTransactionByVehicleNo[0].transactionType == 'entry') {
                    //     findEntryTicket = lastTransactionByVehicleNo[0]
                    // }
                    if (!lastTransactionByVehicleNo[0].exitTime)
                        findEntryTicket = lastTransactionByVehicleNo[0]
                }
            }


            if (findEntryTicket) {

                if (findEntryTicket.cancelledTicket) {
                    return res.status(201).json({
                        status: 201,
                        message: "Ticket has been cancelled",
                    });
                } else if (findEntryTicket.fraudTicket) {
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

                                    let startingOperationalHours = findParking.startingOperationalHours ? findParking.startingOperationalHours : '08:00:00'
                                    let endingOperationalHours = findParking.endingOperationalHours ? findParking.endingOperationalHours : '23:59:59'
                                    let startingNonOperationalHours = findParking.startingNonOperationalHours ? findParking.startingNonOperationalHours : '00:00:00'
                                    let endingNonOperationalHours = findParking.endingNonOperationalHours ? findParking.endingNonOperationalHours : '07:59:59'

                                    let _tariffData = tariffData.filter(t => t.tariffType == vehicleType)[0].tariffData


                                    var entryTimeISO = moment.unix(entryTime).tz("Asia/Calcutta").format("DD-MM-YYYY HH:mm:ss");
                                    var exitTimeISO = moment.unix(exitTime).tz("Asia/Calcutta").format("DD-MM-YYYY HH:mm:ss");
                                    var totalMin = Math.ceil((moment(exitTimeISO, "DD-MM-YYYY HH:mm:ss").diff(moment(entryTimeISO, "DD-MM-YYYY HH:mm:ss"))) / 60000)
                                    var mins = Math.ceil((moment(exitTimeISO, "DD-MM-YYYY HH:mm:ss").diff(moment(entryTimeISO, "DD-MM-YYYY HH:mm:ss"))) / 60000)
                                    let charge = 0
                                    let fine = lostTicket ? _tariffData.lostTicket : 0
                                    var daysdiff = moment(exitTimeISO, "DD-MM-YYYY HH:mm:ss").diff(moment(entryTimeISO, "DD-MM-YYYY HH:mm:ss"), 'days')

                                    let _entrytime = moment.unix(entryTime).tz("Asia/Calcutta")
                                    let _entryDateEndingTime = moment(_entrytime.format("DD-MM-YYYY HH:mm:ss").split(' ')[0].split('-').reverse().join('-') + ' 23:59:59')
                                    var _exitTime = moment.unix(exitTime).tz("Asia/Calcutta");


                                    if (_tariffData.tariffEnableForNonOperationalHours) {

                                        let entry_Time = new Date(_entrytime.format("MM-DD-YYYY HH:mm:ss"))
                                        let exit_Time = new Date(_exitTime.format("MM-DD-YYYY HH:mm:ss"))

                                        // calculation by days
                                        for (i = 0; i <= (daysdiff * 2) + 2; i++) {
                                            entry_Time.setMinutes(entry_Time.getMinutes() + 1)
                                            const startingOperationalHoursDate = new Date(entry_Time.toISOString().split('T')[0] + ' ' + startingOperationalHours)

                                            if (entry_Time < exit_Time)
                                                if (entry_Time < startingOperationalHoursDate) {

                                                    let tillNonOprEndTime = new Date(entry_Time.toISOString().split('T')[0] + ' ' + endingNonOperationalHours)

                                                    if (tillNonOprEndTime > exit_Time)
                                                        tillNonOprEndTime = exit_Time

                                                    let mins = getDifferenceInMinutes(entry_Time, tillNonOprEndTime)
                                                    charge += calculateAmountBasedOnActiveTariff_v2(mins, _tariffData, false)

                                                    entry_Time = tillNonOprEndTime

                                                } else {

                                                    let tillOprEndTime = new Date(entry_Time.toISOString().split('T')[0] + ' ' + endingOperationalHours)

                                                    if (tillOprEndTime > exit_Time)
                                                        tillOprEndTime = exit_Time

                                                    let mins = getDifferenceInMinutes(entry_Time, tillOprEndTime)
                                                    charge += calculateAmountBasedOnActiveTariff_v2(mins, _tariffData, true)

                                                    entry_Time = tillOprEndTime
                                                }

                                        }
                                    } else {
                                        charge += calculateAmountBasedOnActiveTariff_v2(totalMin, _tariffData, true)
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
                                            stayDuration:
                                                totalMin,
                                            charge,
                                            fine,
                                            supervisorId: lostTicket ? findSupervisor._id : null,
                                            entryTicket: findEntryTicket,
                                            exitTime
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

function calculateAmountBasedOnActiveTariff(duration, _tariffData, lostTicket) {
    let amount = 0

    _tariffData = JSON.parse(JSON.stringify(_tariffData))
    // if lost ticket then check all trasactions of vehicle to apply each day tariff

    if (_tariffData)
        if (lostTicket)
            amount += _tariffData.lostTicket
        else
            _tariffData.tariffData.map(tariffData => {

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

        await Ticket.aggregate([
            {
                '$match': {
                    // '$and': [
                    //     {
                    //         'transactionType': 'exit'
                    //     }, {
                    '$or': [
                        {
                            ticketId: ticketId,
                        }, {
                            vehicleNo: vehicleNo,
                        }
                    ]
                    //     }
                    // ]
                }
            }, {
                '$sort': {
                    // 'time': -1
                    'createdAt': -1
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

exports.checkLostTicket = async (req, res) => {
    try {

        const vehicleNo = req.body.vehicleNo;
        const parkingId = req.body.parkingId;
        const exitTime = req.body.exitTime;

        const checkTransaction = await Ticket.aggregate([
            {
                '$match': {
                    'vehicleNo': vehicleNo
                }
            }, {
                '$lookup': {
                    'from': 'shifts',
                    'localField': 'shiftId',
                    'foreignField': '_id',
                    'pipeline': [
                        {
                            '$project': {
                                'parkingId': 1,
                                '_id': 0
                            }
                        }
                    ],
                    'as': 'shiftData'
                }
            }, {
                '$addFields': {
                    'shiftData': {
                        '$first': '$shiftData'
                    }
                }
            }, {
                '$addFields': {
                    'parkingId': '$shiftData.parkingId'
                }
            }, {
                '$match': {
                    'parkingId': new mongoose.Types.ObjectId(parkingId)
                }
            }, {
                '$sort': {
                    'createdAt': -1
                }
            }, {
                '$limit': 1
            }
        ])

        // Old tariff data was array of all tariff breaking lost ticket amount so mustaqeem updated get tariff old methode

        // const tariffData = await Parking.aggregate([
        //     {
        //         '$match': {
        //             '_id': mongoose.Types.ObjectId(parkingId)
        //         }
        //     }, {
        //         '$unwind': {
        //             'path': '$connectedTariff'
        //         }
        //     }, {
        //         '$unwind': {
        //             'path': '$connectedTariff.tariffData'
        //         }
        //     }, {
        //         '$lookup': {
        //             'from': 'tariffs',
        //             'localField': 'connectedTariff.tariffData.tariffId',
        //             'foreignField': '_id',
        //             'pipeline': [
        //                 {
        //                     '$project': {
        //                         'tariffName': 0,
        //                         '_id': 0,
        //                         'isTariffInHour': 0,
        //                         'isActive': 0,
        //                         'createdAt': 0,
        //                         'updatedAt': 0,
        //                         '__v': 0
        //                     }
        //                 }
        //             ],
        //             'as': 'tariffData'
        //         }
        //     }, {
        //         '$addFields': {
        //             'tariffData': {
        //                 '$first': '$tariffData'
        //             }
        //         }
        //     }, {
        //         '$project': {
        //             'parkingName': 0,
        //             '_id': 0,
        //             'parkingNo': 0,
        //             'totalSpaces': 0,
        //             'currentOccupiedSpaces': 0,
        //             'totalEntries': 0,
        //             'address': 0,
        //             'totalExits': 0,
        //             'connectedTariff': 0,
        //             'isActive': 0,
        //             'isAutoCloseBarrier': 0,
        //             'closeBarrierAfter': 0,
        //             'createdAt': 0,
        //             'updatedAt': 0,
        //             '__v': 0
        //         }
        //     }
        // ])

        const findParking = await Parking.findById(parkingId)

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

        // tariffData.map(ele => console.log("ele", ele.hourlyRate))
        // console.log('tariffData: ', tariffData);
        if (checkTransaction.length > 0) {

            if (checkTransaction[0].exitTime) {
                utils.commonResponce(res, 201, "Vehicle already exit the carpark or no entry found", vehicleNo);
            }

            else if (checkTransaction[0].cancelledTicket) {
                return res.status(201).json({
                    status: 201,
                    message: "Ticket has been cancelled",
                });
            } else if (checkTransaction[0].fraudTicket) {
                return res.status(201).json({
                    status: 201,
                    message: "Fraud ticket found",
                });
            }


            else {
                // // if (checkTransaction[0].transactionType == "entry") {
                // ticketId = checkTransaction[0].ticketId;
                // // const tariffType = ticketId.substring(6, 7);
                // // console.log("tariffType", tariffType)
                // // const carwashType = ticketId.substring(5, 6)
                // // entryTime = checkTransaction[0].ticketId.slice(7, 17); //old
                // entryTime = ticketId.slice(-10);
                // var entryTimeISO = moment
                //     .unix(entryTime)
                //     .tz("Asia/Calcutta")
                //     .format("DD-MM-YYYY HH:mm:ss");
                // var exitTimeISO = moment
                //     .unix(Math.floor(Date.now() / 1000))
                //     .tz("Asia/Calcutta")
                //     .format("DD-MM-YYYY HH:mm:ss");
                // var duration = Math.ceil(
                //     moment(exitTimeISO, "DD-MM-YYYY HH:mm:ss").diff(
                //         moment(entryTimeISO, "DD-MM-YYYY HH:mm:ss")
                //     ) / 60000
                // );
                // // calculate_tariff(entryTimeISO, exitTimeISO,checkTransaction[0], tariffData,carwashType,true ,res,);
                // calculate_tariff(entryTime, Math.floor(Date.now() / 1000), checkTransaction[0], tariffData, true, res,);

                // // utils.commonResponce(res, 201, "vehicle data found", vehicleNo);


                // added new code from here for new tariff by mustaqeem

                let startingOperationalHours = findParking.startingOperationalHours ? findParking.startingOperationalHours : '08:00:00'
                let endingOperationalHours = findParking.endingOperationalHours ? findParking.endingOperationalHours : '23:59:59'
                let startingNonOperationalHours = findParking.startingNonOperationalHours ? findParking.startingNonOperationalHours : '00:00:00'
                let endingNonOperationalHours = findParking.endingNonOperationalHours ? findParking.endingNonOperationalHours : '07:59:59'


                let _tariffData = tariffData.filter(t => t.tariffType == checkTransaction[0].vehicleType)[0].tariffData
                let entryTime = checkTransaction[0].entryTime
                let lostTicket = true

                var entryTimeISO = moment.unix(entryTime).tz("Asia/Calcutta").format("DD-MM-YYYY HH:mm:ss");
                var exitTimeISO = moment.unix(exitTime).tz("Asia/Calcutta").format("DD-MM-YYYY HH:mm:ss");
                var totalMin = Math.ceil((moment(exitTimeISO, "DD-MM-YYYY HH:mm:ss").diff(moment(entryTimeISO, "DD-MM-YYYY HH:mm:ss"))) / 60000)
                var mins = Math.ceil((moment(exitTimeISO, "DD-MM-YYYY HH:mm:ss").diff(moment(entryTimeISO, "DD-MM-YYYY HH:mm:ss"))) / 60000)
                let charge = 0
                let fine = lostTicket ? _tariffData.lostTicket : 0
                var daysdiff = moment(exitTimeISO, "DD-MM-YYYY HH:mm:ss").diff(moment(entryTimeISO, "DD-MM-YYYY HH:mm:ss"), 'days')

                let _entrytime = moment.unix(entryTime).tz("Asia/Calcutta")
                let _entryDateEndingTime = moment(_entrytime.format("DD-MM-YYYY HH:mm:ss").split(' ')[0].split('-').reverse().join('-') + ' 23:59:59')
                var _exitTime = moment.unix(exitTime).tz("Asia/Calcutta");


                if (_tariffData.tariffEnableForNonOperationalHours) {

                    let entry_Time = new Date(_entrytime.format("MM-DD-YYYY HH:mm:ss"))
                    let exit_Time = new Date(_exitTime.format("MM-DD-YYYY HH:mm:ss"))

                    // calculation by days
                    for (i = 0; i <= (daysdiff * 2) + 2; i++) {
                        entry_Time.setMinutes(entry_Time.getMinutes() + 1)
                        const startingOperationalHoursDate = new Date(entry_Time.toISOString().split('T')[0] + ' ' + startingOperationalHours)

                        if (entry_Time < exit_Time)
                            if (entry_Time < startingOperationalHoursDate) {

                                let tillNonOprEndTime = new Date(entry_Time.toISOString().split('T')[0] + ' ' + endingNonOperationalHours)

                                if (tillNonOprEndTime > exit_Time)
                                    tillNonOprEndTime = exit_Time

                                let mins = getDifferenceInMinutes(entry_Time, tillNonOprEndTime)
                                charge += calculateAmountBasedOnActiveTariff_v2(mins, _tariffData, false)

                                entry_Time = tillNonOprEndTime

                            } else {

                                let tillOprEndTime = new Date(entry_Time.toISOString().split('T')[0] + ' ' + endingOperationalHours)

                                if (tillOprEndTime > exit_Time)
                                    tillOprEndTime = exit_Time

                                let mins = getDifferenceInMinutes(entry_Time, tillOprEndTime)
                                charge += calculateAmountBasedOnActiveTariff_v2(mins, _tariffData, true)

                                entry_Time = tillOprEndTime
                            }

                    }
                } else {
                    charge += calculateAmountBasedOnActiveTariff_v2(totalMin, _tariffData, true)
                }



                utils.commonResponce(res, 200, "Successfully calculated Tariff", {
                    entryTimeISO: entryTimeISO,
                    exitTimeISO: exitTimeISO,
                    duration: mins,
                    ticketId: checkTransaction[0].ticketId,
                    vehicleType: checkTransaction[0].vehicleType,
                    vehicleNo: checkTransaction[0].vehicleNo,
                    amount: charge,
                    lostTicketFine: fine,
                    // carwashType: carwashType,

                });
            }

        } else {

            utils.commonResponce(res, 201, "Vehicle data not found. Please check vehicle no!!", vehicleNo);
        }

    } catch (error) {
        console.log(error)
        utils.commonResponce(res, 500, "Unexpected server error while creating Lost Ticket", error.toString());

    }
}

function calculate_tariff(entryTime, exitTime, ticket, tariffData, lostTicket, res) {
    // entryTime = 1686950503;
    // exitTime = 1686993028;
    // console.log("tariffData", tariffData)
    // console.log("carwashType", carwashType)
    // console.log("xbj", entryTime, exitTime, ticket, tariffData, carwashType, tariffType, lostTicket, res)
    var entryTimeISO = moment
        .unix(entryTime)
        .tz("Asia/Calcutta")
        .format("DD-MM-YYYY HH:mm:ss");
    var exitTimeISO = moment
        .unix(exitTime)
        .tz("Asia/Calcutta")
        .format("DD-MM-YYYY HH:mm:ss");
    var duration = Math.ceil(
        moment(exitTimeISO, "DD-MM-YYYY HH:mm:ss").diff(
            moment(entryTimeISO, "DD-MM-YYYY HH:mm:ss")
        ) / 60000
    );
    //   dailyRate =  findKey(tariffData, "dailyRate");
    //   lostTicket =  findKey(tariffData, "lostTicket");

    // lostTicketFine = lostTicket ? tariffData.lostTicket.amount : 0;
    // lostTicketFine = lostTicket ? tariffData.lostTicket : 0; //commented by mustaqeem
    lostTicketFine = lostTicket ? tariffData.filter(t => t.tariffType == ticket.vehicleType)[0].tariffData.lostTicket : 0;


    console.log('lostTicket: ', lostTicket);
    // console.log('tariffData: ', tariffData);
    console.log("lostTicketFine", lostTicketFine)
    amount = 0;
    console.log("amount01", amount)
    // carwashAmount = 0;
    // console.log("carwashAmount", carwashAmount)
    // CarwashType = '';
    // if (carwashType == 1) {
    //     carwashAmount = 300;
    //     carwashType = 'Hatchback/Sedan - (Exteriror Only)';

    // }
    // if (carwashType == 2) {
    //     carwashAmount = 400;
    //     carwashType = 'SUV - (Exterior Only)';
    // }
    // if (carwashType == 3) {
    //     carwashAmount = 500;
    //     carwashType = 'Exterior & Interior Cleaning';
    // }

    // amount = calculate_parking_fee(duration, tariffData); // commented by mustaqeem
    // amount = calculate_parking_fee(duration, tariffData.filter(t => t.tariffType == ticket.vehicleType)[0].tariffData);
    amount = calculateAmountBasedOnActiveTariff(duration, tariffData.filter(t => t.tariffType == ticket.vehicleType)[0].tariffData, false);

    console.log("amount", amount, {
        entryTimeISO: entryTimeISO,
        exitTimeISO: exitTimeISO,
        duration: duration,
        // dailyRate: dailyRate,
        // lostTicket: lostTicket,
        ticketId: ticket.ticketId,
        vehicleType: ticket.vehicleType,
        vehicleNo: ticket.vehicleNo,
        amount: amount,
        // carwashAmount: carwashAmount,
        lostTicketFine: lostTicketFine,
        // carwashType: carwashType,

    })

    if (amount != null) {
        utils.commonResponce(res, 200, "Successfully calculated Tariff", {
            entryTimeISO: entryTimeISO,
            exitTimeISO: exitTimeISO,
            duration: duration,
            // dailyRate: dailyRate,
            // lostTicket: lostTicket,
            ticketId: ticket.ticketId,
            vehicleType: ticket.vehicleType,
            vehicleNo: ticket.vehicleNo,
            amount: amount,
            // carwashAmount: carwashAmount,
            lostTicketFine: lostTicketFine,
            // carwashType: carwashType,

        });
    } else {

        utils.commonResponce(res, 500, "Something went wrong", {});
    }





    // console.log("entryTimeISO", entryTimeISO);
    // console.log("exitTime", exitTime);
    // console.log("totalMin", totalMin)
}

function calculate_parking_fee(duration, tariffData) {
    let amount = 0;
    dailyRate = tariffData.dailyRate != null ? tariffData.dailyRate.amount : 0;
    weeklyRate = tariffData.weeklyRate != null ? tariffData.weeklyRate.amount : 0;
    monthlyRate =
        tariffData.monthlyRate != null ? tariffData.monthlyRate.amount : 0;

    // if (tariffType == '2') {
    if (
        duration <= 1440 &&
        (dailyRate != 0 || weeklyRate != 0 || monthlyRate != 0)
    ) {
        // parking duration less than or equal to 24 hours
        tariffData.hourlyRate.map((hourlyRate) => {
            if (duration > hourlyRate.starting) {
                if (hourlyRate.isInfinite == true) {
                    if (hourlyRate.isIterate == true) {
                        iterateFunction(
                            duration,
                            hourlyRate.starting,
                            duration,
                            hourlyRate.iterateEvery,
                            hourlyRate.price
                        );
                    } else {
                        amount += hourlyRate.price;
                    }
                } else {
                    if (hourlyRate.isIterate == true) {
                        iterateFunction(
                            duration,
                            hourlyRate.starting,
                            hourlyRate.ending,
                            hourlyRate.iterateEvery,
                            hourlyRate.price
                        );
                    } else {
                        amount += hourlyRate.price;
                    }
                }
            }
        });
    } else {
        totaldays = Math.floor(duration / 1440);
        if (monthlyRate > 0 && totaldays >= 30) {
            // if(monthlyRate>0){
            totalMonths = Math.floor(totaldays / 30);
            amount += monthlyRate * totalMonths;
            totaldays = totaldays - totalMonths * 30;
            // }
        }
        if (
            totaldays >= 7 &&
            totaldays < (monthlyRate != 0 ? 30 : totaldays + 1) &&
            weeklyRate > 0
        ) {
            // if(weeklyRate>0){
            totalWeeks = Math.floor(totaldays / 7);
            amount += weeklyRate * totalWeeks;
            totaldays = totaldays - totalWeeks * 7;
            // }
        }
        if (
            totaldays >= 1 && totaldays < (monthlyRate != 0 || weeklyRate != 0)
                ? 7
                : totaldays + 1
        ) {
            if (dailyRate > 0) {
                amount += dailyRate * totaldays;
            }
        }

        remainingMin = duration - (dailyRate > 0 ? totaldays * 1440 : 0);
        tariffData.hourlyRate.map((hourlyRate) => {
            if (remainingMin > hourlyRate.starting) {
                if (hourlyRate.isInfinite == true) {
                    if (hourlyRate.isIterate == true) {
                        iterateFunction(
                            remainingMin,
                            hourlyRate.starting,
                            remainingMin,
                            hourlyRate.iterateEvery,
                            hourlyRate.price
                        );
                    } else {
                        amount += hourlyRate.price;
                    }
                } else {
                    if (hourlyRate.isIterate == true) {
                        iterateFunction(
                            remainingMin,
                            hourlyRate.starting,
                            hourlyRate.ending,
                            hourlyRate.iterateEvery,
                            hourlyRate.price
                        );
                    } else {
                        amount += hourlyRate.price;
                    }
                }
            }
        });
    }
    return amount
    // }
    // if (tariffType == '1') {
    //     totalDays = Math.ceil(duration / 1440);
    //     amount = totalDays * dailyRate;


    //     return amount;
    // }

    // return null;

}

function iterateFunction(duration, starting, ending, iterateEvery, price) {
    for (let i = starting; i <= ending; i += iterateEvery) {
        if (duration >= i) {
            amount += price;
        }
    }
}

// exports.checkMonthlyPass = async (req, res) => {
//     try {
//         console.log('checkMonthlyPass: ', req.body);
//         const parkingId = req.body.parkingId
//         const cardNumber = req.body.cardNumber
//         const type = req.body.type

//         const nfcCard = await NFCCard.findOne({ nfcNumber: cardNumber })

//         let passData = await MonthlyPass.findOne({ nfcCardId: nfcCard._id, isActive: true, parkingId, status: type != 'entry' })

//         if (passData) {

//             passData = JSON.parse(JSON.stringify(passData))
//             passData.isActive = (new Date(passData.endDate.split('-').reverse().join('-')) >= new Date())
//             // console.log('new Date(passData.en ', new Date(passData.endDate.split('-').reverse().join('-')));
//             // console.log('new Date(passData.en ', new Date());
//             // if(passData.isActive)
//             // passData.isActive = (new Date(new Date().toLocaleString().split(',')[0].split('/').reverse().join('-')+ 'T' + passData.fromTime)  >= new Date() &&   new Date() <= new Date(new Date().toLocaleString().split(',')[0].split('/').reverse().join('-')+ 'T' + passData.toTime))

//             // const nfcTransaction = await NFCTransaction.findOne({ monthlyPassId: passData._id })
//             const nfcTransaction = await NFCTransaction.aggregate([
//                 {
//                     '$match': {
//                         'monthlyPassId': mongoose.Types.ObjectId(passData._id)
//                     }
//                 }, {
//                     '$sort': {
//                         'updatedAt': -1
//                     }
//                 }, {
//                     '$limit': 1
//                 }
//             ])

//             console.log('passData: ', passData);


//             if (type != 'entry')
//                 if (nfcTransaction.length == 1 && nfcTransaction[0].exitTime)
//                     utils.commonResponce(
//                         res,
//                         201,
//                         "No entry found for this NFC",
//                     );
//                 else {

//                     passData.ticketId = nfcTransaction[0].ticketId
//                     passData.entryTime = nfcTransaction[0].entryTime

//                     utils.commonResponce(
//                         res,
//                         200,
//                         "Successfully fetched card",
//                         passData
//                     );
//                 }
//             else {
//                 utils.commonResponce(
//                     res,
//                     200,
//                     "Successfully fetched card",
//                     passData
//                 );
//             }



//         } else {

//             utils.commonResponce(
//                 res,
//                 201,
//                 type == 'entry' ? "Card already inside or card details not found" : "Card details not found",
//             );

//         }

//     } catch (error) {
//         console.log('error: ', error);
//         return res.status(500).json({
//             status: 500,
//             message: "Unexpected server error while fetching card",
//         });

//     }

// }

function isBeforeOrEqualDate(dateString) {
    // Convert the input date string to a Date object
    let inputDate = new Date(dateString);

    // Get today's date
    let today = new Date();
    today.setHours(0, 0, 0, 0); // Set hours, minutes, seconds, and milliseconds to 0 for comparison

    // Compare the input date with today's date
    return inputDate >= today;
}

function isBeforeTime(timeString) {
    // Get the current time
    // let currentTime = new Date();
    let currentTime = getCurrentTimeIST();
    let hours = currentTime.getHours();
    let minutes = currentTime.getMinutes();

    // Extract hours and minutes from the given time string
    let [givenHours, givenMinutes] = timeString.split(":").map(Number);

    // Compare the times
    if (hours < givenHours) {
        return true;
    } else if (hours === givenHours && minutes < givenMinutes) {
        return true;
    } else {
        return false;
    }
}

function isAfterTime(timeString) {
    // Get the current time
    // let currentTime = new Date();
    let currentTime = getCurrentTimeIST();
    let hours = currentTime.getHours();
    let minutes = currentTime.getMinutes();

    // Extract hours and minutes from the given time string
    let [givenHours, givenMinutes] = timeString.split(":").map(Number);

    // Compare the times
    if (hours > givenHours) {
        return true;
    } else if (hours === givenHours && minutes > givenMinutes) {
        return true;
    } else {
        return false;
    }
}

function getCurrentTimeIST() {
    // Get the current date in UTC
    let now = new Date();

    // UTC to IST offset: UTC+5:30 hours
    let ISTOffset = 5.5 * 60 * 60 * 1000;

    // Get the current UTC time and add the offset for IST
    let ISTTime = new Date(now.getTime() + ISTOffset);

    return ISTTime;
}


exports.checkMonthlyPass = async (req, res) => {
    try {
        console.log('checkMonthlyPass: ', req.body);
        const parkingId = req.body.parkingId
        const cardNumber = req.body.cardNumber
        const type = req.body.type
        const exitTime = req.body.exitTime

        const nfcCard = await NFCCard.findOne({ nfcNumber: cardNumber })

        let passData = await MonthlyPass.findOne({ nfcCardId: nfcCard._id, isActive: true, parkingId })

        if (passData) {

            if (passData.status == (type != 'entry')) { //check if vehicle already in or out based on entry or exit

                passData = JSON.parse(JSON.stringify(passData))

                if (type == 'entry') {
                    if (passData.isActive) {
                        passData.isActive = false

                        if (isBeforeOrEqualDate(new Date(passData.endDate.split('-').reverse().join('-')))) { //checks expiry date
                            if (!isBeforeTime(passData.fromTime)) //checks entry is not before entry time
                                if (!isAfterTime(passData.toTime)) //checks entry is not after exit time
                                    passData.isActive = true
                        }
                    }
                } else {
                    // BECAUSE NO USE OF isActive in exit - charge should be calculated by pass time and expiry date
                    passData.isActive = true
                }


                const nfcTransaction = await Ticket.aggregate([
                    {
                        '$match': {
                            'isNFCTicket': true,
                            'monthlyPassId': mongoose.Types.ObjectId(passData._id)
                        }
                    }, {
                        '$sort': {
                            'updatedAt': -1
                        }
                    }, {
                        '$limit': 1
                    }
                ])


                if (type != 'entry') {
                    if (nfcTransaction.length == 1 && nfcTransaction[0].exitTime || nfcTransaction.length == 0) {
                        utils.commonResponce(
                            res,
                            201,
                            "No entry found for this NFC",
                        );
                    }

                    else if (nfcTransaction.length == 1 && nfcTransaction[0].cancelledTicket) {
                        return res.status(201).json({
                            status: 201,
                            message: "Ticket has been cancelled",
                        });
                    } else if (nfcTransaction.length == 1 && nfcTransaction[0].fraudTicket) {
                        return res.status(201).json({
                            status: 201,
                            message: "Fraud ticket found",
                        });
                    }
                    else {

                        passData.ticketId = nfcTransaction[0].ticketId
                        passData.entryTime = nfcTransaction[0].entryTime

                        const charge = await calculateChargeForMonthlyPass(passData, exitTime)
                        passData.charge = charge

                        utils.commonResponce(
                            res,
                            200,
                            "Successfully fetched card",
                            passData
                        );
                    }

                } else {
                    utils.commonResponce(
                        res,
                        200,
                        "Successfully fetched card",
                        passData
                    );
                }



            } else {

                utils.commonResponce(
                    res,
                    201,
                    type == 'entry' ? "Card already inside" : "No entry found for this card",
                );

            }

        } else {

            utils.commonResponce(
                res,
                201,
                "Card details not found",
            );

        }

    } catch (error) {
        console.log('error: ', error);
        return res.status(500).json({
            status: 500,
            message: "Unexpected server error while fetching card",
        });

    }

}

async function calculateChargeForMonthlyPass(passData, exitTime) {
    let charge = 0;
    try {

        let lostTicket = false;

        const findParking = await Parking.findById(passData.parkingId)

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

            let startingOperationalHours = findParking.startingOperationalHours ? findParking.startingOperationalHours : '08:00:00'
            let endingOperationalHours = findParking.endingOperationalHours ? findParking.endingOperationalHours : '23:59:59'
            let startingNonOperationalHours = findParking.startingNonOperationalHours ? findParking.startingNonOperationalHours : '00:00:00'
            let endingNonOperationalHours = findParking.endingNonOperationalHours ? findParking.endingNonOperationalHours : '07:59:59'

            let _tariffData = tariffData.filter(t => t.tariffType == passData.vehicleType)[0].tariffData


            var entryTimeISO = moment.unix(passData.entryTime).tz("Asia/Calcutta").format("DD-MM-YYYY HH:mm:ss");
            var exitTimeISO = moment.unix(exitTime).tz("Asia/Calcutta").format("DD-MM-YYYY HH:mm:ss");
            var totalMin = Math.ceil((moment(exitTimeISO, "DD-MM-YYYY HH:mm:ss").diff(moment(entryTimeISO, "DD-MM-YYYY HH:mm:ss"))) / 60000)
            var mins = Math.ceil((moment(exitTimeISO, "DD-MM-YYYY HH:mm:ss").diff(moment(entryTimeISO, "DD-MM-YYYY HH:mm:ss"))) / 60000)
            let fine = lostTicket ? _tariffData.lostTicket : 0
            var daysdiff = moment(exitTimeISO, "DD-MM-YYYY HH:mm:ss").diff(moment(entryTimeISO, "DD-MM-YYYY HH:mm:ss"), 'days')

            let _entrytime = moment.unix(passData.entryTime).tz("Asia/Calcutta")
            let _entryDateEndingTime = moment(_entrytime.format("DD-MM-YYYY HH:mm:ss").split(' ')[0].split('-').reverse().join('-') + ' 23:59:59')
            var _exitTime = moment.unix(exitTime).tz("Asia/Calcutta");

            let passEndDate = new Date(passData.endDate.split('-').reverse().join('-'))
            passEndDate.setHours(parseInt(passData.toTime.split(':')[0]))
            passEndDate.setMinutes(parseInt(passData.toTime.split(':')[1]))


            if (_tariffData.tariffEnableForNonOperationalHours) {

                let entry_Time = new Date(_entrytime.format("MM-DD-YYYY HH:mm:ss"))
                let exit_Time = new Date(_exitTime.format("MM-DD-YYYY HH:mm:ss"))
                

                // calculation by days
                for (i = 0; i <= ((daysdiff * 2) + 2); i++) {

                    entry_Time.setMinutes(entry_Time.getMinutes() + 1)

                    const startingOperationalHoursDate = new Date(entry_Time.toISOString().split('T')[0] + ' ' + startingOperationalHours)

                    if (entry_Time < exit_Time)
                        if (entry_Time < startingOperationalHoursDate) {

                            let tillNonOprEndTime = new Date(entry_Time.toISOString().split('T')[0] + ' ' + endingNonOperationalHours)

                            if (tillNonOprEndTime > exit_Time)
                                tillNonOprEndTime = exit_Time
                                
                            let mins = getDifferenceInMinutes(entry_Time, tillNonOprEndTime)
                            // reduce monthly pass duration before expiry date
                            mins -= await countMinutesMatchingPassTimeSlot(formatDate(entry_Time), formatDate(tillNonOprEndTime), passData.fromTime, passData.toTime, passEndDate)

                            charge += calculateAmountBasedOnActiveTariff_v2(mins, _tariffData, false)

                            entry_Time = tillNonOprEndTime

                        } else {

                            let tillOprEndTime = new Date(entry_Time.toISOString().split('T')[0] + ' ' + endingOperationalHours)

                            if (tillOprEndTime > exit_Time)
                                tillOprEndTime = exit_Time
                                

                            let mins = getDifferenceInMinutes(entry_Time, tillOprEndTime)
                            // reduce monthly pass duration before expiry date
                            mins -= await countMinutesMatchingPassTimeSlot(formatDate(entry_Time), formatDate(tillOprEndTime), passData.fromTime, passData.toTime, passEndDate)

                            charge += calculateAmountBasedOnActiveTariff_v2(mins, _tariffData, true)

                            entry_Time = tillOprEndTime
                        }

                }
            } else {

                // reduce monthly pass duration before expiry date
                let monthlyPassDuration = await countMinutesMatchingPassTimeSlot(entryTimeISO, exitTimeISO, passData.fromTime, passData.toTime, passEndDate)

                charge += calculateAmountBasedOnActiveTariff_v2((totalMin - monthlyPassDuration), _tariffData, true)
            }


        } else {
            charge = 0
        }

    } catch (error) {
        console.log('error: ', error);
        charge = 0
    }

    return charge

}

function formatDate(date) {
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const year = date.getFullYear();
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    const seconds = String(date.getSeconds()).padStart(2, '0');

    return `${month}-${day}-${year} ${hours}:${minutes}:${seconds}`;
}


exports.createTransactionNFC = async (req, res) => {
    try {
        console.log('createTransactionNFC: ', req.body);

        const ticketId = req.body.ticketId
        const transactionType = req.body.transactionType
        const shiftId = req.body.shiftId
        const vehicleType = req.body.vehicleType
        const vehicleNo = req.body.vehicleNo
        const cancelledTicket = req.body.cancelledTicket
        const fraudTicket = req.body.fraudTicket
        const monthlyPassUsed = req.body.monthlyPassUsed
        const monthlyPassId = req.body.monthlyPassId

        let shiftData = await Shift.findById(shiftId)


        entryTime = ticketId.slice(-10);

        if (transactionType == 'entry') {

            await Ticket.create({
                ticketId: ticketId,

                entryTime: entryTime,
                shiftId: shiftId,
                parkingId: shiftData.parkingId,
                // amount: amount,
                // paymentType: paymentType,
                vehicleType: vehicleType,
                vehicleNo: vehicleNo,
                // lostTicket: lostTicket,
                // supervisorId: supervisorId
                isNFCTicket: monthlyPassUsed,
                monthlyPassId: monthlyPassId,
            })
            //increment parking ocuupancy
            await Parking.findByIdAndUpdate(shiftData.parkingId, {
                $inc: {
                    currentOccupiedSpaces: 1
                },
            })
            //increement issued tickets count in  the shift data
            await Shift.findByIdAndUpdate(shiftId, {
                $inc: {
                    totalTicketIssued: 1
                }
            })


            let isChecked = true
            if (cancelledTicket == 1)
                isChecked = await cancelTicketfunction(req.body)

            if (fraudTicket == 1)
                isChecked = await fraudTicketfunction(req.body)



            if (isChecked) {
                utils.commonResponce(
                    res,
                    200,
                    'Successfully created transaction',
                    {
                        shiftData, ticketId
                    }
                );
            } else {
                utils.commonResponce(
                    res,
                    201,
                    'Server issue while updating cancel or fraud ticket'
                );
            }


        }

        if (transactionType == 'exit') {

            const amount = req.body.amount;
            const paymentType = req.body.paymentType;
            const lostTicket = req.body.lostTicket;
            const supervisorId = req.body.supervisorId;
            const exitTime = req.body.exitTime;
            const supervisorPin = req.body.supervisorPin;
            // const exitTime = req.body.exitTime.substring(7);
            const remark = req.body.remark;

            var entryTimeISO = moment.unix(entryTime).tz("Asia/Calcutta").format("DD-MM-YYYY HH:mm:ss");
            var exitTimeISO = moment.unix(exitTime).tz("Asia/Calcutta").format("DD-MM-YYYY HH:mm:ss");
            var duration = Math.ceil((moment(exitTimeISO, "DD-MM-YYYY HH:mm:ss").diff(moment(entryTimeISO, "DD-MM-YYYY HH:mm:ss"))) / 60000)

            // const findSerialNumbers = await SerialNumbers.findOne({ parkingId: shiftData.parkingId })

            await Ticket.findOneAndUpdate({ ticketId: ticketId }, {
                exitTime, amount, duration,
                // receiptNo: findSerialNumbers.receiptNo,
                paymentType, lostTicket, exitShiftId: shiftId, remark
            })

            // started from here // mustaqeem

            // await SerialNumbers.findOneAndUpdate({ parkingId: shiftData.parkingId }, {
            //     $inc: { receiptNo: 1 }
            // }, { returnNewDocument: true })



            await Parking.findByIdAndUpdate(shiftData.parkingId, {
                $inc: {
                    currentOccupiedSpaces: -1
                },
            })

            let obj = {
                $inc: {
                    totalTicketCollected: 1,
                    totalLostTicketCollected: lostTicket ? 1 : 0,
                }, $push: {}
            }

            if (shiftData.totalCollection.filter(c => c.paymentType == paymentType).length <= 0)
                obj['$push']['totalCollection'] = [{
                    paymentType: paymentType,
                    amount: amount,
                }]
            else
                obj['$inc']['totalCollection.$[a].amount'] = amount

            await Shift.findByIdAndUpdate(shiftId, obj,
                {
                    arrayFilters: [
                        { "a.paymentType": paymentType },
                    ],
                }
            )

            // update nfc card
            if (monthlyPassUsed) {
                const passData = await MonthlyPass.findById(req.body.monthlyPassId)

                if (passData) {

                    await MonthlyPass.findByIdAndUpdate(req.body.monthlyPassId, { status: false })
                }
            }

            utils.commonResponce(
                res,
                200,
                'Successfully created transaction',
                {
                    shiftData
                }
            );

        }


    } catch (error) {
        console.log('error: ', error);
        return res.status(500).json({
            status: 500,
            message: "Unexpected server error while creating Transaction",
        });
    }
}

exports.registerFraudTicketNFC = async (req, res) => {
    try {
        console.log('registerFraudTicket NFC: ');
        console.log('req.body: ', req.body);

        const ticketId = req.body.ticketId
        const shiftId = req.body.shiftId

        const findTicket = await Ticket.findOne({ ticketId: ticketId })

        if (findTicket) {
            if (findTicket.exitTime) {

                utils.commonResponce(
                    res,
                    201,
                    "Payment already received for Ticket ID"
                );
            } else {

                await Ticket.findByIdAndUpdate(findTicket._id, {
                    fraudTicket: true
                }).then(async (createdParking) => {

                    // update shift and opretor here

                    const findShift = await Shift.findById(shiftId)


                    await Parking.findByIdAndUpdate(findShift.parkingId, {
                        $inc: {
                            currentOccupiedSpaces: -1,
                        },
                    })


                    utils.commonResponce(
                        res,
                        200,
                        "fraurd ticket NFC updated",
                        {
                            shiftData: findShift
                        }
                    );


                }).catch((err) => {

                    utils.commonResponce(
                        res,
                        201,
                        err.toString()
                    );
                });

            }
        }
        else {

            utils.commonResponce(
                res,
                201,
                "Ticket ID not found"
            );
        }

    } catch (error) {
        console.log('error: ', error);
        return res.status(500).json({
            status: 500,
            message: "Unexpected server error while creating Transaction",
        });
    }
}

exports.updateMonthlyPassEntry = async (req, res) => {
    try {
        console.log(' updateMonthlyPassEntry', req.body);
        const parkingId = req.body.parkingId
        const cardNumber = req.body.cardNumber

        // const nfcCard = await NFCCard.findOne({nfcNumber:cardNumber})
        const nfcCard = await NFCCard.findOne({ cardNumber })

        const passData = await MonthlyPass.findOne({ cardNumber, isActive: true, parkingId })

        if (passData) {

            await MonthlyPass.findOneAndUpdate({ nfcCardId: nfcCard._id, isActive: true, parkingId }, { status: true })

            utils.commonResponce(
                res,
                200,
                "Successfully updated card"
            );

        } else {

            utils.commonResponce(
                res,
                201,
                "Error Occured While updating card",
            );

        }

    } catch (error) {
        console.log('error: ', error);
        return res.status(500).json({
            status: 500,
            message: "Unexpected server error while creating Transaction",
        });

    }
}


// new tariff testing 
// calculateCharge_V2()

function calculateCharge_V2() {
    var tariff = {
        "name": "test tariff",
        "tariffData": [
            {
                "starting": 0,
                "ending": 10,
                "price": 0,
                "isIterate": false,
                "iterateEvery": 0,
                "iterrateType": '',
                "isInfinite": false,
            },
            {
                "starting": 10,
                "ending": 360,
                "price": 25,
                "isIterate": false,
                "iterateEvery": 0,
                "iterrateType": '',
                "isInfinite": false,
            },
            {
                "starting": 360,
                "ending": 720,
                "price": 50,
                "isIterate": false,
                "iterateEvery": 0,
                "iterrateType": '',
                "isInfinite": false,
            },
            {
                "starting": 720,
                "ending": 720,
                "price": 100,
                "isIterate": false,
                "iterateEvery": 0,
                "iterrateType": '',
                "isInfinite": true,
            }
        ],
        "tariffEnableForNonOperationalHours": true,
        "tariffDataNonOperationalHours": [
            {
                "starting": 0,
                "ending": 0,
                "price": 200,
                "isIterate": false,
                "iterateEvery": 0,
                "iterrateType": '',
                "isInfinite": true,
            }
        ]
    }

    let entryTime = '1691429277'
    let exitTime = '1691540877'
    let lostTicket = false
    let startingOperationalHours = '08:00:00'
    let endingOperationalHours = '23:59:59'
    let startingNonOperationalHours = '00:00:00'
    let endingNonOperationalHours = '07:59:59'
    let tariffEnableForNonOperationalHours = true

    var entryTimeISO = moment.unix(entryTime).tz("Asia/Calcutta").format("DD-MM-YYYY HH:mm:ss");
    var exitTimeISO = moment.unix(exitTime).tz("Asia/Calcutta").format("DD-MM-YYYY HH:mm:ss");
    var totalMin = Math.ceil((moment(exitTimeISO, "DD-MM-YYYY HH:mm:ss").diff(moment(entryTimeISO, "DD-MM-YYYY HH:mm:ss"))) / 60000)
    var mins = Math.ceil((moment(exitTimeISO, "DD-MM-YYYY HH:mm:ss").diff(moment(entryTimeISO, "DD-MM-YYYY HH:mm:ss"))) / 60000)
    let charge = 0
    let fine = lostTicket ? tariff.lostTicket : 0
    var daysdiff = moment(exitTimeISO, "DD-MM-YYYY HH:mm:ss").diff(moment(entryTimeISO, "DD-MM-YYYY HH:mm:ss"), 'days')

    let _entrytime = moment.unix(entryTime).tz("Asia/Calcutta")
    let _entryDateEndingTime = moment(_entrytime.format("DD-MM-YYYY HH:mm:ss").split(' ')[0].split('-').reverse().join('-') + ' 23:59:59')
    var _exitTime = moment.unix(exitTime).tz("Asia/Calcutta");


    if (tariffEnableForNonOperationalHours) {

        let entry_Time = new Date(_entrytime.format("MM-DD-YYYY HH:mm:ss"))
        let exit_Time = new Date(_exitTime.format("MM-DD-YYYY HH:mm:ss"))

        // calculation by days
        for (i = 0; i <= (daysdiff * 2) + 2; i++) {

            // this stucture works good with 0 to 24 daily start and end but when day start at 6 and end at 5:59 then it does not work

            // if (moment(_entrytime).isBefore(_exitTime, 'day')) {
            //     console.log('before days -----');

            //     var prev_mins = Math.ceil((moment(_entryDateEndingTime, "DD-MM-YYYY HH:mm:ss").diff(moment(_entrytime, "DD-MM-YYYY HH:mm:ss"))) / 60000)

            //     calculateChargeBaseOnOperationalAndNonOperationalHours(prev_mins, false, _entrytime, _exitTime)
            //     _entrytime.add(1, 'days')
            //     _entrytime = moment(_entrytime.format("DD-MM-YYYY HH:mm:ss").split(' ')[0].split('-').reverse().join('-') + ' 00:00:00')
            //     _entryDateEndingTime.add(1, 'days')

            // }
            // else if (moment(_entrytime).isSame(_exitTime, 'day')) {
            //     console.log('end day -----');

            //     var prev_mins = Math.ceil((moment(_entryDateEndingTime, "DD-MM-YYYY HH:mm:ss").diff(moment(_entrytime, "DD-MM-YYYY HH:mm:ss"))) / 60000)
            //     calculateChargeBaseOnOperationalAndNonOperationalHours(prev_mins, lostTicket, _entrytime, _exitTime)

            //     const _exitDateStaringTime = moment(_exitTime.format("DD-MM-YYYY HH:mm:ss").split(' ')[0].split('-').reverse().join('-') + ' 00:00:00').format("DD-MM-YYYY HH:mm:ss");
            //     mins = Math.ceil((moment(exitTimeISO, "DD-MM-YYYY HH:mm:ss").diff(moment(_exitDateStaringTime, "DD-MM-YYYY HH:mm:ss"))) / 60000)
            //     break
            // }



            entry_Time.setMinutes(entry_Time.getMinutes() + 1)
            const startingOperationalHoursDate = new Date(entry_Time.toISOString().split('T')[0] + ' ' + startingOperationalHours)

            if (entry_Time < exit_Time)
                if (entry_Time < startingOperationalHoursDate) {

                    let tillNonOprEndTime = new Date(entry_Time.toISOString().split('T')[0] + ' ' + endingNonOperationalHours)

                    if (tillNonOprEndTime > exit_Time)
                        tillNonOprEndTime = exit_Time

                    let mins = getDifferenceInMinutes(entry_Time, tillNonOprEndTime)
                    charge += calculateAmountBasedOnActiveTariff_v2(mins, tariff, false)

                    entry_Time = tillNonOprEndTime

                } else {

                    let tillOprEndTime = new Date(entry_Time.toISOString().split('T')[0] + ' ' + endingOperationalHours)

                    if (tillOprEndTime > exit_Time)
                        tillOprEndTime = exit_Time

                    let mins = getDifferenceInMinutes(entry_Time, tillOprEndTime)
                    charge += calculateAmountBasedOnActiveTariff_v2(mins, tariff, true)

                    entry_Time = tillOprEndTime
                }

        }
    } else {
        charge += calculateAmountBasedOnActiveTariff_v2(totalMin, tariff, true)
    }

    // calculation charge by hours daily
    function calculateChargeBaseOnOperationalAndNonOperationalHours(mins, lostTicket, entryTime, exitTime) {

        var entryTimeISO = entryTime;
        var exitTimeISO = exitTime;

        // let startingOperationalTime = moment(entryTime.format("DD-MM-YYYY HH:mm:ss").split(' ')[0].split('-').reverse().join('-') + ' 00:00:00')
        // let endingOperationalTime = moment(entryTime.format("DD-MM-YYYY HH:mm:ss").split(' ')[0].split('-').reverse().join('-') + ' 11:59:59')
        // let startingNonOperationalTime = moment(entryTime.format("DD-MM-YYYY HH:mm:ss").split(' ')[0].split('-').reverse().join('-') + ' 12:00:00')
        // let endingNonOperationalTime = moment(entryTime.format("DD-MM-YYYY HH:mm:ss").split(' ')[0].split('-').reverse().join('-') + ' 23:59:59')
        let startingOperationalTime = moment(entryTime.format("DD-MM-YYYY HH:mm:ss").split(' ')[0].split('-').reverse().join('-') + ' ' + startingOperationalHours)
        let endingOperationalTime = moment(entryTime.format("DD-MM-YYYY HH:mm:ss").split(' ')[0].split('-').reverse().join('-') + ' ' + endingOperationalHours)
        let startingNonOperationalTime = moment(entryTime.format("DD-MM-YYYY HH:mm:ss").split(' ')[0].split('-').reverse().join('-') + ' ' + startingNonOperationalHours)
        let endingNonOperationalTime = moment(entryTime.format("DD-MM-YYYY HH:mm:ss").split(' ')[0].split('-').reverse().join('-') + ' ' + endingNonOperationalHours)

        if (tariffEnableForNonOperationalHours) {
            var minsInOperationalHours = 0;
            var minsInNonOperationalHours = 0;

            console.log('entryTimeISO: ', entryTimeISO);
            console.log('startingNonOperationalTime: ', startingNonOperationalTime);
            if (moment(entryTimeISO).isBefore(startingNonOperationalTime, 'minute')) {

                if (moment(exitTimeISO).isBefore(endingOperationalTime, 'minute'))
                    minsInOperationalHours = Math.ceil((moment(exitTimeISO.format("DD-MM-YYYY HH:mm:ss"), "DD-MM-YYYY HH:mm:ss").diff(moment(entryTimeISO.format("DD-MM-YYYY HH:mm:ss"), "DD-MM-YYYY HH:mm:ss"))) / 60000)
                else
                    minsInOperationalHours = Math.ceil((moment(endingOperationalTime.format("DD-MM-YYYY HH:mm:ss"), "DD-MM-YYYY HH:mm:ss").diff(moment(entryTimeISO.format("DD-MM-YYYY HH:mm:ss"), "DD-MM-YYYY HH:mm:ss"))) / 60000)

                if (!moment(exitTimeISO).isBefore(startingNonOperationalTime, 'minute'))
                    if (moment(startingNonOperationalTime).isSame(exitTimeISO, 'day'))
                        minsInNonOperationalHours = Math.ceil((moment(exitTimeISO.format("DD-MM-YYYY HH:mm:ss"), "DD-MM-YYYY HH:mm:ss").diff(moment(startingNonOperationalTime.format("DD-MM-YYYY HH:mm:ss"), "DD-MM-YYYY HH:mm:ss"))) / 60000)
                    else
                        minsInNonOperationalHours = Math.ceil((moment(endingNonOperationalTime.format("DD-MM-YYYY HH:mm:ss"), "DD-MM-YYYY HH:mm:ss").diff(moment(startingNonOperationalTime.format("DD-MM-YYYY HH:mm:ss"), "DD-MM-YYYY HH:mm:ss"))) / 60000)
            } else {

                console.log('exit time is before 12', moment(exitTimeISO).isBefore(startingNonOperationalTime, 'minute'));

                if (!moment(exitTimeISO).isBefore(startingNonOperationalTime, 'minute'))
                    if (moment(startingNonOperationalTime).isSame(exitTimeISO, 'day'))
                        minsInNonOperationalHours = Math.ceil((moment(exitTimeISO.format("DD-MM-YYYY HH:mm:ss"), "DD-MM-YYYY HH:mm:ss").diff(moment(entryTimeISO.format("DD-MM-YYYY HH:mm:ss"), "DD-MM-YYYY HH:mm:ss"))) / 60000)
                    else
                        minsInNonOperationalHours = Math.ceil((moment(endingNonOperationalTime.format("DD-MM-YYYY HH:mm:ss"), "DD-MM-YYYY HH:mm:ss").diff(moment(entryTimeISO.format("DD-MM-YYYY HH:mm:ss"), "DD-MM-YYYY HH:mm:ss"))) / 60000)
            }

            charge += calculateAmountBasedOnActiveTariff_v2(minsInOperationalHours, tariff, lostTicket, true)
            charge += calculateAmountBasedOnActiveTariff_v2(minsInNonOperationalHours, tariff, lostTicket, true)

        } else {
            charge += calculateAmountBasedOnActiveTariff_v2(mins, tariff, lostTicket, true)
            console.log('mins', mins);
            console.log('operational', true);
        }

        // charge += calculateAmountBasedOnActiveTariff_v2(mins, tariff, lostTicket, isOperationalHours)
    }

    console.log('charge', charge);
}

function getDifferenceInMinutes(date1, date2) {
    const diffInMs = Math.abs(date2 - date1);
    return parseInt((diffInMs / (1000 * 60)))
}

// calculate Minutes Within TimeSlab for designa monthlyPass over time charge
async function countMinutesMatchingPassTimeSlot(time1, time2, starting, ending, passExpiryDate) {
    const parseDateTime = (dateTime) => {
        const [date, time] = dateTime.split(' ');
        // const [year, month, day] = date.split('-');
        const [month, day, year] = date.split('-');
        const [hour, min, sec] = time.split(':');
        return { year: parseInt(year), month: parseInt(month) - 1, day: parseInt(day), hour: parseInt(hour), min: parseInt(min), sec: parseInt(sec) };
    };

    const startTime = parseDateTime(time1);
    const endTime = parseDateTime(time2);
    const startSlot = parseDateTime(`2000-01-01 ${starting}:00`);
    const endSlot = parseDateTime(`2000-01-01 ${ending}:00`);

    let count = 0;
    let current = new Date(startTime.year, startTime.month, startTime.day, startTime.hour, startTime.min, startTime.sec);

    for (
        let current = new Date(startTime.year, startTime.month, startTime.day, startTime.hour, startTime.min, startTime.sec);
        current <= new Date(endTime.year, endTime.month, endTime.day, endTime.hour, endTime.min, endTime.sec);
        current.setMinutes(current.getMinutes() + 1)

    ) {

        const currentHour = current.getHours();
        const currentMin = current.getMinutes();

        if (
            (currentHour > startSlot.hour || (currentHour === startSlot.hour && currentMin >= startSlot.min)) &&
            (currentHour < endSlot.hour || (currentHour === endSlot.hour && currentMin <= endSlot.min))
        ) {
            if (passExpiryDate > current) // if current Time is after expiry it will be charged
                count++;
        }
    }

    return count;
}

function calculateAmountBasedOnActiveTariff_v2(duration, _tariffData, isOperationalHours) {
    let amount = 0

    _tariffData = JSON.parse(JSON.stringify(_tariffData))
    // if lost ticket then check all trasactions of vehicle to apply each day tariff

    if (_tariffData) {

        if (isOperationalHours)
            _tariffData.tariffData.map(tariffData => {
                if (duration >= tariffData.starting)
                    if (tariffData.isInfinite == true)
                        if (tariffData.isIterate == true)
                            iterateFunction(tariffData.starting, duration, tariffData.iterateEvery, tariffData.price, isOperationalHours)
                        else
                            amount = tariffData.price //taking only one slab for opretional hours //added 04-10-2023
                    // amount += tariffData.price
                    else
                        if (tariffData.isIterate == true)
                            iterateFunction(tariffData.starting, tariffData.ending, tariffData.iterateEvery, tariffData.price, isOperationalHours)
                        else
                            amount = tariffData.price //taking only one slab for opretional hours //added 04-10-2023
                // amount += tariffData.price
            })
        else
            _tariffData.tariffDataNonOperationalHours.map(tariffData => {
                if (duration >= tariffData.starting)
                    if (tariffData.isInfinite == true)
                        if (tariffData.isIterate == true)
                            iterateFunction(tariffData.starting, duration, tariffData.iterateEvery, tariffData.price)
                        else
                            amount = tariffData.price
                            // amount += tariffData.price
                    else
                        if (tariffData.isIterate == true)
                            iterateFunction(tariffData.starting, tariffData.ending, tariffData.iterateEvery, tariffData.price)
                        else
                            amount = tariffData.price
                            // amount += tariffData.price
            })


    }

    function iterateFunction(starting, ending, iterateEvery, price, isOperationalHours) {
        if (isOperationalHours)
            amount = 0 //initially making it zero //added 04-10-2023

        for (let i = starting; i <= ending; i += iterateEvery) {
            if (duration >= i) {
                amount += price
            }
        }
    }

    return amount
}
