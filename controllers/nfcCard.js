const NFCCard = require("../models/NFCCard")
const MonthlyPass = require("../models/MonthlyPass")
const Package = require("../models/Package")
const utils = require("./utils")
const mongoose = require("mongoose");


exports.createNFCCard = async (req, res) => {
    try {

        const cardNumber = req.body.cardNumber
        const nfcNumber = req.body.nfcNumber

        const cardNotAvailable = await NFCCard.findOne({ cardNumber });
        const nfcNumberAvailable =  await NFCCard.findOne({ nfcNumber });

        if (!cardNotAvailable && !nfcNumberAvailable) {

            await NFCCard.create({
                cardNumber: cardNumber,
                nfcNumber: nfcNumber
            }).then(createNFCCard => {

                utils.commonResponce(
                    res,
                    200,
                    "Successfully created NFC Card",
                    createNFCCard
                );
            }).catch((err) => {
                console.log("err", err)
                utils.commonResponce(
                    res,
                    201,
                    "Error Occured While fetching NFC Card",
                    err.toString()
                );
            });

        } else {

            utils.commonResponce(
                res,
                201,
                "Card already in exist"
            );
        }


    } catch (error) {
        console.log("error", error)
        return res.status(500).json({
            status: 500,
            message: "Unexpected server error while creating NFC Card",
        });
    }
}

exports.getNFCCards = async (req, res) => {
    try {

        // await NFCCard.find()
        await NFCCard.aggregate([
            [
                {
                    '$lookup': {
                        'from': 'monthlypasses',
                        'localField': '_id',
                        'foreignField': 'nfcCardId',
                        'as': 'result'
                    }
                }, {
                    '$addFields': {
                        'size': {
                            '$size': '$result'
                        }
                    }
                }, {
                    '$match': {
                        'size': {
                            $lt: 1
                        }
                    }
                }, {
                    '$project': {
                        'result': 0,
                        'size': 0
                    }
                }
            ]
        ])
            .then(async (nfcCardsData) => {

                utils.commonResponce(
                    res,
                    200,
                    "Successfully fetched NFC Cards",
                    nfcCardsData
                );

            }).catch((err) => {
                utils.commonResponce(
                    res,
                    201,
                    "Error Occured While fetching NFC Cards",
                    err.toString()
                );
            });

    } catch {
        return res.status(500).json({
            status: 500,
            message: "Unexpected server error while fetching NFC Cards",
        });
    }
}
