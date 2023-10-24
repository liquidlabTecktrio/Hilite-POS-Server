// const mongoose = require("mongoose");
// const utils = require("./utils");
// const Shift = require("../models/Shift")


// exports.getParkingRevenue = async (req, res) => {

//     try {
//         const parkingId = req.body.parkingId;
//         console.log("parkingId", parkingId)
//         const fromDate = new Date(req.body.fromDate);
//         console.log("fromDate", fromDate)
//         const toDate = new Date(req.body.toDate);
//         console.log("toDate", toDate)
//         const revenueData = await Shift.aggregate(
//             [
//                 {
//                     '$match': {
//                         'parkingId': mongoose.Types.ObjectId(parkingId),
//                         'isActive': false
//                     }
//                 }, {
//                     '$addFields': {
//                         'shiftEndDate': {
//                             '$split': [
//                                 '$shiftStopTime', ' '
//                             ]
//                         }
//                     }
//                 }, {
//                     '$addFields': {
//                         'shiftEndDate': {
//                             '$first': '$shiftEndDate'
//                         }
//                     }
//                 }, {
//                     '$addFields': {
//                         'shiftEndDateArray': {
//                             '$split': [
//                                 '$shiftEndDate', '-'
//                             ]
//                         }
//                     }
//                 }, {
//                     '$addFields': {
//                         'date': {
//                             '$toInt': {
//                                 '$arrayElemAt': [
//                                     '$shiftEndDateArray', 0
//                                 ]
//                             }
//                         }
//                     }
//                 }, {
//                     '$addFields': {
//                         'shiftEndDateISO': {
//                             '$dateFromParts': {
//                                 'year': {
//                                     '$toInt': {
//                                         '$arrayElemAt': [
//                                             '$shiftEndDateArray', 2
//                                         ]
//                                     }
//                                 },
//                                 'month': {
//                                     '$toInt': {
//                                         '$arrayElemAt': [
//                                             '$shiftEndDateArray', 1
//                                         ]
//                                     }
//                                 },
//                                 'day': {
//                                     '$toInt': {
//                                         '$arrayElemAt': [
//                                             '$shiftEndDateArray', 0
//                                         ]
//                                     }
//                                 }
//                             }
//                         }
//                     }
//                 }, {
//                     '$match': {
//                         'shiftEndDateISO': {
//                             '$gte': fromDate,
//                             '$lte': toDate
//                         }
//                     }
//                 }, {
//                     '$addFields': {
//                         'reducedTotalCollection': {
//                             '$reduce': {
//                                 'input': '$totalCollection',
//                                 'initialValue': 0,
//                                 'in': {
//                                     '$add': [
//                                         '$$value', '$$this.amount'
//                                     ]
//                                 }
//                             }
//                         }
//                     }
//                 }, {
//                     '$lookup': {
//                         'from': 'opretors',
//                         'localField': 'opretorId',
//                         'pipeline': [
//                             {
//                                 '$project': {
//                                     'opretorName': 1,
//                                     '_id': 0
//                                 }
//                             }
//                         ],
//                         'foreignField': '_id',
//                         'as': 'opretor'
//                     }
//                 }, {
//                     '$lookup': {
//                         'from': 'parkings',
//                         'localField': 'parkingId',
//                         'pipeline': [
//                             {
//                                 '$project': {
//                                     'parkingName': 1,
//                                     '_id': 0
//                                 }
//                             }
//                         ],
//                         'foreignField': '_id',
//                         'as': 'parking'
//                     }
//                 }, {
//                     '$addFields': {
//                         'operator': {
//                             '$first': '$opretor'
//                         },
//                         'parking': {
//                             '$first': '$parking'
//                         }
//                     }
//                 }, {
//                     '$addFields': {
//                         'operator': '$operator.opretorName',
//                         'parking': '$parking.parkingName'
//                     }
//                 }, {
//                     '$project': {
//                         '_id': 0,
//                         'opretorId': 0,
//                         'parkingId': 0,
//                         'date': 0,
//                         'shiftEndDate': 0,
//                         'shiftEndDateArray': 0,
//                         'shiftEndDateISO': 0
//                     }
//                 }
//             ]
//         )
//         utils.commonResponce(res, 200, "Successsfully calculated revenue", revenueData)
//     } catch (error) {
//         console.log("error", error)
//         utils.commonResponce(res, 500, "Unexpected error while generating revenue report", error.toString())
//     }
// }


