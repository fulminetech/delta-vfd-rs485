var ModbusRTU = require("modbus-serial");
const express = require("express");
const { exec } = require('child_process');
const restart1Command = "pm2 restart prod-modbus"

const app = express();

// Timestamp for which returns current date and time 
var noww = new Date().toLocaleString(undefined, { timeZone: 'Asia/Kolkata' });
console.log(`[ STARTING: ${noww} ]`)
var startTime = + new Date();

// Modbus RTU configs
var client = new ModbusRTU();
const mbsTimeout = 5000;
const slaveID = 1;
const baudRate = 9600;

// Modbus Addresses
const vfd1_status_monitor = 8448 // 2100H

const vfd1_mode_address = 8192 // 2000H
const vfd1_freq_address = 8193 // 2001H

const vfd1_forward_stop = 17 // 0000000000100001 
const vfd1_forward_run = 18 // 0000000000010010 
const vfd1_forward_jog = 19 // 0000000000010011
const vfd1_reverse_stop = 33 // 0000000000100001
const vfd1_reverse_run = 34 // 0000000000100010
const vfd1_reverse_jog = 35 // 0000000000100011

// Data Structure 
var vfd1 = {
    connection: false,
    status: '',
    error: 0,
    set_frequency: 0,
    output_frequency: 0,
    output_current: 0,
    dc_bus_voltage: 0,
}

var tries = 0
var connection_attempt = 5

//  Make physical connection MODBUS-RTU
var connectClient = function () {

    client.setID(slaveID);
    client.setTimeout(mbsTimeout);

    client.connectRTUBuffered("/dev/tty.usbserial-A50285BI", { baudRate: baudRate, parity: 'even' })
        .then(function () {
            vfd1.connection = true;
            console.log(`[ CONNECTED ]`)
            console.log(`[ BAUDRATE: ${baudRate} ]`);
        })
        .then(function () {
            setInterval(() => {
                vfd1_monitor()
            }, 2000);
        })
        .catch(function (e) {
            tries++
            setTimeout(() => {
                if(tries <= connection_attempt)
                    connectClient
                else vfd1.error = 999
            }, 1000);
            console.error(`[ FAILED TO CONNECT ${tries} ]`)
            console.error(e);
        });
}

connectClient()

var vfd1_monitor = function () {
    client.readHoldingRegisters(vfd1_status_monitor, 5)
        .then(function (data) {
            vfd1.error = data.data[0]
            vfd1.status = data.data[1]
            vfd1.set_frequency = data.data[2]
            vfd1.output_frequency = data.data[3]
            vfd1.output_current = data.data[4]
            vfd1.dc_bus_voltage = data.data[5]
        })
        .catch(function (e) {
            console.error(e)
        })
}

var address;
var set;

var writeReg = function () {

    client.writeRegister(address, set)
        .then(function (d) {
            console.log(`New value ${set}`);
        })
        .catch(function (e) {
            console.log(e.message);
        })
}

var writeCoil = function () {

    client.writeCoil(write_coil + offset, set)
        .then(function (d) {
            console.log(`Address ${status_address} set to ${set}`, d);
            mbsState = MBS_STATE_GOOD_WRITE_COIL;
        })
        .catch(function (e) {
            console.log(e.message);
            mbsState = MBS_STATE_FAIL_WRITE_COIL;
        })
}

app.get("/set/:parameter/:value", (req, res) => {
    const a = req.params.parameter;
    const b = req.params.value;

    if (a == "vfd1_freq" && b<= 80) {
        address = vfd1_freq_address
        set = parseInt(b * 100)
        writeReg()
    }
    // } else if (a == "vfd1_forward_run") {
    //     address = vfd1_mode_address
    //     set = vfd1_forward_run
    //     writeReg()
    // } 

    res.header('Access-Control-Allow-Origin', '*');
    return res.json({ message: `[ UPDATED ${a} to ${b} ]` });
});

app.get("/mode/:parameter", (req, res) => {
    const a = req.params.parameter;

    if (a == "vfd1_forward_run") {
        address = vfd1_mode_address
        set = vfd1_forward_run
        writeReg()
    } else if (a == "vfd1_forward_stop") {
        address = vfd1_mode_address
        set = vfd1_forward_stop
        writeReg()
    } else if (a == "vfd1_forward_jog") {
        address = vfd1_mode_address
        set = vfd1_forward_jog
        writeReg()
    } else if (a == "vfd1_reverse_stop") {
        address = vfd1_mode_address
        set = vfd1_reverse_stop
        writeReg()
    } else if (a == "vfd1_reverse_run") {
        address = vfd1_mode_address
        set = vfd1_reverse_run
        writeReg()
    } else if (a == "vfd1_reverse_jog") {
        address = vfd1_mode_address
        set = vfd1_reverse_jog
        writeReg()
    }

    res.header('Access-Control-Allow-Origin', '*');
    return res.json({ message: `[ Mode: ${a} ]` });
});


app.use("/api/vfd1", (req, res) => {
    res.header('Access-Control-Allow-Origin', '*');
    res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
    res.json(vfd1);
});

function restartprodmodbus() {
    exec(restart1Command, (err, stdout, stderr) => {
        // handle err if you like!
        console.log(`[ RESTARTING: prod-modbus ]`);
        console.log(`${stdout}`);
    });
}

// Start Server
const port = 9000;
app.listen(port, () => console.log(`Server running on port ${port} 🔥`));