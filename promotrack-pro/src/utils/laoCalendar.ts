export const laoMonths=['ມັງກອນ','ກຸມພາ','ມີນາ','ເມສາ','ພຶດສະພາ','ມິຖຸນາ','ກໍລະກົດ','ສິງຫາ','ກັນຍາ','ຕຸລາ','ພະຈິກ','ທັນວາ'];
export const laoWeekdays=['ຈ.','ອ.','ພ.','ພຫ.','ສຸ.','ສ.','ອາ.'];
export function calendarDate(year:number,month:number,day=1){return `${String(year).padStart(4,'0')}-${String(month+1).padStart(2,'0')}-${String(day).padStart(2,'0')}`;}
export function monthDays(year:number,month:number){const d=new Date(0);d.setUTCFullYear(year,month+1,0);return d.getUTCDate();}
export function shiftDate(value:string,days:number){const d=new Date(value+'T12:00:00Z');d.setUTCDate(d.getUTCDate()+days);return d.toISOString().slice(0,10);}
export function formatLaoDate(value:string,type:'date'|'month'='date'){
  if(!value)return '';
  const [year,month,day]=value.split('-').map(Number);
  if(year<1||month<1||month>12||!(type==='month'?/^\d{4}-\d{2}$/:/^\d{4}-\d{2}-\d{2}$/).test(value)||type==='date'&&(!day||day>monthDays(year,month-1)))return '';
  return `${type==='date'?`${day} `:''}${laoMonths[month-1]} ${year}`;
}
