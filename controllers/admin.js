const Admin = require("../models/Admin");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const moment = require("moment-timezone");
const Parking = require("../models/Parking");
const Opretor = require("../models/Opretor");
const Device = require("../models/Device");
// const Receipt = require("../models/Receipt");
const Shift = require("../models/Shift");
const Tariff = require("../models/Tariff");
const mongoose = require("mongoose")


exports.adminLogin = async (req, res, next) => {
  const username = req.body.username;
  const password = req.body.password;

  //console.log("login");
  // validate the request
  const validation = await validateUserInput(username, password);
  if (validation) {
    return res.status(400).json({
      status: 400,
      message: "username and password should not be empty",
    });
  }

  // checking admin exist or not
  const findAdmin = await Admin.findOne({ username: username });
  if (findAdmin) {
    // comparing the password
    const comparePassword = await bcrypt.compare(password, findAdmin.password);
    if (!comparePassword) {
      return res.status(404).json({
        status: 404,
        message: "username/password is incorrect!!!",
      });
    }

    // generate token
    const token = await generateToken(findAdmin._id);

    return res.status(200).json({
      status: 200,
      message: "admin login successfull",
      data: {
        token: token,
        username: username,
        id: findAdmin._id,
      },
    });
  } else {
    return res.status(404).json({
      status: 404,
      message: "admin not found",
    });
  }
};

const validateUserInput = async (username, password) => {
  if (
    username == null ||
    password == null ||
    username == "" ||
    password == "" ||
    username == undefined ||
    password == undefined
  ) {
    return true;
  } else {
    return false;
  }
};

const generateToken = async (admin_id) => {
  const token = await jwt.sign({ admin_id: admin_id }, process.env.JWT_SECRET, {
    expiresIn: "2h",
  });

  return token;
};

exports.appLogin = async (req, res, next) => {
  const username = req.body.username;
  const password = req.body.password;

  // validate the request
  const validation = await validateUserInput(username, password);
  if (validation) {
    return res.status(400).json({
      status: 400,
      message: "username and password should not be empty",
    });
  }

  // checking admin exist or not
  const findOpretor = await Opretor.findOne({ username: username });
  if (findOpretor) {
    // comparing the password
    const comparePassword = await bcrypt.compare(password, findOpretor.password);
    if (!comparePassword) {
      return res.status(404).json({
        status: 404,
        message: "username/password is incorrect!!!",
      });
    } else {

      if (findOpretor.isLogedIn) {

        return res.status(201).json({
          status: 201,
          message: "you can login only one device at a time or logout from other devices!!!",
        });
      } else {

        const findParking = await Parking.findById(findOpretor.parkingId)

        let activeTariffIds = []
        if (findParking) {
          let tariffData = []

          // findParking.connectedTariff.map(t=> t.filter(t => t.dayIndex == new Date().getDay()).map(t => activeTariffIds.push(mongoose.Types.ObjectId(t.tariffId))))
          // const type2TariffID = findParking.connectedTariff.filter(t => t.tariffType == 2).
          const data1 = returnTariffID(2)
          if (data1.tariffId) {
            const data_1 = await Tariff.findById(data1.tariffId)
            tariffData.push({
              tariffType: data1.tariffType,
              tariffData: data_1
            })
          }

          const data2 = returnTariffID(3)
          if (data2.tariffId) {
            const data_2 = await Tariff.findById(data2.tariffId)
            tariffData.push({
              tariffType: data2.tariffType,
              tariffData: data_2
            })
          }

          const data3 = returnTariffID(4)

          if (data3.tariffId) {
            const data_3 = await Tariff.findById(data3.tariffId)
            tariffData.push({
              tariffType: data3.tariffType,
              tariffData: data_3
            })
          }


          function returnTariffID(tariffType) {
            let obj = {}
            const dayIndex = new Date().getDay()
            const data = findParking.connectedTariff.filter(t => t.tariffType == tariffType)
            if (data.length == 1) {

              const data2 = data[0].tariffData.filter(t => t.dayIndex == dayIndex)
              if (data2.length > 0)
                // activeTariffIds.push(
                obj =
                {
                  // tariffId: mongoose.Types.ObjectId(data2[0].tariffId),
                  // tariffId: 'ObjectId(' + data2[0].tariffId + ')',
                  tariffId: data2[0].tariffId,
                  tariffType: tariffType
                }
              // )
            }
            return obj
          }

          // const findParking.cennectedTariff.filter(t=> t.dayIndex == new Date().getDay())
          console.log('activeTariffIds: ', activeTariffIds);

          // const tariffData = await Tariff.aggregate([
          //   {
          //     '$addFields': {
          //       'activeTariffIds': activeTariffIds
          //     }
          //   },
          //   {
          //     '$unwind': {
          //       'path': '$activeTariffIds'
          //     }
          //   },
          //   {
          //     '$addFields': {
          //       'tariffType': '$activeTariffIds.tariffType'
          //     }
          //   },
          //   {
          //     '$match': {
          //       '_id': '$activeTariffIds.tariffId'
          //     }
          //   }
          // ])

          const devices = await Device.aggregate([
            {
              '$match': {
                'parkingId': mongoose.Types.ObjectId(findParking._id)
              }
            }
          ])

          // const isActiveTariff = await Tariff.findOne({
          //   isActive: true,
          // })



          await Opretor.findOneAndUpdate({ username: username }, {
            isLogedIn: true,
            logedInTime: moment.unix(Date.now() / 1000).tz("Asia/Calcutta").format("DD-MM-YYYY HH:mm:ss"),
            // lastLogin: findOpretor.logOutTime
          }).then(async (userData) => {

            const isShiftActive = await Shift.findOne({
              opretorId: mongoose.Types.ObjectId(findOpretor._id),
              isActive: true
            })

            return res.status(200).json({
              status: 200,
              message: "opretor login successfull",
              data: {
                parkingName: findParking.parkingName,
                opretorId: findOpretor._id,
                opretorName: findOpretor.opretorName,
                shiftData: isShiftActive ? isShiftActive : {},
                tariffData: tariffData,
                devices: devices
              },
            });
          })

        } else {
          return res.status(200).json({
            status: 200,
            message: "parking not found",
          });
        }
      }
    }


  } else {
    return res.status(404).json({
      status: 404,
      message: "opretor not found",
    });
  }
};

