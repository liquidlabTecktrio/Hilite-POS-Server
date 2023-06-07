const Transaction = require("../models/Transaction");
const Tariff = require("../models/Tariff");
const Shift = require("../models/Shift");
const Opretor = require("../models/Opretor");
const Parking = require("../models/Parking");
const utils = require("./utils")
const Bluebird = require("bluebird");
const mongoose = require("mongoose");
const moment = require("moment-timezone");

exports.createTransaction = async (req, res) => {
    try {

        const ticketId = req.body.ticketId
        const transactionType = req.body.transactionType
        const shiftId = req.body.shiftId
        const vehicleType = req.body.vehicleType
        const amount = req.body.amount
        const paymentType = req.body.paymentType


        var currentTime = moment.unix(Date.now() / 1000).tz("Asia/Calcutta").format("DD-MM-YYYY HH:mm:ss");

        await Transaction.create({
            ticketId: ticketId,
            transactionType: transactionType,
            time: currentTime,
            shiftId: shiftId,
            amount: amount,
            paymentType: paymentType,
            vehicleType: vehicleType,
        }).then(async (createdParking) => {

            // update shift and opretor here

            const findShift = await Shift.findById(shiftId)

            let obj = {
                $inc: {
                    totalTicketIssued: transactionType != 'exit' ? 1 : 0,
                    totalTicketCollected: transactionType == 'exit' ? 1 : 0,
                }
            }

            if (transactionType == 'exit') {

                if (findShift?.totalCollection?.filter(c => c.paymentType == transactionType).length <= 0)
                    obj['$push']['totalCollection'] = [{
                        paymentType: transactionType,
                        amount: amount,
                    }]
                else
                    obj['inc']['totalCollection.$[a].amount'] = amount
            }

            await Shift.findByIdAndUpdate(shiftId, obj,
                {
                    arrayFilters: [
                        { "a.paymentType": transactionType },
                    ],
                }
            )


            await Shift.findById(shiftId).then(async (shiftData) => {

                utils.commonResponce(
                    res,
                    200,
                    "Successfully created transaction",
                    {
                        shiftData: shiftData
                      }
                );

            }).catch((err) => {
                utils.commonResponce(
                    res,
                    201,
                    "Error Occured While fetching Transaction",
                    err.toString()
                );
            });

        }).catch((err) => {
            utils.commonResponce(
                res,
                201,
                "Error Occured While creating Transaction",
                err.toString()
            );
        });

    } catch {
        return res.status(500).json({
            status: 500,
            message: "Unexpected server error while creating Transaction",
        });
    }
}

exports.calculatecCharge = async (req, res) => {
    try {

        const entryTime = req.body.entryTime
        const shiftId = req.body.shiftId
        const vehicleType = req.body.vehicleType

        var currentTime = moment.unix(Date.now() / 1000).tz("Asia/Calcutta").format("DD-MM-YYYY HH:mm:ss");

        var mins = Math.ceil((moment(currentTime, "DD-MM-YYYY HH:mm:ss").diff(moment(entryTime, "DD-MM-YYYY HH:mm:ss"))) / 60000)

        const findShift = await Shift.findById(shiftId)

        if (findShift) {
            const findParking = await Parking.findById(findShift.parkingId)

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


                var currentTime = moment.unix(Date.now() / 1000).tz("Asia/Calcutta").format("DD-MM-YYYY HH:mm:ss");
                var mins = Math.ceil((moment(currentTime, "DD-MM-YYYY HH:mm:ss").diff(moment(entryTime, "DD-MM-YYYY HH:mm:ss"))) / 60000)

                let charge = 0

                switch (vehicleType) {
                    case 2:
                        charge = calculateAmountBasedOnActiveTariff(mins, tariffData.filter(t => t.tariffType == 2)[0].tariffData)
                        break;
                    case 3:
                        charge = calculateAmountBasedOnActiveTariff(mins, tariffData.filter(t => t.tariffType == 3)[0].tariffData)
                        break;
                    case 4:
                        charge = calculateAmountBasedOnActiveTariff(mins, tariffData.filter(t => t.tariffType == 3)[0].tariffData)
                        break;
                    default:
                        charge = calculateAmountBasedOnActiveTariff(mins, tariffData.filter(t => t.tariffType == 2)[0].tariffData)
                }


                utils.commonResponce(
                    res,
                    200,
                    "Successfully calculated charge",
                    {
                        stayDuration: mins,
                        charge: charge
                    }
                );



            } else {
                return res.status(200).json({
                    status: 200,
                    message: "parking not found",
                });
            }

        } else {
            return res.status(200).json({
                status: 200,
                message: "shift not found",
            });
        }

    } catch (error) {
        console.log('error: ', error);
        return res.status(500).json({
            status: 500,
            message: "Unexpected server error while calculating charge",
        });
    }
}

function calculateAmountBasedOnActiveTariff(duration, tariffData) {
    let amount = 0

    if (tariffData)
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
    return amount
}