import{j as e}from"./iframe-jQ-knsx3.js";import{C as c,c as d,d as i,a as u,S as s,I as r,b as E}from"./tooltip-DxcaGd-F.js";import"./preload-helper-C1FmrZbK.js";import"./IconBase.esm-CaTeI6KH.js";import"./index-C31rOMmP.js";function V({state:a}){const y=a==="power_admin"||a==="saving";return e.jsxs("div",{className:"p-6 max-w-6xl mx-auto",children:[e.jsx("h3",{className:"m-0 mb-4",children:"Einstellungen"}),a==="error"&&e.jsx("div",{className:"mb-3 text-sm text-destructive",children:"Einstellungen konnten nicht geladen werden."}),e.jsxs("div",{className:"grid grid-cols-1 md:grid-cols-2 gap-4 mb-4",children:[e.jsxs(c,{children:[e.jsx(d,{children:e.jsx(i,{className:"mt-0",children:"Meine Anzeige"})}),e.jsxs(u,{className:"space-y-3",children:[e.jsx(s,{label:"Layout",defaultValue:"standard",options:[{value:"standard",label:"Standard"},{value:"neon",label:"NeonGreen"},{value:"neon_cyan",label:"NeonCyan"}]}),e.jsx(s,{label:"Schriftart",defaultValue:"Inter",options:[{value:"Inter",label:"Inter"},{value:"Source Sans 3",label:"Source Sans 3"},{value:"Baskervville",label:"Baskervville"}]})]})]}),e.jsxs(c,{children:[e.jsx(d,{children:e.jsx(i,{className:"mt-0",children:"Dashboard"})}),e.jsxs(u,{className:"space-y-3",children:[e.jsx(s,{label:"Standard-Sortierung",defaultValue:"date",options:[{value:"date",label:"Datum"},{value:"name",label:"Name"},{value:"status",label:"Status"}]}),e.jsx(r,{label:"Sprache",defaultValue:"de",disabled:!0}),e.jsx(r,{label:"Timezone",defaultValue:"Europe/Zurich",disabled:!0})]})]})]}),e.jsx("div",{className:"flex justify-end mb-6",children:e.jsx(E,{disabled:a==="saving",children:a==="saving"?"Speichern...":"Meine Einstellungen speichern"})}),y&&e.jsxs(c,{children:[e.jsx(d,{children:e.jsx(i,{className:"mt-0",children:"Globale Defaults (Power Admin)"})}),e.jsxs(u,{className:"grid grid-cols-1 md:grid-cols-3 gap-3",children:[e.jsx(r,{label:"Slide-Dauer (Sek.)",type:"number",defaultValue:10}),e.jsx(r,{label:"Refresh (Sek.)",type:"number",defaultValue:30}),e.jsx(s,{label:"Gruppen pro Folie",defaultValue:1,options:[{value:1,label:"1 Gruppe"},{value:2,label:"2 Gruppen"}]})]})]})]})}const P={title:"Patterns/Management/States/Settings",component:V},l={args:{state:"success"}},n={args:{state:"error"}},t={args:{state:"power_admin"}},o={args:{state:"saving"}};var m,p,g;l.parameters={...l.parameters,docs:{...(m=l.parameters)==null?void 0:m.docs,source:{originalSource:`{
  args: {
    state: 'success'
  }
}`,...(g=(p=l.parameters)==null?void 0:p.docs)==null?void 0:g.source}}};var x,b,j;n.parameters={...n.parameters,docs:{...(x=n.parameters)==null?void 0:x.docs,source:{originalSource:`{
  args: {
    state: 'error'
  }
}`,...(j=(b=n.parameters)==null?void 0:b.docs)==null?void 0:j.source}}};var h,v,S;t.parameters={...t.parameters,docs:{...(h=t.parameters)==null?void 0:h.docs,source:{originalSource:`{
  args: {
    state: 'power_admin'
  }
}`,...(S=(v=t.parameters)==null?void 0:v.docs)==null?void 0:S.source}}};var f,N,w;o.parameters={...o.parameters,docs:{...(f=o.parameters)==null?void 0:f.docs,source:{originalSource:`{
  args: {
    state: 'saving'
  }
}`,...(w=(N=o.parameters)==null?void 0:N.docs)==null?void 0:w.source}}};const A=["Success","Error","PowerAdmin","Saving"];export{n as Error,t as PowerAdmin,o as Saving,l as Success,A as __namedExportsOrder,P as default};
