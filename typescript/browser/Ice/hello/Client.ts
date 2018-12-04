// **********************************************************************
//
// Copyright (c) 2003-2018 ZeroC, Inc. All rights reserved.
//
// **********************************************************************

import {Ice} from "ice";
import {Demo} from "./index";

(function(){

const communicator = Ice.initialize();

let batch:number = 0;
let helloPrx:Demo.HelloPrx = null;

//
// Create the hello proxy.
//
function updateProxy()
{
    const hostname = document.location.hostname || "127.0.0.1";
    let proxy = communicator.stringToProxy("hello" +
                                           ":ws -h " + hostname + " -p 8080 -r /demows" +
                                           ":wss -h " + hostname + " -p 9090 -r /demowss");

    //
    // Set or clear the timeout.
    //
    const timeout:number = Number($("#timeout").val());
    proxy = proxy.ice_invocationTimeout(timeout > 0 ? timeout : -1);

    //
    // Set the mode and protocol
    //
    const mode = $("#mode").val();
    if(mode == "twoway")
    {
        proxy = proxy.ice_twoway();
    }
    else if(mode == "twoway-secure")
    {
        proxy = proxy.ice_twoway().ice_secure(true);
    }
    else if(mode == "oneway")
    {
        proxy = proxy.ice_oneway();
    }
    else if(mode == "oneway-secure")
    {
        proxy = proxy.ice_oneway().ice_secure(true);
    }
    else if(mode == "oneway-batch")
    {
        proxy = proxy.ice_batchOneway();
    }
    else if(mode == "oneway-batch-secure")
    {
        proxy = proxy.ice_batchOneway().ice_secure(true);
    }
    helloPrx = Demo.HelloPrx.uncheckedCast(proxy);

    //
    // The batch requests associated to the proxy are lost when we
    // update the proxy.
    //
    batch = 0;
    $("#flush").addClass("disabled").off("click");
}

enum State
{
    Idle,
    SendRequest,
    FlushBatchRequests
}

//
// Invoke sayHello.
//
async function sayHello()
{
    try
    {
        setState(State.SendRequest);

        if(helloPrx.ice_isBatchOneway())
        {
            batch++;
        }
        await helloPrx.sayHello(Number($("#delay").val()));
    }
    catch(ex)
    {
        $("#output").val(ex.toString());
    }
    finally
    {
        setState(State.Idle);
    }
}

//
// Flush batch requests.
//
async function flush()
{
    try
    {
        setState(State.SendRequest);

        batch = 0;
        setState(State.FlushBatchRequests);
        await helloPrx.ice_flushBatchRequests();
    }
    catch(ex)
    {
        $("#output").val(ex.toString());
    }
    finally
    {
        setState(State.Idle);
    }
}

//
// Shutdown the server.
//
async function shutdown()
{
    try
    {
        setState(State.SendRequest);

        if(helloPrx.ice_isBatchOneway())
        {
            batch++;
        }
        await helloPrx.shutdown();
    }
    catch(ex)
    {
        $("#output").val(ex.toString());
    }
    finally
    {
        setState(State.Idle);
    }
}

//
// Handle the client state.
//

let state:State;

function setState(newState:State)
{
    if(state === newState)
    {
        //
        // This event was queued before the event handler has time
        // to disable the button, just ignore it.
        //
        return;
    }

    switch(newState)
    {
        case State.Idle:
        {
            //
            // Hide the progress indicator.
            //
            $("#progress").hide();
            $("body").removeClass("waiting");

            //
            // Enable buttons.
            //
            $("#hello").removeClass("disabled").click(sayHello);
            $("#shutdown").removeClass("disabled").click(shutdown);
            if(batch > 0)
            {
                $("#flush").removeClass("disabled").click(flush);
            }
            break;
        }
        case State.SendRequest:
        case State.FlushBatchRequests:
        {
            //
            // Reset the output.
            //
            $("#output").val("");

            //
            // Disable buttons.
            //
            $("#hello").addClass("disabled").off("click");
            $("#shutdown").addClass("disabled").off("click");
            $("#flush").addClass("disabled").off("click");

            //
            // Display the progress indicator and set the wait cursor.
            //
            $("#progress .message").text(
                newState === State.SendRequest ? "Sending Request..." : "Flush Batch Requests...");
            $("#progress").show();
            $("body").addClass("waiting");
            break;
        }
        default:
        {
            break;
        }
    }
    state = newState;
}

//
// Start in the idle state
//
setState(State.Idle);

//
// Extract the url GET variables and intialize the mode
//
if(window.location.search.length > 1)
{
    for(let arg of window.location.search.substr(1).split("&"))
    {
        if(arg.includes("mode="))
        {
            $("#mode").val(arg.split("=")[1]);
        }
    }
}

//
// If the user selects a secure mode, ensure that the page is loaded over HTTPS
// so the web server SSL certificate is obtained.
//
$("#mode").on("change", e =>
    {
        const newMode = $(e.currentTarget).val();
        if(document.location.protocol === "http:" &&
           (newMode === "twoway-secure" || newMode === "oneway-secure" || newMode === "oneway-batch-secure"))
        {
            let href = document.location.protocol + "//" + document.location.host +
                       document.location.pathname + "?mode=" + newMode;
            href = href.replace("http", "https");
            href = href.replace("8080", "9090");
            document.location.assign(href);
        }
        else if (document.location.protocol === "https:" &&
                 (newMode === "twoway" || newMode === "oneway" || newMode === "oneway-batch"))
        {
            let href = document.location.protocol + "//" + document.location.host +
                       document.location.pathname + "?mode=" + newMode;
            href = href.replace("https", "http");
            href = href.replace("9090", "8080");
            document.location.assign(href);
        }
        updateProxy();
    });

    $("#timeout").on("change", () => updateProxy());

updateProxy();

}());
