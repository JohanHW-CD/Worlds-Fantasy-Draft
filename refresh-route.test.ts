import {test} from 'node:test';
import assert from 'node:assert/strict';
import {GET,POST} from '../src/app/api/refresh/route';
test('cron refuses unauthorized requests; public refresh only accepts same-origin POST',async()=>{
 const previous=process.env.CRON_SECRET;process.env.CRON_SECRET='test-secret';
 try{
  assert.equal((await GET(new Request('http://localhost/api/refresh'))).status,401);
  assert.equal((await GET(new Request('http://localhost/api/refresh',{headers:{authorization:'Bearer wrong'}}))).status,401);
  assert.equal((await POST(new Request('http://localhost/api/refresh',{method:'POST',headers:{origin:'https://other.example'}}))).status,403);
  assert.equal((await POST(new Request('http://localhost/api/refresh',{method:'POST'}))).status,403);
 }finally{if(previous===undefined)delete process.env.CRON_SECRET;else process.env.CRON_SECRET=previous;}
});
