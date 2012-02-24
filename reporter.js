function replaceChars(aStr) {
    aStr = aStr.replace(/&amp;/g, '&');
    aStr = aStr.replace(/&gt;/g, '>');
    aStr = aStr.replace(/&lt;/g, '<');
    aStr = aStr.replace(/<[^>]+>/g, '');
    aStr = aStr.replace(/\n/g,'');
    return aStr;
}
SimpleTest.waitForExplicitFinish();
this.doctestReporterHook = {
    init : function (reporter,verbosity) {
    },
    reportSuccess : function (example, output) {
        var example_out = replaceChars(example.output);
        var output_out = replaceChars(output);
        ok(true, output_out);
    },
    reportFailure : function (example, output) {
        var example_out = replaceChars(example.output);
        var output_out = replaceChars(output);
        console.log("HERE");
        ok(false, output_out);
    },
    finish: function(reporter) {
        SimpleTest.finish();
     }
};
