'use strict';
const DBKEY='mahgol.diary.v1',enc=new TextEncoder(),dec=new TextDecoder();
function b64(buffer){
 const data=new Uint8Array(buffer), parts=[];
 for(let start=0;start<data.length;start+=8192)parts.push(String.fromCharCode(...data.subarray(start,start+8192)));
 return btoa(parts.join(''));
}
const bytes=s=>Uint8Array.from(atob(s),x=>x.charCodeAt(0)),rand=n=>crypto.getRandomValues(new Uint8Array(n));
const emptyState=()=>({periods:[],logs:{},pms:5,rem:{hour:'09:00',enabled:false,show:false,intimate:false,types:['before','start','ovu','pms'],custom:{}},sent:''});
let state, envelope,secretKey, lastRaw,saveQueue=Promise.resolve(), generation=0;
function readState(){lastRaw=localStorage.getItem(DBKEY);const value=lastRaw?JSON.parse(lastRaw):null;envelope=value?.vault?value:null;state=envelope?null:(value??emptyState())}
function commit(raw){if(localStorage.getItem(DBKEY)!==lastRaw)throw Error('دفتر در پنجرهٔ دیگری تغییر کرده. صفحه را تازه کن.');localStorage.setItem(DBKEY,raw);lastRaw=raw}
async function encrypt(key,data){const iv=rand(12);const encrypted=await crypto.subtle.encrypt({name:'AES-GCM',iv},key,enc.encode(data));return {iv:b64(iv),data:b64(encrypted)}}
function save(){if(!state)return Promise.reject(Error('دفتر قفل است.'));const payload=JSON.stringify(state), vault=envelope, key=secretKey;const task=saveQueue.then(async()=>{if(vault){const ciphertext=await encrypt(key,payload);commit(JSON.stringify({...vault,...ciphertext}));Object.assign(vault,ciphertext)}else commit(payload)});saveQueue=task.catch(()=>{});return task}
async function authKey(v){const cred=await navigator.credentials.get({publicKey:{challenge:rand(32),allowCredentials:[{type:'public-key',id:bytes(v.id)}],timeout:60000,userVerification:'required',extensions:{prf:{eval:{first:bytes(v.salt)}}}}});const out=cred?.getClientExtensionResults().prf?.results?.first;if(!out)throw Error('این دستگاه از کلید رمزگذاری دفتر پشتیبانی نمی‌کند.');return crypto.subtle.importKey('raw',out,'AES-GCM',false,['encrypt','decrypt'])}
async function enableVault(){
 if(!window.PublicKeyCredential||!window.isSecureContext||!(await PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable()))throw Error('قفل دستگاه در این مرورگر در دسترس نیست.');
 await saveQueue;
 const credential=await navigator.credentials.create({publicKey:{rp:{name:'ماه‌گل'},user:{id:rand(32),name:'mahgol-diary',displayName:'دفتر ماه‌گل'},challenge:rand(32),pubKeyCredParams:[{type:'public-key',alg:-7},{type:'public-key',alg:-257}],authenticatorSelection:{authenticatorAttachment:'platform',residentKey:'preferred',userVerification:'required'},timeout:60000,extensions:{prf:{}}}});
 const v={vault:1,id:b64(credential.rawId),salt:b64(rand(32))};const key=await authKey(v);
 Object.assign(v,await encrypt(key,JSON.stringify(state)));commit(JSON.stringify(v));envelope=v;secretKey=key;
}
async function unlock(){const v=JSON.parse(localStorage.getItem(DBKEY));const key=await authKey(v);const raw=await crypto.subtle.decrypt({name:'AES-GCM',iv:bytes(v.iv)},key,bytes(v.data));state=JSON.parse(dec.decode(raw));secretKey=key;envelope=v}
async function disableVault(){await authKey(envelope);await saveQueue;commit(JSON.stringify(state));envelope=null;secretKey=null}
