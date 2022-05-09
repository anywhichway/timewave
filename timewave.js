const isDate = (value) => value && typeof(value)==="object" && value instanceof Date;
const durationMilliseconds = {
    ms: 1,
    s: 1000,
    m: 1000 * 60,
    h: 1000 * 60 * 60,
    d: 1000 * 60 * 60 * 24,
    w: 1000 * 60 * 60 * 24 * 7,
    mo: 1000 * 60 * 60 * 2 * 365.2424177, // (1000 * 60 * 60 * 24 * 365.2424177)/12
    q: 1000 * 60 * 60 * 6 * 365.2424177, // (1000 * 60 * 60 * 24 * 365.2424177)/4
    y: 1000 * 60 * 60 * 24 * 365.2424177
};
const dateMath = {
    y(date,y) {
        date.setYear(date.getYear()+y);
    },
    q(date,q) {
        const newmonth = (q * 3) + date.getMonth();
        date.setMonth(newmonth>11 ? newmonth - 12 : newmonth);
    },
    mo(date,mo) {
        const newmonth = mo + date.getMonth();
        date.setMonth(newmonth>11 ? newmonth - 12 : newmonth);
    },
    w(date,w) {
        const dayofyear = Math.floor((date - new Date(date.getFullYear(), 0, 0)) / durationMilliseconds["d"]),
            newdayofyear = dayofyear + (w * 7),
            newtime = date.getTime() + (newdayofyear + durationMilliseconds["d"])
        date.setTime(newtime);
    },
    d(date,d) {
        const dayofyear = Math.floor((date - new Date(date.getFullYear(), 0, 0)) / durationMilliseconds["d"]),
            newdayofyear = dayofyear + d,
            newtime = date.getTime() + (newdayofyear + durationMilliseconds["d"])
        date.setTime(newtime);
    },
    h(date,h) {
        const newhour = h + date.getHours();
        date.setHours(newhour>23 ? 24-newhour : newhour);
    },
    m(date,m) {
        const newminutes = m + date.getMinutes();
        date.setMinutes(newminutes>59 ? 60-newminutes : newminutes);
    },
    s(date,s) {
        const newseconds = s + date.getSeconds();
        date.setSeconds(newseconds>59 ? 60-newseconds : newseconds);
    },
    ms(date,ms) {
        const newmseconds = ms + date.getMilliseconds()
        date.setMilliseconds(newmseconds>999 ? 1000-newmseconds : newmseconds);
    }
}
const parseDuration = (value) => {
    const type = typeof(value);
    if(value && type==="object" && value instanceof D) return value.valueOf();
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
    if(isDate(value)) return value.getTime();
    return null;
};
function Period(start,end) {
    if(!this || !(this instanceof Period)) return new Period(start,end);
    Object.defineProperty(this,"start",{
        set(value) {
            if (!value || typeof (value) !== "object" || !(value instanceof Date)) throw new TypeError(`Period boundary must be a Date`);
            start = value;
        }
    });
    Object.defineProperty(this,"end",{
        set(value) {
            if (!value || typeof (value) !== "object" || !(value instanceof Date)) throw new TypeError(`Period boundary must be a Date`);
            end = value;
        }
    });
    Object.defineProperty(this,"valueOf",{ value:() => {
            const t1 = start.getTime(),
                t2 = end.getTime();
            return D(Math.max(t1,t2)-Math.min(t1,t2))
        }});
    Object.defineProperty(this,"length",{get() { return this.valueOf();}});
    this.start = start;
    this.end = end;
}
function Clock(date=new Date(),{tz,hz}={}) {
    if(typeof(date)==="number") date = new Date(date);
    if(!date || typeof(date)!=="object" || !(date instanceof Date)) throw new TypeError(`Clock() expects a Date not ${JSON.stringify(date)}`);
    let tzoffset = now.getTimezoneOffset(),
        diff = 0;
    if(tz) {
        const thereLocaleStr = date.toLocaleString('en-US', {timeZone: tz}),
            thereDate = new Date(thereLocaleStr);
        diff = thereDate.getTime() - date.getTime();
        tzoffset = Math.round(tzoffset - (diff /  (1000 * 60)));
    } else {
        tzoffset = date.getTimezoneOffset();
    }
    if(hz) {
        if(hz>60) console.warn(`Clock set to run faster than ${hz}hz. Excess CPU load beyond typical DOM refresh rate.`);
        const warp = date.getTime() - Date.now();
        setInterval(() => {
            date = new Date(Date.now() + warp);
        },1000/Math.abs(hz))
    }
    const extensions = {
        plus(duration,times=1) {
            if(typeof(duration)==="number") duration = D(duration);
            if(!D.is(duration)) throw new TypeError(`${JSON.stringify(duration)} is not a duration`);
            const parts = duration.toJSON().split(" "),
                result = new Date(date);
            Object.entries(dateMath).forEach(([key,math]) => {
                parts.some((part) => {
                    if(part.endsWith(key)) {
                        math(result,parseFloat(part)*times);
                        return true;
                    }
                })
            });
            return new Clock(result,{tz},true);
        },
        minus(duration) {
            this.plus(duration,-1);
        },
        clone({tz,hz}={}) {
            const thereDate = new Clock(new Date(),{tz}),
                thereOffset = thereDate.getTimezoneOffset(),
                offset = tzoffset - thereOffset,
                newDate = new Date(date.getTime() + offset * 1000 * 60)
            return new Clock(newDate,{tz,hz});
        },
        getTimezoneOffset() {
            return tzoffset;
        },
        toString() {
            const string = date.toString(),
                offset = tzoffset / 60,
                fraction = offset % 1,
                minutes = (1 - fraction) >= .017 ? `${Math.round(fraction * 60)}` : "00", // .017 = 1 minute
                hours = `${Math.abs(Math.round(offset))}`,
                gmt = `GMT${offset>0 ? "-" : "+"}${hours.padStart(2,"0")}${minutes.padStart(2,"0")}`,
                zone = tz ? ` (${tz})` : "";
            return string.replace(/GMT.*/g,gmt) + zone;
        }
    };
    const proxy = new Proxy(date,{
        get(target,property) {
            let value = extensions[property];
            if(value!==undefined) return value;
            if(property==="weekDay") {
                return target.getDay()+1;
            }
            if(property==="dayOfMonth") {
                return target.getDate();
            }
            if(property==="dayOfYear" || property==="ordinal") {
                return Math.floor((target - new Date(target.getFullYear(), 0, 0)) / durationMilliseconds["d"])
            }
            if(property==="isInLeapYear") {
                const year = date.getFullYear();
                return !(year % 4 || !(year % 100) && year % 400);
            }
            if(property==="offset") {
                return tzoffset;
            }
            if(property==="weekOfYear") {
                return Math.floor(((target - new Date(target.getFullYear(), 0, 0)) / durationMilliseconds["d"]) / 7)
            }
            value = date[property];
            if(typeof(value)==="function") return value.bind(target);
            if(typeof(property)==="string" && !property.startsWith("get")) {
                let fname = "get" + property[0].toUpperCase() + property.substring(1);
                if(typeof(target[fname])==="function") return target[fname]();
                fname += "s";
                if(typeof(target[fname])==="function") return target[fname]();
            }
            return value;
        }
    });
    return proxy;
}
Clock.min = (...clocks) => {
    const mintime = clocks.reduce((mintime,clock) => {
        const t = clock.getTime() + clock.getTimezoneOffset() * 1000 * 60;
        mintime = Math.min(t,mintime);
    },Infinity);
    return clocks.reduce((min,clock) => {
        if((clock.getTime() + clock.getTimezoneOffset() * 1000 * 60)===mintime) {
            min.push(clock);
        }
        return min;
    },[])
}
Clock.max = (...clocks) => {
    const maxtime = clocks.reduce((mintime,clock) => {
        const t = clock.getTime() + clock.getTimezoneOffset() * 1000 * 60;
        mintime = Math.max(t,mintime);
    },-Infinity);
    return clocks.reduce((min,clock) => {
        if((clock.getTime() + clock.getTimezoneOffset() * 1000 * 60)===maxtime) {
            min.push(clock);
        }
        return min;
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
    if(valueof==null) throw new TypeError(`${typeof(value)==="string" ? value : JSON.stringify(value)}${type!==undefined ? type :""} is not a valid duration`);
    Object.defineProperty(this,"type",{get() { return type; }});
    Object.defineProperty(this,"valueOf",{value:() => valueof});
    Object.defineProperty(this,"toJSON",{value:() => duration});
    return this;
}
D.is = (value) => value && typeof(value)==="object" && value instanceof D;
D.prototype.to = function(type="ms") {
    const value = this.valueOf();
    if(type==="Date") {
        if(this instanceof Period) throw new TypeError(`Cannot convert Period to Date`);
        return new Date(value);
    }
    if(!(type in durationMilliseconds)) throw new TypeError(`${type} is not a valid duration type`);
    return value / durationMilliseconds[type];
}
D.prototype.days = function() { return this.to("d"); }
D.prototype.Date = function() { return this.to("Date"); }
D.Period = Period;
Period.is = (value) => value && typeof(value)==="object" && value instanceof Period;
Period.prototype = {...D.prototype};
delete Period.prototype.Date;

export {Clock,Period,D}