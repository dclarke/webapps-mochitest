const MODE_READONLY   = 0x01;
const PERMS_FILE = 0644;

var popupNotifications = getPopupNotifications(window.top);

netscape.security.PrivilegeManager.enablePrivilege("UniversalXPConnect");
Components.classes["@mozilla.org/permissionmanager;1"]
          .getService(Components.interfaces.nsIPermissionManager)
          .add(SpecialPowers.getDocumentURIObject(window.document),
               "webapps-manage",
               Components.interfaces.nsIPermissionManager.ALLOW_ACTION);

SpecialPowers.setCharPref("dom.mozApps.whitelist", "http://mochi.test:8888");


SpecialPowers.setBoolPref('dom.mozBrowserFramesEnabled', true);
SpecialPowers.setBoolPref("dom.mozBrowserFramesWhitelist", "http://www.example.com");


var SERVERS = {"_primary":"http://127.0.0.1:8088",
               "super_crazy":"http://www.example.com:80/chrome/dom/tests/mochitest/webapps/apps/super_crazy.webapp",
               "wild_crazy":"http://www.example.com:80/chrome/dom/tests/mochitest/webapps/apps/wild_crazy.webapp",
               "app_with_simple_service":"http://127.0.0.1:8888/tests/dom/tests/mochitest/webapps/servers/app_with_simple_service",
               "bad_content_type":"http://test2.example.org:80/chrome/dom/tests/mochitest/webapps/apps/bad_content_type.webapp",
               "json_syntax_error":"http://sub1.test1.example.org:80/chrome/dom/tests/mochitest/webapps/apps/json_syntax_error.webapp",
               "manifest_with_bom":"http://sub1.test2.example.org:80/chrome/dom/tests/mochitest/webapps/apps/manifest_with_bom.webapp",
               "missing_required_field":"http://sub2.test1.example.org:80/chrome/dom/tests/mochitest/webapps/apps/missing_required_field.webapp",
               "no_delegated_install":"http://sub2.test2.example.org:80/chrome/dom/tests/mochitest/webapps/apps/no_delegated_install.webapp",
               "no_mgmt_api_off_repo_origin":"http://test1.example.org:8000/tests/dom/tests/mochitest/webapps/servers/no_mgmt_api_off_repo_origin",
               "demo":"http://test2.example.org:8000/tests/dom/tests/mochitest/webapps/servers/demo",
               "demopaid":"http://example.org:8000/tests/dom/tests/mochitest/webapps/servers/demopaid",
               "mozillaball":"http://test:80/tests/dom/tests/mochitest/webapps/servers/mozillaball"
 };

function onIframeLoad(name, next) {
  document.getElementById(name).contentWindow.wrappedJSObject.mozAppscb = mozAppscb;
  document.getElementById(name).contentWindow.wrappedJSObject.next = next;
  document.getElementById(name).contentWindow.wrappedJSObject.appURL = SERVERS[name];
  document.getElementById(name).contentWindow.wrappedJSObject.install = install;
  document.getElementById(name).contentWindow.wrappedJSObject.getInstalled = getInstalled;
  document.getElementById(name).contentWindow.wrappedJSObject.ok = ok;
  document.getElementById(name).contentWindow.wrappedJSObject.info = info;
}

function uninstallAll(next) {
  var pendingGetAll = navigator.mozApps.mgmt.getAll();
  pendingGetAll.onsuccess = function() {
    var m = this.result;
    var total = m.length;
    var finished = (total === 0);
    for (var i=0; i < m.length; i++) {
      var app = m[i];
      var pendingUninstall = app.uninstall();
      pendingUninstall.onsuccess = function(r) {
        finished = (--total === 0);
      };
      pendingUninstall.onerror = function () {
        finished = true;
        throw('Failed');
      };
    };

    info("calling next");
    next();
  }
}

