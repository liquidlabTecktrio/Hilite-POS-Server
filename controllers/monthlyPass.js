const MonthlyPass = require("../models/MonthlyPass")
const NFCCard = require("../models/NFCCard")
const Package = require("../models/Package")
const utils = require("./utils")
const mongoose = require("mongoose");



function formatDate(date) {
    var dd = date.getDate();
    var mm = date.getMonth() + 1;
    var yyyy = date.getFullYear();
    if (dd < 10) {
        dd = "0" + dd;
    }
    if (mm < 10) {
        mm = "0" + mm;
    }
    date = dd + "-" + mm + "-" + yyyy;
    return date;
}

exports.createMonthlyPass = async (req, res) => {
    try {
        const passHolderName = req.body.passHolderName
        const phoneNumber = req.body.phoneNumber
        const email = req.body.email
        const address = req.body.address
        const startDate = req.body.startDate
        const endDate = req.body.endDate
        // const cardNumber = req.body.cardNumber
        const vehicleType = req.body.vehicleType
        const parkingId = req.body.parkingId
        const packageId = req.body.packageId

        const paymentType = req.body.paymentType
        const nfcCardObjId = req.body.nfcCardObjId

        const nfcCard = await NFCCard.findById(nfcCardObjId)

        const packageData = await Package.findById(packageId)
        const activeMonthlyPassExist = await MonthlyPass.findOne({ nfcCardId: nfcCard._id })

        if (!activeMonthlyPassExist) {
            if (packageData && packageData.vehicleType == vehicleType) {

                await MonthlyPass.create({
                    passHolderName: passHolderName,
                    phoneNumber: phoneNumber,
                    email: email,
                    address: address,
                    startDate: startDate,
                    endDate: endDate,
                    // cardNumber: cardNumber,
                    vehicleType: vehicleType,
                    parkingId: parkingId,
                    packageId: packageData._id,
                    amount: packageData.amount,
                    fromTime: packageData.fromTime,
                    toTime: packageData.toTime,
                    status: false,
                    isActive: true,
                    purchaseDate: formatDate(new Date()),
                    paymentType: paymentType,
                    cardNumber: nfcCard.cardNumber,
                    nfcCardId: nfcCard._id
                }).then(createMonthlyPass => {

                    utils.commonResponce(
                        res,
                        200,
                        "Successfully created Monthly Pass",
                        createMonthlyPass
                    );
                }).catch((err) => {
                    console.log("err", err)
                    utils.commonResponce(
                        res,
                        201,
                        "Error Occured While fetching Monthly Pass",
                        err.toString()
                    );
                });

            } else {

                utils.commonResponce(
                    res,
                    201,
                    "Active Package Details Not Found"
                );
            }

        } else {

            utils.commonResponce(
                res,
                201,
                "Card already in use try to renew"
            );
        }


    } catch (error) {
        console.log("error", error)
        return res.status(500).json({
            status: 500,
            message: "Unexpected server error while creating Monthly Pass",
        });
    }
}

exports.renewMonthlyPass = async (req, res) => {
    try {

        const monthlyPassObjId = req.body.monthlyPassObjId
        const startDate = req.body.startDate
        const endDate = req.body.endDate
        const vehicleType = req.body.vehicleType
        const parkingId = req.body.parkingId
        const packageId = req.body.packageId

        const paymentType = req.body.paymentType
        const nfcCardObjId = req.body.nfcCardObjId

        const nfcCard = await NFCCard.findById(nfcCardObjId)
        const packageData = await Package.findById(packageId)

        // const activeMonthlyPassExist = await MonthlyPass.findOne({ nfcCardId: nfcCard._id, isActive:false })
        const monthlyPassExist = await MonthlyPass.findById(monthlyPassObjId)

        let activeMonthlyPassExist = await MonthlyPass.aggregate([
            {
                '$match': {
                    nfcCardId: nfcCard._id, isActive: true
                }
            }, {
                $sort: {
                    createdAt: -1
                }
            }, {
                $limit: 1
            }
        ])

        if (monthlyPassExist) {
            if (activeMonthlyPassExist.length <= 0) {

                // activeMonthlyPassExist = activeMonthlyPassExist[0]

                if (packageData && packageData.vehicleType == vehicleType) {

                    await MonthlyPass.create({
                        passHolderName: monthlyPassExist.passHolderName,
                        phoneNumber: monthlyPassExist.phoneNumber,
                        email: monthlyPassExist.email,
                        address: monthlyPassExist.address,
                        startDate: startDate,
                        endDate: endDate,
                        vehicleType: vehicleType,
                        parkingId: parkingId,
                        packageId: packageData._id,
                        amount: packageData.amount,
                        fromTime: packageData.fromTime,
                        toTime: packageData.toTime,
                        status: false,
                        isActive: true,
                        purchaseDate: formatDate(new Date()),
                        paymentType: paymentType,
                        cardNumber: nfcCard.cardNumber,
                        nfcCardId: nfcCard._id
                    }).then(createMonthlyPass => {

                        utils.commonResponce(
                            res,
                            200,
                            "Successfully renewed Monthly Pass",
                            createMonthlyPass
                        );
                    }).catch((err) => {
                        console.log("err", err)
                        utils.commonResponce(
                            res,
                            201,
                            "Error Occured While renewing Monthly Pass",
                            err.toString()
                        );
                    });

                } else {

                    utils.commonResponce(
                        res,
                        201,
                        "Active Package Details Not Found"
                    );
                }

            } else {

                utils.commonResponce(
                    res,
                    201,
                    "Active Card already exist"
                );
            }

        } else {

            utils.commonResponce(
                res,
                201,
                "Card details not found"
            );
        }


    } catch (error) {
        console.log("error", error)
        return res.status(500).json({
            status: 500,
            message: "Unexpected server error while renewing Monthly Pass",
        });
    }
}

