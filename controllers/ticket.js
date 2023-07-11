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

exports.createTransaction = async(req,res)=>{
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

        let shiftData = await Shift.findById(transactions[0]?.shiftId)

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
    let statusCode = 200;
    let message = '';
    try {

        const ticketId = transactionData.ticketId
        const transactionType = transactionData.transactionType
        const shiftId = transactionData.shiftId
        const vehicleType = transactionData.vehicleType
        const vehicleNo = transactionData.vehicleNo
        if(transactionType == "exit"){
           
        }
       

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
            if (transactionType == 'entry'){
                await Ticket.create({
                    ticketId: ticketId,
                    
                    entryTime: entryTime,
                    shiftId: shiftId,
                    parkingId:shiftData.parkingId,
                    // amount: amount,
                    // paymentType: paymentType,
                    vehicleType: vehicleType,
                    vehicleNo: vehicleNo,
                    // lostTicket: lostTicket,
                    // supervisorId: supervisorId
                })
                //increment parking ocuupancy
                await Parking.findByIdAndUpdate(shiftData.parkingId, {
                    $inc: {
                        currentOccupiedSpaces: 1
                    },
                })
                //increement issued tickets count in  the shift data
                await Shift.findByIdAndUpdate(shiftId, { $inc: {
                    totalTicketIssued: 1}},
                    
                )
                statusCode = 200
                message = 'Successfully created transaction'
                return {
                    statusCode, message
                }

            }

            if(transactionType == 'exit')
            {
                const amount = transactionData.amount;
                const paymentType = transactionData.paymentType;
                const lostTicket = transactionData.lostTicket;
                const supervisorId = transactionData.supervisorId;
                const exitTime = req.body.exitTime;

                await Ticket.findOneAndUpdate({ticketId:ticketId},{
                    exitTime:exitTime,amount:amount,
                })
            }
        // }

      






        //     await Transaction.create({
        //         ticketId: ticketId,
        //         transactionType: transactionType,
        //         time: currentTime,
        //         shiftId: shiftId,
        //         amount: amount,
        //         paymentType: paymentType,
        //         vehicleType: vehicleType,
        //         vehicleNo: vehicleNo,
        //         lostTicket: lostTicket,
        //         supervisorId: supervisorId
        //     }).then(async (createdParking) => {

        //         // update shift and opretor here

        //         const findShift = await Shift.findById(shiftId)

        //         await Parking.findByIdAndUpdate(findShift.parkingId, {
        //             $inc: {
        //                 currentOccupiedSpaces: transactionType == 'entry' ? 1 : -1,
        //             },
        //         })

        //         let obj = {
        //             $inc: {
        //                 totalTicketIssued: transactionType != 'exit' ? 1 : 0,
        //                 totalTicketCollected: transactionType == 'exit' ? 1 : 0,
        //                 totalLostTicketCollected: lostTicket ? transactionType == 'exit' ? 1 : 0 : 0,
        //             },
        //             $push: {}
        //         }

        //         if (transactionType == 'exit') {

        //             if (findShift?.totalCollection?.filter(c => c.paymentType == paymentType).length <= 0)
        //                 obj['$push']['totalCollection'] = [{
        //                     paymentType: paymentType,
        //                     amount: amount,
        //                 }]
        //             else
        //                 obj['$inc']['totalCollection.$[a].amount'] = amount
        //         }

        //         await Shift.findByIdAndUpdate(shiftId, obj,
        //             {
        //                 arrayFilters: [
        //                     { "a.paymentType": paymentType },
        //                 ],
        //             }
        //         )


        //         // update supervisor pin because lost ticket transaction is valid online
        //         if (lostTicket && !supervisorId) {
        //             // get All pincode
        //             const existingSupervisorPinParkiongWise = await Opretor.aggregate([
        //                 {
        //                     '$match': {
        //                         parkingId: mongoose.Types.ObjectId(findShift.parkingId),
        //                         isSupervisor: true
        //                     }
        //                 }, {
        //                     '$project': {
        //                         supervisorPin: 1,
        //                         _id: 0
        //                     }
        //                 }
        //             ])

        //             supervisorPin = getRandomNumber(existingSupervisorPinParkiongWise.map(o => o.supervisorPin))
        //             if (supervisorPin)
        //                 await Opretor.findByIdAndUpdate(supervisorId, { supervisorPin })
        //         }


        //         statusCode = 200
        //         message = 'Successfully created transaction'

        //     }).catch((err) => {
        //         statusCode = 201
        //         message = err.toString()
        //     });
        // }

    } catch (error) {
        statusCode = 201
        message = error.toString()
        return {
            statusCode, message
        }
    }

    
}