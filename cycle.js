'use strict';
const DAY=86400000, fa=n=>Number(n).toLocaleString('fa-IR',{useGrouping:false});
const fmt=(o,loc='fa-IR')=>new Intl.DateTimeFormat(loc,{timeZone:'UTC',...o});
const persian=fmt({year:'numeric',month:'numeric',day:'numeric'},'en-US-u-ca-persian');
const longDate=fmt({weekday:'long',day:'numeric',month:'long',year:'numeric'}), shortDate=fmt({day:'numeric',month:'long'}), monthName=fmt({month:'long',year:'numeric'});
const dayDate=n=>new Date(n*DAY), today=()=>{const d=new Date();return Date.UTC(d.getFullYear(),d.getMonth(),d.getDate())/DAY};
const dateParts=n=>Object.fromEntries(persian.formatToParts(dayDate(n)).filter(x=>['year','month','day'].includes(x.type)).map(x=>[x.type,+x.value]));
const monthStart=n=>n-dateParts(n).day+1, nextMonth=n=>monthStart(monthStart(n)+32);
const names=['فروردین','اردیبهشت','خرداد','تیر','مرداد','شهریور','مهر','آبان','آذر','دی','بهمن','اسفند'];
const jStarts=new Map();
function jMonth(y,m){const k=y+'-'+m;if(jStarts.has(k))return jStarts.get(k);let n=Math.floor(Date.UTC(y+621,2,18)/DAY);while(dateParts(n).year<y)n++;for(let i=1;i<m;i++)n=nextMonth(n);jStarts.set(k,n);return n}
const avg=a=>Math.round(a.reduce((s,n)=>s+n,0)/a.length);
function model(periods) {
  const recent = [...periods].sort((a, b) => a.start - b.start).slice(-7);
  const intervals = recent.slice(1).map((period, index) => ({
    start: recent[index].start,
    end: period.start,
    days: period.start - recent[index].start
  }));
  const gaps = intervals.map(interval => interval.days);
  const spans = recent.filter(period => period.end != null)
    .map(period => period.end - period.start + 1);
  if (!gaps.length || !spans.length) return null;
  return {
    cycle: avg(gaps),
    duration: avg(spans),
    low: Math.min(...gaps),
    high: Math.max(...gaps),
    latest: recent.at(-1).start,
    count: gaps.length,
    intervals
  };
}

function phase(n, periods, m, pmsDays, referenceDay = today()) {
  const known = periods.find(period =>
    n >= period.start && n <= (period.end ?? period.start));
  if (known) return { type: 'bleed', label: 'خون‌ریزی ثبت‌شده', actual: true };
  if (!m) return { type: '', label: 'بدون پیش‌بینی' };
  if (n < m.latest) return { type: '', label: 'روز بدون ثبت' };

  const last = periods.find(period => period.start === m.latest);
  if (last.end == null && n < m.latest + m.duration) {
    return { type: 'bleed', label: 'ادامهٔ احتمالی خون‌ریزی' };
  }

  const next = expected(m);
  // A predicted start never becomes the start of a newly inferred cycle.
  if (n >= next) {
    if (n < next + m.duration && referenceDay < next + m.duration) {
      return { type: 'bleed', label: 'خون‌ریزی احتمالی؛ شروع واقعی هنوز ثبت نشده' };
    }
    return { type: '', label: 'در انتظار ثبت شروع واقعی دورهٔ بعدی' };
  }
  const until = next - n;
  if (until >= 12 && until <= 16) {
    return { type: 'ovu', label: 'بازهٔ احتمالی تخمک‌گذاری' };
  }
  if (until <= pmsDays) return { type: 'pms', label: 'روزهای احتمالی پی‌ام‌اس' };
  return { type: '', label: 'روز دیگری از چرخه' };
}
function expected(m){return m?m.latest+m.cycle:null}
function validatePeriod(list,start,end,skip){
 if(!Number.isInteger(start)||start>today()||(end!=null&&(!Number.isInteger(end)||end<start||end>today())))return 'تاریخ شروع و پایان را بررسی کن. هر دو باید تا امروز باشند.';
 if(list.some(p=>p.start!==skip&&start<=(p.end??p.start)&&(end??start)>=p.start))return 'این تاریخ با یکی از دوره‌های ثبت‌شده هم‌پوشانی دارد.';
 if(list.some(p=>p.start!==skip&&p.end==null&&p.start<start))return 'اول تاریخ پایان دورهٔ باز را ثبت کن.';
 if(end==null&&list.some(p=>p.start!==skip&&p.start>start))return 'برای یک دورهٔ قدیمی، تاریخ پایان را هم وارد کن.';
 return '';
}