exports.getMonthlyPass = async (req, res) => {
    try {

        await MonthlyPass.find().then(async (monthlyPassData) => {

            utils.commonResponce(
                res,
                200,
                "Successfully fetched Monthly Pass",
                monthlyPassData
            );

        }).catch((err) => {
            utils.commonResponce(
                res,
                201,
                "Error Occured While fetching Monthly Pass",
                err.toString()
            );
        });

    } catch {
        return res.status(500).json({
            status: 500,
            message: "Unexpected server error while creating Device",
        });
    }
}

exports.updateMonthlyPass = async (req, res) => {
    try {
        const monthlyPassId = req.body.monthlyPassId
        console.log("monthlyPassId",monthlyPassId)
        const isActive = req.body.isActive
        console.log("isActive",isActive)

        // const name = req.body.updateMonthlyPassData.updateName

        // const phoneNumber = req.body.updateMonthlyPassData.updatePhoneNumber;
        // const email = req.body.updateMonthlyPassData.updateEmail;
        // const address = req.body.updateMonthlyPassData.updateAdress;
        // const passDuration = req.body.updateMonthlyPassData.updatePassDuration;
        // const startMonth = req.body.updateMonthlyPassData.updateStartMonth
        // const endMonth = req.body.updateMonthlyPassData.updateEndMonth;
        // const cardNumber = req.body.updateMonthlyPassData.updateCardNumber;
        // const vehicalModel = req.body.updateMonthlyPassData.updateVehicalModel;
        // const vehicalColor = req.body.updateMonthlyPassData.updateVehicalColor;
        // const cardType = req.body.updateMonthlyPassData.updateCardType;
        // const licenseNumber = req.body.updateMonthlyPassData.updateLicenseNumber
        // // const designation = req.body.designation;
        // const amount = req.body.updateMonthlyPassData.updateAmount;

        const monthlyPassExist = await MonthlyPass.findById(monthlyPassId);
        console.log("monthlyPassExist",monthlyPassExist)
        if (monthlyPassExist && monthlyPassExist.isActive) {

            const options = { useFindAndModify: false, new: true };
            await MonthlyPass.findByIdAndUpdate(
                { _id: monthlyPassId },
                {
                    // name: name,
                    // phoneNumber: phoneNumber,
                    // email: email,
                    // address: address,
                    // passDuration: passDuration,
                    // startMonth: startMonth,
                    // endMonth: endMonth,
                    // cardNumber: cardNumber,
                    // vehicalModel: vehicalModel,
                    // vehicalColor: vehicalColor,
                    // cardType: cardType,
                    // amount: amount,
                    // licenseNumber: licenseNumber,
                    isActive: isActive,

                },
                options
            )
                .then(updateMonthlyPass => {

                    utils.commonResponce(res, 200, "Monthly Pass Updated Sucessfully", updateMonthlyPass)
                }).catch(function (error) {
                    console.log(error);
                    utils.commonResponce(res, 201, "Error while update Monthly Pass ", error.toString())

                });
        } else {
            utils.commonResponce(res, 201, "Active Monthly Pass not found ")
        }

    } catch (error) {
        console.log(error)
    }
}