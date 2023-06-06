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

// router.post("/createPrinter",  printerController.createPrinter);


// router.post("/createRegisteredVehicle",  registeredVehicleController.createRegisteredVehicle);

// router.post("/createRegisteredCustomer",  registeredCustomerController.createRegisteredCustomer);

// router.get("/getTariff", verifyTokenMiddleware, tafiffController.getTariff);
// router.get("/getRegisteredCustomer",verifyTokenMiddleware,registeredCustomerController.getRegisteredCustomer )

// router.post("/connectTariff", 
// // verifyTokenMiddleware,
//  tafiffController.connectTariff);


router.post("/createParking", 
// verifyTokenMiddleware,
parkingController.createParking);

router.post("/createOpretor", 
// verifyTokenMiddleware,
opretorController.createOpretor);

router.post("/createDevice", 
// verifyTokenMiddleware,
deviceController.createDevice);


module.exports = router;