const Transaction = require("../models/Transaction");
const Tariff = require("../models/Tariff");
const Shift = require("../models/Shift");
const Opretor = require("../models/Opretor");
const Parking = require("../models/Parking");
const utils = require("./utils");
const Bluebird = require("bluebird");
const mongoose = require("mongoose");
const moment = require("moment-timezone");
const MonthlyPass = require("../models/MonthlyPass");
const Ticket = require("../models/Ticket");

exports.getParkingRevenue = async (req, res) => {
    try {
        const parkingId = req.body.parkingId;
        console.log("parkingId", parkingId)
        const fromDate = new Date(new Date(req.body.fromDate).setHours(0));
        console.log("fromDate", fromDate)
        let toDate = new Date(new Date(req.body.toDate).setHours(24));
        console.log("toDate", toDate)

        let revenueData = await Shift.aggregate([
            {
                '$match': {
                    'parkingId': mongoose.Types.ObjectId(parkingId),
                    'isActive': false
                }
            },
            {
                '$addFields': {
                    'shiftEndDateISO': {
                        '$dateFromString': {
                            'dateString': '$shiftStopTime',
                            'format': "%d-%m-%Y %H:%M:%S"
                        }
                    }
                }
            }, {
                '$match': {
                    'shiftEndDateISO': {
                        '$gte': fromDate,
                        '$lte': toDate,

                    }
                }
            }, {
                '$addFields': {
                    'reducedTotalCollection': {
                        '$reduce': {
                            'input': '$totalCollection',
                            'initialValue': 0,
                            'in': {
                                '$add': [
                                    '$$value', '$$this.amount'
                                ]
                            }
                        }
                    }
                }
            }, {
                '$lookup': {
                    'from': 'opretors',
                    'localField': 'opretorId',
                    'pipeline': [
                        {
                            '$project': {
                                'opretorName': 1,
                                '_id': 0
                            }
                        }
                    ],
                    'foreignField': '_id',
                    'as': 'operator'
                }
            }, {
                '$lookup': {
                    'from': 'parkings',
                    'localField': 'parkingId',
                    'pipeline': [
                        {
                            '$project': {
                                'parkingName': 1,
                                '_id': 0
                            }
                        }
                    ],
                    'foreignField': '_id',
                    'as': 'parking'
                }
            }, {
                '$addFields': {
                    'operator': {
                        '$first': '$operator'
                    },
                    'parking': {
                        '$first': '$parking'
                    }
                }
            }, {
                '$addFields': {
                    'operator': '$operator.opretorName',
                    'parking': '$parking.parkingName'
                }
            }, {
                '$project': {
                    "_id": 0,
                    'shiftId': 1,
                    'shiftNo': 1,
                    "shiftStartTime": 1,
                    "shiftStopTime": 1,
                    "totalTicketIssued": 1,
                    "totalTicketCancelled": 1,
                    "totalTicketCollected": 1,
                    "totalLostTicketCollected": 1,
                    "reducedTotalCollection": 1,
                    "operator": 1,
                    "parking": 1
                }
            }
        ])

        const monthlyPassRevenueData = await MonthlyPass.aggregate([
            {
                '$match': {
                    'parkingId': mongoose.Types.ObjectId(parkingId),
                }
            }, {
                '$match': {
                    'createdAt': {
                        '$gte': fromDate,
                        '$lte': toDate,

                    }
                }
            },
            // {
            //     '$group': {
            //         "_id": null,
            //         "totalSeasonParkerRevenue": {
            //             "$sum": "$amount"
            //         }
            //     }
            // }
            {
                '$project': {
                    "_id": 0
                }
            }
        ])

        // let totalSeasonParkerRevenue = 0
        // if (monthlyPassRevenueData.length > 0)
        //     if (monthlyPassRevenueData[0].totalSeasonParkerRevenue > 0) {
        //         // revenueData = JSON.parse(JSON.stringify(revenueData))
        //         totalSeasonParkerRevenue = monthlyPassRevenueData[0].totalSeasonParkerRevenue
        //     }

        utils.commonResponce(res, 200, "Successsfully calculated revenue", { revenueData, monthlyPassRevenueData })
    } catch (error) {
        utils.commonResponce(res, 500, "Unexpected error while generating revenue report", error.toString())
    }
}

