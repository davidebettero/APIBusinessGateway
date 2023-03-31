var Service = require("node-windows").Service;

const fs = require("fs");
let rawdata = fs.readFileSync("./service_config.json");
let service_config = JSON.parse(rawdata);

// Create a new service object
var svc = new Service(service_config);

// Listen for the "install" event, which indicates the
// process is available as a service.
svc.on("install", function () {
  svc.start();
});

svc.install();
