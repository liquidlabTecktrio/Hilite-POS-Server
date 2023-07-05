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

const posHeartbeatController = require("../controllers/posHeartbeat");

const vehicleController = require("../controllers/vehicle");

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

router.post("/getParkings", verifyTokenMiddleware, parkingController.getParkings);
router.post("/getParkingDataForGraph", verifyTokenMiddleware, parkingController.getParkingDataForGraph);

router.post("/createOpretor",
    verifyTokenMiddleware,
    opretorController.createOpretor);

router.post("/getOpretors", verifyTokenMiddleware, opretorController.getOpretors);

router.post("/createDevice",
    // verifyTokenMiddleware,
    deviceController.createDevice);

router.post("/getDevices", verifyTokenMiddleware, deviceController.getDevices);


router.post("/createVehicle",
    // verifyTokenMiddleware,
    vehicleController.createVehicle);

router.post("/getVehicles", verifyTokenMiddleware, vehicleController.getVehicles);
router.post("/getParkingRevenue", verifyTokenMiddleware, reportsController.getParkingRevenue)


module.exports = router;
