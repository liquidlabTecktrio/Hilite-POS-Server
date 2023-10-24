const express = require("express");
const router = express.Router();
const verifyTokenMiddleware = require("../middleware/verifyJwtToken");

const appLoginController = require("../controllers/admin");
const tafiffController = require("../controllers/tafiff");
// const printerController = require("../controllers/printer");
// const registeredVehicleController = require("../controllers/registeredVehicle");
// const registeredCustomerController = require("../controllers/registeredCustomer");

const parkingController = require("../controllers/parking");
const opretorController = require("../controllers/opretor");
const deviceController = require("../controllers/device");
const dashboardController = require("../controllers/dashboard");
const reportsController = require("../controllers/reports")
const monthlyPassController = require("../controllers/monthlyPass")
const packageController = require("../controllers/package")


const posHeartbeatController = require("../controllers/posHeartbeat");

const vehicleController = require("../controllers/vehicle");
const reportController = require("../controllers/reports");






router.post("/adminLogin", appLoginController.adminLogin);

router.post("/createTariff",
    // verifyTokenMiddleware,
    tafiffController.createTariff);

router.post("/getDashboardData", dashboardController.getDashboardData);

router.post("/getTariffs", verifyTokenMiddleware, tafiffController.getTariffs);

router.post("/getTariffForParking", verifyTokenMiddleware, tafiffController.getTariffForParking);

// router.post("/createPrinter",  printerController.createPrinter);

// router.post("/createRegisteredVehicle",  registeredVehicleController.createRegisteredVehicle);

// router.post("/createRegisteredCustomer",  registeredCustomerController.createRegisteredCustomer);

// router.post("/getRegisteredCustomer",verifyTokenMiddleware,registeredCustomerController.getRegisteredCustomer )


router.post("/createParking",
    verifyTokenMiddleware,
    parkingController.createParking);
    
    router.post("/updateParking",verifyTokenMiddleware,parkingController.updateParking)

router.post("/getParkings", verifyTokenMiddleware, parkingController.getParkings);
router.post("/getParkingDataForGraph", verifyTokenMiddleware, parkingController.getParkingDataForGraph);

router.post("/createOpretor",
    verifyTokenMiddleware,
    opretorController.createOpretor);

router.post("/getOpretors", verifyTokenMiddleware, opretorController.getOpretors);
router.post("/updateOperator",verifyTokenMiddleware,opretorController.updateOperator)

router.post("/createDevice",
    // verifyTokenMiddleware,
    deviceController.createDevice);

router.post("/getDevices", verifyTokenMiddleware, deviceController.getDevices);
router.post("/updateDevice", verifyTokenMiddleware, deviceController.updateDevice);


router.post("/createVehicle",
    // verifyTokenMiddleware,
    vehicleController.createVehicle);

router.post("/getVehicles", verifyTokenMiddleware, vehicleController.getVehicles);
// router.post("/getParkingRevenue", verifyTokenMiddleware, reportsController.getParkingRevenue)

router.post("/createPackage", packageController.createPackage)
router.post("/updatePackage", packageController.updatePackage)
router.post("/getPackages", packageController.getPackages)

router.post("/createMonthlyPass", monthlyPassController.createMonthlyPass)
router.post("/getMonthlyPass", monthlyPassController.getMonthlyPass)
router.post("/updateMonthlyPass", monthlyPassController.updateMonthlyPass)



router.post("/getParkingRevenue", reportController.getParkingRevenue)
router.post("/shiftReport", reportController.shiftReport)
router.post("/seasonParkerReport", reportController.seasonParkerReport)
router.post("/seasonParkerDetailReport", reportController.seasonParkerDetailReport)

router.post("/getParkingReport", reportController.getParkingReport)

module.exports = router;
