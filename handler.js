var request = require('request');
var AWS = require('aws-sdk');

AWS.config.update({
    region: "us-west-1"
});


'use strict';

module.exports.hello = (event, context, callback) => {
  const response = {
    statusCode: 200,
    headers: {
      "Access-Control-Allow-Origin": "*"
    },
    body: JSON.stringify({
      message: 'Shuttle Routes have been updated!'
    }),
  };

  fetchBroncoShuttle();
  callback(null, response);


};

module.exports.queryShuttleTime = (event, context, callback) => {
    queryBroncoTime(callback);
};

var docClient = new AWS.DynamoDB.DocumentClient();
var table = "BroncoExpress";

function fetchBroncoShuttle() {
    request('https://rqato4w151.execute-api.us-west-1.amazonaws.com/dev/info', function (error, response, body) {

        if (!error && response.statusCode == 200) {
            var items = JSON.parse(body);
            for(var i = 0; i < items.length; i++) {
                putItem(items[i]);
            }

        }
    })
}

function putItem(item) {
    var params = {
        TableName:table,
        Item:{
            "BusID": item.id.toString(),
            "Timestamp": Date.now(),
            "logo": item.logo,
            "lat": item.lat,
            "lng": item.lng,
            "route": item.route
        }
    };

    console.log("Adding a new item...");
    docClient.put(params, function(err, data) {
        if (err) {
            console.error("Unable to add item. Error JSON:", JSON.stringify(err, null, 2));
        } else {
            console.log("Added item:", JSON.stringify(data, null, 2));
        }
    });
}

function queryBroncoTime(callback) {
    var params = {
        TableName: table,
        //FilterExpression: "#key = :inputName",
        //KeyConditionExpression: "#key = :inputName1 and #sortKey = :inputName2",
        /*ExpressionAttributeNames:{
         "#key": "BusID"
         //"#sortKey": "Timestamp"
         },
         ExpressionAttributeValues:{
         ":inputName": BusID
         //":inputName2":1487060364762
         }*/
    };

    console.log("Scanning Routes table.");
    var list = []
    var reference = []

    console.log(reference.size)

    docClient.scan(params, function (err, data) {
        if (err) {
            console.error("Unable to scan the table. Error JSON:", JSON.stringify(err, null, 2));

            if (callback) {
                const responseErr = {
                    statusCode: 500,
                    headers: {
                        "Access-Control-Allow-Origin": "*"
                    },
                    body: JSON.stringify({'err': err}),
                };

                callback(null, responseErr);
            }

        } else {
            // print all the routes
            console.log("Scan succeeded.");
            data.Items.forEach(function (bus) {
                list.push({id: bus.BusID, logo: bus.logo, lat: bus.lat, lng: bus.lng, route: bus.route});
                //Algorithm to only push most up to date to Json
                //Maybe use a reference array to achieve this purpose
            });

            // continue scanning if we have more routes, because
            // scan can retrieve a maximum of 1MB of data
            if (typeof data.LastEvaluatedKey != "undefined") {
                console.log("Scanning for more...");
                params.ExclusiveStartKey = data.LastEvaluatedKey;
                docClient.scan(params, callback);
            }

            if (callback) {
                const responseOk = {
                    statusCode: 200,
                    headers: {
                        "Access-Control-Allow-Origin": "*"
                    },

                    body: JSON.stringify(list),

                };

                callback(null, responseOk);
            }
        }
    });
}