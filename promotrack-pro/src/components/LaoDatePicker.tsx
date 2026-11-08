import { useEffect, useId, useRef, useState, type InputHTMLAttributes, type KeyboardEvent } from 'react';
import { createPortal } from 'react-dom';
import { CalendarDays, ChevronLeft, ChevronRight, X } from 'lucide-react';
import { businessToday, validVisitDate } from '../utils/coverage';
import { calendarDate, formatLaoDate, laoMonths, laoWeekdays, monthDays, shiftDate } from '../utils/laoCalendar';

type Props=Omit<InputHTMLAttributes<HTMLInputElement>,'type'|'value'|'onChange'> & {type?:'date'|'month';value:string;onChange:(event:{target:{value:string}})=>void};

export function LaoDatePicker({type='date',value,onChange,id,name,required,disabled,min,max,className,placeholder,'aria-label':label,'aria-labelledby':labelledBy}:Props){
  const [open,setOpen]=useState(false),[cursor,setCursor]=useState(businessToday());
  const trigger=useRef<HTMLButtonElement>(null),dialog=useRef<HTMLDialogElement>(null),validation=useRef<HTMLInputElement>(null),titleId=useId();
  const today=businessToday(),monthMode=type==='month',low=min?String(min):'',high=max?String(max):'';
  const [year,monthNumber]=cursor.split('-').map(Number),month=monthNumber-1;
  const allowed=(date:string)=>{const candidate=monthMode?date.slice(0,7):date;return (!low||candidate>=low)&&(!high||candidate<=high);};
  const show=()=>{if(disabled)return;let date=value?(monthMode?value+'-01':value):today;if(!validVisitDate(date))date=today;if(low&&(monthMode?date.slice(0,7):date)<low)date=monthMode?low+'-01':low;if(high&&(monthMode?date.slice(0,7):date)>high)date=monthMode?high+'-01':high;setCursor(date);setOpen(true);};
  const choose=(date:string)=>{if(date&&!allowed(date))return;onChange({target:{value:date?(monthMode?date.slice(0,7):date):''}});setOpen(false);};
  useEffect(()=>{validation.current?.setCustomValidity(value&&(!validVisitDate(monthMode?value+'-01':value)||!allowed(monthMode?value+'-01':value))?'ເລືອກວັນທີໃນໄລຍະທີ່ກຳນົດ':'');},[value,type,low,high]);
  useEffect(()=>{
    if(!open)return;
    const element=dialog.current,overflow=document.body.style.overflow;
    document.body.style.overflow='hidden';element?.showModal();
    element?.querySelector<HTMLElement>('[aria-pressed="true"]:not(:disabled)')?.focus();
    return()=>{element?.close();document.body.style.overflow=overflow;trigger.current?.focus({preventScroll:true});};
  },[open]);
  const firstDay=new Date(calendarDate(year,month)+'T12:00:00Z').getUTCDay(),offset=(firstDay+6)%7;
  const yearMin=low?Number(low.slice(0,4)):Math.max(1,Math.min(year,Number(today.slice(0,4)))-100);
  const yearMax=high?Number(high.slice(0,4)):Math.min(9999,Math.max(year,Number(today.slice(0,4)))+30);
  const move=(step:number)=>{const d=new Date(cursor+'T12:00:00Z');d.setUTCDate(1);monthMode?d.setUTCFullYear(year+step):d.setUTCMonth(month+step);setCursor(d.toISOString().slice(0,10));};
  const canMove=(step:number)=>{const d=new Date(cursor+'T12:00:00Z');d.setUTCDate(1);monthMode?d.setUTCFullYear(year+step):d.setUTCMonth(month+step);const start=d.toISOString().slice(0,monthMode?4:7);return (!low||start>=low.slice(0,start.length))&&(!high||start<=high.slice(0,start.length));};
  const dayKeys=(event:KeyboardEvent<HTMLButtonElement>,date:string)=>{
    const delta:Record<string,number>={ArrowLeft:-1,ArrowRight:1,ArrowUp:-7,ArrowDown:7,Home:-((new Date(date+'T12:00:00Z').getUTCDay()+6)%7),End:6-((new Date(date+'T12:00:00Z').getUTCDay()+6)%7)};
    if(!(event.key in delta))return;event.preventDefault();const next=shiftDate(date,delta[event.key]);if(!allowed(next))return;setCursor(next);requestAnimationFrame(()=>dialog.current?.querySelector<HTMLElement>(`[data-date="${next}"]`)?.focus());
  };
  return <span className="app-date-field">
    <button ref={trigger} id={id} type="button" disabled={disabled} aria-label={label||(!labelledBy?(monthMode?'ເລືອກເດືອນ':'ເລືອກວັນທີ'):undefined)} aria-labelledby={labelledBy} aria-haspopup="dialog" aria-expanded={open} onClick={show} className={`app-date-trigger ${className||''}`}><span>{formatLaoDate(value,type)||placeholder||(monthMode?'ເລືອກເດືອນ':'ເລືອກວັນທີ')}</span><CalendarDays size={16} aria-hidden="true"/></button>
    <input ref={validation} type="text" name={name} value={value} onChange={()=>{}} required={required} disabled={disabled} tabIndex={-1} aria-hidden="true" className="app-date-validation" onInvalid={event=>{event.preventDefault();const form=event.currentTarget.form;if(!form||form.querySelector('input:invalid,select:invalid,textarea:invalid')===event.currentTarget)show();}}/>
    {open&&createPortal(<dialog ref={dialog} className="app-calendar-dialog" aria-labelledby={titleId} onKeyDown={event=>event.stopPropagation()} onCancel={event=>{event.preventDefault();setOpen(false);}} onClick={event=>{if(event.target!==event.currentTarget)return;const r=event.currentTarget.getBoundingClientRect();if(event.clientX<r.left||event.clientX>r.right||event.clientY<r.top||event.clientY>r.bottom)setOpen(false);}}>
      <header className="app-calendar-heading"><span><CalendarDays size={20}/><strong id={titleId}>{monthMode?'ເລືອກເດືອນ':'ເລືອກວັນທີ'}</strong></span><button type="button" onClick={()=>setOpen(false)} aria-label="ປິດປະຕິທິນ"><X size={20}/></button></header>
      <div className="app-calendar-body">
        <div className="app-calendar-controls"><button type="button" disabled={!canMove(-1)} onClick={()=>move(-1)} aria-label={monthMode?'ປີກ່ອນ':'ເດືອນກ່ອນ'}><ChevronLeft size={19}/></button>
          {!monthMode&&<select aria-label="ເດືອນ" value={month} onChange={event=>setCursor(calendarDate(year,Number(event.target.value)))}>{laoMonths.map((m,index)=><option key={m} value={index}>{m}</option>)}</select>}
          <select aria-label="ປີ" value={year} onChange={event=>setCursor(calendarDate(Number(event.target.value),month))}>{Array.from({length:Math.max(0,yearMax-yearMin+1)},(_,index)=>yearMin+index).map(y=><option key={y} value={y}>{y}</option>)}</select>
          <button type="button" disabled={!canMove(1)} onClick={()=>move(1)} aria-label={monthMode?'ປີຖັດໄປ':'ເດືອນຖັດໄປ'}><ChevronRight size={19}/></button>
        </div>
        {monthMode?<div className="app-calendar-months">{laoMonths.map((m,index)=>{const date=calendarDate(year,index),selected=value===date.slice(0,7);return <button type="button" key={m} disabled={!allowed(date)} aria-pressed={selected} onClick={()=>choose(date)}>{m}</button>;})}</div>:<>
          <div className="app-calendar-weekdays" aria-hidden="true">{laoWeekdays.map(day=><span key={day}>{day}</span>)}</div>
          <div className="app-calendar-days" role="group" aria-label="ວັນທີ">{Array.from({length:42},(_,index)=>{const day=index-offset+1;if(day<1||day>monthDays(year,month))return <span key={index} aria-hidden="true"/>;const date=calendarDate(year,month,day);return <button type="button" key={index} data-date={date} disabled={!allowed(date)} aria-label={formatLaoDate(date)} aria-pressed={value===date} className={date===today?'is-today':''} onKeyDown={event=>dayKeys(event,date)} onClick={()=>choose(date)}>{day}</button>;})}</div>
        </>}
      </div>
      <footer className="app-calendar-footer"><div>{!required&&<button type="button" onClick={()=>choose('')}>ລ້າງ</button>}<button type="button" disabled={!allowed(today)} onClick={()=>choose(today)}>{monthMode?'ເດືອນນີ້':'ມື້ນີ້'}</button></div><button type="button" onClick={()=>setOpen(false)}>ຍົກເລີກ</button></footer>
    </dialog>,document.body)}
  </span>;
}
