const opretorController = require("../controllers/opretor");
const Opretor = require("../models/Opretor");
const utils = require("./utils")
const Bluebird = require("bluebird");
const mongoose = require("mongoose");


exports.createOpretor = async (req, res) => {
    try {

        const opretorName = req.body.opretorName
        const opretorNo = req.body.opretorNo
        const parkingId = req.body.parkingId
        const mobileNo = req.body.mobileNo
        const opretorEmail = req.body.opretorEmail
        const username = req.body.username
        const password = req.body.password
        

        await Opretor.create({
            opretorName: opretorName,
            opretorNo: opretorNo,
            parkingId: parkingId,
            mobileNo: mobileNo,
            opretorEmail: opretorEmail,
            username: username,
            password: password,
            isActive: true,
        }).then(async (createdOpretor) => {

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
                    202,
                    "Error Occured While fetching Opretor",
                    err.toString()
                );
            });

        }).catch((err) => {
            utils.commonResponce(
                res,
                202,
                "Error Occured While creating Opretor",
                err.toString()
            );
        });

    } catch {
        return res.status(500).json({
            status: 500,
            message: "Unexpected server error while creating Opretor",
        });
    }
}

