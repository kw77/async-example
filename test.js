// Async / AJAX example scenario:
// 1) Get a full list of all the classes in the school (call to API #1)
// 2) For each class, get a count of students (call to separste API #2)
//
// Populate an object as:
/*
{
  "years": {
    "01": {
      "name": "01",
      "classList": [
        "01A"
      ],
      "classes": {         //   <--- By reference!
        "01A": {
          "name": "01A",
          "count": 32
        }
      }
    }
  },
  "classes": {
    "01A": {
      "name": "01A",
      "count": 32
    }
  },
  "yearsList": [
    "01"
  ],
  "classesList": [
    "01A"
  ]
}
*/

var async = require('async');
var request = require('request');

var classInfo = {
    years:       {},
    classes:     {},
    yearsList:   [],
    classesList: []
};

// For each class
//   classInfo.classesList.push('01A');
//   classInfo.classes['01A'] = { name: '01A' };
//   classInfo.classes['01A'].count = 32;
// For each class year, if not exists
//   classInfo.yearsList.push('01');
//   classInfo.years['01'] = { name: '01', classList: [], classes: {} };
// For each class (continued)
//   classInfo.years['01'].classList.push('01A');
//   classInfo.years['01'].classes['01A'] = classInfo.classes['01A'];
// NB: JS objects are passed by reference = desire self referencing
// NB: JS strings/dates/numbers are passed by value (for info)

var classListUrl = 'http://localhost:3000/classes';
var classSizeUrl = 'http://localhost:3000/classes/';
var classNameRegex = /^[0-9][0-9][A-Z]$/;

// Start of the async chain of functions, initial API call
function getClassList(){
    request(classListUrl,processClassList);
}

// Processor for initial API response
function processClassList(error,response,body){
    // Validate return data; always!
    var data     = JSON.parse(body);
    var code     = response && response.statusCode;
    var dataTest = Array.isArray(data)

    if(error){       console.log('Err|prClsLst|' + error);   return false; }
    if(code != 200){ console.log('Err|prClsLst|HTTP'+code);  return false; }
    if(!dataTest){   console.log('Err|prClsLst|BadContent'); return false; }

    // Add class info to the classInfo object
    for (var i=0; i<data.length; i++){
        var className = data[i];
        var nameOK    = classNameRegex.test(className);

        if(!nameOK){ console.log('Err|prClsLst|Cls:'+className); return false; }

        var classYear = className.substr(0,2);

        // Use object property named array notation for dynamic referencing
        classInfo.classesList.push(className);
        classInfo.classes[className] = { name: className };

        if(!classInfo.years[classYear]){
            classInfo.yearsList.push(classYear);
            classInfo.years[classYear] = { name: classYear, classList: [], classes: {} };
        }

        classInfo.years[classYear].classList.push(className);
        classInfo.years[classYear].classes[className] = classInfo.classes[className];
    }

    // The rich object structure is designed to be multi-purpose for easy reuse
    // Use the flat classes list in this instance, but populate the nested structure
    // for later use
    async.eachLimit(classInfo.classesList, 3, getClassSize, processListComplete);
    // Only process 3 requests at a time, call processListComplete when all have returned
}

function getClassSize(className,callback){
    // Make an AJAX request for each class
    // Must be an in-line function to keep callback available in the function scope
    request(classSizeUrl+className,function(error, response, body){
        // Validate return data; always!
        var data     = JSON.parse(body);
        var code     = response && response.statusCode;
        var dataTest = Number.isInteger(data.count)

        if(error){       console.log('Err|gtClsSz|' + error);   return false; }
        if(code != 200){ console.log('Err|gtClsSz|HTTP'+code);  return false; }
        if(!dataTest){   console.log('Err|gtClsSz|BadContent'); return false; }

        // Append the count to the nested object structure
        classInfo.classes[className].count = data.count;
        callback();
    });
}

function processListComplete(error){
    console.log(JSON.stringify(classInfo,null,2));
    // Handle the classInfo output here (creating year reports)
}

// Worth wrapping all of this in an ES6 class and create instances for each cron
// invocation. This will help avoid having global objects, makes the code more reusable
// and can make it easier to maintain


// Call the initial function after a brief delay (given this uses a local test stub
// web server that needs to be up first)
setTimeout(getClassList,1000);


//
// TEST STUB TO RESPOND TO THE AJAX API CALLS
// FOR DEMONSTRATION PURPOSES ONLY
//

var express = require('express');
var app = express();

// API route to mimic returning the class list
app.get('/classes', function (req, res) {
    res.json(['01A','01B','02A','02B','03X']);
});

// API route to return class sizes, randomised for test purposes
app.get('/classes/:className', function (req, res) {
    var min = 18;
    var max = 28;
    var count = Math.floor(Math.random() * (max - min + 1)) + min;
    res.json({ count: count });
});

// Server Setup
app.listen(3000, function () {
    console.log('Example app listening on port 3000');
});



// Note that this leaves the web server running Ctrl+c to close as ever
// Use cron approach for scheduling
