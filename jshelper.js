function subsetOf(resultObj, list) {
  var returnObj = {} ;
  for (var i=0; i < list.length; i++) {
    console.log(resultObj[list[i]]);
    returnObj[list[i]] = resultObj[list[i]];
  }
  return returnObj;
}

function embedIFrameAndStartChannel(url) {
  var iframe = document.createElement("iframe");
  iframe.setAttribute('type', 'content');
  info(url);
  iframe.setAttribute('src', url);
  iframe.setAttribute('style', "width: 350px; height: 350px; display: block;");

  iframe.height = window.innerHeight + 'px';
  iframe.width = window.innerWidth + 'px';
  document.documentElement.appendChild(iframe);
  // next, let's connect to her over a jschannel
  var chan =  Channel.build({
      window: iframe.contentWindow,
      scope: "test",
      origin: "*",
      onReady: function() {alert("channel is ready");}
   });
  return chan;
}

// a utility function to automatically build up proper jschan.call args:
function buildJSChanArgs(name, cb) {
  return { method: name,
           success: cb,
           error: cb };
}

// given an origin of a host, find the iframe associated with it and
// maximize it
function showIFrame(origin) {
  var tags = document.getElementsByTagName('iframe');
  for (var i = 0; i < tags.length; i++) {
    if (0 === tags[i].getAttribute('src').indexOf(origin)) {
      tags[i].style.display = "block";
      return;
    }
  }
}

function hideIFrame(origin) {
  var tags = document.getElementsByTagName('iframe');
  for (var i = 0; i < tags.length; i++) {
    if (0 === tags[i].getAttribute('src').indexOf(origin)) {
      tags[i].style.display = "none";
      return;
    }
  }
}
