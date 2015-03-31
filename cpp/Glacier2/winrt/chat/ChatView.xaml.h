﻿// **********************************************************************
//
// Copyright (c) 2003-2015 ZeroC, Inc. All rights reserved.
//
// **********************************************************************

#pragma once

#include "ChatView.g.h"

namespace chat
{

public ref class ChatView sealed
{
public:
        
    ChatView();
    void setError(Platform::String^ err);
    void appendMessage(Platform::String^ message);
        
private:
        
    void inputKeyDown(Platform::Object^ sender, Windows::UI::Xaml::Input::KeyRoutedEventArgs^ e);
};

}
