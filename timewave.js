const isDate = (value) => value && typeof(value)==="object" && value instanceof Date;
const durationMilliseconds = {
    ms: 1,
    s: 1000,
    m: 1000 * 60,
    h: 1000 * 60 * 60,
    d: 1000 * 60 * 60 * 24 * 365.2424177 / 365,
    w: 1000 * 60 * 60 * 24 * 365.2424177 / 52,
    mo: 1000 * 60 * 60 * 24 * 365.2424177 / 12,
    q: 1000 * 60 * 60 * 24 * 365.2424177 / 4,
    y: 1000 * 60 * 60 * 24 * 365.2424177
};
const durations = {
    milliseconds: "ms",
    seconds: "s",
    minutes: "m",
    hours: "h",
    days: "d",
    weeks: "w",
    months: "mo",
    quarters: "q",
    years: "y"
}
const types = {
    ms:"Milliseconds",
    s:"Seconds",
    m:"Minutes",
    h:"Hours",
    d:"Days",
    w:"Weeks",
    mo:"Months",
    q:"Quarters",
    y:"Years"
}
// https://stackoverflow.com/questions/11887934/how-to-check-if-dst-daylight-saving-time-is-in-effect-and-if-so-the-offset
/*
Let x be the expected number of milliseconds into the year of interest without factoring in daylight savings.
Let y be the number of milliseconds since the Epoch from the start of the year of the date of interest.
Let z be the number of milliseconds since the Epoch of the full date and time of interest
Let t be the subtraction of both x and y from z: z - y - x. This yields the offset due to DST.
If t is zero, then DST is not in effect. If t is not zero, then DST is in effect.
 */
const dstOffsetAtDate = (dateInput) => {
    var fullYear = dateInput.getFullYear()|0;
    // "Leap Years are any year that can be exactly divided by 4 (2012, 2016, etc)
    //   except if it can be exactly divided by 100, then it isn't (2100,2200,etc)
    //    except if it can be exactly divided by 400, then it is (2000, 2400)"
    // (https://www.mathsisfun.com/leap-years.html).
    var isLeapYear = ((fullYear & 3) | (fullYear/100 & 3)) === 0 ? 1 : 0;
    // (fullYear & 3) = (fullYear % 4), but faster
    //Alternative:var isLeapYear=(new Date(currentYear,1,29,12)).getDate()===29?1:0
    var fullMonth = dateInput.getMonth()|0;
    return (
        // 1. We know what the time since the Epoch really is
        (+dateInput) // same as the dateInput.getTime() method
        // 2. We know what the time since the Epoch at the start of the year is
        - (+new Date(fullYear, 0)) // day defaults to 1 if not explicitly zeroed
        // 3. Now, subtract what we would expect the time to be if daylight savings
        //      did not exist. This yields the time-offset due to daylight savings.
        - ((
            ((
                // Calculate the day of the year in the Gregorian calendar
                // The code below works based upon the facts of signed right shifts
                //    • (x) >> n: shifts n and fills in the n highest bits with 0s
                //    • (-x) >> n: shifts n and fills in the n highest bits with 1s
                // (This assumes that x is a positive integer)
                -1 + // first day in the year is day 1
                (31 & ((-fullMonth) >> 4)) + // January // (-11)>>4 = -1
                ((28 + isLeapYear) & ((1-fullMonth) >> 4)) + // February
                (31 & ((2-fullMonth) >> 4)) + // March
                (30 & ((3-fullMonth) >> 4)) + // April
                (31 & ((4-fullMonth) >> 4)) + // May
                (30 & ((5-fullMonth) >> 4)) + // June
                (31 & ((6-fullMonth) >> 4)) + // July
                (31 & ((7-fullMonth) >> 4)) + // August
                (30 & ((8-fullMonth) >> 4)) + // September
                (31 & ((9-fullMonth) >> 4)) + // October
                (30 & ((10-fullMonth) >> 4)) + // November
                // There are no months past December: the year rolls into the next.
                // Thus, fullMonth is 0-based, so it will never be 12 in Javascript

                (dateInput.getDate()|0) // get day of the month

            )&0xffff) * 24 * 60 // 24 hours in a day, 60 minutes in an hour
            + (dateInput.getHours()&0xff) * 60 // 60 minutes in an hour
            + (dateInput.getMinutes()&0xff)
        )|0) * 60 * 1000 // 60 seconds in a minute * 1000 milliseconds in a second
        - (dateInput.getSeconds()&0xff) * 1000 // 1000 milliseconds in a second
        - dateInput.getMilliseconds()
    );
}
const parseDuration = (value) => {
    let type = typeof(value);
    if(value && type==="object") {
        if(value instanceof D) return {...D};
        if(value instanceof Period) {
            value = value.valueOf();
            type = typeof(value);
        }
    }
    if(type==="number") return {ms:value,counts:[ms],types:["ms"]};
    if(type==="string") {
        const parts = value.split(" ");
        let ms = 0, counts = [], types = [];
        for(const part of parts) {
            const num = parseFloat(part),
                suffix = part.match(/\d([mshdwqy]+[os]?)+/)[1];
            if(typeof(num)==="number" && !isNaN(num) && suffix in durationMilliseconds) {
                ms += durationMilliseconds[suffix] * num;
                counts.push(num);
                types.push(suffix);
            } else {
                throw new TypeError(`${part} in ${value} is not a valid duration ${JSON.stringify(part.match(/\d([mshdqy]+[os]?)+/))}`)
            }
        }
        return {ms,counts,types};
    }
    throw new TypeError(`Invalid duration: ${value}`)
};

