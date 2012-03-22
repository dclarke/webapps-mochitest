const MODE_RDONLY   = 0x01;
const PERMS_FILE      = 0644;

var SERVERS = {"_primary":"http://127.0.0.1:8088",
               "super_crazy":"http://www.example.com:80/chrome/dom/tests/mochitest/webapps/apps/super_crazy.webapp",
               "wild_crazy":"http://www.example.com:80/chrome/dom/tests/mochitest/webapps/apps/wild_crazy.webapp",
               "app_with_simple_service":"http://127.0.0.1:8888/tests/dom/tests/mochitest/webapps/servers/app_with_simple_service",
               "bad_content_type":"http://test2.example.org:80/tests/dom/tests/mochitest/webapps/servers/bad_content_type",
               "json_syntax_error":"http://sub1.test1.example.org:80/tests/dom/tests/mochitest/webapps/servers/json_syntax_error",
               "manifest_with_bom":"http://sub1.test2.example.org:80/tests/dom/tests/mochitest/webapps/servers/manifest_with_bom",
               "missing_required_field":"http://sub2.test1.example.org:80/tests/dom/tests/mochitest/webapps/servers/missing_required_field",
               "no_delegated_install":"http://sub2.test2.example.org:80/tests/dom/tests/mochitest/webapps/servers/no_delegated_install",
               "no_mgmt_api_off_repo_origin":"http://test1.example.org:8000/tests/dom/tests/mochitest/webapps/servers/no_mgmt_api_off_repo_origin",
               "demo":"http://test2.example.org:8000/tests/dom/tests/mochitest/webapps/servers/demo",
               "demopaid":"http://example.org:8000/tests/dom/tests/mochitest/webapps/servers/demopaid",
               "mozillaball":"http://test:80/tests/dom/tests/mochitest/webapps/servers/mozillaball"
 };

function getAll() {
  var request = navigator.mozApps.mgmt.getAll();
  request.onsuccess = function() {
    var apps = request.result;
    document.body.innerHTML += "<p>" + apps.length + " apps</p>";
    for (var i = 0; i < apps.length; i++)
      document.body.innerHTML += "<p>enumerate app: " + JSON.stringify(apps[i].origin) + "</p>";
  } 
  request.onerror = function() { 
    alert("Error calling getAll : " + request.error.name);
  }
}

function uninstallAll(next) {
   var pendingGetAll = navigator.mozApps.mgmt.getAll();
   pendingGetAll.onsuccess = function() {
     var m = this.result;
     var total = m.length;
     finished = (total === 0);
     for (var i=0; i < m.length; i++) {
       var app = m[i];
       var pendingUninstall = app.uninstall();
       pendingUninstall.onsuccess = function(r) {
         finished = (--total === 0);
       };
       pendingUninstall.onerror = function () {
         finished = true;
         writeln('Error:', this.error);
         throw('Failed');
       };
     }
     info("calling next");
     next();
   }
}

function iterateMethods(label, root, suppress) {
  var arr = [];
  for (var f in root) {
    if (suppress && suppress.indexOf(f) != -1)
      continue;
    if (typeof root[f] === 'function')
      arr.push(label + f);
   }
  return arr;
}

function js_traverse(template, object) {
  var type = typeof template;
  console.log("inside js_traverse");
  console.log("type = " + type);
  console.log(typeof(object));
 
  if (type == "object") {
    if (Object.keys(template).length == 1 && template["status"]) {
      ok(!object || object.length == 0,"The return object from mozApps api was null as expected");
      return;
    }
    for (var key in template) {
      console.log("key: ", key);
      var accessor = key.split(".",1);
      if (accessor.length > 1) {
        js_traverse(template[key], object[accessor[0]].accessor[1]);
      } else {
        js_traverse(template[key], object[key]);
      }
    }
  } else if (type == "array") {
    for (var i = 0; i < object.length; i++) {
      js_traverse(template[i],object[i]);
    }
  } else {
    var evaluate = "";
    try {
      console.log("object = " + object.quote());
      console.log("template = " + template);
      evaluate = object.quote() + template;
    } catch (e) {
      evaluate = object + template;
    }

    console.log("evaluate = " + evaluate);
    console.log(eval(evaluate));
    ok(eval(evaluate), "#" + object + "# is expected to be true per template #" + template + "#");
  }
}

function subsetOf(resultObj, list) {
  var returnObj = {} ;
  for (var i=0; i < list.length; i++) {
    returnObj[list[i]] = resultObj[list[i]];
  }
  return returnObj;
}

