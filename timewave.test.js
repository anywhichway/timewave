import {Clock,D,Period} from "./timewave.js";

function daysIntoYear(date){
    return Math.trunc((Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()) - Date.UTC(date.getFullYear(), 0, 0)) / D.durations["d"]);
}

function weeksIntoYear(date){
    return Math.trunc((Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()) - Date.UTC(date.getFullYear(), 0, 0)) / D.durations["w"]);
}

test("Clock",() => {
    const now = new Date(),
        clock = Clock(now);
    expect(clock.getTime()).toBe(now.getTime());
});

test("Clock - throw", () => {
    expect(()=> {
        Clock("foo");
    }).toThrow(TypeError);
})

test("Clock",() => {
    const now = new Date(),
        c1 = Clock(now),
        c2 = Clock(now);
    expect(JSON.stringify(c1)).toBe(JSON.stringify(c2));
});

test("Clock - get",() => {
    const now = new Date(),
        clock = Clock(now);
    Object.getOwnPropertyNames(Date.prototype).forEach((key) => {
        if(key.startsWith("get")) {
            expect(clock[key]()).toBe(now[key]())
        }
    })
});

test("Clock - base properties",() => {
    const now = new Date(),
        clock = Clock(now);
    Object.getOwnPropertyNames(Date.prototype).forEach((key) => {
        if(key.startsWith("get")) {
            const name = key[3].toLowerCase() + key.substring(4);
            expect(clock[name]).toBe(now[key]());
        }
    })
});

test("Clock - base properties plural",() => {
    const now = new Date(),
        clock = Clock(now);
    Object.getOwnPropertyNames(Date.prototype).forEach((key) => {
        if(key.startsWith("get") && key.endsWith("s")) {
            const name = key[3].toLowerCase() + key.substring(4,key.length-1);
            expect(clock[name]).toBe(now[key]());
        }
    })
});

test("Clock - weekDay",() => {
    const now = new Date(),
        clock = Clock(now);
    expect(clock.weekDay).toBe(clock.getDay()+1);
    expect(clock.weekDay).toBe(now.getDay()+1)
});

test("Clock - dayOfMonth",() => {
    const now = new Date(),
        clock = Clock(now);
    expect(clock.dayOfMonth).toBe(clock.getDate());
    expect(clock.dayOfMonth).toBe(now.getDate())
});

test("Clock - dayOfYear and ordinal",() => {
    const now = new Date(),
        clock = Clock(now);
    expect(clock.dayOfYear).toBe(daysIntoYear(now));
    expect(clock.ordinal).toBe(daysIntoYear(now))
})

test("Clock - isInLeapYear",() => {
    const now = new Date(),
        clock = Clock(now),
        nowyr = now.getFullYear(),
        clockyr = clock.getFullYear();
    expect(clock.isInLeapYear).toBe(!(clockyr % 4 || !(clockyr % 100) && clockyr % 400));
    expect(clock.isInLeapYear).toBe(!(nowyr % 4 || !(nowyr % 100) && nowkyr % 400))
});

test("Clock - offset",() => {
    const now = new Date(),
        clock = Clock(now);
    expect(clock.offset).toBe(now.getTimezoneOffset());
});

test("Clock - plus",() => {
    const now = new Date(),
        clock = Clock(now).plus("1y");
    expect(clock.getTime()).toBe(Math.round(now.getTime()+D.durations.y));
});

test("Clock - plus throw", () => {
    expect(() => {
        const now = new Date(),
            future = Clock(now).plus("1Y");
    }).toThrow(TypeError );
    expect(() => {
        const now = new Date(),
            future = Clock(now).plus({});
    }).toThrow(TypeError );
})

test("Clock - minus",() => {
    const now = new Date(),
        clock = Clock(now).minus("1y");
    expect(clock.getTime()).toBe(Math.trunc(now.getTime()-D.durations.y));
});

test("Clock - weekOfYear",() => {
    const now = new Date(),
        clock = Clock(now);
    expect(clock.weekOfYear).toBe(weeksIntoYear(now));
})

test("Clock - toString",() => {
    const now = new Date(),
        nyc = Clock(now,{tz:"America/New_York"}),
        offset = nyc.getTimezoneOffset(),
        str = nyc.toString(),
        hours = `${Math.round(offset / 60)}`.padStart(2,"0"),
        minutes = `${offset % 60}`.padStart(2,"0"),
        gmt = `GMT${offset<=0 ? "+" : "-"}${hours}${minutes}`;
    expect(str.includes("(America/New_York)")).toBe(true);
    expect(str.includes(gmt)).toBe(true);
});