function uninstall(appURL, next) {
  var pending = navigator.mozApps.getInstalled(); 
  pending.onsuccess = function () {
    var m = this.result;
    for (var i=0; i < m.length; i++) {
      var app = m[i];
      if (app.manifestURL == appURL) {
        found = true;
        var pendingUninstall = app.uninstall();
        pendingUninstall.onsuccess = function(r) {
          finished = true;
          ok(true, "app has been uninstalled");
          try {
            var secondUninstall = app.uninstall();
            secondUninstall.onsuccess = function(r) {
              next();
            };
            secondUninstall.onerror = function(r) {
              info(secondUninstall.error.name);
              info(secondUninstall.error.manifestURL);
              next();
            };
          } 
          catch(e) {
            ok(e.message == "Not enough arguments \[mozIDOMApplicationRegistry.install\]", "install returned " + e.message);
            next();
          }
        };
        pendingUninstall.onerror = function () {
          ok(false);
          finished = true;
          throw('Failed');
        };
      }
    }
  }
  pending.onerror = function ()  {
    ok(false, "Unexpected on error called in uninstall " );
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
 
  if (type == "object") {
    if (Object.keys(template).length == 1 && template["status"]) {
      ok(!object || object.length == 0,"The return object from mozApps api was null as expected");
      return;
    }
    for (var key in template) {
      info("key: ", key);
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
      info("object = " + object.quote());
      
      info("template = " + template);
      evaluate = object.quote() + template;
    } catch (e) {
      evaluate = object + template;
    }
    info("evaluate = " + evaluate);
    info(eval(evaluate));
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
    if(typeof next == 'function') {
      info("calling next");
      next();
    }
  };
  pending.onerror = function () {
    done = true;
    pending.error.status = 'error';
    ok(true, "failure cb called");
    js_traverse(comparatorObj, pending.error);
    if(typeof next == 'function') {
      info("calling next");
      next();
    }
  };
}

function getPopupNotifications(aWindow) {
  var Ci = Components.interfaces;
  var chromeWin = aWindow.QueryInterface(Ci.nsIInterfaceRequestor)
                           .getInterface(Ci.nsIWebNavigation)
                           .QueryInterface(Ci.nsIDocShell)
                           .chromeEventHandler.ownerDocument.defaultView;

  var popupNotifications = chromeWin.PopupNotifications;
  return popupNotifications;
}

function triggerMainCommand(popup) {
  var notifications = popup.childNodes;
  ok(notifications.length > 0, "at least one notification displayed");
  var notification = notifications[0];
  info("triggering command: " + notification.getAttribute("buttonlabel"));

  // 20, 10 so that the inner button is hit
  notification.button.doCommand();
}

function popup_listener() {
  popupNotifications.panel.addEventListener("popupshown", function() {
        triggerMainCommand(this);
  }, false );

}
function runAll(steps) {
  var index = 0;
  SimpleTest.waitForExplicitFinish();
  function callNext() {
    if (index >= steps.length-1) {
      SimpleTest.finish();
      return;
    }
    info("index = " + index);
    var func = steps[index];
    index++;
    func(callNext);
  }
  callNext();
}

function install(appURL, next) {
  var origin = URLParse(appURL).normalize().originOnly().toString();
  popup_listener(); 
  var url = appURL.substring(appURL.indexOf('/apps/'));
  var manifest = JSON.parse(readFile(url));
  if(!manifest.installs_allowed_from) {
    manifest.installs_allowed_from = "== undefined";
  }
  for (var i = 0 ; i <  manifest.installs_allowed_from.length; i++)
    manifest.installs_allowed_from[i] = "== " + manifest.installs_allowed_from[i].quote();

  mozAppscb(navigator.mozApps.install(
      appURL, null),
      {
        status: "== \"success\"",
        installOrigin: "== " + "chrome://mochitests".quote(),
        origin: "== " + origin.quote(),
        manifestURL: "== " +  appURL.quote(),
        manifest: {
          name: "== " + unescape(manifest.name).quote(),
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
        name: "== " + unescape(manifest.name).quote(),
        installs_allowed_from: manifest.installs_allowed_from
      }
    }],
    next);
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
  var paths = "chrome/dom/tests/mochitest/webapps" + aFile;
  var split = paths.split("/");
  var sis = Components.classes["@mozilla.org/scriptableinputstream;1"].
            createInstance(Components.interfaces.nsIScriptableInputStream);
  var utf8Converter = Components.classes["@mozilla.org/intl/utf8converterservice;1"].
    getService(Components.interfaces.nsIUTF8ConverterService);

  for(var i = 0; i < split.length; ++i) {
    file.append(split[i]);
  }
  fis.init(file, MODE_READONLY, PERMS_FILE, 0);
  sis.init(fis);
  var text = sis.read(sis.available());
  text = utf8Converter.convertURISpecToUTF8 (text, "UTF-8");
  sis.close();
  info (text);
  return text;
}

