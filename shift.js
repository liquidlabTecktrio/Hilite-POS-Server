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
      await SerialNumbers.create({ parkingId, shiftNo: 1001, receiptNo: 1001 }).then(created => {
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


        await SerialNumbers.findOneAndUpdate({ parkingId }, {
          $inc: { shiftNo: 1 }
        }, { returnNewDocument: true })

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

function getShiftEndDeatils() {
  return [
    {
      vehicleType: '2 Wheeler',
      Count: 0,
      Collection_Cash: 0,
      Collection_UPI: 0,
      Lost_Ticket_Count: 0,
      Lost_Ticket_Collection_Cash: 0,
      Lost_Ticket_Collection_UPI: 0,
      Over_Night_Vehicle_Count: 0,
      Over_Night_Vehicle_Collection_Cash: 0,
      Over_Night_Vehicle_Collection_UPI: 0,
      Total: 0
    },
    {
      vehicleType: '4 Wheeler',
      Count: 0,
      Collection_Cash: 0,
      Collection_UPI: 0,
      Lost_Ticket_Count: 0,
      Lost_Ticket_Collection_Cash: 0,
      Lost_Ticket_Collection_UPI: 0,
      Over_Night_Vehicle_Count: 0,
      Over_Night_Vehicle_Collection_Cash: 0,
      Over_Night_Vehicle_Collection_UPI: 0,
      Total: 0
    },
    {
      vehicleType: 'Bicycle',
      Count: 0,
      Collection_Cash: 0,
      Collection_UPI: 0,
      Lost_Ticket_Count: 0,
      Lost_Ticket_Collection_Cash: 0,
      Lost_Ticket_Collection_UPI: 0,
      Over_Night_Vehicle_Count: 0,
      Over_Night_Vehicle_Collection_Cash: 0,
      Over_Night_Vehicle_Collection_UPI: 0,
      Total: 0
    },
    // {
    //   vehicleType: 'Total',
    //   Count: 0,
    //   Collection_Cash: 0,
    //   Collection_UPI: 0,
    //   Lost_Ticket_Count: 0,
    //   Lost_Ticket_Collection_Cash: 0,
    //   Lost_Ticket_Collection_UPI: 0,
    //   Over_Night_Vehicle_Count: 0,
    //   Over_Night_Vehicle_Collection_Cash: 0,
    //   Over_Night_Vehicle_Collection_UPI: 0,
    //   Total: 0
    // }
  ]
}

exports.closeShift_v2 = async (req, res, next) => {
  try {

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


      let _shiftData = await Shift.aggregate([
        {
          '$match': {
            '_id': mongoose.Types.ObjectId(findShift._id)
          }
        }, {
          '$lookup': {
            'from': 'tickets',
            'localField': '_id',
            'foreignField': 'shiftId',
            // 'foreignField': 'exitShiftId',
            'as': 'tickets'
          }
        }
      ])

      let _shiftDataWithExitTickets = await Shift.aggregate([
        {
          '$match': {
            '_id': mongoose.Types.ObjectId(findShift._id)
          }
        }, {
          '$lookup': {
            'from': 'tickets',
            'localField': '_id',
            // 'foreignField': 'shiftId',
            'foreignField': 'exitShiftId',
            'as': 'tickets'
          }
        }
      ])


      console.log('closeShift_v2 length: ', _shiftData.length);

      _shiftData = _shiftData[0]
      _shiftData = JSON.parse(JSON.stringify(_shiftData))

      _shiftData.shiftEndDetails = getShiftEndDeatils()
      _shiftData.Count = 0;
      _shiftData.Collection_Cash = 0;
      _shiftData.Collection_UPI = 0;
      _shiftData.Lost_Ticket_Count = 0;
      _shiftData.Lost_Ticket_Collection_Cash = 0;
      _shiftData.Lost_Ticket_Collection_UPI = 0;
      _shiftData.Over_Night_Vehicle_Count = 0;
      _shiftData.Over_Night_Vehicle_Collection_Cash = 0;
      _shiftData.Over_Night_Vehicle_Collection_UPI = 0;
      _shiftData.Total = 0;

      let vehicleTypes = ['2', '4', 'Bicycle']

      
      if (_shiftData.tickets.length > 0) {

        _shiftData.tickets.map(ticket => {
          switch (ticket.vehicleType) {
            case '4':
              _shiftData.shiftEndDetails[vehicleTypes.indexOf('4')].Count += 1
              // _shiftData.shiftEndDetails[vehicleTypes.indexOf('Total')].Count += 1
              _shiftData.Count += 1


              // if (ticket.lostTicket) {
              //   _shiftData.shiftEndDetails[vehicleTypes.indexOf('4')].Lost_Ticket_Count += 1
              //   // _shiftData.shiftEndDetails[vehicleTypes.indexOf('Total')].Lost_Ticket_Count += 1
              //   _shiftData.Lost_Ticket_Count += 1
              // }

              // if (ticket.amount > 0) {
              //   _shiftData.shiftEndDetails[vehicleTypes.indexOf('4')].Total += ticket.amount
              //   _shiftData.Total += ticket.amount


              //   if (ticket.paymentType == 'cash') {
              //     _shiftData.shiftEndDetails[vehicleTypes.indexOf('4')].Collection_Cash += ticket.amount
              //     // _shiftData.shiftEndDetails[vehicleTypes.indexOf('Total')].Collection_Cash += ticket.amount
              //     _shiftData.Collection_Cash += ticket.amount

              //     if (ticket.lostTicket) {
              //       _shiftData.shiftEndDetails[vehicleTypes.indexOf('4')].Lost_Ticket_Collection_Cash += ticket.amount
              //       // _shiftData.shiftEndDetails[vehicleTypes.indexOf('Total')].Lost_Ticket_Collection_Cash += ticket.amount
              //       _shiftData.Lost_Ticket_Collection_Cash += ticket.amount
              //     }
              //   }

              //   if (ticket.paymentType == 'upi') {
              //     _shiftData.shiftEndDetails[vehicleTypes.indexOf('4')].Collection_UPI += ticket.amount
              //     // _shiftData.shiftEndDetails[vehicleTypes.indexOf('Total')].Collection_UPI += ticket.amount
              //     _shiftData.Collection_UPI += ticket.amount

              //     if (ticket.lostTicket) {
              //       _shiftData.shiftEndDetails[vehicleTypes.indexOf('4')].Lost_Ticket_Collection_UPI += ticket.amount
              //       // _shiftData.shiftEndDetails[vehicleTypes.indexOf('Total')].Lost_Ticket_Collection_UPI += ticket.amount
              //       _shiftData.Lost_Ticket_Collection_UPI += ticket.amount
              //     }
              //   }
              // }

              break;

            case '2':
              _shiftData.shiftEndDetails[vehicleTypes.indexOf('2')].Count += 1
              // _shiftData.shiftEndDetails[vehicleTypes.indexOf('Total')].Count += 1
              _shiftData.Count += 1


              // if (ticket.lostTicket) {
              //   _shiftData.shiftEndDetails[vehicleTypes.indexOf('2')].Lost_Ticket_Count += 1
              //   // _shiftData.shiftEndDetails[vehicleTypes.indexOf('Total')].Lost_Ticket_Count += 1
              //   _shiftData.Lost_Ticket_Count += 1
              // }

              // if (ticket.amount > 0) {
              //   _shiftData.shiftEndDetails[vehicleTypes.indexOf('2')].Total += ticket.amount
              //   _shiftData.Total += ticket.amount

              //   if (ticket.paymentType == 'cash') {
              //     _shiftData.shiftEndDetails[vehicleTypes.indexOf('2')].Collection_Cash += ticket.amount
              //     // _shiftData.shiftEndDetails[vehicleTypes.indexOf('Total')].Collection_Cash += ticket.amount
              //     _shiftData.Collection_Cash += ticket.amount

              //     if (ticket.lostTicket) {
              //       _shiftData.shiftEndDetails[vehicleTypes.indexOf('2')].Lost_Ticket_Collection_Cash += ticket.amount
              //       // _shiftData.shiftEndDetails[vehicleTypes.indexOf('Total')].Lost_Ticket_Collection_Cash += ticket.amount
              //       _shiftData.Lost_Ticket_Collection_Cash += ticket.amount
              //     }
              //   }

              //   if (ticket.paymentType == 'upi') {
              //     _shiftData.shiftEndDetails[vehicleTypes.indexOf('2')].Collection_UPI += ticket.amount
              //     // _shiftData.shiftEndDetails[vehicleTypes.indexOf('Total')].Collection_UPI += ticket.amount
              //     _shiftData.Collection_UPI += ticket.amount

              //     if (ticket.lostTicket) {
              //       _shiftData.shiftEndDetails[vehicleTypes.indexOf('2')].Lost_Ticket_Collection_UPI += ticket.amount
              //       // _shiftData.shiftEndDetails[vehicleTypes.indexOf('Total')].Lost_Ticket_Collection_UPI += ticket.amount
              //       _shiftData.Lost_Ticket_Collection_UPI += ticket.amount
              //     }
              //   }
              // }

              break;

            case '3':

              _shiftData.shiftEndDetails[vehicleTypes.indexOf('Bicycle')].Count += 1
              // _shiftData.shiftEndDetails[vehicleTypes.indexOf('Total')].Count += 1
              _shiftData.Count += 1

              // if (ticket.lostTicket) {
              //   _shiftData.shiftEndDetails[vehicleTypes.indexOf('Bicycle')].Lost_Ticket_Count += 1
              //   // _shiftData.shiftEndDetails[vehicleTypes.indexOf('Total')].Lost_Ticket_Count += 1
              //   _shiftData.Lost_Ticket_Count += 1
              // }

              // if (ticket.amount > 0) {
              //   _shiftData.shiftEndDetails[vehicleTypes.indexOf('Bicycle')].Total += ticket.amount
              //   _shiftData.Total += ticket.amount

              //   if (ticket.paymentType == 'cash') {
              //     _shiftData.shiftEndDetails[vehicleTypes.indexOf('Bicycle')].Collection_Cash += ticket.amount
              //     // _shiftData.shiftEndDetails[vehicleTypes.indexOf('Total')].Collection_Cash += ticket.amount
              //     _shiftData.Collection_Cash += ticket.amount

              //     if (ticket.lostTicket) {
              //       _shiftData.shiftEndDetails[vehicleTypes.indexOf('Bicycle')].Lost_Ticket_Collection_Cash += ticket.amount
              //       // _shiftData.shiftEndDetails[vehicleTypes.indexOf('Total')].Lost_Ticket_Collection_Cash += ticket.amount
              //       _shiftData.Lost_Ticket_Collection_Cash += ticket.amount
              //     }
              //   }

              //   if (ticket.paymentType == 'upi') {
              //     _shiftData.shiftEndDetails[vehicleTypes.indexOf('Bicycle')].Collection_UPI += ticket.amount
              //     // _shiftData.shiftEndDetails[vehicleTypes.indexOf('Total')].Collection_UPI += ticket.amount
              //     _shiftData.Collection_UPI += ticket.amount

              //     if (ticket.lostTicket) {
              //       _shiftData.shiftEndDetails[vehicleTypes.indexOf('Bicycle')].Lost_Ticket_Collection_UPI += ticket.amount
              //       // _shiftData.shiftEndDetails[vehicleTypes.indexOf('Total')].Lost_Ticket_Collection_UPI += ticket.amount
              //       _shiftData.Lost_Ticket_Collection_UPI += ticket.amount
              //     }
              //   }
              // }

              break;

            default:
              break;
          }

        })

        delete _shiftData.tickets

      }

      if (_shiftDataWithExitTickets.length == 1) {

        _shiftDataWithExitTickets = _shiftDataWithExitTickets[0]
      _shiftDataWithExitTickets = JSON.parse(JSON.stringify(_shiftDataWithExitTickets))
    
        // let vehicleTypes = ['2', '4', 'Bicycle', 'Total']

        _shiftDataWithExitTickets.tickets.map(ticket => {
          switch (ticket.vehicleType) {
            case '4':
              _shiftData.shiftEndDetails[vehicleTypes.indexOf('4')].Count += 1
              // _shiftData.shiftEndDetails[vehicleTypes.indexOf('Total')].Count += 1
              _shiftData.Count += 1


              if (ticket.lostTicket) {
                _shiftData.shiftEndDetails[vehicleTypes.indexOf('4')].Lost_Ticket_Count += 1
                // _shiftData.shiftEndDetails[vehicleTypes.indexOf('Total')].Lost_Ticket_Count += 1
                _shiftData.Lost_Ticket_Count += 1
              }

              if (ticket.amount > 0) {
                _shiftData.shiftEndDetails[vehicleTypes.indexOf('4')].Total += ticket.amount
                _shiftData.Total += ticket.amount


                if (ticket.paymentType == 'cash') {
                  _shiftData.shiftEndDetails[vehicleTypes.indexOf('4')].Collection_Cash += ticket.amount
                  // _shiftData.shiftEndDetails[vehicleTypes.indexOf('Total')].Collection_Cash += ticket.amount
                  _shiftData.Collection_Cash += ticket.amount

                  if (ticket.lostTicket) {
                    _shiftData.shiftEndDetails[vehicleTypes.indexOf('4')].Lost_Ticket_Collection_Cash += ticket.amount
                    // _shiftData.shiftEndDetails[vehicleTypes.indexOf('Total')].Lost_Ticket_Collection_Cash += ticket.amount
                    _shiftData.Lost_Ticket_Collection_Cash += ticket.amount
                  }
                }

                if (ticket.paymentType == 'upi') {
                  _shiftData.shiftEndDetails[vehicleTypes.indexOf('4')].Collection_UPI += ticket.amount
                  // _shiftData.shiftEndDetails[vehicleTypes.indexOf('Total')].Collection_UPI += ticket.amount
                  _shiftData.Collection_UPI += ticket.amount

                  if (ticket.lostTicket) {
                    _shiftData.shiftEndDetails[vehicleTypes.indexOf('4')].Lost_Ticket_Collection_UPI += ticket.amount
                    // _shiftData.shiftEndDetails[vehicleTypes.indexOf('Total')].Lost_Ticket_Collection_UPI += ticket.amount
                    _shiftData.Lost_Ticket_Collection_UPI += ticket.amount
                  }
                }
              }

              break;

            case '2':

              _shiftData.shiftEndDetails[vehicleTypes.indexOf('2')].Count += 1
              // _shiftData.shiftEndDetails[vehicleTypes.indexOf('Total')].Count += 1
              _shiftData.Count += 1


              if (ticket.lostTicket) {
                _shiftData.shiftEndDetails[vehicleTypes.indexOf('2')].Lost_Ticket_Count += 1
                // _shiftData.shiftEndDetails[vehicleTypes.indexOf('Total')].Lost_Ticket_Count += 1
                _shiftData.Lost_Ticket_Count += 1
              }

              if (ticket.amount > 0) {
                _shiftData.shiftEndDetails[vehicleTypes.indexOf('2')].Total += ticket.amount
                _shiftData.Total += ticket.amount

                if (ticket.paymentType == 'cash') {
                  _shiftData.shiftEndDetails[vehicleTypes.indexOf('2')].Collection_Cash += ticket.amount
                  // _shiftData.shiftEndDetails[vehicleTypes.indexOf('Total')].Collection_Cash += ticket.amount
                  _shiftData.Collection_Cash += ticket.amount

                  if (ticket.lostTicket) {
                    _shiftData.shiftEndDetails[vehicleTypes.indexOf('2')].Lost_Ticket_Collection_Cash += ticket.amount
                    // _shiftData.shiftEndDetails[vehicleTypes.indexOf('Total')].Lost_Ticket_Collection_Cash += ticket.amount
                    _shiftData.Lost_Ticket_Collection_Cash += ticket.amount
                  }
                }

                if (ticket.paymentType == 'upi') {
                  _shiftData.shiftEndDetails[vehicleTypes.indexOf('2')].Collection_UPI += ticket.amount
                  // _shiftData.shiftEndDetails[vehicleTypes.indexOf('Total')].Collection_UPI += ticket.amount
                  _shiftData.Collection_UPI += ticket.amount

                  if (ticket.lostTicket) {
                    _shiftData.shiftEndDetails[vehicleTypes.indexOf('2')].Lost_Ticket_Collection_UPI += ticket.amount
                    // _shiftData.shiftEndDetails[vehicleTypes.indexOf('Total')].Lost_Ticket_Collection_UPI += ticket.amount
                    _shiftData.Lost_Ticket_Collection_UPI += ticket.amount
                  }
                }
              }

              break;

            case '3':

              _shiftData.shiftEndDetails[vehicleTypes.indexOf('Bicycle')].Count += 1
              // _shiftData.shiftEndDetails[vehicleTypes.indexOf('Total')].Count += 1
              _shiftData.Count += 1

              if (ticket.lostTicket) {
                _shiftData.shiftEndDetails[vehicleTypes.indexOf('Bicycle')].Lost_Ticket_Count += 1
                // _shiftData.shiftEndDetails[vehicleTypes.indexOf('Total')].Lost_Ticket_Count += 1
                _shiftData.Lost_Ticket_Count += 1
              }

              if (ticket.amount > 0) {
                _shiftData.shiftEndDetails[vehicleTypes.indexOf('Bicycle')].Total += ticket.amount
                _shiftData.Total += ticket.amount

                if (ticket.paymentType == 'cash') {
                  _shiftData.shiftEndDetails[vehicleTypes.indexOf('Bicycle')].Collection_Cash += ticket.amount
                  // _shiftData.shiftEndDetails[vehicleTypes.indexOf('Total')].Collection_Cash += ticket.amount
                  _shiftData.Collection_Cash += ticket.amount

                  if (ticket.lostTicket) {
                    _shiftData.shiftEndDetails[vehicleTypes.indexOf('Bicycle')].Lost_Ticket_Collection_Cash += ticket.amount
                    // _shiftData.shiftEndDetails[vehicleTypes.indexOf('Total')].Lost_Ticket_Collection_Cash += ticket.amount
                    _shiftData.Lost_Ticket_Collection_Cash += ticket.amount
                  }
                }

                if (ticket.paymentType == 'upi') {
                  _shiftData.shiftEndDetails[vehicleTypes.indexOf('Bicycle')].Collection_UPI += ticket.amount
                  // _shiftData.shiftEndDetails[vehicleTypes.indexOf('Total')].Collection_UPI += ticket.amount
                  _shiftData.Collection_UPI += ticket.amount

                  if (ticket.lostTicket) {
                    _shiftData.shiftEndDetails[vehicleTypes.indexOf('Bicycle')].Lost_Ticket_Collection_UPI += ticket.amount
                    // _shiftData.shiftEndDetails[vehicleTypes.indexOf('Total')].Lost_Ticket_Collection_UPI += ticket.amount
                    _shiftData.Lost_Ticket_Collection_UPI += ticket.amount
                  }
                }
              }

              break;

            default:
              break;
          }

        })

        delete _shiftData.tickets

      }

      // console.log('closeShift_v2 length: ', _shiftData);



      return res.status(200).json({
        status: 200,
        message: "shift closed successfull",
        data: {
          shiftData:
            // shiftData
            _shiftData
        },
      });

      })

    } else {
      return res.status(404).json({
        status: 404,
        message: "active shift not found",
      });
    }
  } catch (error) {
    console.log('error: ', error);
    return res.status(500).json({
      status: 500,
      message: "server error",
    });
  }

};