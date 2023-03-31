("use strict");

const express = require("express");
require("dotenv").config({ path: "envdg" });
var target = process.env.DG_TARGET;
var endpoint1 = "/m3api-rest/v2/execute/OIS100MI/GetATP";
var endpoint1b = "/m3api-rest/v2/execute/MMS200MI/GetItmWhsBal";

var endpoint2 = "/m3api-rest/v2/execute/CMS100MI/LstSAPAvail";

var endpoint3 = "/m3api-rest/v2/execute/OIS350MI/LstInvLine";
var endpoint4 = "/m3api-rest/v2/execute/MWS411MI/LstDeliveryLine";

console.log("Start HTTPS proxy");
console.log("Target: " + target);
var https = require("https"),
  httpProxy = require("http-proxy");
var request = require("request");
const axios = require("axios");
const _ = require("lodash");
const { createProxyMiddleware } = require("http-proxy-middleware");
var fs = require("fs");
var async = require("async");
var port = 3007;
const { MultidimensionalMap } = require("multidimensional-map");
const { response } = require("express");
var isAlreadyAvailable = false;
var key = fs.readFileSync(process.env.DG_KEY_URL);
var cert = fs.readFileSync(process.env.DG_CERT_URL);
var options = {
  key: key,
  cert: cert,
};

var app = express();

function getReqATPs(atps) {
  const tokens = atps.split(",");
  for (let i = 0; i < tokens.length; i++) {
    tokens[i] = tokens[i].trim();
  }

  return tokens;
}

function getReqItems(items) {
  const tokens = items.split(",");
  for (let i = 0; i < tokens.length; i++) {
    tokens[i] = tokens[i].trim();
  }
  return tokens;
}

function getReqWarehouses(warehouses) {
  const tokens = warehouses.split(",");
  for (let i = 0; i < tokens.length; i++) {
    tokens[i] = tokens[i].trim();
  }
  return tokens;
}

function getReqDates(dates) {
  const tokens = dates.split(",");
  for (let i = 0; i < tokens.length; i++) {
    tokens[i] = tokens[i].trim();
  }
  return tokens;
}