test("Clock - getTimezoneOffset",() => {
    const now = new Date(),
        nyc = Clock(now,{tz:"America/New_York"}),
        la = Clock(now,{tz:"America/Los_Angeles"});
    expect(la.getTimezoneOffset()-nyc.getTimezoneOffset()).toBe(60*3);
    expect(nyc.getTime()).toBe(la.getTime());
});

test("Clock - clone",() => {
    const now = new Date(),
        nyc = Clock(now,{tz:"America/New_York"}),
        la = nyc.clone({tz:"America/Los_Angeles"});
    expect(la.getTimezoneOffset()-nyc.getTimezoneOffset()).toBe(60*3);
    expect(nyc.getTime()).toBe(la.getTime()+1000*60*60*3);
    expect(nyc.milliseconds).toBe(now.getMilliseconds());
    expect(nyc.milliseconds).toBe(la.milliseconds);
    expect(nyc.seconds).toBe(now.getSeconds());
    expect(nyc.seconds).toBe(la.seconds);
    expect(nyc.minutes).toBe(now.getMinutes());
    expect(nyc.minutes).toBe(la.minutes);
    expect(nyc.hours).toBe(now.getHours());
    expect(nyc.hours===la.hours).toBe(false);
});

test("Clock - extended get",() => {
    const now = new Date(),
        nyc = Clock(now,{tz:"America/New_York"}),
        la = nyc.clone({tz:"America/Los_Angeles"});
    Object.getOwnPropertyNames(Date.prototype).forEach((key) => {
        if(key!=="getTimezoneOffset" && key.startsWith("get")) {
            expect(la[key]()).toBe(nyc[key]("America/Los_Angeles"));
        }
    })
});

test("Clock - max", () => {
    const now = Date.now(),
        c1 = Clock(now).plus(D("1m")),
        c2 =  Clock(now).plus(D("1y")),
        c3 =  Clock(now).plus(D("1y")),
        maxes = Clock.max(c1,c2,c3);
    expect(maxes.length).toBe(2);
    expect(maxes[0]).toBe(c2);
    expect(maxes[1]).toBe(c3);
})

test("Clock - min", () => {
    const now = Date.now(),
        c1 = Clock(now).plus(D("1m")),
        c2 =  Clock(now).plus(D("1y")),
        c3 =  Clock(now).plus(D("1m")),
        mins = Clock.min(c1,c2,c3);
    expect(mins.length).toBe(2);
    expect(mins[0]).toBe(c1);
    expect(mins[1]).toBe(c3);
})

test("Clock - run",async () => {
    const now = new Date(),
        clock = Clock(now,{tz:"America/Los_Angeles",run:true}),
        start = clock.getTime();
    let time = await new Promise((resolve) => {
            setTimeout(() => {
                resolve(clock.getTime())
            },1000);
        });
    //expect(clock.toString()).toBe(now.getTime()+1000);
    expect(time).toBeGreaterThan(start+999);
    expect(time).toBeLessThan(start+1100);
    expect(time).toBeGreaterThan(now.getTime()+1000-1000/60);
    expect(time).toBeLessThan(now.getTime()+1000+(1000/60)*4);
    let stats = clock.stats;
    expect(typeof(stats)).toBe("object");
    expect(stats.hz).toBe(60);
    expect(stats.tick).toBe(1000/60);
    expect(stats.sync).toBe(true);
    expect(stats.cycles.length).toBe(1);
    let cycle = stats.cycles[stats.cycles.length-1];
    expect(cycle.hz).toBe(stats.hz);
    expect(cycle.tick).toBe(stats.tick);
    expect(cycle.sync).toBe(stats.sync);
    expect(cycle.time.start).toBeGreaterThanOrEqual(now.getTime());
    expect(cycle.time.start).toBeLessThanOrEqual(now.getTime()+1);
    expect(cycle.time.stop).toBe(undefined);
    expect(cycle.clockTime.start).toBe(start);
    expect(cycle.clockTime.stop).toBe(undefined);
    clock.stop();
    stats = clock.stats;
    expect(typeof(stats)).toBe("object");
    expect(stats.hz).toBe(60);
    expect(stats.tick).toBe(1000/60);
    expect(stats.sync).toBe(true);
    expect(stats.cycles.length).toBe(1);
    cycle = stats.cycles[stats.cycles.length-1];
    expect(cycle.hz).toBe(stats.hz);
    expect(cycle.tick).toBe(stats.tick);
    expect(cycle.sync).toBe(stats.sync);
    expect(cycle.time.stop).toBeGreaterThanOrEqual(Date.now()-1);
    expect(cycle.time.stop).toBeLessThanOrEqual(Date.now());
    expect(cycle.clockTime.stop).toBe(clock.getTime());
    clock.start({hz:50,sync:false});
    stats = clock.stats;
    expect(typeof(stats)).toBe("object");
    expect(stats.hz).toBe(60);
    expect(stats.tick).toBe(1000/60);
    expect(stats.sync).toBe(true);
    expect(stats.cycles.length).toBe(2);
    cycle = stats.cycles[stats.cycles.length-1];
    expect(cycle.hz).toBe(50);
    expect(cycle.tick).toBe(1000/50);
    expect(cycle.sync).toBe(false);
    clock.start({hz:1,tick:2000,sync:false});
    stats = clock.stats;
    expect(typeof(stats)).toBe("object");
    expect(stats.hz).toBe(60);
    expect(stats.tick).toBe(1000/60);
    expect(stats.sync).toBe(true);
    expect(stats.cycles.length).toBe(3);
    cycle = stats.cycles[stats.cycles.length-1];
    expect(cycle.hz).toBe(1);
    expect(cycle.tick).toBe(2000);
    expect(cycle.sync).toBe(false);
    const ctime = clock.getTime();
    time = await new Promise((resolve) => {
        setTimeout(() => {
            resolve(clock.getTime())
        },1000);
    });
    expect(clock.getTime()).toBeGreaterThanOrEqual(ctime+2000);
    expect(clock.getTime()).toBeLessThanOrEqual(ctime+3000);
    clock.reset();
    stats = clock.stats;
    expect(clock.getTime()).toBe(stats.initialDate.getTime());
})

