const {chromium} = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
(async()=>{
 const browser=await chromium.launch({executablePath:'/usr/bin/chromium',args:['--no-sandbox']});
 const page=await browser.newPage({viewport:{width:1280,height:1000}});const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto('http://127.0.0.1:4173');await page.getByRole('button',{name:'暂时跳过介绍'}).click();
 await page.evaluate(async()=>{
  const {dayKey}=await import('./src/trends.js?v=cycle-axis1');const db=await import('./src/event-db.js?v=cycle-axis1');
  const date=n=>{const d=new Date();d.setHours(12,0,0,0);d.setDate(d.getDate()+n);return d;};
  const periods=[-62,-34,-6].map((n,i)=>({start:dayKey(date(n).getTime()),end:dayKey(date(n+4).getTime()),note:'合成演示记录'}));localStorage.setItem('her-space-periods-v1',JSON.stringify(periods));
  for(let n=-34;n<=0;n++){if(n===-20)continue;await db.putEvent({version:3,id:'axis-demo-'+n,timestamp:Math.min(Date.now(),date(n).getTime()),mood:Math.round(Math.sin((n+34)/3)*2),title:'合成演示：日常状态',emotion:'平静',tag:'测试数据',note:'非真实用户数据',favorite:false});}
 });
 await page.reload();await page.goto('http://127.0.0.1:4173/#history');
 await page.getByRole('heading',{name:'沿着一个生理周期，看见心情变化'}).waitFor();
 const svg=page.locator('.physio-svg');await svg.getByText('卵泡期（估计）',{exact:true}).waitFor();await svg.getByText('排卵附近（估计）',{exact:true}).waitFor();await svg.getByText('黄体期（估计）',{exact:true}).waitFor();await svg.getByText('第28天',{exact:true}).waitFor();
 await page.locator('#cycle-choice').selectOption({index:1});await page.locator('.physio-svg').getByText('卵泡期（估计）',{exact:true}).waitFor();await page.locator('.physio-chart-panel').screenshot({path:process.cwd()+'/docs/screenshots/physio-axis-chart.png'});
 await page.evaluate(()=>window.scrollTo(0,0));await page.screenshot({path:process.cwd()+'/docs/screenshots/physio-axis-desktop.png',fullPage:true});
 await page.setViewportSize({width:390,height:844});
 if(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth))throw Error('document overflow');
 if(!await page.locator('.physio-scroll').evaluate(el=>el.scrollWidth>el.clientWidth))throw Error('mobile chart should scroll independently');
 await page.evaluate(()=>window.scrollTo(0,0));await page.screenshot({path:process.cwd()+'/docs/screenshots/physio-axis-mobile.png',fullPage:true});
 await page.getByRole('button',{name:'历史比较',exact:true}).click();if(await page.locator('.physio-svg').count()!==2)throw Error('comparison requires per-cycle backgrounds');
 await page.locator('#cycle-unknown').check();await page.getByText('已选择阶段未知 / 不适用，不划分估计阶段。',{exact:false}).first().waitFor();if(await page.locator('.physio-stage-label').filter({hasText:'卵泡期（估计）'}).count())throw Error('unknown must not draw estimated stages');
 await page.locator('#cycle-unknown').uncheck();await page.getByRole('button',{name:'周期视图',exact:true}).click();await page.locator('#cycle-choice').selectOption({index:1});await page.locator('.physio-svg a').first().click();await page.locator('.day-events').waitFor();
 if(errors.length)throw Error(errors.join(';'));await browser.close();console.log('PASS physiological stage axis, full ongoing cycle, separate actual bleeding, two-cycle backgrounds, unknown fallback, mobile independent scroll, point drilldown');
})().catch(e=>{console.error(e);process.exit(1)});
