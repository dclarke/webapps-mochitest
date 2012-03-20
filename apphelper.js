
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

const kOK = 0;

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

function uninstallAll() {
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
   };
   return function () {
     wait(function () {
       if (finished) {
         finished = false;
         return true;
       }
     });
   };
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
    console.log(object);

    if (type == "object") {
        for (var key in template) {
            console.log("key: ", key);
            js_traverse(template[key],object[key]);
        }
    } else if (type == "array") {
       for (var i = 0; i < object.length; i++) {
            js_traverse(template[key][i],object[key][i]);
        }
    } 
     else {
        console.log("object = " + object.quote());
        console.log("template = " + template);
        var evaluate = object.quote() + template;
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
  
  pending.onsuccess = function () {
    done = true;
    pending.result.status = 'success';
    ok(true, "success cb, called");
    js_traverse(comparatorObj, pending.result);
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

function appsTest(pending, comparatorObj, next) {
  var result = mozAppscb(pending, comparatorObj); 
  pending.onsuccess = function () {
    done = true;
    pending.result.status = 'success';
    console.log("success cb, called");
    js_traverse(comparatorObj, pending.result);
    next();
    return pending;
  };
  pending.onerror = function () {
    done = true;
    pending.error.status = 'error';
    console.log ("HERE");
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

function triggerMainCommand(popup)
{
  info("triggering main command");
  let notifications = popup.childNodes;
  ok(notifications.length > 0, "at least one notification displayed");
  let notification = notifications[0];
  info("triggering command: " + notification.getAttribute("buttonlabel"));

  // 20, 10 so that the inner button is hit
  notification.button.doCommand();
}

netscape.security.PrivilegeManager.enablePrivilege("UniversalXPConnect");
Components.classes["@mozilla.org/permissionmanager;1"]
          .getService(Components.interfaces.nsIPermissionManager)
          .add(SpecialPowers.getDocumentURIObject(window.document),
               "webapps-manage",
               Components.interfaces.nsIPermissionManager.ALLOW_ACTION);

SpecialPowers.setCharPref("dom.mozApps.whitelist", "http://mochi.test:8888");

