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
const parseDuration = (value) => {
    const type = typeof(value);
    if(value && type==="object" && (value instanceof D || value instanceof Period)) return value.valueOf();
    if(type==="number") return value;
    if(type==="string") {
        const parts = value.split(" ");
        let ms = 0;
        for(const part of parts) {
            const num = parseFloat(part),
                suffix = part.substring((num+"").length);
            if(typeof(num)==="number" && !isNaN(num) && suffix in durationMilliseconds) {
                ms += durationMilliseconds[suffix] * num;
            } else {
                throw new TypeError(`${part} in ${value} is not a valid duration`)
            }
        }
        return ms;
    }
    throw new TypeError(`Invalid duration: ${value}`)
};

function Clock(date=new Date(),{tz,hz=60,tick=1000/hz,run,sync=true,alarms=[]}={}) {
    const type = typeof(date);
    if(!date || (type!=="number" && !isDate(date))) throw new TypeError(`Clock() expects a Date or number of ms not ${JSON.stringify(date)}`);
    date = new Date(date);
    const stats = {
        initialDate:new Date(date),
        hz,
        tick,
        sync,
        cycles:[],
        alarms:[...alarms]
    };
    let interval,
        tzoffset = date.getTimezoneOffset(),
        diff = 0;
    if(tz) {
        stats.tz = tz;
        const _toString = date.toString,
        toString = () => {
            const string = _toString.call(date);
            const offset = tzoffset / 60,
                fraction = offset % 1,
                minutes = (1 - fraction) >= .017 ? `${Math.round(fraction * 60)}` : "00", // .017 = 1 minute
                hours = `${Math.abs(Math.round(offset))}`,
                gmt = `GMT${offset>0 ? "-" : "+"}${hours.padStart(2,"0")}${minutes.padStart(2,"0")}`,
                zone = tz ? ` (${tz})` : "";
            return string.replace(/GMT.*/g,gmt) + zone;
        };
        Object.defineProperty(date,"toString",{configurable:true,writable:true,value:toString});
        const thereLocaleStr = date.toLocaleString('en-US', {timeZone: tz}),
            thereDate = new Date(thereLocaleStr);
        diff = thereDate.getTime() - date.getTime();
        tzoffset = Math.round(tzoffset - (diff /  (1000 * 60)));
    } else {
        tzoffset = date.getTimezoneOffset();
    }
    stats.offset = tzoffset;
    const extensions = {
        plus(duration,times=1) {
            const type = typeof(duration);
            if(type!=="number" && type!=="string" && !D.is(duration) && !Period.is(duration)) {
                throw new TypeError(`${JSON.stringify(duration)} is not a duration and can't be coerced into one`);
            }
            if(type==="number" || type==="string") duration = D(duration);
            const time = date.getTime() + (duration * times);
            date.setTime(time);
            return this;
        },
        minus(duration) {
            return this.plus(duration,-1);
        },
        clone(options= {tz,hz,tick,alarms}) {
            const {tz,hz,tick,alarms} = options,
                thereDate = new Clock(new Date(),{tz}),
                thereOffset = thereDate.getTimezoneOffset(),
                offset = tzoffset - thereOffset,
                newDate = new Date(date.getTime() + offset * 1000 * 60)
            return new Clock(newDate,{tz,hz,tick,alarms});
        },
        getTimezoneOffset() {
            return tzoffset;
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
                    time = (sync ? now : clocknow) + tick;
                date.setTime(time);
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
            if(property==="isInLeapYear") {
                const year = date.getFullYear();
                return !(year % 4 || !(year % 100) && year % 400);
            }
            if(property==="offset") return tzoffset;
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
    const valueof = parseDuration(duration);
    Object.defineProperty(this,"type",{get() { return type; }});
    Object.defineProperty(this,"valueOf",{value:() => valueof});
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
})
Object.defineProperty(D.prototype,"Date",{get:function() { return this.to("Date");}})
D.durations = durationMilliseconds;


function Period({start,end}) {
    if(!this || !(this instanceof Period)) return new Period({start,end});
    Object.defineProperty(this,"start",{
        set(value) {
            const type = typeof(value);
            if (!value || (type!=="number" && (type !== "object" || !(value instanceof Date)))) throw new TypeError(`Period boundary must be a Date or number`);
            if(type==="number") value = new Date(value);
            start = value;
        },
        get() {
            return start;
        }
    });
    Object.defineProperty(this,"end",{
        set(value) {
            const type = typeof(value);
            if (!value || (type!=="number" && (type !== "object" || !(value instanceof Date)))) throw new TypeError(`Period boundary must be a Date or number`);
            if(type==="number") value = new Date(value);
            end = value;
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
Period.prototype.to = D.prototype.to;
Object.entries(durations).forEach(([key,value]) => {
    Object.defineProperty(Period.prototype,key,{get:function() { return this.to(value); }})
});
Period.prototype.shift = function(ms,{pure=true}={}) {
    const start = this.start.getTime()+ms,
        end = this.end.getTime()+ms;
    if(pure) return new Period({start,end});
    this.start.setTime(start);
    this.end.setTime(end);
    return this;
}
Period.prototype.extend = function(ms,{pure=true}={}) {
    if(ms<0) {
        const start = this.start.getTime()+ms;
        if(pure) return Period({start,end:this.end});
        this.start.setTime(start);
    } else {
        const end = this.end.getTime()+ms;
        if(pure) return Period({start:this.start,end});
        this.end.setTime(end);
    }
    return this;
}

export {Clock,Period,D}