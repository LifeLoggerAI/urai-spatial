const functions = require("firebase-functions");

exports.health = functions.https.onRequest((req, res) => {
  res.status(200).send("URAI Spatial Functions Live");
});
