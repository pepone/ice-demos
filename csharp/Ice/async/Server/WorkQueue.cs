//
// Copyright (c) ZeroC, Inc. All rights reserved.
//

using System;
using System.Threading;
using System.Threading.Tasks;
using System.Collections.Generic;
using Demo;

public class WorkQueue
{
    private class TaskEntry
    {
        public TaskEntry(Task task, int delay)
        {
            this.task = task;
            this.delay = delay;
        }

        public Task task;
        public int delay;
    }

    public void Join() => thread_.Join();

    public void Start()
    {
        thread_ = new Thread(new ThreadStart(Run));
        thread_.Start();
    }

    public void Run()
    {
        lock(this)
        {
            while(!_done)
            {
                if(_tasks.Count == 0)
                {
                    Monitor.Wait(this);
                }

                if(!_done && _tasks.Count != 0)
                {
                    //
                    // Get next work item.
                    //
                    TaskEntry entry = _tasks[0];

                    //
                    // Wait for the amount of time indicated in delay to
                    // emulate a process that takes a significant period of
                    // time to complete.
                    //
                    Monitor.Wait(this, entry.delay);

                    if(!_done)
                    {
                        _tasks.RemoveAt(0);
                        entry.task.Start();
                    }
                }
            }

            foreach(TaskEntry e in _tasks)
            {
                e.task.Start();
            }
        }
    }

    public Task Add(int delay)
    {
        Task t;

        lock(this)
        {
            if(!_done)
            {
                if(_tasks.Count == 0)
                {
                    Monitor.Pulse(this);
                }
                t = new Task(() => RunTask());
                _tasks.Add(new TaskEntry(t, delay));
            }
            else
            {
                t = Task.Factory.StartNew(() => RunTask());
            }
        }

        return t;
    }

    public void Destroy()
    {
        lock(this)
        {
            _done = true;
            Monitor.Pulse(this);
        }
    }

    private void RunTask()
    {
        lock(this)
        {
            if(!_done)
            {
                Console.Out.WriteLine("Belated Hello World!");
            }
            else
            {
                throw new RequestCanceledException();
            }
        }
    }

    private readonly List<TaskEntry> _tasks = new List<TaskEntry>();
    private bool _done;
    private Thread thread_;
}