const CC = Components.Constructor;
const BinaryInputStream = CC("@mozilla.org/binaryinputstream;1",
                             "nsIBinaryInputStream",
                             "setInputStream");

function handleRequest(request, response) {
    var host = request.host;
    var port = request.port;
    var path = request.path;
    var file; 

    getObjectState("SERVER_ROOT", function(serverRoot)
    { 
        file = serverRoot.getFile("tests/dom/tests/mochitest/webapps/servers/basic_app/" + path);
    });
    response.write(file);
}


