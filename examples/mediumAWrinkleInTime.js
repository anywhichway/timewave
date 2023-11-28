import {Clock} from '../timewave.js';

//console.log(Clock(new Date(),{tz:'America/New_York'}).minus("1w").endOf("d").toISOString())

const tz = 'America/New_York';
/*const clock1 = Clock(new Date(2023,0,1),{tz,run:true})
    .plus("364d 23h 59m 55s") // jump forward to 11:59.55PM on Dec 31st, 2023
    .setAlarm({for:new Date(2024,0,1)},() => { console.log(`Happy New Year 2024!`); clock1.stop(); });


const clock2 = Clock(new Date(2023,0,1),{tz,tick:10000,run:true})
    .plus("364d 23h 59m 55s") // jump forward to 11:59.55PM on Dec 31st, 2023
    .setAlarm({for:new Date(2024,0,1)},() => { console.log(`First Happy New Year 2024!`); clock2.stop(); });

const clock3 = Clock(new Date(2023,0,1),{tz,hz:120,tick:5000,run:true})
    .plus("364d 23h 59m 55s") // jump forward to 11:59.55PM on Dec 31st, 2023
    .setAlarm({for:new Date(2024,0,1)},() => { console.log(`Fast First Happy New Year 2024!`); clock3.stop(); });*/

const clock4 = Clock(new Date(2024,0,1),{tz,tick:-1000,run:true})// jump backward to 1 minute into 2024
    .setAlarm({for:new Date(2023,11,31,23,58,59)},() => { console.log(`Happy Old Year 2023!`); clock4.stop(); });