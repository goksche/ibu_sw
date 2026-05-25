import{j as e}from"./iframe-jQ-knsx3.js";import{T as E,f as P,g as o,h as _,C as l,I as d,b as T}from"./tooltip-DxcaGd-F.js";import"./preload-helper-C1FmrZbK.js";import"./IconBase.esm-CaTeI6KH.js";import"./index-C31rOMmP.js";const C=[{id:1,time:"24.02.2026, 18:42:01",path:"/leagues/4",user:"40",ip:"95.111.238.180"},{id:2,time:"24.02.2026, 18:42:09",path:"/tournaments/21",user:"10",ip:"95.111.238.180"},{id:3,time:"24.02.2026, 18:42:18",path:"/settings",user:"1",ip:"95.111.238.180"}];function I({state:s}){return s==="permission"?e.jsxs("div",{className:"p-8 text-center",children:[e.jsx("h3",{className:"text-foreground mb-2",children:"Zugriff verweigert"}),e.jsx("p",{className:"text-muted-foreground m-0",children:"Nur Admins können Logs einsehen."})]}):e.jsxs("div",{className:"p-6 max-w-6xl mx-auto",children:[e.jsx("h3",{className:"m-0 mb-4",children:"Log Center"}),e.jsxs(E,{defaultValue:"page_views",children:[e.jsxs(P,{className:"mb-4 flex gap-2",children:[e.jsx(o,{value:"page_views",children:"Page Views"}),e.jsx(o,{value:"login_events",children:"Login Events"}),e.jsx(o,{value:"api_requests",children:"API Requests"})]}),e.jsxs(_,{value:"page_views",children:[e.jsx(l,{className:"p-4 mb-4",children:e.jsxs("div",{className:"grid grid-cols-4 gap-3",children:[e.jsx(d,{label:"Suche",placeholder:"/leagues/4"}),e.jsx(d,{label:"Von",type:"date"}),e.jsx(d,{label:"Bis",type:"date"}),e.jsx("div",{className:"flex items-end justify-end",children:e.jsx(T,{variant:"secondary",children:"Aktualisieren"})})]})}),s==="error"&&e.jsx("div",{className:"mb-3 text-sm text-destructive",children:"Logs konnten nicht geladen werden."}),e.jsxs(l,{className:"p-0 overflow-hidden",children:[s==="loading"&&e.jsx("div",{className:"p-4 text-muted-foreground",children:"Lade Logs..."}),s==="empty"&&e.jsx("div",{className:"p-4 text-muted-foreground",children:"Keine Einträge im gewählten Zeitraum."}),s==="success"&&e.jsxs("table",{className:"w-full border-collapse",children:[e.jsx("thead",{children:e.jsxs("tr",{className:"border-b border-border text-left",children:[e.jsx("th",{className:"p-3",children:"Zeit"}),e.jsx("th",{className:"p-3",children:"Pfad"}),e.jsx("th",{className:"p-3",children:"User"}),e.jsx("th",{className:"p-3",children:"IP"})]})}),e.jsx("tbody",{children:C.map(r=>e.jsxs("tr",{className:"border-b border-border/60",children:[e.jsx("td",{className:"p-3",children:r.time}),e.jsx("td",{className:"p-3 font-mono text-sm",children:r.path}),e.jsx("td",{className:"p-3",children:r.user}),e.jsx("td",{className:"p-3",children:r.ip})]},r.id))})]})]})]})]})]})}const B={title:"Patterns/Management/States/Logs",component:I},a={args:{state:"success"}},t={args:{state:"loading"}},n={args:{state:"empty"}},i={args:{state:"error"}},c={args:{state:"permission"}};var m,p,u;a.parameters={...a.parameters,docs:{...(m=a.parameters)==null?void 0:m.docs,source:{originalSource:`{
  args: {
    state: 'success'
  }
}`,...(u=(p=a.parameters)==null?void 0:p.docs)==null?void 0:u.source}}};var x,g,h;t.parameters={...t.parameters,docs:{...(x=t.parameters)==null?void 0:x.docs,source:{originalSource:`{
  args: {
    state: 'loading'
  }
}`,...(h=(g=t.parameters)==null?void 0:g.docs)==null?void 0:h.source}}};var j,N,b;n.parameters={...n.parameters,docs:{...(j=n.parameters)==null?void 0:j.docs,source:{originalSource:`{
  args: {
    state: 'empty'
  }
}`,...(b=(N=n.parameters)==null?void 0:N.docs)==null?void 0:b.source}}};var f,v,w;i.parameters={...i.parameters,docs:{...(f=i.parameters)==null?void 0:f.docs,source:{originalSource:`{
  args: {
    state: 'error'
  }
}`,...(w=(v=i.parameters)==null?void 0:v.docs)==null?void 0:w.source}}};var L,y,S;c.parameters={...c.parameters,docs:{...(L=c.parameters)==null?void 0:L.docs,source:{originalSource:`{
  args: {
    state: 'permission'
  }
}`,...(S=(y=c.parameters)==null?void 0:y.docs)==null?void 0:S.source}}};const D=["Success","Loading","Empty","Error","PermissionDenied"];export{n as Empty,i as Error,t as Loading,c as PermissionDenied,a as Success,D as __namedExportsOrder,B as default};
