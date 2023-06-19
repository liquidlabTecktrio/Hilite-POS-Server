const Shift = require("../models/Shift");
const Opretor = require("../models/Opretor");
const utils = require("./utils")
const moment = require("moment-timezone");
const mongoose = require("mongoose")
const SerialNumbers = require("../models/SerialNumbers");


exports.startShift = async (req, res) => {
  try {

    const opretorId = req.body.opretorId;
    const parkingId = req.body.parkingId;

    const isShiftActiveExist = await Shift.findOne({
      opretorId: opretorId,
      isActive: true
    })


    let findSerialNumbers = await SerialNumbers.findOne({
      parkingId: parkingId
    })

    if (!findSerialNumbers)
      await SerialNumbers.create({ parkingId, shiftNo: 1001 }).then(created => {
        findSerialNumbers = created
      })

    if (isShiftActiveExist) {
      utils.commonResponce(
        res,
        201,
        "shift already open for Opretor"
      );
    } else {

      await Shift.create({
        shiftNo: findSerialNumbers.shiftNo,
        opretorId: opretorId,
        parkingId: parkingId,
        shiftStartTime: moment.unix(Date.now() / 1000).tz("Asia/Calcutta").format("DD-MM-YYYY HH:mm:ss"),
        isActive: true
      }).then(async (shiftData) => {

        await Opretor.findByIdAndUpdate(opretorId, {
          isShiftIn: true
        })

        utils.commonResponce(
          res,
          200,
          "Successfully created shift",
          {
            shiftData: shiftData
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

  const shiftId = req.body.shiftId;

  // checking shift exist or not
  const findShift = await Shift.findOne(
    {
      _id: mongoose.Types.ObjectId(shiftId),
      isActive: true
    }
  );
  if (findShift) {

    await Shift.findByIdAndUpdate(shiftId, {
      shiftStopTime: moment.unix(Date.now() / 1000).tz("Asia/Calcutta").format("DD-MM-YYYY HH:mm:ss"),
      isActive: false
    }, { new: true }).then(async (shiftData) => {

      await Opretor.findByIdAndUpdate(findShift.opretorId, {
        isShiftIn: false
      })

      return res.status(200).json({
        status: 200,
        message: "shift closed successfull",
        data: {
          shiftData: shiftData
        },
      });

    })

  } else {
    return res.status(404).json({
      status: 404,
      message: "active shift not found",
    });
  }
};