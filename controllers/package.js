const Package = require("../models/Package")
const utils = require("./utils")
const mongoose = require("mongoose");

exports.createPackage = async (req, res) => {
    try {
        const packageName = req.body.packageName
        const validityType = req.body.validityType
        const validity = req.body.validity
        const vehicalType = req.body.vehicalType
        const fromTime = req.body.fromTime
        const toTime = req.body.toTime
        const amount = req.body.amount

        await Package.create({
            packageName: packageName,
            validityType: validityType,
            validity: validity,
            vehicalType: vehicalType,
            fromTime: fromTime,
            toTime: toTime,
            amount: amount
            
        }).then(async(packagesData) => {

            await Package.find().then(async (packagesData) => {
                utils.commonResponce(
                    res,
                    200,
                    "Successfully created Package",
                    packagesData
                );
            }).catch((err) => {
                utils.commonResponce(
                    res,
                    201,
                    "Error Occured While fetching Package",
                    err.toString()
                );
            });

        }).catch((err) => {
            console.log("err", err)
            utils.commonResponce(
                res,
                201,
                "Error Occured While fetching Package",
                err.toString()
            );
        });


    } catch (error) {
        console.log("error", error)
        return res.status(500).json({
            status: 500,
            message: "Unexpected server error while creating Package",
        });
    }
}

exports.updatePackage = async (req,res)=>{
    try{
     const packageId = req.body.packageId;
     const packageName = req.body.packageName
     const validityType = req.body.validityType
     const validity = req.body.validity
     const vehicalType = req.body.vehicalType
     const fromTime = req.body.fromTime
     const toTime = req.body.toTime
     const amount = req.body.amount


    const parkingExist =  await Parking.findById({ _id: parkingId });
    if(parkingExist){
        const options = { useFindAndModify: false, new: true };
        
        await Package.findByIdAndUpdate(
           { _id:packageId},
            {
                packageName: packageName,
                validityType: validityType,
                validity: validity,
                vehicalType: vehicalType,
                fromTime: fromTime,
                toTime: toTime,
                amount: amount
        },
        options
        
        ) .then( updatedParking => {
            utils.commonResponce(
                res,
                200,
                "Successfully Update Package",
                updatedParking
            );
        })
        .catch((err) => {
            console.log("err",err)
            utils.commonResponce(
                res,
                201,
                "Error Occured While Updated Package",
                err.toString()
            );
        });


    }
    }catch(error){
       console.log("error",error)
       return res.status(500).json({
        status: 500,
        message: "Unexpected server error while updating Package",
      });
    }
}

exports.getPackages = async (req, res) => {
    try {

        await Package.find().then(async (packagesData) => {


            utils.commonResponce(
                res,
                200,
                "Successfully fetched Package",
                packagesData
            );

        }).catch((err) => {
            utils.commonResponce(
                res,
                201,
                "Error Occured While fetching Package",
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
