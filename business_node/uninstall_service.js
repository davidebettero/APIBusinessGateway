var Service = require("node-windows").Service;

const fs = require("fs");
let rawdata = fs.readFileSync("./service_config.json");
let service_config = JSON.parse(rawdata);

// Create a new service object
var svc = new Service(service_config);

// Listen for the "uninstall" event so we know when it's done.
svc.on("uninstall", function () {
  console.log("Uninstall complete.");
  console.log("The service exists: ", svc.exists);
});

// Uninstall the service.
svc.uninstall();
