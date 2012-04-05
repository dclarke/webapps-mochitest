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

function subsetOf(resultObj, list) {
  var returnObj = {} ;
  for (var i=0; i < list.length; i++) {
    console.log(resultObj[list[i]]);
    returnObj[list[i]] = resultObj[list[i]];
  }
  return returnObj;
}

function createIframe(name) {

  var appURL = SERVERS[name];
  appURL = appURL.substring(0,appURL.indexOf(name + ".webapp"));
  var iframe = document.createElement("iframe");
  iframe.setAttribute('type', 'content');
  iframe.setAttribute('src', appURL + "include.html");
  iframe.setAttribute('style', "width: 350px; height: 350px; display: block;");
  iframe.setAttribute('id', name);
  iframe.height = window.innerHeight + 'px';
  iframe.width = window.innerWidth + 'px';
  info(appURL + "include.html");
  document.documentElement.appendChild(iframe);

}

function onIframeLoad(name, next) {
  document.getElementById(name).contentWindow.wrappedJSObject.next = next;
  document.getElementById(name).contentWindow.wrappedJSObject.ok = ok;
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
        info(finished);
      };
      pendingUninstall.onerror = function () {
        finished = true;
        throw('Failed');
      };
    }
    var t; 
    function uninstallcheck() {
      info(finished);
      if(finished == true) {
        if (t) {
          clearTimeout(t);
        }
        next();
      }
      else {
        info("else statement");
        t = setTimeout("uninstallcheck()", 1000);
      }
    }
    uninstallcheck();
  };
}

function subsetOf(resultObj, list) {
  var returnObj = {} ;
  for (var i=0; i < list.length; i++) {
    returnObj[list[i]] = resultObj[list[i]];
  }
  return returnObj;
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

function dump(foo) {
  var output = '';
  for (property in foo) {
    output += property + ': ' + foo[property]+'; ';
  }
  info(output);
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
        if(object[key]) {
          js_traverse(template[key], object[key]);
        } else {
          ok(typeof template[key] == "undefined", key + " is undefined as expected");
        }
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
    } 
    catch (e) {
      info("template = " + template);
      evaluate = object + template;
    }
    
    info("evaluate = " + evaluate);
    info(eval(evaluate));
    ok(eval(evaluate), "#" + object + "# is expected to be true per template #" + template + "#");
  }
}

function mozAppscb(pending, comparatorObj, next) {
  info("inside mozAppscb"); 
  pending.onsuccess = function () {
    ok(true, "success cb, called");
    if(pending.result) {
      if(pending.result.length) {
        info("length = " + pending.result.length);
        for(i=0;i < pending.result.length;i++) {
          pending.result[i].status= 'success';
          js_traverse(comparatorObj[i],pending.result[i]);
        }
      } else {
        info("comparatorOBj in else");
        pending.result.status = 'success';
        js_traverse(comparatorObj[0], pending.result);
      }
    } else {
      info("HERE");
      js_traverse(comparatorObj[0], null);
    }
    if(typeof next == 'function') {
      info("calling next");
      next();
    }
  };

  pending.onerror = function () {
    pending.error.status = 'error';
    ok(true, "failure cb called");
    js_traverse(comparatorObj[0], pending.error);
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

function install(appURL, next) {
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
      }], next);
}

function getInstalled(appURLs, next) {
  var checkInstalled = [];
  for (var i = 0; i < appURLs.length ; i++) {
    var appURL = appURLs[i];
    var origin = URLParse(appURL).normalize().originOnly().toString();
    var url = appURL.substring(appURL.indexOf('/apps/'));
    var manifest = JSON.parse(readFile(url));
    var receipts = manifest.receipts;
   
    if(manifest.installs_allowed_from) {
      for (var j = 0 ; j <  manifest.installs_allowed_from.length; j++)
        manifest.installs_allowed_from[j] = "== " + manifest.installs_allowed_from[j].quote();
    }
    for (v in manifest.receipts)
      manifest.receipts[v] = "== " + manifest.receipts[v].quote();
    
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
  mozAppscb(navigator.mozApps.getInstalled(), checkInstalled, next);
}

