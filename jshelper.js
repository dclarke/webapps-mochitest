var SERVERS = {"_primary":"http://127.0.0.1:8088",
               "super_crazy":"http://www.example.com:80/chrome/dom/tests/mochitest/webapps/apps/super_crazy.webapp",
               "wild_crazy":"http://www.example.com:80/chrome/dom/tests/mochitest/webapps/apps/wild_crazy.webapp",
               "app_with_simple_service":"http://127.0.0.1:8888/tests/dom/tests/mochitest/webapps/servers/app_with_simple_service",
               "bad_content_type":"http://test2.example.org:80/chrome/dom/tests/mochitest/webapps/apps/bad_content_type.webapp",
               "json_syntax_error":"http://sub1.test1.example.org:80/chrome/dom/tests/mochitest/webapps/apps/json_syntax_error.webapp",
               "manifest_with_bom":"http://sub1.test2.example.org:80/chrome/dom/tests/mochitest/webapps/apps/manifest_with_bom.webapp",
               "missing_required_field":"http://sub2.test1.example.org:80/chrome/dom/tests/mochitest/webapps/apps/missing_required_field.webapp",
               "no_delegated_install":"http://sub2.test2.example.org:80/chrome/dom/tests/mochitest/webapps/apps/no_delegated_install.webapp"
 };


function onIframeLoad(name, check, next) {
  document.getElementById(name).contentWindow.wrappedJSObject.next = next;
  document.getElementById(name).contentWindow.wrappedJSObject.check = check;
  document.getElementById(name).contentWindow.wrappedJSObject.info = info;
  document.getElementById(name).contentWindow.wrappedJSObject.appURL = SERVERS[name]; 
  document.getElementById(name).contentWindow.wrappedJSObject.popup_listener = popup_listener;
  document.getElementById(name).contentWindow.wrappedJSObject.readFile = readFile;
}

function uninstallAll(next) {
  var pendingGetAll = navigator.mozApps.mgmt.getAll();
  pendingGetAll.onsuccess = function() {
    var m = this.result;
    var total = m.length;
    var finished = (total === 0);
    info("total = " + total);
    for (var i=0; i < m.length; i++) {
      var app = m[i];
      var pendingUninstall = app.uninstall();
      pendingUninstall.onsuccess = function(r) {
        finished = (--total === 0);
        if(finished == true) {
          next();
        }
      };
      pendingUninstall.onerror = function () {
        finished = true;
        throw('Failed');
        if(finished == true) {
          next();
        }
      };
    }
  if(finished == true) {
    next();
  }
  }
}

function subsetOf(resultObj, list) {
  var returnObj = {} ;
  for (var i=0; i < list.length; i++) {
    returnObj[list[i]] = resultObj[list[i]];
  }
  return returnObj;
}

function uninstall(appURL, check, next) {
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
          check(true, "app has been uninstalled");
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
            check(e.message == "Not enough arguments \[mozIDOMApplicationRegistry.install\]", "install returned " + e.message);
            next();
          }
        };
        pendingUninstall.onerror = function () {
          check(false);
          finished = true;
          throw('Failed');
        };
      }
    }
  }
  pending.onerror = function ()  {
    check(false, "Unexpected on error called in uninstall " );
  }
}

function dump(foo) {
  var output = '';
  for (property in foo) {
    output += property + ': ' + foo[property]+'; ';
  }
  info(output);
}

function js_traverse(template, check, object) {
  var type = typeof template;

  if (type == "object") {
    if (Object.keys(template).length == 1 && template["status"]) {
      check(!object || object.length == 0,"The return object from mozApps api was null as expected");
      return;
    }
    for (var key in template) {
      info("key: ", key);
      var accessor = key.split(".",1);
      if (accessor.length > 1) {
        js_traverse(template[key], check, object[accessor[0]].accessor[1]);
      } else {
        if(object[key]) {
          js_traverse(template[key], check, object[key]);
        } else {
          check(typeof template[key] == "undefined", key + " is undefined as expected");
        }
      }
    }
  } else if (type == "array") {
    for (var i = 0; i < object.length; i++) {
      js_traverse(template[i], check, object[i]);
    }
  } else {
    var evaluate = "";
    
    try {
      info("object = " + object.quote());
      info("template = " + template);
      
      evaluate = object.quote() + template;
    } 
    catch (e) {
      info("template = " + template);
      evaluate = object + template;
    }
    
    info("evaluate = " + evaluate);
    info(eval(evaluate));
    check(eval(evaluate), "#" + object + "# is expected to be true per template #" + template + "#");
  }
}

function mozAppscb(pending, comparatorObj, check, next) {
  info("inside mozAppscb"); 
  pending.onsuccess = function () {
    info("success cb, called");
    if(pending.result) {
      if(pending.result.length) {
        for(i=0;i < pending.result.length;i++) {
          pending.result[i].status= 'success';
          js_traverse(comparatorObj[i], check, pending.result[i]);
        }
      } else {
        info("comparatorOBj in else");
        pending.result.status = 'success';
        js_traverse(comparatorObj[0], check, pending.result);
      }
    } else {
      js_traverse(comparatorObj[0], check, null);
    }
    if(typeof next == 'function') {
      info("calling next");
      next();
    }
  };

  pending.onerror = function () {
    pending.error.status = 'error';
    check(true, "failure cb called");
    js_traverse(comparatorObj[0], check, pending.error);
    if(typeof next == 'function') {
      info("calling next");
      next();
    }
  };
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

function install(appURL, check, receipts, next) {
  var origin = URLParse(appURL).normalize().originOnly().toString();
  var installOrigin = URLParse(window.location.href).normalize().originOnly().toString();
  info("installOrigin = " + installOrigin);
  popup_listener(); 
  var url = appURL.substring(appURL.indexOf('/apps/'));
  var manifest = JSON.parse(readFile(url));
  if(!manifest.installs_allowed_from) {
    manifest.installs_allowed_from = undefined;
  } else {
    for (var i = 0 ; i <  manifest.installs_allowed_from.length; i++)
      manifest.installs_allowed_from[i] = "== " + manifest.installs_allowed_from[i].quote();
  }
  mozAppscb(navigator.mozApps.install(
      appURL, null),
      [{
        status: "== \"success\"",
        installOrigin: "== " + installOrigin.quote(),
        origin: "== " + origin.quote(),
        manifestURL: "== " +  appURL.quote(),
        manifest: {
          name: "== " + unescape(manifest.name).quote(),
          installs_allowed_from: manifest.installs_allowed_from
        }
      }], check, 
      next);
}

function getInstalled(appURLs, check, receipts, next) {
  var checkInstalled = [];
  for (var i = 0; i < appURLs.length ; i++) {
    var appURL = appURLs[i];
    var origin = URLParse(appURL).normalize().originOnly().toString();
    var url = appURL.substring(appURL.indexOf('/apps/'));
    var manifest = JSON.parse(readFile(url));
   
    if(manifest.installs_allowed_from) {
      for (var j = 0 ; j <  manifest.installs_allowed_from.length; j++)
        manifest.installs_allowed_from[j] = "== " + manifest.installs_allowed_from[j].quote();
    }
    
    checkInstalled[i] = {
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
     };
  }
  info(JSON.stringify(checkInstalled));
  mozAppscb(navigator.mozApps.getInstalled(), checkInstalled, check, next);
}

function check_event_listener_fired (next) {
  todo(triggered, "Event Listener fired");
  triggered = false;
  next();
}