exports.checkBeforeLogout = async (req, res, next) => {
  const username = req.body.username;
  const userId = req.body.userId;
  const shiftId = req.body.shiftId;


  // checking admin exist or not
  const findAdmin = await Opretor.findOne({ username: username, isLogedIn: true });
  if (findAdmin) {

    // await Opretor.findOneAndUpdate({ username: username },{
    //   isLogedIn:false,
    //   logOutTime: moment.unix(Date.now() / 1000).tz("Asia/Calcutta").format("DD-MM-YYYY HH:mm:ss"),
    //   lastLogin: moment.unix(Date.now() / 1000).tz("Asia/Calcutta").format("DD-MM-YYYY HH:mm:ss")
    // }).then((userData)=>{

    const findShift = await Shift.findOne(
      {
        _id: mongoose.Types.ObjectId(shiftId),
        username: username,
        userId: mongoose.Types.ObjectId(userId),
        isActive: true
      }
    );
    if (findShift) {

      const shiftReport = Receipt.aggregate(
        [
          {
            '$match': {
              'username': username,
              'userId': mongoose.Types.ObjectId(userId)
            }
          }, {
            '$addFields': {
              'receiptTimeISO': {
                '$dateFromString': {
                  'dateString': '$receiptTime',
                  'format': '%d-%m-%Y %H:%M:%S'
                }
              },
              'logedInTimeISO': {
                '$dateFromString': {
                  'dateString': findShift.entryTime,
                  'format': '%d-%m-%Y %H:%M:%S'
                }
              },
              'logOutTimeISO': {
                '$dateFromString': {
                  'dateString': moment.unix(Date.now() / 1000).tz("Asia/Calcutta").format("DD-MM-YYYY HH:mm:ss"),
                  'format': '%d-%m-%Y %H:%M:%S'
                }
              }
            }
          }, {
            '$addFields': {
              'isMatched': {
                '$cond': {
                  'if': {
                    '$and': [
                      {
                        '$gte': [
                          '$receiptTimeISO', '$logedInTimeISO'
                        ]
                      }, {
                        '$lte': [
                          '$receiptTimeISO', '$logOutTimeISO'
                        ]
                      }
                    ]
                  },
                  'then': true,
                  'else': false
                }
              }
            }
          }, {
            '$match': {
              'isMatched': true
            }
          }, {
            '$group': {
              '_id': '$paymentType',
              'amount': {
                '$sum': '$$ROOT.amount'
              }
            }
          }, {
            '$addFields': {
              'paymentType': '$_id'
            }
          }, {
            '$project': {
              '_id': 0
            }
          }
        ]
      ).then((shiftReportData) => {

        return res.status(200).json({
          status: 200,
          message: "receipts fetched successfull",
          data: {
            username: username,
            userId: findAdmin._id,
            payments: shiftReportData,
            entryTime: findShift.entryTime,
            exitTime: moment.unix(Date.now() / 1000).tz("Asia/Calcutta").format("DD-MM-YYYY HH:mm:ss"),
          },
        });


      }).catch((error) => {
        console.log('error: ', error);
        return res.status(201).json({
          status: 201,
          message: error
        });
      })


      // })
    } else {
      return res.status(404).json({
        status: 404,
        message: "active shift not found",
      });
    }
  } else {
    return res.status(404).json({
      status: 404,
      message: "active user not found",
    });
  }
};

exports.appLogout = async (req, res, next) => {
  const username = req.body.username;
  const userId = req.body.userId;

  const newDate = new Date()
  const date = newDate.getDate() + '-' + (newDate.getMonth() + 1) + '-' + newDate.getFullYear()

  // checking admin exist or not
  const findAdmin = await Opretor.findOne({ username: username, isLogedIn: true });
  if (findAdmin) {

    // await Shift.create({
    //   username: username,
    //   userId: userId,
    //   entryTime: entryTime,
    //   exitTime: exitTime,
    //   payments: payments,
    //   date: date,
    // }).then(async (userData) => {

    await Opretor.findOneAndUpdate({ username: username, userId: userId }, {
      isLogedIn: false,
      logOutTime: moment.unix(Date.now() / 1000).tz("Asia/Calcutta").format("DD-MM-YYYY HH:mm:ss"),
      // lastLogin: moment.unix(Date.now() / 1000).tz("Asia/Calcutta").format("DD-MM-YYYY HH:mm:ss"),
      lastLogin: findAdmin.logedInTime,
    }).then((shiftCreatedData) => {

      return res.status(200).json({
        status: 200,
        message: "user logout successfull",
        data: {
          username: username,
          userId: findAdmin._id,
          entryTime: findAdmin.logedInTime,
          exitTime: moment.unix(Date.now() / 1000).tz("Asia/Calcutta").format("DD-MM-YYYY HH:mm:ss"),
        },
      });
    }).catch((error) => {
      console.log('error: ', error);
      return res.status(201).json({
        status: 201,
        message: error
      });
    })


    // })

  } else {
    return res.status(404).json({
      status: 404,
      message: "active user not found",
    });
  }
};