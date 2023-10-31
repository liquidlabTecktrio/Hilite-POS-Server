const AppVersion = require("../models/AppVersion");
const utils = require("../controllers/utils");
const { Validator } = require("node-input-validator");
exports.getLatestAppVersion = async (req, res) => {
  try {
    const highest_version = await AppVersion.aggregate([
      {
        '$sort': {
          'Version': -1
        }
      }, {
        '$limit': 1
      }
    ]);
    utils.commonResponce(
      res,
      200,
      "Successfully retrieved latest app version",
      highest_version[0]
    );
  } catch (error) {
    utils.commonResponce(res, 500, "Server Error", error);
  }
};

exports.updateAppVersion = async (req, res) => {
  try {

    const v = new Validator(req.body,{
      appVersion:"required|integer",
      isForcedUpdate:"required|boolean"
    });
    v.check().then(async(matched)=>{
      if (!matched) {
        return utils.commonResponce(res, 422, "Unprocessable Entity", v.errors);
        //res.status(422).send(v.errors);
      }else{

        const highest_version = await AppVersion.aggregate([
          {
            '$sort': {
              'Version': -1
            }
          }, {
            '$limit': 1
          }
        ]);

        

        const appVersion = req.body.appVersion;
        const isForcedUpdate = req.body.isForcedUpdate
        if(highest_version.length >0 && highest_version[0].Version >=appVersion)
        {
          return utils.commonResponce(res,201, "The new version is not higher than the highest version number.Please enter a higher version number", );
        }
        else{
          AppVersion.create({
            Version: appVersion,
            isForcedUpdate: isForcedUpdate,
          }).then((version)=>{
            utils.commonResponce(
              res,
              200,
              "App version updated successfully",
              version
            );
          }).catch((err)=>{
            utils.commonResponce(
              res,
              500,
              "Unexpected server error while updating the app version number",
              err
            );
          })
        }
        
      }
    })
    
    

   
  } catch (error) {
    console.log(error);
    utils.commonResponce(res, 500, "Server Error", error);
  }
};