exports.shiftReport = async (req, res) => {
    try {

        const parkingId = req.body.parkingId;
        console.log("parkingId", parkingId)
        const shiftNo = req.body.shiftNo;

        const shiftData = await Shift.aggregate([
            {
                '$match': {
                    'parkingId': mongoose.Types.ObjectId(parkingId),
                    'shiftNo': shiftNo
                }
            }, {
                '$lookup': {
                    'from': 'transactions',
                    'localField': '_id',
                    'foreignField': 'shiftId',
                    'as': 'transactions'
                }
            }, {
                '$lookup': {
                    'from': 'opretors',
                    'localField': 'opretorId',
                    'foreignField': '_id',
                    'pipeline': [
                        {
                            '$project': {
                                'opretorName': 1,
                                '_id': 0
                            }
                        }
                    ],
                    'as': 'operator'
                }
            }, {
                '$lookup': {
                    'from': 'parkings',
                    'localField': 'parkingId',
                    'foreignField': '_id',
                    'pipeline': [
                        {
                            '$project': {
                                'parkingName': 1,
                                '_id': 0
                            }
                        }
                    ],
                    'as': 'parking'
                }
            }, {
                '$addFields': {
                    'operator': {
                        '$first': '$operator'
                    },
                    'parking': {
                        '$first': '$parking'
                    }
                }
            }, {
                '$addFields': {
                    'operator': '$operator.opretorName',
                    'parking': '$parking.parkingName'
                }
            }, {
                '$addFields': {
                    'TotalCollection': {
                        '$reduce': {
                            'input': '$totalCollection',
                            'initialValue': 0,
                            'in': {
                                '$add': [
                                    '$$value', '$$this.amount'
                                ]
                            }
                        }
                    }
                }
            }, {
                '$addFields': {
                    'cash_collection': {
                        '$function': {
                            'body': 'function(transactions){const cash_collection = transactions.filter((collection)=> collection.paymentType == "cash").reduce((a,c)=>a+c.amount,0); return cash_collection}',
                            'args': [
                                '$transactions'
                            ],
                            'lang': 'js'
                        }
                    },
                    'card_collection': {
                        '$function': {
                            'body': 'function(transactions){const cash_collection = transactions.filter((collection)=> collection.paymentType == "card").reduce((a,c)=>a+c.amount,0); return cash_collection}',
                            'args': [
                                '$transactions'
                            ],
                            'lang': 'js'
                        }
                    },
                    'upi_collection': {
                        '$function': {
                            'body': 'function(transactions){const cash_collection = transactions.filter((collection)=> collection.paymentType == "upi").reduce((a,c)=>a+c.amount,0); return cash_collection}',
                            'args': [
                                '$transactions'
                            ],
                            'lang': 'js'
                        }
                    }
                }
            }, {
                '$project': {
                    'opretorId': 0,
                    'parkingId': 0
                }
            }
        ])

        if (shiftData.length > 0) {

            utils.commonResponce(res, 200, "succesfully generated shift report", shiftData)

        } else {

            utils.commonResponce(res, 404, "shift not found, Please check the parking and shift number")

        }


    } catch (error) {

        utils.commonResponce(res, 500, "unexpected server error while generating shift report", error.toString())

    }
}

exports.seasonParkerReport = async (req, res) => {
    try {

        const parkingId = req.body.parkingId;

        const MonthlyPassData = await MonthlyPass.aggregate([
            {
                '$match': {
                    'parkingId': mongoose.Types.ObjectId(parkingId),
                }
            },
            {
                '$project': {
                    'opretorId': 0,
                    'parkingId': 0
                }
            }
        ])

        // if (MonthlyPassData.length > 0) {

        utils.commonResponce(res, 200, "succesfully fetched season parkers", MonthlyPassData)

        // } else {

        //     utils.commonResponce(res, 404, "sNo season parker found")

        // }


    } catch (error) {

        utils.commonResponce(res, 500, "unexpected server error while fetching season parkers", error.toString())

    }
}

