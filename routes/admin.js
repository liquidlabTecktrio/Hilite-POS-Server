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


router.post("/adminLogin", appLoginController.adminLogin);

router.post("/createTariff", 
// verifyTokenMiddleware,
 tafiffController.createTariff);

 router.get("/getTariffs", verifyTokenMiddleware, tafiffController.getTariffs);
 
 router.get("/getTariffForParking", verifyTokenMiddleware, tafiffController.getTariffForParking);

// router.post("/createPrinter",  printerController.createPrinter);

// router.post("/createRegisteredVehicle",  registeredVehicleController.createRegisteredVehicle);

// router.post("/createRegisteredCustomer",  registeredCustomerController.createRegisteredCustomer);

// router.get("/getRegisteredCustomer",verifyTokenMiddleware,registeredCustomerController.getRegisteredCustomer )


router.post("/createParking", 
verifyTokenMiddleware,
parkingController.createParking);

router.get("/getParkings", verifyTokenMiddleware, parkingController.getParkings);

router.post("/createOpretor", 
verifyTokenMiddleware,
opretorController.createOpretor);

router.get("/getOpretors", verifyTokenMiddleware, opretorController.getOpretors);

router.post("/createDevice", 
// verifyTokenMiddleware,
deviceController.createDevice);

router.get("/getDevices", verifyTokenMiddleware, deviceController.getDevices);


module.exports = router;