function addNewPosts(oldPosts, newPosts) {
  /*for (let i = 0; i < newPosts.length; i++) {
    isAlreadyAvailable = false;

    for (let j = 0; j < oldPosts.length; j++) {
      if (_.isEqual(oldPosts[j], newPosts[i])) {
        isAlreadyAvailable = true;
        break;
      }
    }

    // add a post to old posts only if it already has not added
    if (!isAlreadyAvailable) {*/
  oldPosts.push(newPosts);
  /*}
  }*/

  return oldPosts;
}
// Sales&Services
app.get("/sapStockInquiry", async (req, res) => {
  //send same authorization to M3
  var basicAuth = req.header("authorization");
  const config = {
    headers: {
      Authorization: basicAuth,
    },
    maxRedirects: 21,
  };

  let posts = [];
  const SapRequests = [];
  // retrieve and filter all fields from URL
  //const atps = getReqATPs(req.query.atps);
  //Get all ATPS
  var items = getReqItems(req.query.items);
  var warehouses = getReqWarehouses(req.query.warehouses);
  var dates = getReqDates(req.query.dates);
  for (let i = 0; i < items.length; i++) {
    for (let j = 0; j < warehouses.length; j++) {
      for (let k = 0; k < dates.length; k++) {
        //build up an array containing all combinations of the matrix
        SapRequests.push(items[i] + ";" + warehouses[j] + ";" + dates[k]);
      }
    }
  }
  //Get actual availability
  for (let i = 0; i < items.length; i++) {
    for (let j = 0; j < warehouses.length; j++) {
      SapRequests.push(items[i] + ";" + warehouses[j] + ";" + "TODAY");
    }
  }
  // make concurrent api calls
  const requests = SapRequests.map((atp) => {
    var fields = atp.split(";");
    //console.log(fields[0]);
    if (fields[2] == "TODAY") {
      var url =
        target + endpoint1b + "?WHLO=" + fields[1] + "&ITNO=" + fields[0];
      return axios.get(url, config);
    } else {
      var url =
        target +
        endpoint1 +
        "?WHLO=" +
        fields[1] +
        "&ITNO=" +
        fields[0] +
        "&DWDT=" +
        fields[2];
      return axios.get(url, config);
    }
  });
  try {
    const result = await Promise.all(requests);
    //console.log(result);
    result.map((atp) => {
      var itno = "";
      var whlo = "";
      var dwdt = "";
      var urlParams = new URLSearchParams(
        atp.request.path.replace(endpoint1, "")
      );
      if (atp.request.path.includes(endpoint1)) {
        urlParams = new URLSearchParams(
          atp.request.path.replace(endpoint1, "")
        );
        itno = urlParams.get("ITNO");
        whlo = urlParams.get("WHLO");
        dwdt = urlParams.get("DWDT");
      }
      if (atp.request.path.includes(endpoint1b)) {
        urlParams = new URLSearchParams(
          atp.request.path.replace(endpoint1b, "")
        );
        itno = urlParams.get("ITNO");
        whlo = urlParams.get("WHLO");
        dwdt = "TODAY";
      }
      //const urlParams = new URLSearchParams(atp.request.path);
      console.log(urlParams);
      var quantity = 0;
      try {
        if (dwdt == "TODAY") {
          console.log(atp.data.results[0].records[0].AVAL);
          quantity = atp.data.results[0].records[0].AVAL;
        } else {
          console.log(atp.data.results[0].records[0].AVTQ);
          quantity = atp.data.results[0].records[0].AVTQ;
        }
      } catch (err) {
        var errorMessage = atp.data.results[0].errorMessage;
        //console.log(errorMessage);
      } finally {
        var post = {
          item: itno,
          warehouse: whlo,
          deliveryDate: dwdt,
          quantity: quantity,
        };
        console.log(post);
        posts = addNewPosts(posts, post);
      }
    });
  } catch (err) {
    res.status(500).json({ error: String(err) });
  }
  return res.send(posts);
});
/*
app.get("/sapStockInquiry", async (req, res) => {
      var basicAuth = req.header('authorization');
      const config = {
        headers:{
          Authorization: basicAuth
        },
        maxRedirects: 21
      };

  let posts = [];
  const SapRequests = [];
  var items = getReqItems(req.query.items);
  var warehouses = getReqWarehouses(req.query.warehouses);
  var dates = getReqDates(req.query.dates);
  for(let i = 0; i < items.length; i++) {
    for(let j = 0; j < warehouses.length; j++) {
      for(let k = 0; k < dates.length; k++) {
        SapRequests.push(items[i]+";"+warehouses[j]+";"+dates[k]);
      }
    }
  }
  const requests = SapRequests.map((atp) => {
      var fields = atp.split(";");
      var url = target+endpoint1+"?WHLO="+fields[1]+"&ITNO="+fields[0]+"&DWDT="+fields[2];
      return axios.get(url,config);
    }
  );
  try {
    const result = await Promise.all(requests);
    //console.log(result);
    result.map((atp) => {
      const urlParams = new URLSearchParams(atp.request.path.replace(endpoint1,''));
      //const urlParams = new URLSearchParams(atp.request.path);
      console.log(urlParams)
      var itno = urlParams.get("ITNO");
      var whlo = urlParams.get("WHLO");
      var dwdt = urlParams.get("DWDT");
      var quantity = 0;
      try{
        console.log(atp.data.results[0].records[0].AVTQ);
        quantity=atp.data.results[0].records[0].AVTQ;
      }
      catch(err){
        var errorMessage = atp.data.results[0].errorMessage;
        //console.log(errorMessage);
      }
      finally{
        var post = {item: itno,warehouse:whlo,deliveryDate: dwdt, quantity: quantity}; 
        console.log(post);
        posts = addNewPosts(posts, post);
      }
    });
  } catch (err) {
    res.status(500).json({ error: String(err) });

  }
  return res.send(posts);
});
*/
app.get("/sapStock", async (req, res) => {
  //send same authorization to M3
  var basicAuth = req.header("authorization");
  const config = {
    headers: {
      Authorization: basicAuth,
    },
    maxRedirects: 21,
  };

  let posts = [];
  const SapRequests = [];
  // retrieve and filter all fields from URL
  //const atps = getReqATPs(req.query.atps);
  var items = getReqItems(req.query.items);
  for (let i = 0; i < items.length; i++) {
    //build up an array containing all combinations of the matrix
    SapRequests.push(items[i]);
  }
  // make concurrent api calls
  const requests = SapRequests.map((atp) => {
    var fields = atp.split(";");
    //console.log(fields[0]);
    var url = target + endpoint2 + "?&MBITNO=" + fields[0];
    return axios.get(url, config);
  });
  try {
    const result = await Promise.all(requests);
    //console.log(result);
    result.map((atp) => {
      const urlParams = new URLSearchParams(
        atp.request.path.replace(endpoint1, "")
      );
      var itno = "";
      var whlo = "";
      var quantity = 0;
      try {
        for (let i = 0; i < atp.data.results[0].records.length; i++) {
          console.log(atp.data.results[0].records[i]);
          itno = atp.data.results[0].records[i].MBITNO;
          whlo = atp.data.results[0].records[i].MBWHLO;
          quantity = atp.data.results[0].records[i].MBAVAL;
          var post = { item: itno, warehouse: whlo, quantity: quantity };
          posts = addNewPosts(posts, post);
        }
      } catch (err) {
        var errorMessage = atp.data.results[0].errorMessage;
      }
    });
  } catch (err) {
    res.status(500).json({ error: String(err) });
  }
  return res.send(posts);
});

