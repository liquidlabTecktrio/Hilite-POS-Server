const Parking = require("../models/Parking");
const Opretor = require("../models/Opretor");
const Shift = require("../models/Shift");
const utils = require("./utils")
const Bluebird = require("bluebird");
const mongoose = require("mongoose");


exports.getDashboardData = async (req, res) => {
    try {

        const parkings = await Parking.find()
        const opretors = await Opretor.find()
        // const totalIncome = await Opretor.find()

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

        utils.commonResponce(
            res,
            200,
            "Successfully fetched data",
            { parkings, opretors,
                totalIncome,
                pastTwoWeeksIncomeSeries: pastTwoWeeksIncomeDeta,
                pastTwoWeeksIncomeCategories: twoWeekDates.map(d => d.category),
                thisWeekTotalIncome,
                lastWeekTotalIncome
             }
        );


    } catch(error) {
        console.log('error: ', error);
        return res.status(500).json({
            status: 500,
            message: "Unexpected server error while creating Parking",
        });
    }
}


exports.parkingAggregateForGraph = async ( date) => {

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

    } catch(error) {
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
