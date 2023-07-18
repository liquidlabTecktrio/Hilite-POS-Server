const express = require("express");
const router = express.Router();

const appLoginController = require("../controllers/admin");
// const vehicleController = require("../controllers/vehicle");
// const printerController = require("../controllers/printer");
const shiftController = require("../controllers/shift");
// const tafiffController = require("../controllers/tafiff");
const transactionController = require("../controllers/transaction");
const posHeartbeatController = require("../controllers/posHeartbeat");
const ticketController = require("../controllers/ticket")
const opretorController = require("../controllers/opretor");

router.post("/appLogin", appLoginController.appLogin);

// router.post("/registerVehicle", vehicleController.registerVehicle);
// router.post("/checkVehicleBeforeRegister", vehicleController.checkVehicleBeforeRegister);
// router.post("/changeVehicleStatus", vehicleController.changeVehicleStatus);
// router.post("/checkVehicleBeforeExit", vehicleController.checkVehicleBeforeExit);


// router.post("/getStayDurationReport", vehicleController.getStayDurationReport);
// router.post("/getStayDurationBesedOnDurationReport", vehicleController.getStayDurationBesedOnDurationReport);
// router.get("/getReportForVehicleInMoreThenEightHours/:hour", vehicleController.getReportForVehicleInMoreThenEightHours);
// router.get("/getParkingOccupancy", vehicleController.getParkingOccupancy);

// router.get("/getPrinters", printerController.getPrinters);

router.post("/appLogout", appLoginController.appLogout);

// router.post("/checkBeforeLogout", appLoginController.checkBeforeLogout);

router.post("/startShift", shiftController.startShift);

router.post("/closeShift", shiftController.closeShift);

// router.post("/createTransaction", transactionController.createTransaction);
// router.post("/cancelTicket", transactionController.cancelTicket);
// router.post("/calculateCharge", transactionController.calculateCharge);
// router.post("/getReceipts", transactionController.getReceipts);
// router.post("/checkLostTicket", transactionController.checkLostTicket)
router.post("/createTransaction", ticketController.createTransaction);
router.post("/cancelTicket", ticketController.cancelTicket);
router.post("/calculateCharge", ticketController.calculateCharge);
router.post("/getReceipts", ticketController.getReceipts);
router.post("/checkLostTicket", ticketController.checkLostTicket)

router.post("/updateHeartbeat", posHeartbeatController.updateHeartbeat);

router.post("/getSupervisorPin", opretorController.getSupervisorPin);




module.exports = router;
