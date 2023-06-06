const Shift = require("../models/Shift");
const Opretor = require("../models/Opretor");
const utils = require("./utils")
const moment = require("moment-timezone");
const mongoose = require("mongoose")


exports.startShift = async (req, res) => {
  try {

    const opretorId = req.body.opretorId;
    const parkingId = req.body.parkingId;

    const isShiftActiveExist = await Shift.findOne({
        opretorId: opretorId,
          parkingId: parkingId,
          isActive:true
    })

    if(isShiftActiveExist){
        utils.commonResponce(
            res,
            201,
            "shift already open for Opretor"
        );
    }else{

        await Shift.create({
            opretorId: opretorId,
            parkingId: parkingId,
            shiftStartTime: moment.unix(Date.now() / 1000).tz("Asia/Calcutta").format("DD-MM-YYYY HH:mm:ss"),
            isActive:true
        }).then(async (shiftData) => {

          await Opretor.findByIdAndUpdate(opretorId, {
            isShiftIn:true
          })
    
            utils.commonResponce(
                res,
                200,
                "Successfully created shift",
                {
                  shiftId:shiftData._id,
                  opretorId:opretorId,
                  parkingId:parkingId
                }
            );
    
        }).catch((err) => {
            utils.commonResponce(
                res,
                201,
                "Error Occured While creating shift",
                err.toString()
            );
        });
    }


  } catch {
      return res.status(500).json({
          status: 500,
          message: "Unexpected server error while creating shift",
      });
  }
}

exports.closeShift = async (req, res, next) => {
    const username = req.body.username;
    const userId = req.body.userId;
    const entryTime = req.body.entryTime;
    const exitTime = req.body.exitTime;
    const payments = req.body.payments;
    const shiftId = req.body.shiftId;
  
    const newDate = new Date()
    const date = newDate.getDate() + '-' + (newDate.getMonth() + 1) + '-' + newDate.getFullYear()
  
    // checking admin exist or not
    const findShift = await Shift.findOne(
      {
        _id:mongoose.Types.ObjectId(shiftId),
        username:username,
        userId:mongoose.Types.ObjectId(userId),
        isActive:true
      }
      );
    if (findShift) {
  
      await Shift.findByIdAndUpdate(shiftId,{
        username: username,
        userId: mongoose.Types.ObjectId(userId),
        entryTime: entryTime,
        exitTime: exitTime,
        payments: payments,
        date: date,
        isActive:false
      }).then(async (userData) => {
  
        // await User.findOneAndUpdate({ username: username }, {
        //   isLogedIn: false,
        //   logOutTime: exitTime,
        //   lastLogin: exitTime
        // }).then((shiftCreatedData) => {
  
          return res.status(200).json({
            status: 200,
            message: "shift closed successfull",
            data: {
              username: username,
              userId: findShift.userId,
              entryTime: findShift.entryTime,
              exitTime: exitTime,
            },
          });
        // }).catch((error) => {
        //   console.log('error: ', error);
        //   return res.status(201).json({
        //     status: 201,
        //     message: error
        //   });
        // })
  
  
      })
  
    } else {
      return res.status(404).json({
        status: 404,
        message: "active shift not found",
      });
    }
  };