test("Clock - Date alarm",async () => {
    const result = await new Promise((resolve) => {
        const now = Date.now();
        Clock(now,{run:true})
            .setAlarm({for:new Date(now+2000)},(clock) => {
                clock.stop();
                resolve("alarmed!")
            })
    });
    expect(result).toBe("alarmed!");
})

test("Clock - Period alarm",async () => {
    const result = await new Promise((resolve) => {
        const now = Date.now();
        Clock(now,{run:true})
            .setAlarm({for:Period({start:new Date(now+1000),end:new Date(now+3000)})},(clock,complete) => {
                if(complete) {
                    clock.stop();
                    resolve(clock)
                } else {
                    clock.count ||= 0;
                    clock.count++;
                }
            })
    });
    expect(result).toBeInstanceOf(Date);
    expect(result.count).toBeGreaterThan(60);
})

test("D - create",() => {
    const d1 = D(1000),
        d2 = D("1ms"),
        d3 = D(new Date()),
        d4 = D(D(1));
    expect(d1).toBeInstanceOf(D);
    expect(d2).toBeInstanceOf(D);
    expect(d3).toBeInstanceOf(D);
    expect(d4).toBeInstanceOf(D);
})

test("D - ms from Date",() => {
    const now = new Date(),
        d = D(now,"ms");
    expect(d.valueOf()).toBe(now.getTime());
})

test("D - to Date",() => {
    const now = new Date(),
        d = D(now);
    expect(d.to("Date").getTime()).toBe(now.getTime());
})

test("D - throw from Date",() => {
    expect(() => {
        D(new Date(),"y")
    }).toThrow(TypeError)
})

test("D - throw",() => {
    expect(() => {
        D({})
    }).toThrow(TypeError)
})

test("D - throw from bad duration",() => {
    expect(() => {
        D("1Y")
    }).toThrow(TypeError)
})

test("D - simple math", () => {
    const sum = D("1y") + D("1q") + D("1mo") + D("1w") + D("1d") + D("1h") + D("1m") + D("1s") + D("1ms");
    expect(sum).toBe(Object.values(D.durations).reduce((sum,duration) => sum + duration));
})

test("D - Date Math", () => {
    const now = new Date(),
        future = D(now) + D("1y");
    expect(future).toBe(now.getTime()+D.durations.y);
})

test("D - plus", () => {
    const now = new Date(),
        future = D(now).plus("1y");
    expect(future).toBeInstanceOf(D);
    expect(future.valueOf()).toBe(now.getTime()+D.durations.y);
})

test("D - plus throw", () => {
   expect(() => {
        const now = new Date(),
            future = D(now).plus("1Y");
    }).toThrow(TypeError );
    expect(() => {
        const now = new Date(),
            future = D(now).plus({});
    }).toThrow(TypeError );
})

test("D - minus", () => {
    const now = new Date(),
        future = D(now).minus("1y");
    expect(future.valueOf()).toBe(now.getTime()-D.durations.y);
})

test("D - minus throw", () => {
    expect(() => {
        const now = new Date(),
            future = D(now).minus("1Y");
    }).toThrow(TypeError);
})

