// Platform constructor
// config may be null
// api may be null if launched from old homebridge version
module.exports = function Platform(log, config, api) {
    console.log("Platform Init");
    this.log = log;
    this.config = config;
    this.accessories = [];

    this.requestServer = http.createServer(function(request, response) {
        if (request.url === "/add") {
            this.addAccessory();
            response.writeHead(204);
            response.end();
        }

        if (request.url == "/reachability") {
            this.updateAccessoriesReachability();
            response.writeHead(204);
            response.end();
        }

        if (request.url == "/remove") {
            this.removeAccessory();
            response.writeHead(204);
            response.end();
        }
    }.bind(this));

    this.requestServer.listen(18081, function() {
        console.log("Server Listening...");
    });

    if (api) {
        // Save the API object as plugin needs to register new accessory via this object.
        this.api = api;

        // Listen to event "didFinishLaunching", this means homebridge already finished loading cached accessories
        // Platform Plugin should only register new accessory that doesn't exist in homebridge after this event.
        // Or start discover new accessories
        this.api.on('didFinishLaunching', function() {
            console.log("Plugin - DidFinishLaunching");
        }.bind(this));
    }
}

// Function invoked when homebridge tries to restore cached accessory
// Developer can configure accessory at here (like setup event handler)
// Update current value
Platform.prototype.configureAccessory = function(accessory) {
    console.log("Plugin - Configure Accessory: " + accessory.displayName);

    // set the accessory to reachable if plugin can currently process the accessory
    // otherwise set to false and update the reachability later by invoking
    // accessory.updateReachability()
    accessory.reachable = true;

    accessory.on('identify', function(paired, callback) {
        console.log("Identify!!!");
        callback();
    });

    if (accessory.getService(Service.Lightbulb)) {
        accessory.getService(Service.Lightbulb)
            .getCharacteristic(Characteristic.On)
            .on('set', function(value, callback) {
                console.log("Light -> " + value);
                callback();
            });
    }

    this.accessories.push(accessory);
}

//Handler will be invoked when user try to config your plugin
//Callback can be cached and invoke when nessary
Platform.prototype.configurationRequestHandler = function(context, request, callback) {
    console.log("Context: ", JSON.stringify(context));
    console.log("Request: ", JSON.stringify(request));

    // Check the request response
    if (request && request.response && request.response.inputs && request.response.inputs.name) {
        this.addAccessory(request.response.inputs.name);

        // Invoke callback with config will let homebridge save the new config into config.json
        // Callback = function(response, type, replace, config)
        // set "type" to platform if the plugin is trying to modify platforms section
        // set "replace" to true will let homebridge replace existing config in config.json
        // "config" is the data platform trying to save
        callback(null, "platform", true, {
            "platform": "Platform",
            "otherConfig": "SomeData"
        });
        return;
    }

    // - UI Type: Input
    // Can be used to request input from user
    // User response can be retrieved from request.response.inputs next time
    // when configurationRequestHandler being invoked

    var respDict = {
        "type": "Interface",
        "interface": "input",
        "title": "Add Accessory",
        "items": [{
                "id": "name",
                "title": "Name",
                "placeholder": "Fancy Light"
            } //,
            // {
            //   "id": "pw",
            //   "title": "Password",
            //   "secure": true
            // }
        ]
    }

    // - UI Type: List
    // Can be used to ask user to select something from the list
    // User response can be retrieved from request.response.selections next time
    // when configurationRequestHandler being invoked

    // var respDict = {
    //   "type": "Interface",
    //   "interface": "list",
    //   "title": "Select Something",
    //   "allowMultipleSelection": true,
    //   "items": [
    //     "A","B","C"
    //   ]
    // }

    // - UI Type: Instruction
    // Can be used to ask user to do something (other than text input)
    // Hero image is base64 encoded image data. Not really sure the maximum length HomeKit allows.

    // var respDict = {
    //   "type": "Interface",
    //   "interface": "instruction",
    //   "title": "Almost There",
    //   "detail": "Please press the button on the bridge to finish the setup.",
    //   "heroImage": "base64 image data",
    //   "showActivityIndicator": true,
    // "showNextButton": true,
    // "buttonText": "Login in browser",
    // "actionURL": "https://google.com"
    // }

    // Plugin can set context to allow it track setup process
    context.ts = "Hello";

    //invoke callback to update setup UI
    callback(respDict);
}

// Sample function to show how developer can add accessory dynamically from outside event
Platform.prototype.addAccessory = function(accessoryName) {
    console.log("Add Accessory");
    var uuid;

    if (!accessoryName) {
        accessoryName = "Test Accessory"
    }

    uuid = UUIDGen.generate(accessoryName);

    var newAccessory = new Accessory(accessoryName, uuid);
    newAccessory.on('identify', function(paired, callback) {
        console.log("Identify!!!");
        callback();
    });
    // Plugin can save context on accessory
    // To help restore accessory in configureAccessory()
    // newAccessory.context.something = "Something"

    newAccessory.addService(Service.Lightbulb, "Test Light")
        .getCharacteristic(Characteristic.On)
        .on('set', function(value, callback) {
            console.log("Light -> " + value);
            callback();
        });

    this.accessories.push(newAccessory);
    this.api.registerPlatformAccessories("homebridge-Platform", "Platform", [newAccessory]);
}

Platform.prototype.updateAccessoriesReachability = function() {
    console.log("Update Reachability");
    for (var index in this.accessories) {
        var accessory = this.accessories[index];
        accessory.updateReachability(false);
    }
}

// Sample function to show how developer can remove accessory dynamically from outside event
Platform.prototype.removeAccessory = function() {
    console.log("Remove Accessory");
    this.api.unregisterPlatformAccessories("homebridge-chickencoop", "ChickenCoop", this.accessories);

    this.accessories = [];
}