//ZBETDAV - /retrieveInvoiceOrders (call OIS350MI.LstInvLine and return all distinct ORNOs concatenated by a semicolon)
app.get("/retrieveInvoiceOrders", async (req, res) => {
  //send same authorization to M3
  var basicAuth = req.header("authorization");
  const config = {
    headers: {
      Authorization: basicAuth,
    },
    maxRedirects: 21,
  };

  let posts = {};
  // retrieve and filter all fields from URL
  var items = [req.query.CONO, req.query.DIVI, req.query.YEA4, req.query.IVNO];
  var url =
    target +
    endpoint3 +
    "?&CONO=" +
    items[0] +
    "&DIVI=" +
    items[1] +
    "&YEA4=" +
    items[2] +
    "&IVNO=" +
    items[3];
  //console.log(url);
  const result = axios.get(url, config).then((atp) => {
    var ORNOs = [];
    try {
      for (let i = 0; i < atp.data.results[0].records.length; i++) {
        //console.log(atp.data.results[0].records[i]);
        orno = atp.data.results[0].records[i].ORNO;
        if (
          orno != null &&
          orno != undefined &&
          orno != "" &&
          ORNOs.indexOf(orno.trim()) === -1
        ) {
          ORNOs.push(orno.trim());
        }
        //console.log(orno);
      }
      //console.log(ORNOs);
      temp = "";
      for (let i = 0; i < ORNOs.length; i++) {
        temp += ORNOs[i];
        if (i < ORNOs.length - 1) temp += ";";
      }
      posts["ORNOs"] = temp;
      //console.log(posts);
      return res.send(posts);
    } catch (err) {
      var errorMessage = atp.data.results[0].errorMessage;
      console.log(errorMessage);
    }
  });
});

//ZBETDAV - /retrieveDeliveryOrders (call MWS411MI.LstDeliveryLine and return all distinct ORNOs (RIDNs) concatenated by a semicolon)
app.get("/retrieveDeliveryOrders", async (req, res) => {
  //send same authorization to M3
  var basicAuth = req.header("authorization");
  const config = {
    headers: {
      Authorization: basicAuth,
    },
    maxRedirects: 21,
  };

  let posts = {};
  // retrieve and filter all fields from URL
  var items = [req.query.DLIX];
  var url = target + endpoint4 + "?&DLIX=" + items[0];
  //console.log(url);

  const result = axios.get(url, config).then((atp) => {
    try {
      var ORNOs = [];
      for (let i = 0; i < atp.data.results[0].records.length; i++) {
        console.log(atp.data.results[0].records[i]);
        orno = atp.data.results[0].records[i].RIDN;
        if (
          orno != null &&
          orno != undefined &&
          orno != "" &&
          ORNOs.indexOf(orno.trim()) === -1
        ) {
          ORNOs.push(orno.trim());
        }
        //console.log(orno);
      }
      //console.log(ORNOs);
      temp = "";
      for (let i = 0; i < ORNOs.length; i++) {
        temp += ORNOs[i];
        if (i < ORNOs.length - 1) temp += ";";
      }
      posts["ORNOs"] = temp;
      //console.log(posts);
      return res.send(posts);
    } catch (err) {
      var errorMessage = atp.data.results[0].errorMessage;
      console.log(errorMessage);
    }
  });
});

var httpsServer = https.createServer(options, app);
httpsServer.listen(3007);