test("D - max", () => {
    const d1 = D("1m"),
        d2 = D("1y"),
        d3 = D("1y"),
        maxes = D.max(d1,d2,d3);
    expect(maxes.length).toBe(2);
    expect(maxes[0]).toBe(d2);
    expect(maxes[1]).toBe(d3);
})

test("D - min", () => {
    const d1 = D("1m"),
        d2 = D("1y"),
        d3 = D("1m"),
        mins = D.min(d1,d2,d3);
    expect(mins.length).toBe(2);
    expect(mins[0]).toBe(d1);
    expect(mins[1]).toBe(d3);
})

test("P - create", () => {
    const now = Date.now(),
        p1 = Period({start:now,end:now+D("1y")}),
        p2 = Period({start:new Date(now),end:new Date(now+D("1y"))}),
        p3 = Period({start:Clock(now),end:Clock(now+D("1y"))});
    expect(p1).toBeInstanceOf(Period);
    expect(p2).toBeInstanceOf(Period);
    expect(p3).toBeInstanceOf(Period);
    expect(p1.start).toBeInstanceOf(Date);
    expect(p1.end).toBeInstanceOf(Date);
    expect(p2.start).toBeInstanceOf(Date);
    expect(p2.end).toBeInstanceOf(Date);
    expect(p1.start.getTime()).toBe(p2.start.getTime());
})

test("P - to ", () => {
    const now = Date.now(),
        p1 = Period({start:now,end:now+D("1y")});
    expect(p1.to("ms")).toBe(Math.round(D("1y").valueOf()));
})

test("P - to Date throw", () => {
    expect(() => {
        const now = Date.now(),
            p1 = Period({start:now,end:now+D("1y")});
        p1.to("Date");
    }).toThrow(TypeError)
})

test("P - shift", () => {
    const now = Date.now(),
        p1 = Period({start:now,end:now+D("1y")}),
        p2 = p1.shift(D("1y"));
    expect(p1.end.getTime()).toBe(p2.start.getTime());
})

test("P - shift impure", () => {
    const now = Date.now(),
        p1 = Period({start:now,end:now+D("1y")}),
        p1end = p1.end.getTime(),
        p2 = p1.shift(D("1y"),{pure:false});
    expect(p1end).toBe(p2.start.getTime());
})

test("P - extend forward", () => {
    const now = Date.now(),
        p1 = Period({start:now,end:now+D("1y")}),
        p2 = p1.extend(D("1y"));
    expect(p2.end.getTime()).toBe(Math.round(p1.end.getTime()+D("1y")));
})

test("P - extend forward impure", () => {
    const now = Date.now(),
        p1 = Period({start:now,end:now+D("1y")}),
        p1end = p1.end.getTime(),
        p2 = p1.extend(D("1y"),{pure:false});
    expect(p2.end.getTime()).toBe(Math.round(p1end+D("1y")));
})

test("P - extend backward", () => {
    const now = Date.now(),
        p1 = Period({start:now,end:now+D("1y")}),
        p2 = p1.extend(D("-1y"));
    expect(p2.start.getTime()).toBeGreaterThanOrEqual(Math.round((p1.start.getTime()+D("-1y"))-1));
    expect(p2.start.getTime()).toBeLessThanOrEqual(Math.round(p1.start.getTime()+D("-1y")));
})

test("P - extend backward impure", () => {
    const now = Date.now(),
        p1 = Period({start:now,end:now+D("1y")}),
        p1start = p1.start.getTime(),
        p2 = p1.extend(D("-1y"),{pure:false});
    expect(p2.start.getTime()).toBeGreaterThanOrEqual(Math.round((p1start+D("-1y"))-1));
    expect(p2.start.getTime()).toBeLessThanOrEqual(Math.round(p1start+D("-1y")));
})

test("P - throw",() => {
    expect(() => {
        Period({start:"foo",end:"bar"});
    }).toThrowError(TypeError)
})

test("P - max", () => {
    const now = Date.now(),
        p1 = Period({start:now,end:now+D("1m")}),
        p2 =  Period({start:now,end:now+D("1y")}),
        p3 =  Period({start:now,end:now+D("1y")}),
        maxes = Period.max(p1,p2,p3);
    expect(maxes.length).toBe(2);
    expect(maxes[0]).toBe(p2);
    expect(maxes[1]).toBe(p3);
})

test("P - min", () => {
    const now = Date.now(),
        p1 = Period({start:now,end:now+D("1m")}),
        p2 =  Period({start:now,end:now+D("1y")}),
        p3 =  Period({start:now,end:now+D("1m")}),
        mins = Period.min(p1,p2,p3);
    expect(mins.length).toBe(2);
    expect(mins[0]).toBe(p1);
    expect(mins[1]).toBe(p3);
})