exports.seasonParkerDetailReport = async (req, res) => {
    try {

        const monthlyPassObjId = req.body.monthlyPassObjId;

        const shiftData = await MonthlyPass.aggregate([
            {
                '$match': {
                    '_id': mongoose.Types.ObjectId(monthlyPassObjId),
                }
            }, {
                '$lookup': {
                    'from': 'nfctransactions',
                    'localField': '_id',
                    'foreignField': 'monthlyPassId',
                    'as': 'transactions'
                }
            }, {
                '$lookup': {
                    'from': 'parkings',
                    'localField': 'parkingId',
                    'foreignField': '_id',
                    'pipeline': [
                        {
                            '$project': {
                                'parkingName': 1,
                                '_id': 0
                            }
                        }
                    ],
                    'as': 'parking'
                }
            }, {
                '$addFields': {
                    'parking': {
                        '$first': '$parking'
                    }
                }
            }, {
                '$addFields': {
                    'parking': '$parking.parkingName'
                }
            }, {
                '$project': {
                    'opretorId': 0,
                    'parkingId': 0
                }
            }
        ])

        if (shiftData.length > 0) {

            utils.commonResponce(res, 200, "succesfully generated shift report", shiftData)

        } else {

            utils.commonResponce(res, 201, "shift not found, Please check the parking and shift number")

        }


    } catch (error) {

        utils.commonResponce(res, 500, "unexpected server error while generating shift report", error.toString())

    }
}