function mozAppscb(pending, comparatorObj, next) {
  var done = false;
  info("inside mozAppscb"); 
  pending.onsuccess = function () {
    done = true;
    ok(true, "success cb, called");
    info("what is the result " + pending.result);
    if(pending.result) {
      if(pending.result.length) {
        info("length = " + pending.result.length);
        for(i=0;i < pending.result.length;i++) {
          pending.result[i].status= 'success';
          console.log("looking at result = " + i);
          console.log(JSON.stringify(comparatorObj[i]));
          js_traverse(comparatorObj[i],pending.result[i]);
        }
      } else {
        pending.result.status = 'success';
        js_traverse(comparatorObj, pending.result);
      }
    } else {
      js_traverse(comparatorObj, null);
    }
    info("calling next");
    next();
    return pending;
  };
  pending.onerror = function () {
    done = true;
    pending.error.status = 'error';
    ok(false, "failure cb called");
    js_traverse(comparatorObj, pending.error);
    next();
    return pending;
  };
}

var popups = 0;
var popupNotifications = getPopupNotifications(window.top);

function getPopupNotifications(aWindow) {
    var Ci = Components.interfaces;
    var chromeWin = aWindow.QueryInterface(Ci.nsIInterfaceRequestor)
                           .getInterface(Ci.nsIWebNavigation)
                           .QueryInterface(Ci.nsIDocShell)
                           .chromeEventHandler.ownerDocument.defaultView;

    var popupNotifications = chromeWin.PopupNotifications;
    return popupNotifications;
}


/*
 * getPopup
 *
 */
function getPopup(aPopupNote, aKind) {
    ok(true, "Looking for " + aKind + " popup notification");
    return aPopupNote.getNotification(aKind);
}

function dumpNotifications() {
  try {
    // PopupNotifications
    var container = getPopupNotifications(window.top);
    ok(true, "is popup panel open? " + container.isPanelOpen);
    var notes = container._currentNotifications;
    ok(true, "Found " + notes.length + " popup notifications.");
    for (var i = 0; i < notes.length; i++) {
        ok(true, "#" + i + ": " + notes[i].id);
    }
    var Ci = Components.interfaces;
    // Notification bars
    var chromeWin = window.top.QueryInterface(Ci.nsIInterfaceRequestor)
                           .getInterface(Ci.nsIWebNavigation)
                           .QueryInterface(Ci.nsIDocShell)
                           .chromeEventHandler.ownerDocument.defaultView;
    var nb = chromeWin.getNotificationBox(window.top);
    var notes = nb.allNotifications;
    ok(true, "Found " + notes.length + " notification bars.");
    for (var i = 0; i < notes.length; i++) {
        ok(true, "#" + i + ": " + notes[i].getAttribute("value"));
    }
  } catch(e) { todo(false, "WOAH! " + e); }
}

function triggerMainCommand(popup) {

  info("triggering main command");
  let notifications = popup.childNodes;
  ok(notifications.length > 0, "at least one notification displayed");
  let notification = notifications[0];
  info("triggering command: " + notification.getAttribute("buttonlabel"));

  // 20, 10 so that the inner button is hit
  notification.button.doCommand();

}

function clickPopup() {
  popupNotifications.panel.addEventListener("popupshown", function() {
        triggerMainCommand(this);
  }, false );

}
function runAll() {
  var index = 0;
  SimpleTest.waitForExplicitFinish();
  function callNext() {
    index++;
    if (index >= arguments.length) {
      SimpleTest.finish();
      return;
    }
    var func = arguments[index];
    func(callNext);
  }
}

function install(appURL,next) {
  var origin = URLParse(appURL).normalize().originOnly().toString();
  clickPopup(); 
  var url = appURL.substring(appURL.indexOf('/apps/'));
  info(url);
  var manifest = JSON.parse(readFile(url));

  for (var i = 0 ; i <  manifest.installs_allowed_from.length; i++)
    manifest.installs_allowed_from[i] = "== " + manifest.installs_allowed_from[i].quote();

  info(manifest.installs_allowed_from);

  mozAppscb(navigator.mozApps.install(
      appURL, null),
      {
        status: "== \"success\"",
        installOrigin: "== " + "chrome://mochitests".quote(),
        origin: "== " + origin.quote(),
        manifestURL: "== " +  appURL.quote(),
        manifest: {
          name: "== " + manifest.name.quote(),
          installs_allowed_from: manifest.installs_allowed_from
        }
      }, next);
}