function Clock(date=new Date(),{tz,hz=60,tick=1000/hz,run,sync=true,alarms=[]}={}) {
    const type = typeof(date);
    if(!date || (type!=="number" && !isDate(date))) throw new TypeError(`Clock() expects a Date or number of ms not ${JSON.stringify(date)}`);
    date = new Date(type==="number" ? date : date.getTime());
    const stats = {
        initialDate:new Date(date),
        hz,
        tick,
        sync,
        cycles:[],
        alarms:[...alarms]
    };
    let interval;
    if(tz) {
        stats.tz = tz;
        const _toString = date.toString,
        toString = () => {
            const string = _toString.call(date),
                offset = proxy.getTimezoneOffset() / 60,
                fraction = offset % 1,
                minutes = (1 - fraction) >= .017 ? `${Math.round(fraction * 60)}` : "00", // .017 = 1 minute
                hours = `${Math.abs(Math.round(offset))}`,
                gmt = `GMT${offset>0 ? "-" : "+"}${hours.padStart(2,"0")}${minutes.padStart(2,"0")}`,
                zone = tz ? ` (${tz} ${proxy.isInDST ? "Daylight Time" : "Standard Time"})` : "";
            return string.replace(/GMT.*/g,gmt) + zone;
        };
        Object.defineProperty(date,"toString",{configurable:true,writable:true,value:toString});
    }
    const extensions = {
        addMilliseconds(value) {
            date.setTime(date.getTime()+value);
            return proxy;
        },
        addSeconds(value) {
            date.setTime(date.getTime()+value*1000);
            return proxy;
        },
        addMinutes(value) {
            date.setTime(date.getTime()+value*1000*60);
            return proxy;
        },
        addHours(value) {
            date.setTime(date.getTime()+value*1000*60*60);
            return proxy;
        },
        addDays(value) {
            if(value<=0) return proxy;
            if(value<1) {
                return proxy.addHours(value * 24);
            }
            const daysinmonth = proxy.daysInMonth,
                day = date.getDate(),
                restofmonth = daysinmonth - day;
            if(value>restofmonth) {
                proxy.addMonths(1);
                date.setDate(1);
                return proxy.addDays((value - 1) - restofmonth)
            }
            date.setDate(day + value);
            return proxy;
        },
        addWeeks(value) {
            return proxy.addDays(value/7);
        },
        addMonths(value) {
            if(value<=0) return proxy;
            if(value<1) {
                return proxy.addDays(value * proxy.daysInMonth)
            }
            const month = date.getMonth(),
                restofyear = 11 - month;
            if(value>restofyear) {
                proxy.addYears(1);
                date.setMonth(0);
                return proxy.addMonths((value - 1) - restofyear);
            }
            date.setMonth(month + value);
            return proxy;
        },
        addQuarters(value) {
            return proxy.addMonths(value / 4);
        },
        addYears(value) {
            if(value>=1) {
                const future = date.getFullYear() + Math.trunc(value);
                // future is not a leap year and current is a leap year and Feb 29th
                if((future % 4 || !(future % 100) && future % 400) && proxy.isInLeapYear && date.getMonth()==1 && date.getDate()===29) {
                    date.setDate(28);
                }
                date.setYear(future);
            }
            if((value % 1) > 0) {
                proxy.addDays((value % 1) * 365.2424177);
            }
            return proxy;
        },
        subtractMilliseconds(value) {
            date.setTime(date.getTime()-value);
            return proxy;
        },
        subtractSeconds(value) {
            date.setTime(date.getTime()-value*1000);
            return proxy;
        },
        subtractMinutes(value) {
            date.setTime(date.getTime()-value*1000*60);
            return proxy;
        },
        subtractHours(value) {
            date.setTime(date.getTime()-value*1000*60*60);
            return proxy;
        },
        subtractDays(value) {
            if(value<=0) return proxy;
            if(value<1) {
                return proxy.subtractHours(value * 24);
            }
            const daysinmonth = proxy.daysInMonth,
                day = date.getDate(),
                startofmonth = Math.abs(day - daysinmonth);
            if(value>startofmonth) {
                proxy.subtractMonth(1);
                date.setDate(1);
                return proxy.subtractDays((value - 1) - startofmonth);
            }
            date.setDate(day - value);
            return proxy;
        },
        subtractWeeks(value) {
            return proxy.subtractDays(value/7);
        },
        subtractMonths(value) {
            if(value<=0) return proxy;
            if(value<1) {
                return proxy.subtractDays(value * proxy.daysInMonth)
            }
            const month = date.getMonth(),
                startofyear = Math.abs(month - 11);
            if(value>startofyear) {
                date.setMonth(11);
                proxy.subtractYears(1);
                return proxy.subtractMonths((value - 1) - startofyear);
            }
            date.setMonth(month - value);
            return proxy;
        },
        subtractQuarters(value) {
            return proxy.subtractMonths(value / 4);
        },
        subtractYears(value) {
            const past = date.getFullYear() - value;
            // future is not a leap year and current is a leap year and Feb 29th
            if((past % 4 || !(past % 100) && past % 400) && proxy.isInLeapYear && date.getMonth()==1 && date.getDate()===29) {
                date.setDate(28);
            }
            date.setYear(past);
            proxy.subtractDays((past % 1) * 365.2424177);
            return proxy;
        },
        plus(duration,times=1) {
            const type = typeof(duration);
            if(type!=="number" && type!=="string" && !D.is(duration) && !Period.is(duration)) {
                throw new TypeError(`${JSON.stringify(duration)} is not a duration and can't be coerced into one`);
            }
            if(type==="number" || type==="string") duration = D(duration);
            duration.types.forEach((type,i) => {
                type = types[type];
                const count = duration.counts[i];
                if(count>0) {
                    proxy["add"+type](count);
                } else if(count<0) {
                    proxy["subtract"+type](-count);
                }
            })
            return this;
        },
        minus(duration) {
            const type = typeof(duration);
            if(type!=="number" && type!=="string" && !D.is(duration) && !Period.is(duration)) {
                throw new TypeError(`${JSON.stringify(duration)} is not a duration and can't be coerced into one`);
            }
            if(type==="number" || type==="string") duration = D(duration);
            duration.types.forEach((type,i) => {
                type = types[type];
                const count = duration.counts[i];
                if(count>0) {
                    proxy["subtract"+type](count);
                } else if(count<0) {
                    proxy["add"+type](-count);
                }
            })
            return this;
        },
        clone(options= {tz,hz,tick,alarms}) {
            const {tz,hz,tick,alarms} = options,
                thereDate = new Clock(new Date(),{tz}),
                thereOffset = thereDate.getTimezoneOffset(),
                offset = proxy.getTimezoneOffset() - thereOffset,
                newDate = new Date(date.getTime() + offset * 1000 * 60)
            return new Clock(newDate,{tz,hz,tick,alarms});
        },
        endOf(period) {
            if(period.length>2) period = durations[period+"s"];
            const ms = date.getTime();
            if(period==="s") {
                date.setMilliseconds(999);
            } else if(period==="m") {
                date.setSeconds(59);
                date.setMilliseconds(999);
            } else if(period==="h")  {
                date.setMinutes(59);
                date.setSeconds(59);
                date.setMilliseconds(999);
            } else if(period==="d") {
                date.setHours(59);
                date.setMinutes(59);
                date.setSeconds(59);
                date.setMilliseconds(999);
            } else if(period==="w") {

            } else if(period==="mo") {
                date.setHours(59);
                date.setMinutes(59);
                date.setSeconds(59);
                date.setMilliseconds(999)
                date.setDate(proxy.daysInMonth);
            } else if(period==="q") {

            } else if(period==="y") {
                date.setHours(59);
                date.setMinutes(59);
                date.setSeconds(59);
                date.setMilliseconds(999)
                date.setDate(proxy.daysInMonth);
                date.setMonth(11);
            }
        },
        startOf(period) {
            if(period.length>2) period = durations[period+"s"];
            const ms = date.getTime();
            if(period==="s") {
                date.setMilliseconds(0);
            } else if(period==="m") {
                date.setSeconds(0);
                date.setMilliseconds(0);
            } else if(period==="h")  {
                date.setMinutes(0);
                date.setSeconds(0);
                date.setMilliseconds(0);
            } else if(period==="d") {
                date.setHours(0);
                date.setMinutes(0);
                date.setSeconds(0);
                date.setMilliseconds(0);
            } else if(period==="w") {

            } else if(period==="mo") {
                date.setHours(0);
                date.setMinutes(0);
                date.setSeconds(0);
                date.setMilliseconds(0)
                date.setDate(1);
            } else if(period==="q") {

            } else if(period==="y") {
                date.setHours(0);
                date.setMinutes(0);
                date.setSeconds(0);
                date.setMilliseconds(0)
                date.setDate(1);
                date.setMonth(0);
            }
        },
        getTimezoneOffset() {
            const thereLocaleStr = date.toLocaleString('en-US', {timeZone: tz}),
                thereDate = new Date(thereLocaleStr),
                diff = thereDate.getTime() - date.getTime();
            return Math.round(date.getTimezoneOffset() - (diff /  (1000 * 60)));
        },
        stop() {
            const cycle = stats.cycles[stats.cycles.length-1];
            cycle.time.stop = Date.now();
            cycle.clockTime.stop = date.getTime();
            cycle.skew =  cycle.clockTime.stop - cycle.time.stop;
            clearInterval(interval);
            interval = null;
            return proxy;
        },
        start(options={hz,tick,sync}) {
            const {hz=60,tick=1000/hz,sync=false} = options,
                cycle = {hz,tick,sync,time:{start:Date.now()},clockTime:{start:date.getTime()}};
            stats.cycles.push(cycle);
            if(interval) this.stop();
            interval = setInterval(() => {
                const now = Date.now(),
                    clocknow = date.getTime(),
                    time = (sync ? now : clocknow);
                date.setTime(time);
                proxy.plus(tick);
                stats.alarms.forEach((alarm) => {
                    const {condition,action,executed} = alarm;
                    if(!executed) {
                        if(condition.for instanceof Date) {
                            if(!executed) {
                                if (time >= condition.for.getTime()) {
                                    alarm.executed = true;
                                    setTimeout(() => action(proxy, alarm.executed));
                                }
                            }
                        } else if(condition.for instanceof Period) {
                            if(time>=condition.for.start.getTime()) {
                                if(time>=condition.for.end.getTime()) {
                                    alarm.executed = true;
                                }
                                setTimeout(() => action(proxy,alarm.executed));
                            }
                        }
                    }
                })
            },1000/Math.abs(hz));
            return proxy;
        },
        reset(options={hz,tick,sync,run}) {
            const {hz=60,tick=1000/hz,sync,run} = options,
                cycle = stats.cycles[stats.cycles.length-1];
            if(interval) this.stop();
            date = new Date(stats.initialDate);
            if(run) this.start({hz,tick,sync});
            return proxy;
        },
        setAlarm(condition,action,name=action.name) {
            stats.alarms.push({condition,action,name});
        }
    };
    const proxy = new Proxy(date,{
        get(target,property) {
            if(property==="toString") return target.toString.bind(date);
            let value = extensions[property];
            if(value!==undefined) return value
            if(property==="length") return proxy.getTime() + proxy.getTimezoneOffset() * 1000 * 60;
            if(property==="weekDay") return target.getDay()+1;
            if(property==="dayOfMonth") return target.getDate();
            if(property==="dayOfYear" || property==="ordinal") {
                return Math.floor((Date.UTC(target.getFullYear(), target.getMonth(), target.getDate()) - Date.UTC(target.getFullYear(), 0, 0)) / durationMilliseconds["d"])
            }
            if(property==="daysInMonth") {
                return new Date(date.getFullYear(), date.getMonth()+1, 0). getDate();
            }
            if(property==="isInLeapYear") {
                const year = date.getFullYear();
                return !(year % 4 || !(year % 100) && year % 400);
            }
            if(property==="isInDST") {
                return !!dstOffsetAtDate(date);
            }
            if(property==="offset") return date.getTimezoneOffset();
            if(property==="weekOfYear") {
                return Math.floor((Date.UTC(target.getFullYear(), target.getMonth(), target.getDate()) - Date.UTC(target.getFullYear(), 0, 0)) / durationMilliseconds["w"])
            }
            if(property==="stats") {
               const cycles = stats.cycles.map((cycle) => { return {...cycle,time:{...cycle.time},clockTime:{...cycle.clockTime}}}),
                   alarms = stats.alarms.map(({condition,action}) => { return {condition:{...condition},action}; });
               return {...stats,cycles,alarms};
            }
            value = date[property];
            if(typeof(value)==="function") {
                if(property.startsWith("get")) return (timezone) => timezone ? proxy.clone({tz:timezone})[property]() : value.call(date);
                return value.bind(date);
            }
            if(typeof(property)==="string") {
                let fname = "get" + property[0].toUpperCase() + property.substring(1);
                if(typeof(target[fname])==="function") return date[fname]();
                fname += "s";
                if(typeof(target[fname])==="function") return date[fname]();
            }
            return value;
        }
    });
    if(run) extensions.start();
    return proxy;
}
Clock.min = (...items) => {
    const mintime = items.reduce((mintime,item) => Math.min(item.length,mintime),Infinity);
    return items.reduce((min,item) => {
        if(item.length===mintime) min.push(item);
        return min;
    },[])
}
Clock.max = (...items) => {
    const maxtime = items.reduce((maxtime,item) => Math.max(item.length,maxtime),-Infinity);
    return items.reduce((max,item) => {
        if(item.length===maxtime) max.push(item);
        return max;
    },[])
}
function D(value,type) {
    if(!this || !(this instanceof D)) return new D(value,type);
    let duration = value;
    if(isDate(duration)) {
        if(type && type!=="ms") throw new TypeError(`A date can't be used to initialize ${type}`);
        duration = value.getTime()+"ms";
    } else if(typeof(duration)==="number") {
        duration += type||"ms";
    }
    const {ms,counts,types} = parseDuration(duration);
    //Object.defineProperty(this,"type",{get() { return type; }});
    Object.assign(this,{ms,counts,types});
    Object.defineProperty(this,"valueOf",{value:() => ms});
    Object.defineProperty(this,"toJSON",{value:() => duration});
    Object.defineProperty(this,"length",{get() { return this.valueOf();}});
    return this;
}
D.is = (value) => value && typeof(value)==="object" && value instanceof D;
D.min = Clock.min;
D.max = Clock.max;
D.prototype.plus = function(duration,times=1) {
    const type = typeof(duration);
    if(type!=="number" && type!=="string" && !D.is(duration) && !Period.is(duration)) {
        throw new TypeError(`${JSON.stringify(duration)} is not a duration and can't be coerced into one`);
    }
    if(type==="number" || type==="string" || duration instanceof Date) duration = D(duration);
    return D(this.valueOf()+(duration * times));
},
D.prototype.minus = function(duration) {
    return this.plus(duration,-1);
},
D.prototype.to = function(type="ms") {
    const value = this.valueOf();
    if(type==="Date") {
        if(this instanceof Period) throw new TypeError(`Cannot convert Period to Date`);
        return new Date(value);
    }
    if(!(type in durationMilliseconds)) throw new TypeError(`${type} is not a valid duration type`);
    return value / durationMilliseconds[type];
}
Object.entries(durations).forEach(([key,value]) => {
    Object.defineProperty(D.prototype,key,{get:function() { return this.to(value); }})
    if(value!=="ms") Object.defineProperty(D.prototype,value,{get:function() { return this.to(value); }})
})
Object.defineProperty(D.prototype,"Date",{get:function() { return this.to("Date");}})
D.durations = durationMilliseconds;

