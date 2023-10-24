const Opretor = require("../models/Opretor");
const utils = require("./utils")
const Bluebird = require("bluebird");
const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");


exports.createOpretor = async (req, res) => {
    try {

        const opretorName = req.body.opretorName
        let opretorNo = req.body.opretorNo
        const parkingId = req.body.parkingId
        const mobileNo = req.body.mobileNo
        const opretorEmail = req.body.opretorEmail
        const username = req.body.username
        const password = req.body.password
        const isSupervisor = req.body.isSupervisor

        if(opretorNo.length==1)
        opretorNo = '0'+opretorNo

        const hashedPassword = await bcrypt.hash(
            password,
            12
        );

        let supervisorPin = null
        if (isSupervisor) {
            // get All pincode
            const existingSupervisorPinParkiongWise = await Opretor.aggregate([
                {
                    '$match': {
                        parkingId: mongoose.Types.ObjectId(parkingId),
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
        }

        const findOpratorWithSameUsername = await Opretor.findOne({ username: username })
        if (findOpratorWithSameUsername)
            utils.commonResponce(
                res,
                201,
                "Username already exist",
            );
        else
            await Opretor.create({
                opretorName: opretorName,
                opretorNo: opretorNo,
                parkingId: parkingId,
                mobileNo: mobileNo,
                opretorEmail: opretorEmail,
                username: username,
                password: hashedPassword,
                isSupervisor: isSupervisor,
                supervisorPin: supervisorPin,
                isActive: true,
            }).then(async (createdOpretor) => {

                await Opretor.find().then(async (opretorData) => {


                    utils.commonResponce(
                        res,
                        200,
                        "Successfully created Opretor",
                        opretorData
                    );

                }).catch((err) => {
                    utils.commonResponce(
                        res,
                        201,
                        "Error Occured While fetching Opretor",
                        err.toString()
                    );
                });

            }).catch((err) => {
                utils.commonResponce(
                    res,
                    201,
                    "Error Occured While creating Opretor",
                    err.toString()
                );
            });

    } catch (error) {
        console.log('error: ', error);
        return res.status(500).json({
            status: 500,
            message: "Unexpected server error while creating Opretor",
        });
    }
}
exports.updateOperator = async (req, res) => {
    try {

        const operatorId = req.body.updateOpertorData.operatorId
        const opretorName = req.body.updateOpertorData.updateOpretorName;
        let opretorNo = req.body.updateOpertorData.updateOperatorNumber;
        const mobileNo = req.body.updateOpertorData.updateMobileNumber;
        const opretorEmail = req.body.updateOpertorData.updateOperatorEmail;
        const username = req.body.updateOpertorData.updateUserName;
        const password = req.body.updateOpertorData.updatePassword;
        const isSupervisor = req.body.updateOpertorData.updateIsSupervisor;
        const parkingId = req.body.updateOpertorData.updateParkingId

        if(opretorNo.length==1)
        opretorNo = '0'+opretorNo

        const hashedPassword = await bcrypt.hash(
            password,
            12
        );
        const operatorExist = await Opretor.findById({ _id: operatorId });
        if (operatorExist) {
            const options = { useFindAndModify: false, new: true };
            await Opretor.findByIdAndUpdate(
                { _id: operatorId },
                {
                    opretorName: opretorName,
                    opretorNo: opretorNo,
                    mobileNo: mobileNo,
                    opretorEmail: opretorEmail,
                    username: username,
                    password: hashedPassword,
                    isSupervisor: isSupervisor,
                    parkingId: parkingId
                },
                options

            ).then(updatedOperator => {
                utils.commonResponce(
                    res,
                    200,
                    "Successfully Update Operator",
                    updatedOperator
                );
            })
                .catch((err) => {
                    console.log("err", err)
                    utils.commonResponce(
                        res,
                        201,
                        "Error Occured While Updated Operator",
                        err.toString()
                    );
                });


        }
    } catch (error) {
        console.log("error", error)
        return res.status(500).json({
            status: 500,
            message: "Unexpected server error while updating Opertor",
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

exports.getOpretors = async (req, res) => {
    try {
        await Opretor.find().then(async (opretorData) => {

            utils.commonResponce(
                res,
                200,
                "Successfully fetched Opretor",
                opretorData
            );

        }).catch((err) => {
            utils.commonResponce(
                res,
                201,
                "Error Occured While fetching Opretor",
                err.toString()
            );
        });

    } catch (error) {
        console.log('error: ', error);
        return res.status(500).json({
            status: 500,
            message: "Unexpected server error while creating Opretor",
        });
    }
}

exports.getSupervisorPin = async (req, res) => {
    try {
        const opretorId = req.body.opretorId;

        await Opretor.findOne({ opretorId: mongoose.Types.ObjectId(opretorId), isSupervisor: true }).then(async (opretorData) => {
            utils.commonResponce(
                res,
                200,
                "Successfully fetched Opretor",
                opretorData
            );

        }).catch((err) => {
            utils.commonResponce(
                res,
                201,
                "Error Occured While fetching Opretor",
                err.toString()
            );
        });

    } catch (error) {
        console.log('error: ', error);
        return res.status(500).json({
            status: 500,
            message: "Unexpected server error while creating Opretor",
        });
    }
}
