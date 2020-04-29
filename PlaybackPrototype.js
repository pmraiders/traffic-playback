//NOTE: this prototype will probably end up being exported as a module down the line. 
var http = require('http') //Offers various http capabilities.
var https = require('https')
var mysql = require('mysql') //DB driver. 
var requests_cache = {} 

var base_request_time = 0
var base_local_time = 0;


//This function forgoes completing a task for ms_delay milliseconds. //For our purposes, it is used to space out requests. 
function delay_request (ms_delay,options,resolve,reject) {
    //The returned Promise will execute function resolve, which is dispatch_request defined right below, after ms_delay elapses.
    return new Promise(() => {setTimeout(()=> {resolve(options)},ms_delay)}
);
  }


//This function dispatches a request 
function dispatch_request(options){
    //request options url path and etc
    console.log(Date.now())
    var req_headers = new Object()
    var header_array = options.header.split("\r\n")

    for (var header in header_array)
    {
	var name_val = header_array[header].split(":::::")
	if(name_val[0] != "")
		req_headers[name_val[0]] = name_val[1];
    }

    //Select the correct request class
    var webreq = options.secure ? https : http


    var req_options = {"host":"localhost", "setHost":false, "path":options.uri, "method":options.method, "headers":req_headers}
    var req = webreq.request(req_options, (res) => {
        res.setEncoding("utf-8")
	res.on('data', (data)=>{/*console.log(data)*/})
	res.on('end', ()=>{console.log("Finished streaming data for request response.")})
	}) //Create the request

	if(options.reqbody != "")
		req.write(options.reqbody)
        req.end()
}

//Connection settings like username, password, and etc. 
var connection_arguments = {
    host:"localhost",
    user:"traffic",
    password:"12345",
    database:"trafficDB"}
    
// Attempt to create a connection using the arguments above. 
var connection = mysql.createConnection(connection_arguments)

//Issue a static GET query for the prototype. 
connection.query('SELECT * FROM raw', function (error, results, fields) {
    if (error)
        throw error
    
    //All requests will have their times subtracted by the time of the first request.
    //This is so we can shift all times back to zero.
    console.log(results[0])
    //Times from the database must be multiplied by 1000 to represent in milliseconds as opposed to seconds.milli
    base_request_time = results[0].utime * 1000
    console.log("Base Time:")
    console.log("Job: " + base_request_time)
    for (var result in results)
    {
        //Using let variables for block scoping and to avoid hoisting shennanigans.
        let row_reference = results[result] //This references a row which desribes a request
	//Calculate the time to sleep by obtaining the current request's delta from its capture point
	//Then subtracting a correction for a delta in local execution time.
        let sleep_time = ((results[result].utime * 1000) - base_request_time) - (Date.now() - ((base_local_time == 0) ? base_local_time = Date.now() : base_local_time))

        //This line dispatches a request after a timeout determined by sleep_time for a given row/request.
        console.log("delaying request " + result + "for " + sleep_time + "miliseconds.")
        delay_request(sleep_time,row_reference,dispatch_request,null)
    }
  })
//Close the connection. 
connection.end()