function Period({start,end}) {
    if(!this || !(this instanceof Period)) return new Period({start,end});
    Object.defineProperty(this,"start",{
        set(value) {
            const type = typeof(value);
            if (!value || (type!=="number" && (type !== "object" || !(value instanceof Date)))) throw new TypeError(`Period boundary must be a Date or number`);
            start = new Clock(value);
        },
        get() {
            return start;
        }
    });
    Object.defineProperty(this,"end",{
        set(value) {
            const type = typeof(value);
            if (!value || (type!=="number" && (type !== "object" || !(value instanceof Date)))) throw new TypeError(`Period boundary must be a Date or number`);
            end = new Clock(value);
        },
        get() {
            return end;
        }
    });
    Object.defineProperty(this,"valueOf",{ value:() => {
            const t1 = start.getTime(),
                t2 = end.getTime();
            return Math.max(t1,t2)-Math.min(t1,t2);
        }});
    Object.defineProperty(this,"toJSON",{value: () => { return {start,end}}});
    Object.defineProperty(this,"length",{get() { return this.valueOf();}});
    this.start = start;
    this.end = end;
}
Period.is = (value) => value && typeof(value)==="object" && value instanceof Period;
Period.min = D.min;
Period.max = D.max;
Period.prototype.to = function(duration) {
    if(Object.entries(durations).some(([key,value]) => duration===key || duration===value)) {
        return (new D(this.length)).to(duration);
    }
    throw new TypeError(`${duration} is not a valid duration type`);
};
Object.entries(durations).forEach(([key,value]) => {
    Object.defineProperty(Period.prototype,key,{get:function() { return this.to(value); }})
    Object.defineProperty(Period.prototype,value,{get:function() { return this.to(value); }})
});
Period.prototype.shift = function(amount,{pure=true}={}) {
    if(pure) {
        const start = this.start.clone().plus(amount),
            end = this.end.clone().plus(amount);
        return new Period({start,end});
    }
    this.start.plus(amount),
    this.end.plus(amount);
    return this;
}
Period.prototype.extend = function(amount,{pure=true}={}) {
    if(amount.valueOf()<0) {
        if(pure) {
            const start = this.start.clone().plus(amount);
            return Period({start,end:this.end});
        }
        this.start.plus(amount);
    } else {
        if(pure) {
            const end = this.end.clone().plus(amount);
            return Period({start:this.start,end});
        }
        this.end.plus(amount);
    }
    return this;
}
// intersection
// union
// difference
const Timewave = {
    Clock,
    Period,
    D
};
if(typeof(self)!=="undefined") {
    self.Timewave = Timewave;
}
export {Clock,Period,D,Timewave as default}