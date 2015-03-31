// **********************************************************************
//
// Copyright (c) 2003-2015 ZeroC, Inc. All rights reserved.
//
// **********************************************************************

#include <Ice/Ice.h>
#include <ThroughputI.h>

ThroughputI::ThroughputI() :
    _byteSeq(Demo::ByteSeqSize),
    _stringSeq(Demo::StringSeqSize, "hello"),
    _stringViewSeq(Demo::StringSeqSize, "hello"),
    _structSeq(Demo::StringDoubleSeqSize),
    _fixedSeq(Demo::FixedSeqSize),
    _warmup(false)
{
    int i;
    for(i = 0; i < Demo::StringDoubleSeqSize; ++i)
    {
        _structSeq[i].s = "hello";
        _structSeq[i].d = 3.14;
    }
    for(i = 0; i < Demo::FixedSeqSize; ++i)
    {
        _fixedSeq[i].i = 0;
        _fixedSeq[i].j = 0;
        _fixedSeq[i].d = 0;
    }
}

bool
ThroughputI::needsWarmup(const Ice::Current&)
{
    _warmup = false;
    return false;
}

void
ThroughputI::startWarmup(const Ice::Current&)
{
    _warmup = true;
}

void
ThroughputI::endWarmup(const Ice::Current&)
{
    _warmup = false;
}

void
ThroughputI::sendByteSeq(const std::pair<const Ice::Byte*, const Ice::Byte*>&, const Ice::Current&)
{
}

void
ThroughputI::recvByteSeq_async(const Demo::AMD_Throughput_recvByteSeqPtr& cb, const Ice::Current&)
{
    std::pair<const Ice::Byte*, const Ice::Byte*> ret;
    if(_warmup)
    {
        Demo::ByteSeq empty(1);
        ret.first = &empty[0];
        ret.second = ret.first + empty.size();
    }
    else
    {
        ret.first = &_byteSeq[0];
        ret.second = ret.first + _byteSeq.size();
    }
    cb->ice_response(ret);
}

void
ThroughputI::echoByteSeq_async(const Demo::AMD_Throughput_echoByteSeqPtr& cb, 
                         const std::pair<const Ice::Byte*, const Ice::Byte*>& seq, const Ice::Current&)
{
    cb->ice_response(seq);
}

void
ThroughputI::sendStringSeq(const std::vector<Util::string_view>&, const Ice::Current&)
{
}

void
ThroughputI::recvStringSeq_async(const Demo::AMD_Throughput_recvStringSeqPtr& cb, 
                                 const Ice::Current&)
{
    if(_warmup)
    {
        cb->ice_response(std::vector<Util::string_view>(0));
    }
    else
    {
        cb->ice_response(_stringViewSeq);
    }
}

void
ThroughputI::echoStringSeq_async(const Demo::AMD_Throughput_echoStringSeqPtr& cb, 
                                 const std::vector<Util::string_view>& seq, const Ice::Current&)
{
    cb->ice_response(seq);
}

void
ThroughputI::sendStructSeq(const Demo::StringDoubleSeq&, const Ice::Current&)
{
}

Demo::StringDoubleSeq
ThroughputI::recvStructSeq(const Ice::Current&)
{
    if(_warmup)
    {
        return Demo::StringDoubleSeq();
    }
    else
    {
        return _structSeq;
    }
}

Demo::StringDoubleSeq
ThroughputI::echoStructSeq(const Demo::StringDoubleSeq& seq, const Ice::Current&)
{
    return seq;
}

void
ThroughputI::sendFixedSeq(const Demo::FixedSeq&, const Ice::Current&)
{
}

Demo::FixedSeq
ThroughputI::recvFixedSeq(const Ice::Current&)
{
    if(_warmup)
    {
        return Demo::FixedSeq();
    }
    else
    {
        return _fixedSeq;
    }
}

Demo::FixedSeq
ThroughputI::echoFixedSeq(const Demo::FixedSeq& seq, const Ice::Current&)
{
    return seq;
}

void
ThroughputI::shutdown(const Ice::Current& c)
{
    c.adapter->getCommunicator()->shutdown();
}
