const Admin = require("../models/Admin");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const moment = require("moment-timezone");
const mongoose = require("mongoose")
const Parking = require("../models/Parking");
const Opretor = require("../models/Opretor");
const Device = require("../models/Device");
// const Receipt = require("../models/Receipt");
const Shift = require("../models/Shift");
const Tariff = require("../models/Tariff");
const PosHeartbeat = require("../models/PosHeartbeat");
const dashboardController = require("../controllers/dashboard");


exports.adminLogin = async (req, res, next) => {
  const username = req.body.username;
  console.log("username",username)
  const password = req.body.password;
  console.log("password",password)


  //console.log("login");
  // validate the request
  const validation = await validateUserInput(username, password);
  if (validation) {
    return res.status(202).json({
      status: 202,
      message: "username and password should not be empty",
    });
  }

  // checking admin exist or not
  const findAdmin = await Admin.findOne({ username: username });
  if (findAdmin) {
    // comparing the password
    const comparePassword = await bcrypt.compare(password, findAdmin.password);
    if (!comparePassword) {
      return res.status(201).json({
        status: 201,
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
    return res.status(202).json({
      status: 202,
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
  const posDeviceID = req.body.posDeviceID;

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

      // if (findOpretor.isLogedIn) {

      //   return res.status(201).json({
      //     status: 201,
      //     message: "you can login only one device at a time or logout from other devices!!!",
      //   });
      // } else {

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
            tariff: data_1
          })
        }

        const data2 = returnTariffID(3)
        if (data2.tariffId) {
          const data_2 = await Tariff.findById(data2.tariffId)
          tariffData.push({
            tariffType: data2.tariffType,
            tariff: data_2
          })
        }

        const data3 = returnTariffID(4)
        if (data3.tariffId) {
          const data_3 = await Tariff.findById(data3.tariffId)
          tariffData.push({
            tariffType: data3.tariffType,
            tariff: data_3
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
        // console.log('activeTariffIds: ', activeTariffIds);

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


          if (await PosHeartbeat.findOne({ posDeviceID }))
            await PosHeartbeat.findOneAndUpdate({ posDeviceID }, {
              opretorId: findOpretor._id,
              opretorName: findOpretor.opretorName,
              opretorNo: findOpretor.opretorNo,
              mobileNo: findOpretor.mobileNo,
              opretorEmail: findOpretor.opretorEmail,
              parkingId: findParking._id,
              parkingName: findParking.parkingName,
              parkingNo: findParking.parkingNo,
              loginTime: moment.unix(Date.now() / 1000).tz("Asia/Calcutta").format("DD-MM-YYYY HH:mm:ss"),
              lastUpdated: moment.unix(Date.now() / 1000).tz("Asia/Calcutta").format("DD-MM-YYYY HH:mm:ss"),
              isAlive: true,
              isActive: true
            })
          else
            await PosHeartbeat.create({
              posDeviceID: posDeviceID,
              opretorId: findOpretor._id,
              opretorName: findOpretor.opretorName,
              opretorNo: findOpretor.opretorNo,
              mobileNo: findOpretor.mobileNo,
              opretorEmail: findOpretor.opretorEmail,
              parkingId: findParking._id,
              parkingName: findParking.parkingName,
              parkingNo: findParking.parkingNo,
              loginTime: moment.unix(Date.now() / 1000).tz("Asia/Calcutta").format("DD-MM-YYYY HH:mm:ss"),
              lastUpdated: moment.unix(Date.now() / 1000).tz("Asia/Calcutta").format("DD-MM-YYYY HH:mm:ss"),
              isAlive: true,
              isActive: true
            })


          // web socket 
          dashboardController.getDashboardDataFunction()


          const isShiftActive = await Shift.findOne({
            opretorId: mongoose.Types.ObjectId(findOpretor._id),
            isActive: true
          })

          return res.status(200).json({
            status: 200,
            message: "opretor login successfull",
            data: {
              parkingId: findParking._id,
              parkingName: findParking.parkingName,
              parkingNo: findParking.parkingNo,
              isAutoCloseBarrier: findParking.isAutoCloseBarrier,
              closeBarrierAfter: findParking.closeBarrierAfter,
              opretorId: findOpretor._id,
              opretorName: findOpretor.opretorName,
              opretorNo: findOpretor.opretorNo,
              shiftData: isShiftActive ? isShiftActive : {},
              tariffs: tariffData,
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
      // }
    }


  } else {
    return res.status(404).json({
      status: 404,
      message: "opretor not found",
    });
  }
};

exports.appLogout = async (req, res, next) => {
  const opretorId = req.body.opretorId;
  const posDeviceID = req.body.posDeviceID;

  // checking admin exist or not
  const findOpretor = await Opretor.findOne({ _id: mongoose.Types.ObjectId(opretorId), isLogedIn: true });
  if (findOpretor) {

    await Opretor.findOneAndUpdate({ _id: mongoose.Types.ObjectId(opretorId) }, {
      isLogedIn: false,
      logOutTime: moment.unix(Date.now() / 1000).tz("Asia/Calcutta").format("DD-MM-YYYY HH:mm:ss"),
      lastLogin: findOpretor.logedInTime,
    }).then(async (shiftCreatedData) => {

      await PosHeartbeat.findOneAndUpdate({ posDeviceID, isActive: true }, { isActive: false })

      // web socket 
      dashboardController.getDashboardDataFunction()

      return res.status(200).json({
        status: 200,
        message: "Opretor logout successfull",
        data: {
          _id: findOpretor._id,
          entryTime: findOpretor.logedInTime,
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

  } else {
    return res.status(404).json({
      status: 404,
      message: "active user not found",
    });
  }
};

// createAdmin()
async function createAdmin(){
  try{
    await Admin.create({
      "password": "$2a$12$x.qBf.QaPoheMWFlTAaiceOaiYEDx.hGZy0s8GwYl.ux5InM5mCse",
      "username": "admin"
    })

  }catch(error){
    console.log('error: ', error);

  }
}