exports.getParkingReport = async (req, res) => {
    try {
        const parkingId = req.body.parkingId;
        console.log("parkingId", parkingId)
        const fromDate = new Date(new Date(req.body.date).setHours(0));
        console.log("fromDate", fromDate)
        let toDate = new Date(new Date(req.body.date).setHours(24));
        console.log("toDate", toDate)

        let parkingsData = await Ticket.aggregate([
            {
                '$addFields': {
                    entryDateISO: {
                        $toDate:
                            { $multiply: [{ $toInt: '$entryTime' }, 1000] }
                    },
                    exitDateISO: {
                        // $cond: {
                        //     if: {
                        //             '$ne': ['$exitTime', null]
                        //     },
                        //     then: {
                        //         $toDate:{
                        //             $multiply: [{ $toInt: '$exitTime' }, 1000] 
                        //         }
                        //         },
                        //     else: null
                        // }

                        $toDate:
                            { $multiply: [{ $toInt: '$exitTime' }, 1000] }
                    },
                    date: fromDate
                }
            }, {
                '$addFields': {
                    entryDateISOMatched: {
                        $cond: {
                            if: {
                                '$and': [
                                    {
                                        '$gte': [
                                            '$entryDateISO', fromDate
                                        ]
                                    }, {
                                        '$lte': [
                                            '$entryDateISO', toDate
                                        ]
                                    }
                                ]
                            },
                            then: true,
                            else: false
                        }
                    },
                    exitDateISOMatched: {
                        $cond: {
                            if: {
                                '$and': [
                                    {
                                        '$gte': [
                                            '$exitDateISO', fromDate
                                        ]
                                    }, {
                                        '$lte': [
                                            '$exitDateISO', toDate
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
                            entryDateISOMatched: true
                        }, {
                            exitDateISOMatched: true

                        }
                    ]
                }
            },
            {
                '$lookup': {
                    'from': 'opretors',
                    'localField': 'opretorId',
                    'pipeline': [
                        {
                            '$project': {
                                'opretorName': 1,
                                '_id': 0
                            }
                        }
                    ],
                    'foreignField': '_id',
                    'as': 'operator'
                }
            }, {
                '$lookup': {
                    'from': 'parkings',
                    'localField': 'parkingId',
                    'pipeline': [
                        {
                            '$project': {
                                'parkingName': 1,
                                'parkingNo': 1,
                                'address': 1,
                                '_id': 0
                            }
                        }
                    ],
                    'foreignField': '_id',
                    'as': 'parking'
                }
            }, {
                '$lookup': {
                    'from': 'shifts',
                    'localField': 'shiftId',
                    'pipeline': [
                        {
                            '$project': {
                                'shiftNo': 1
                            }
                        }
                    ],
                    'foreignField': '_id',
                    'as': 'shiftNo'
                }
            }, {
                '$addFields': {
                    'operator': {
                        '$first': '$operator'
                    },
                    'parking': {
                        '$first': '$parking'
                    },
                    'shiftNo': {
                        '$first': '$shiftNo'
                    }
                }
            }, {
                '$addFields': {
                    'opretorName': '$operator.opretorName',
                    'parkingName': '$parking.parkingName',
                    'parkingNo': '$parking.parkingNo',
                    'address': '$parking.address',
                    'shiftNo': '$shiftNo.shiftNo',
                }
            }, {
                '$project': {
                    "date": 1,
                    "ticketId": 1,
                    "vehicleType": 1,
                    "vehicleNo": 1,
                    "parkingName": 1,
                    "parkingNo": 1,
                    "address": 1,
                    "entryDateISO": 1,
                    "duration": 1,
                    "exitDateISO": 1,
                    "amount": 1,
                    "paymentType": 1,
                    "receiptNo": 1,
                    "shiftNo": 1,
                }
            }
        ])

        let totalParkingFeeCollection = parkingsData.filter(p => p.paymentType != null).reduce((a, c) => { return a + c.amount }, 0)
        let totalUPICollection = parkingsData.filter(p => p.paymentType == 'upi').reduce((a, c) => { return a + c.amount }, 0)
        let totalCashCollection = parkingsData.filter(p => p.paymentType == 'cash').reduce((a, c) => { return a + c.amount }, 0)
        let totalCardCollection = parkingsData.filter(p => p.paymentType == 'card').reduce((a, c) => { return a + c.amount }, 0)


        utils.commonResponce(res, 200, "Successsfully generated parkings report", { totalParkingFeeCollection, totalUPICollection, totalCashCollection, totalCardCollection, parkingsData })
    } catch (error) {
        utils.commonResponce(res, 500, "Unexpected error while generating parkings report", error.toString())
    }
}

function getReportDates(reportType, reportDate){

    let fromDate;
    let toDate;
    
    switch (reportType) {
        case "Daily":
            fromDate = new Date(new Date(reportDate).setHours(0));
            toDate = new Date(new Date(reportDate).setHours(24));
            
            break;
            
            case "Weekly":
                
                break;
                
                
                case "Monthly":
                    
                    fromDate = new Date(new Date(reportDate.split("-")[0], parseInt(reportDate.split("-")[1])-1, 1).setHours(0));
                    toDate = new Date(new Date(reportDate.split("-")[0], reportDate.split("-")[1], 0).setHours(24));
                    
                    break;
                    
                    default:
                        break;
                    }
                    console.log('fromDate: ', fromDate);
                    console.log('toDate: ', toDate);

                    return {
                        fromDate,
                        toDate
                    }
}

exports.getParkingSummaryReport = async (req, res) => {
    try {
        const parkingId = req.body.parkingId;
        // const fromDate = new Date(new Date(req.body.fromDate).setHours(0));
        // let toDate = new Date(new Date(req.body.toDate).setHours(24));
        
        
        const reportDates = getReportDates(req.body.reportType, req.body.reportDate);
        fromDate = reportDates.fromDate
        toDate = reportDates.toDate
        
         console.log("fromDate", fromDate)
         console.log("toDate", toDate)

        let parkingsData = await Ticket.aggregate([
            {
                '$addFields': {
                    // entryDateISO: {
                    //     $toDate:
                    //         { $multiply: [{ $toInt: '$entryTime' }, 1000] }
                    // },
                    exitDateISO: {

                        $toDate:
                            { $multiply: [{ $toInt: '$exitTime' }, 1000] }
                    },
                }
            }, {
                '$addFields': {
                    // entryDateISOMatched: {
                    //     $cond: {
                    //         if: {
                    //             '$and': [
                    //                 {
                    //                     '$gte': [
                    //                         '$entryDateISO', fromDate
                    //                     ]
                    //                 }, {
                    //                     '$lte': [
                    //                         '$entryDateISO', toDate
                    //                     ]
                    //                 }
                    //             ]
                    //         },
                    //         then: true,
                    //         else: false
                    //     }
                    // },
                    exitDateISOMatched: {
                        $cond: {
                            if: {
                                '$and': [
                                    {
                                        '$gte': [
                                            '$exitDateISO', fromDate
                                        ]
                                    }, {
                                        '$lte': [
                                            '$exitDateISO', toDate
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
                    // '$or': [
                    //     {
                    //         entryDateISOMatched: true
                    //     }, {
                    exitDateISOMatched: true
                    //     }
                    // ]
                }
            }, {
                '$lookup': {
                    'from': 'parkings',
                    'localField': 'parkingId',
                    'pipeline': [
                        {
                            '$project': {
                                'parkingName': 1,
                                'parkingNo': 1,
                                'address': 1,
                                '_id': 0
                            }
                        }
                    ],
                    'foreignField': '_id',
                    'as': 'parking'
                }
            }, {
                '$addFields': {
                    'parking': {
                        '$first': '$parking'
                    }
                }
            }, {
                '$addFields': {
                    'parkingName': '$parking.parkingName',
                    'parkingNo': '$parking.parkingNo',
                    'address': '$parking.address',
                }
            },
            {
                '$group': {
                    '_id': {
                        vehicleType: '$vehicleType',
                        parkingName: '$parkingName',
                        parkingNo: '$parkingNo',
                        address: '$address',
                    },
                    noOfVehicle: {
                        $sum: 1
                    },
                    paymentCollection: {
                        // $sum: '$amount'
                        $push: '$$ROOT'
                    },
                }
            },
            {
                '$addFields': {
                    'totalParkingFeeCollection': {
                        '$sum': {
                            '$map': {
                              'input': '$paymentCollection',
                              'as': 'sumValue',
                              'in': {
                                '$sum': [
                                  '$$sumValue.amount'
                                ]
                              }
                            }
                          }
                    },
                    'totalUPICollection': {
                        '$sum': {
                            '$map': {
                              'input': {
                                '$filter': {
                                    'input': '$paymentCollection',
                                    'as': 'ms',
                                    'cond': {
                                      '$eq': [
                                        '$$ms.paymentType', 'upi'
                                      ]
                                    }
                                  }
                              },
                              'as': 'sumValue',
                              'in': {
                                '$sum': [
                                  '$$sumValue.amount'
                                ]
                              }
                            }
                          }
                    },
                    'totalCashCollection': {
                        '$sum': {
                            '$map': {
                              'input': {
                                '$filter': {
                                    'input': '$paymentCollection',
                                    'as': 'ms',
                                    'cond': {
                                      '$eq': [
                                        '$$ms.paymentType', 'cash'
                                      ]
                                    }
                                  }
                              },
                              'as': 'sumValue',
                              'in': {
                                '$sum': [
                                  '$$sumValue.amount'
                                ]
                              }
                            }
                          }
                    },
                    'totalCardCollection': {
                        '$sum': {
                            '$map': {
                              'input': {
                                '$filter': {
                                    'input': '$paymentCollection',
                                    'as': 'ms',
                                    'cond': {
                                      '$eq': [
                                        '$$ms.paymentType', 'card'
                                      ]
                                    }
                                  }
                              },
                              'as': 'sumValue',
                              'in': {
                                '$sum': [
                                  '$$sumValue.amount'
                                ]
                              }
                            }
                          }
                    },
                    'groupType':'Short Term parker'
                }
            },
            {
                '$project': {
                    "_id": 0,
                    "vehicleType": '$_id.vehicleType',
                    "parkingName": '$_id.parkingName',
                    "parkingNo": '$_id.parkingNo',
                    "address": '$_id.address',
                    "noOfVehicle": 1,
                    "totalParkingFeeCollection": 1,
                    "totalUPICollection": 1,
                    "totalCashCollection": 1,
                    "totalCardCollection": 1,
                    "groupType":1
                }
            }
        ])

        let seasonParkersData = await MonthlyPass.aggregate([
            {
                '$addFields': {
                    purchaseDateISO: {
                        $dateFromString: {
                            dateString: '$purchaseDate',
                            format: "%d-%m-%Y"
                        }
                    }
                }
            },
            {
                '$match': {
                    'parkingId': mongoose.Types.ObjectId(parkingId),
                            'purchaseDateISO': {
                                '$gte': fromDate
                            },
                            'purchaseDateISO': {
                                '$lte': toDate
                            }
                }
            }, {
                '$lookup': {
                    'from': 'parkings',
                    'localField': 'parkingId',
                    'pipeline': [
                        {
                            '$project': {
                                'parkingName': 1,
                                'parkingNo': 1,
                                'address': 1,
                                '_id': 0
                            }
                        }
                    ],
                    'foreignField': '_id',
                    'as': 'parking'
                }
            }, {
                '$addFields': {
                    'parking': {
                        '$first': '$parking'
                    }
                }
            }, {
                '$addFields': {
                    'parkingName': '$parking.parkingName',
                    'parkingNo': '$parking.parkingNo',
                    'address': '$parking.address',
                }
            },
            {
                '$group': {
                    '_id': {
                        vehicleType: '$vehicleType',
                        parkingName: '$parkingName',
                        parkingNo: '$parkingNo',
                        address: '$address',
                    },
                    noOfVehicle: {
                        $sum: 1
                    },
                    paymentCollection: {
                        // $sum: '$amount'
                        $push: '$$ROOT'
                    },
                }
            },
            {
                '$addFields': {
                    'totalParkingFeeCollection': {
                        '$sum': {
                            '$map': {
                              'input': '$paymentCollection',
                              'as': 'sumValue',
                              'in': {
                                '$sum': [
                                  '$$sumValue.amount'
                                ]
                              }
                            }
                          }
                    },
                    'totalUPICollection': {
                        '$sum': {
                            '$map': {
                              'input': {
                                '$filter': {
                                    'input': '$paymentCollection',
                                    'as': 'ms',
                                    'cond': {
                                      '$eq': [
                                        '$$ms.paymentType', 'upi'
                                      ]
                                    }
                                  }
                              },
                              'as': 'sumValue',
                              'in': {
                                '$sum': [
                                  '$$sumValue.amount'
                                ]
                              }
                            }
                          }
                    },
                    'totalCashCollection': {
                        '$sum': {
                            '$map': {
                              'input': {
                                '$filter': {
                                    'input': '$paymentCollection',
                                    'as': 'ms',
                                    'cond': {
                                      '$eq': [
                                        '$$ms.paymentType', 'cash'
                                      ]
                                    }
                                  }
                              },
                              'as': 'sumValue',
                              'in': {
                                '$sum': [
                                  '$$sumValue.amount'
                                ]
                              }
                            }
                          }
                    },
                    'totalCardCollection': {
                        '$sum': {
                            '$map': {
                              'input': {
                                '$filter': {
                                    'input': '$paymentCollection',
                                    'as': 'ms',
                                    'cond': {
                                      '$eq': [
                                        '$$ms.paymentType', 'card'
                                      ]
                                    }
                                  }
                              },
                              'as': 'sumValue',
                              'in': {
                                '$sum': [
                                  '$$sumValue.amount'
                                ]
                              }
                            }
                          }
                    },
                    'groupType':'Season parker'
                }
            },
            {
                '$project': {
                    "_id": 0,
                    "vehicleType": '$_id.vehicleType',
                    "parkingName": '$_id.parkingName',
                    "parkingNo": '$_id.parkingNo',
                    "address": '$_id.address',
                    "noOfVehicle": 1,
                    "totalParkingFeeCollection": 1,
                    "totalUPICollection": 1,
                    "totalCashCollection": 1,
                    "totalCardCollection": 1,
                    "groupType":1
                }
            }
        ])
  

        utils.commonResponce(res, 200, "Successsfully generated parkings summary report", [...parkingsData, ...seasonParkersData])
    } catch (error) {
        utils.commonResponce(res, 500, "Unexpected error while generating parkings summary report", error.toString())
    }
}





