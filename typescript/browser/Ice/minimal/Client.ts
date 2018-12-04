// **********************************************************************
//
// Copyright (c) 2003-2018 ZeroC, Inc. All rights reserved.
//
// **********************************************************************

import {Ice} from "ice";
import {Demo} from "./index";
(function(){

//
// Handle the client state
//
enum State
{
    Idle,
    Busy
}

//
// Initialize the communicator.
//
const communicator = Ice.initialize();

async function sayHello()
{
    try
    {
        setState(State.Busy);

        //
        // Create a proxy for the hello object
        //
        const hostname = document.location.hostname || "127.0.0.1";
        const proxy = communicator.stringToProxy(`hello:ws -h ${hostname} -p 10000`);

        //
        // Down-cast this proxy to the derived interface Demo::Hello
        // using checkedCast, and invoke the sayHello operation if
        // the checkedCast succeeds.
        //
        const hello = await Demo.HelloPrx.checkedCast(proxy);
        await hello.sayHello();
    }
    catch(ex)
    {
        //
        // Handle any exceptions thrown above.
        //
        $("#output").val(ex.toString());
    }
    finally
    {
        setState(State.Idle);
    }
}

function setState(newState:State)
{
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
            // Enable buttons
            //
            $("#hello").removeClass("disabled").click(sayHello);
            break;
        }
        case State.Busy:
        {
            //
            // Clear any previous error messages.
            //
            $("#output").val("");

            //
            // Disable buttons.
            //
            $("#hello").addClass("disabled").off("click");

            //
            // Display the progress indicator and set the wait cursor.
            //
            $("#progress").show();
            $("body").addClass("waiting");
            break;
        }
        default:
        {
            break;
        }
    }
}

//
// Start in the idle state
//
setState(State.Idle);

}());
