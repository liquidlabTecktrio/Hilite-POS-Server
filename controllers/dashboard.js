const Parking = require("../models/Parking");
const Opretor = require("../models/Opretor");
const Shift = require("../models/Shift");
const utils = require("./utils")
const Bluebird = require("bluebird");
const mongoose = require("mongoose");
const PosHeartbeat = require("../models/PosHeartbeat");
const parkingController = require("../controllers/parking");
const { WebSocket, WebSocketServer } = require('ws');
const designaPOS = require("../designaPOS");
const MonthlyPass = require("../models/MonthlyPass");

exports.getDashboardData = async (req, res) => {
    try {

        let parkings = JSON.parse(JSON.stringify(await Parking.find()))


        await Bluebird.each(parkings, async (parking, index) => {
            const cancelIncomeGraph = index == 0 ? false : true
            if(index == 0)
            parking.graphData = await parkingController.getParkingDataForGraphFunction({ parkingId: parking._id, period: 'week', cancelIncomeGraph })
            else
            parking.graphData = {}

            parking.monthlyAndDailyRevenueData = await parkingController.getParkingMonthlyAndDailyRevenueDataForGraphFunction({ parkingId: parking._id})

        })

        const opretors = await Opretor.find()
        // const totalIncome = await Opretor.find()
// console.log(new Date());
var date = new Date();
var fromDate = new Date(date.getFullYear(), date.getMonth(), 1);
var toDate = new Date(date.getFullYear(), date.getMonth() + 1, 0);
// console.log("firstDay",firstDay)
// console.log("lastDay",lastDay)
        // const fromDate = new Date(new Date(new Date().setDate(1)).setHours(0));
        // let toDate = new Date(new Date(new Date().setDate(new Date(new Date().getFullYear(), new Date().getMonth()+1, 0).getDate())).setHours(24));

        // console.log("fromDate",fromDate),
        // console.log("toDate",toDate)

        let totalIncome = await Shift.aggregate(
            [
                {
                    '$addFields': {
                        'shiftEndDateISO': {
                            '$dateFromString': {
                                'dateString': '$shiftStopTime',
                                'format': "%d-%m-%Y %H:%M:%S"
                            }
                        }
                    }
                },
                // {
                //     '$match': {
                //         'shiftEndDateISO': {
                //             '$gte': fromDate,
                //             '$lte': toDate,
    
                //         }
                //     }
                // },
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
        let totalMonthlyIncome = await Shift.aggregate(
            [
                {
                    '$addFields': {
                        'shiftEndDateISO': {
                            '$dateFromString': {
                                'dateString': '$shiftStopTime',
                                'format': "%d-%m-%Y %H:%M:%S"
                            }
                        }
                    }
                },
                {
                    '$match': {
                        'shiftEndDateISO': {
                            '$gte': fromDate,
                            '$lte': toDate,
    
                        }
                    }
                },
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

        const monthlyPassRevenueData = await MonthlyPass.aggregate([
           {
                '$match': {
                    'createdAt': {
                        '$gte': fromDate,
                        '$lte': toDate,

                    }
                }
            },
            {
                '$group': {
                    "_id": null,
                    "totalSeasonParkerRevenue": {
                        "$sum": "$amount"
                    }
                }
            },
            {
                '$project': {
                    "_id": 0
                }
            }
        ])

        const passRevenueData = await MonthlyPass.aggregate([
            // {
            //      '$match': {
            //          'createdAt': {
            //              '$gte': fromDate,
            //              '$lte': toDate,
 
            //          }
            //      }
            //  },
             {
                 '$group': {
                     "_id": null,
                     "totalSeasonParkerRevenue": {
                         "$sum": "$amount"
                     }
                 }
             },
             {
                 '$project': {
                     "_id": 0
                 }
             }
         ])

        if (totalIncome.length > 0)
            totalIncome = totalIncome[0].totalAmount
        else
            totalIncome = 0
        if (totalMonthlyIncome.length > 0)
        totalMonthlyIncome = totalMonthlyIncome[0].totalAmount
        else
        totalMonthlyIncome = 0

        // if (monthlyPassRevenueData.length > 0)
        //     if (monthlyPassRevenueData[0].totalSeasonParkerRevenue > 0) {
        //         totalMontlyIncome += monthlyPassRevenueData[0].totalSeasonParkerRevenue
        //     }
        
        // if (passRevenueData.length > 0)
        //     if (passRevenueData[0].totalSeasonParkerRevenue > 0) {
        //         totalIncome += passRevenueData[0].totalSeasonParkerRevenue
        //     }

        let pastTwoWeeksIncomeDetails = []
        const twoWeekDates = getDates('twoWeeks')

        for (j = 0; j <= twoWeekDates.length - 1; j++) {
            pastTwoWeeksIncomeDetails.push(
                await this.parkingAggregateForGraph(twoWeekDates[j])
            );
        }

        let thisWeekTotalIncome = 0;
        let lastWeekTotalIncome = 0;

        let pastTwoWeeksIncomeDeta = [
            {
                name: 'Net Profit',
                data: twoWeekDates.map(d => 0)
            }
        ]

        pastTwoWeeksIncomeDetails.map((d, index) => {

            const total = d.shiftData.reduce((allTotal, shift) => {
                const sum = shift.totalCollection.reduce((total, collected) => {
                    return total + collected.amount;
                }, 0);
                return allTotal + sum;
            }, 0)

            if (index < 7) {
                // lastWeekTotalIncome += 100
                // pastTwoWeeksIncomeDeta[0].data[index] += 100
                lastWeekTotalIncome += total
                pastTwoWeeksIncomeDeta[0].data[index] += total
            }
            else {
                thisWeekTotalIncome += total
                pastTwoWeeksIncomeDeta[0].data[index] += total
            }
        })

        // const posHeartbeats = await PosHeartbeat.find()


        // designaPOS.wss.clients.forEach(function each(client) {

        //     if (client.readyState === WebSocket.OPEN) {

        //         client.send(JSON.stringify({
        //             parkings, opretors,
        //             totalIncome,
        //             pastTwoWeeksIncomeSeries: pastTwoWeeksIncomeDeta,
        //             pastTwoWeeksIncomeCategories: twoWeekDates.map(d => d.category),
        //             thisWeekTotalIncome,
        //             lastWeekTotalIncome,
        //             posHeartbeats
        //         }));
        //     }
        // })

        // console.log('dashboard sent');

        utils.commonResponce(
            res,
            200,
            "Successfully fetched data",
            {
                parkings, opretors,
                totalIncome,
                totalMonthlyIncome,
                monthlyPassRevenue:monthlyPassRevenueData.length > 0?monthlyPassRevenueData[0].totalSeasonParkerRevenue :0,
                totalPassRevenue:passRevenueData.length > 0?passRevenueData[0].totalSeasonParkerRevenue :0,
                pastTwoWeeksIncomeSeries: pastTwoWeeksIncomeDeta,
                pastTwoWeeksIncomeCategories: twoWeekDates.map(d => d.category),
                thisWeekTotalIncome,
                lastWeekTotalIncome,
                // posHeartbeats
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

async function getDashboardDataFunctionReal(requestData) {
    try {

        let parkings = JSON.parse(JSON.stringify(await Parking.find()))

        await Bluebird.each(parkings, async (parking, index) => {

            parking.graphData = await parkingController.getParkingDataForGraphFunction({ parkingId: parking._id, period: 'week' })

            parking.monthlyAndDailyRevenueData = await parkingController.getParkingMonthlyAndDailyRevenueDataForGraphFunction({ parkingId: parking._id})

        })

        const opretors = await Opretor.find()
        // const totalIncome = await Opretor.find()
       
        // const fromDate = new Date(new Date(new Date().setDate(1)).setHours(0));
        // let toDate = new Date(new Date(new Date().setDate(new Date(new Date().getFullYear(), new Date().getMonth()+1, 0).getDate())).setHours(24));

        var date = new Date();
var fromDate = new Date(date.getFullYear(), date.getMonth(), 1);
var toDate = new Date(date.getFullYear(), date.getMonth() + 1, 0);

        let totalIncome = await Shift.aggregate(
            [
                {
                    '$addFields': {
                        'shiftEndDateISO': {
                            '$dateFromString': {
                                'dateString': '$shiftStopTime',
                                'format': "%d-%m-%Y %H:%M:%S"
                            }
                        }
                    }
                }, 
                // {
                //     '$match': {
                //         'shiftEndDateISO': {
                //             '$gte': fromDate,
                //             '$lte': toDate,
    
                //         }
                //     }
                // },
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
        let totalMonthlyIncome = await Shift.aggregate(
            [
                {
                    '$addFields': {
                        'shiftEndDateISO': {
                            '$dateFromString': {
                                'dateString': '$shiftStopTime',
                                'format': "%d-%m-%Y %H:%M:%S"
                            }
                        }
                    }
                }, 
                {
                    '$match': {
                        'shiftEndDateISO': {
                            '$gte': fromDate,
                            '$lte': toDate,
    
                        }
                    }
                },
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

        const monthlyPassRevenueData = await MonthlyPass.aggregate([
             {
                '$match': {
                    'createdAt': {
                        '$gte': fromDate,
                        '$lte': toDate,

                    }
                }
            },
            {
                '$group': {
                    "_id": null,
                    "totalSeasonParkerRevenue": {
                        "$sum": "$amount"
                    }
                }
            },
            {
                '$project': {
                    "_id": 0
                }
            }
        ])
        const passRevenueData = await MonthlyPass.aggregate([
            //  {
            //     '$match': {
            //         'createdAt': {
            //             '$gte': fromDate,
            //             '$lte': toDate,

            //         }
            //     }
            // },
            {
                '$group': {
                    "_id": null,
                    "totalSeasonParkerRevenue": {
                        "$sum": "$amount"
                    }
                }
            },
            {
                '$project': {
                    "_id": 0
                }
            }
        ])

        if (totalIncome.length > 0)
            totalIncome = totalIncome[0].totalAmount
        else
            totalIncome = 0

        if (totalMonthlyIncome.length > 0)
            totalMonthlyIncome = totalMonthlyIncome[0].totalAmount
        else
            totalMonthlyIncome = 0

        // if (monthlyPassRevenueData.length > 0)
        //     if (monthlyPassRevenueData[0].totalSeasonParkerRevenue > 0) {
        //         totalIncome += monthlyPassRevenueData[0].totalSeasonParkerRevenue
        //     }


        let pastTwoWeeksIncomeDetails = []
        const twoWeekDates = getDates('twoWeeks')

        for (j = 0; j <= twoWeekDates.length - 1; j++) {
            pastTwoWeeksIncomeDetails.push(
                await this.parkingAggregateForGraph(twoWeekDates[j])
            );
        }

        let thisWeekTotalIncome = 0;
        let lastWeekTotalIncome = 0;

        let pastTwoWeeksIncomeDeta = [
            {
                name: 'Net Profit',
                data: twoWeekDates.map(d => 0)
            }
        ]

        pastTwoWeeksIncomeDetails.map((d, index) => {

            const total = d.shiftData.reduce((allTotal, shift) => {
                const sum = shift.totalCollection.reduce((total, collected) => {
                    return total + collected.amount;
                }, 0);
                return allTotal + sum;
            }, 0)

            if (index < 7) {
                // lastWeekTotalIncome += 100
                // pastTwoWeeksIncomeDeta[0].data[index] += 100
                lastWeekTotalIncome += total
                pastTwoWeeksIncomeDeta[0].data[index] += total
            }
            else {
                thisWeekTotalIncome += total
                pastTwoWeeksIncomeDeta[0].data[index] += total
            }
        })

        // utils.commonResponce(
        //     res,
        //     200,
        //     "Successfully fetched data",
        const obj = {
            parkings, opretors,
            totalIncome,
            totalMonthlyIncome,
            monthlyPassRevenue:monthlyPassRevenueData.length > 0?monthlyPassRevenueData[0].totalSeasonParkerRevenue :0,
            totalPassRevenue:passRevenueData.length > 0?passRevenueData[0].totalSeasonParkerRevenue :0,
            pastTwoWeeksIncomeSeries: pastTwoWeeksIncomeDeta,
            pastTwoWeeksIncomeCategories: twoWeekDates.map(d => d.category),
            thisWeekTotalIncome,
            lastWeekTotalIncome,
            // posHeartbeats
        }

        // console.log('obj: web socket ', obj);
        designaPOS.wss.clients.forEach(function each(client) {

            if (client.readyState === WebSocket.OPEN) {
                client.send(JSON.stringify(obj));
            }
        })
        // );


    } catch (error) {
        console.log('error: ', error);
        // return {
        //     parkings: [],
        //     opretors: [],
        //     totalIncome: 0,
        //     pastTwoWeeksIncomeSeries: [],
        //     pastTwoWeeksIncomeCategories: [],
        //     thisWeekTotalIncome: 0,
        //     lastWeekTotalIncome: 0,
        //     // posHeartbeats
        // }
    }
}

async function getDashboardDataFunction(requestData) {
    try {

    // do nothing

    } catch (error) {
        console.log('error: ', error);
      
    }
}

exports.parkingAggregateForGraph = async (date) => {

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
                        ]
                    }
                },
            ]
        )


        return { date, shiftData };

    } catch (error) {
        console.log('error: ', error);
        return { date, shiftData: [] };

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

exports.getDashboardDataFunction = getDashboardDataFunction
