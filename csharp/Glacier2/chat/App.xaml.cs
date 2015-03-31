// **********************************************************************
//
// Copyright (c) 2003-2015 ZeroC, Inc. All rights reserved.
//
// **********************************************************************

using System;
using System.Collections.Generic;
using System.Configuration;
using System.Data;
using System.Linq;
using System.Windows;

namespace Glacier2.chat.client
{
    /// <summary>
    /// Interaction logic for App.xaml
    /// </summary>
    public partial class App : System.Windows.Application
    {
    
        public void start(object sender, StartupEventArgs e)
        {
            ChatWindow window = new ChatWindow();
            window.Show();
            window.doLogin();
        }
    }
}