function getInstalled(appURL, next) {

    var origin = URLParse(appURL).normalize().originOnly().toString();
  var url = appURL.substring(appURL.indexOf('/apps/'));
  var manifest = JSON.parse(readFile(url));
  var receipts = manifest.receipts;

  for (var i = 0 ; i <  manifest.installs_allowed_from.length; i++)
    manifest.installs_allowed_from[i] = "== " + manifest.installs_allowed_from[i].quote();
  info(manifest.installs_allowed_from);

  for (v in manifest.receipts)
    manifest.receipts[v] = "== " + manifest.receipts[v].quote();
  
  mozAppscb(navigator.mozApps.getInstalled(),
    [{
      status: "== " + "success".quote(),
      installOrigin: "== " + "chrome://mochitests".quote(),
      origin: "== " + origin.quote(),
      manifestURL: "== " +  appURL.quote(),
      installTime: " \> Date.now() - 3000",
      //"receipts": "== " + manifest.receipts,
      manifest: {
        name: "== " + manifest.name.quote(),
        installs_allowed_from: manifest.installs_allowed_from
      }
    }],
    next);
}

function getFile(file) {
  
  var contents = {} ; 

  var fileStream = Components.classes['@mozilla.org/network/file-input-stream;1']
                   .createInstance(Components.interfaces.nsIFileInputStream);
  fileStream.init(file, 1, 0, false);
  var binaryStream = Components.classes['@mozilla.org/binaryinputstream;1']
                     .createInstance(Components.interfaces.nsIBinaryInputStream);
  binaryStream.setInputStream(fileStream);

  response.bodyOutputStream.writeFrom(binaryStream, binaryStream.available());

  binaryStream.close();
  fileStream.close();

}
function fetchManifest(url, cb) {
  // contact our server to retrieve the URL
  url = "/content/chrome/dom/tests/mochitest/webapps" +
         url.substring(url.indexOf('/apps/'));
  info(url);
 
  var xhr = new XMLHttpRequest();
  // proxy through HTML5 repo host to support cross domain fetching
  xhr.open("GET", url, true);
  xhr.overrideMimeType("text/html");
  xhr.responseType = "json";

  xhr.onreadystatechange = function(aEvt) {
    info("readystate = " + xhr.readyState);
    if (xhr.readyState == 4) {
      info("readystatus = " + xhr.status);
      if (xhr.status == 200) {
        
        info(xhr.responseText);
        cb("return " + xhr.responseText);
      } else {
        cb(null);
      }
    }
  };
  xhr.send(null);
}
/**
 * Reads text from a file and returns the string.
 *
 * @param  aFile
 *         The file to read from.
 * @return The string of text read from the file.
 */
function readFile(aFile) {
  var file = Components.classes["@mozilla.org/file/directory_service;1"].
             getService(Components.interfaces.nsIProperties).
             get("CurWorkD", Components.interfaces.nsILocalFile);

  var fis = Components.classes["@mozilla.org/network/file-input-stream;1"].
            createInstance(Components.interfaces.nsIFileInputStream);

  
  var paths = "tests/dom/tests/mochitest/webapps/" + aFile;
  var split = paths.split("/");
  for(var i = 0; i < split.length; ++i) {
    file.append(split[i]);
  }
  info(file);
  fis.init(file, MODE_RDONLY, PERMS_FILE, 0);
  info("readFile 2");
  var sis = Components.classes["@mozilla.org/scriptableinputstream;1"].
            createInstance(Components.interfaces.nsIScriptableInputStream);
  sis.init(fis);
  info("before sis.avail");
  var text = sis.read(sis.available());
  sis.close();
  info(text);
  return text;
}

window.onerror = function (message, filename, lineno) {
  var m = message;
  if (filename || lineno) {
    m += ' (';
    if (filename) {
      m += filename;
      if (lineno) {
        m += ':' + lineno;
      }
    } else {
      m += 'line ' + lineno;
    }
    m += ')';
  }
  info('Error: ' + m);
};

netscape.security.PrivilegeManager.enablePrivilege("UniversalXPConnect");
Components.classes["@mozilla.org/permissionmanager;1"]
          .getService(Components.interfaces.nsIPermissionManager)
          .add(SpecialPowers.getDocumentURIObject(window.document),
               "webapps-manage",
               Components.interfaces.nsIPermissionManager.ALLOW_ACTION);

SpecialPowers.setCharPref("dom.mozApps.whitelist", "http://mochi.test:8888");

