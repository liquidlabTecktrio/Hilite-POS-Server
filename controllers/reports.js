const mongoose = require("mongoose");
const utils = require("./utils");
const Shift = require("../models/Shift")


exports.getParkingRevenue = async (req, res) => {

    try {
        const parkingId = req.body.parkingId;
        console.log("parkingId", parkingId)
        const fromDate = new Date(req.body.fromDate);
        console.log("fromDate", fromDate)
        const toDate = new Date(req.body.toDate);
        console.log("toDate", toDate)
        const revenueData = await Shift.aggregate(
            [
                {
                    '$match': {
                        'parkingId': mongoose.Types.ObjectId(parkingId),
                        'isActive': false
                    }
                }, {
                    '$addFields': {
                        'shiftEndDate': {
                            '$split': [
                                '$shiftStopTime', ' '
                            ]
                        }
                    }
                }, {
                    '$addFields': {
                        'shiftEndDate': {
                            '$first': '$shiftEndDate'
                        }
                    }
                }, {
                    '$addFields': {
                        'shiftEndDateArray': {
                            '$split': [
                                '$shiftEndDate', '-'
                            ]
                        }
                    }
                }, {
                    '$addFields': {
                        'date': {
                            '$toInt': {
                                '$arrayElemAt': [
                                    '$shiftEndDateArray', 0
                                ]
                            }
                        }
                    }
                }, {
                    '$addFields': {
                        'shiftEndDateISO': {
                            '$dateFromParts': {
                                'year': {
                                    '$toInt': {
                                        '$arrayElemAt': [
                                            '$shiftEndDateArray', 2
                                        ]
                                    }
                                },
                                'month': {
                                    '$toInt': {
                                        '$arrayElemAt': [
                                            '$shiftEndDateArray', 1
                                        ]
                                    }
                                },
                                'day': {
                                    '$toInt': {
                                        '$arrayElemAt': [
                                            '$shiftEndDateArray', 0
                                        ]
                                    }
                                }
                            }
                        }
                    }
                }, {
                    '$match': {
                        'shiftEndDateISO': {
                            '$gte': fromDate,
                            '$lte': toDate
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
                        'as': 'opretor'
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
                            '$first': '$opretor'
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
                        '_id': 0,
                        'opretorId': 0,
                        'parkingId': 0,
                        'date': 0,
                        'shiftEndDate': 0,
                        'shiftEndDateArray': 0,
                        'shiftEndDateISO': 0
                    }
                }
            ]
        )
        utils.commonResponce(res, 200, "Successsfully calculated revenue", revenueData)
    } catch (error) {
        console.log("error", error)
        utils.commonResponce(res, 500, "Unexpected error while generating revenue report", error.toString())
    }
}








