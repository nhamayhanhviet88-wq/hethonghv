const http = require('http');
const loginData = JSON.stringify({username:'admin',password:'admin123'});

const loginReq = http.request({hostname:'localhost',port:11000,path:'/api/auth/login',method:'POST',headers:{'Content-Type':'application/json','Content-Length':Buffer.byteLength(loginData)}}, res => {
  let cookie = '';
  const setCookies = res.headers['set-cookie'] || [];
  for(const c of setCookies){ if(c.includes('token=')){ cookie = c.split(';')[0]; break; } }
  let d=''; res.on('data',c=>d+=c); res.on('end',()=>{
    if(!cookie){ console.log('No cookie'); return; }
    
    // Test done view
    http.get('http://localhost:11000/api/printing/records?year=2026&status=done',{headers:{Cookie:cookie}},r2=>{
      let d2='';r2.on('data',c=>d2+=c);r2.on('end',()=>{
        try{
          const j=JSON.parse(d2);
          if(j.error){console.log('DONE ERROR:',j.error);return;}
          const recs=j.records||[];
          console.log('=== DONE VIEW ('+recs.length+' records) ===');
          recs.forEach((r,i)=>{
            const name = (r.product_name||r.order_code||'?').substring(0,65);
            const code = r.order_code || '?';
            console.log(`${String(i+1).padStart(2)}) [${code}] ${name}`);
          });
        }catch(e){console.log('Parse err:',e.message,d2.substring(0,500))}
      });
    });
  });
});
loginReq.write(loginData);
loginReq.end();
