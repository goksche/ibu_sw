import{j as e}from"./iframe-jQ-knsx3.js";import{C as j,a as v,B as T,b as c,I as r}from"./tooltip-DxcaGd-F.js";import{P as m,D as o}from"./DataTablePattern-T2kXtJRx.js";import"./preload-helper-C1FmrZbK.js";import"./IconBase.esm-CaTeI6KH.js";import"./index-C31rOMmP.js";function S({title:d,description:a,children:l,footer:t}){return e.jsx(j,{children:e.jsxs(v,{className:"p-6",children:[e.jsxs("div",{className:"mb-4",children:[e.jsx("h3",{className:"m-0 text-base font-semibold text-foreground",children:d}),a&&e.jsx("p",{className:"mt-1 mb-0 text-sm text-muted-foreground",children:a})]}),e.jsx("div",{className:"space-y-4",children:l}),t&&e.jsx("div",{className:"mt-6 border-t border-border pt-4",children:t})]})})}S.__docgenInfo={description:"",methods:[],displayName:"SettingsSectionPattern",props:{title:{required:!0,tsType:{name:"string"},description:""},description:{required:!1,tsType:{name:"string"},description:""},children:{required:!0,tsType:{name:"ReactNode"},description:""},footer:{required:!1,tsType:{name:"ReactNode"},description:""}}};function P({title:d="Admin Logs",entries:a,dense:l=!0}){return e.jsx(j,{children:e.jsxs(v,{className:"p-0",children:[e.jsx("div",{className:"border-b border-border px-4 py-3",children:e.jsx("h3",{className:"m-0 text-sm font-semibold text-foreground",children:d})}),e.jsx("ul",{className:"m-0 list-none p-0 divide-y divide-border",children:a.map(t=>e.jsxs("li",{className:l?"px-4 py-2 text-xs text-foreground":"px-4 py-3 text-sm text-foreground",children:[e.jsxs("div",{className:"flex flex-wrap items-center gap-2",children:[e.jsx("span",{className:"font-medium",children:t.timestamp}),e.jsx(T,{variant:t.severity||"default",children:t.action}),t.scope&&e.jsx("span",{className:"text-muted-foreground",children:t.scope})]}),e.jsx("div",{className:"mt-1 text-muted-foreground",children:t.actor})]},t.id))})]})})}P.__docgenInfo={description:"",methods:[],displayName:"AdminLogListPattern",props:{title:{required:!1,tsType:{name:"string"},description:"",defaultValue:{value:"'Admin Logs'",computed:!1}},entries:{required:!0,tsType:{name:"Array",elements:[{name:"AdminLogEntry"}],raw:"AdminLogEntry[]"},description:""},dense:{required:!1,tsType:{name:"boolean"},description:"",defaultValue:{value:"true",computed:!1}}}};const D={title:"Patterns/Management/Library",parameters:{layout:"padded"}},s={render:()=>e.jsxs("div",{className:"space-y-6",children:[e.jsx(m,{title:"Turnierverwaltung",subtitle:"Status und Aktionen im einheitlichen Seitenkopf"}),e.jsx(m,{title:"Benutzerverwaltung",breadcrumbs:"Admin / Benutzer",actions:e.jsxs(e.Fragment,{children:[e.jsx(c,{variant:"secondary",children:"Export"}),e.jsx(c,{variant:"primary",children:"Neu"})]})})]})},n={render:()=>e.jsxs("div",{className:"space-y-6",children:[e.jsx(o,{title:"Benutzer",filters:e.jsxs("div",{className:"grid grid-cols-1 gap-3 sm:grid-cols-3",children:[e.jsx(r,{label:"Suche",placeholder:"Name oder E-Mail"}),e.jsx(r,{label:"Rolle",placeholder:"admin"}),e.jsx(r,{label:"Status",placeholder:"aktiv"})]}),children:e.jsxs("table",{className:"w-full text-sm",children:[e.jsx("thead",{children:e.jsxs("tr",{className:"border-b border-border",children:[e.jsx("th",{className:"px-3 py-2 text-left font-semibold",children:"Name"}),e.jsx("th",{className:"px-3 py-2 text-left font-semibold",children:"Rolle"}),e.jsx("th",{className:"px-3 py-2 text-left font-semibold",children:"Status"})]})}),e.jsx("tbody",{children:e.jsxs("tr",{className:"border-b border-border/60",children:[e.jsx("td",{className:"px-3 py-2",children:"Lara Meyer"}),e.jsx("td",{className:"px-3 py-2",children:"Admin"}),e.jsx("td",{className:"px-3 py-2",children:"Aktiv"})]})})]})}),e.jsx(o,{title:"Benutzer",loading:!0,children:e.jsx("div",{})}),e.jsx(o,{title:"Benutzer",isEmpty:!0,emptyText:"Keine Benutzer vorhanden.",children:e.jsx("div",{})})]})},i={render:()=>e.jsxs("div",{className:"space-y-6",children:[e.jsxs(S,{title:"LiveTicker",description:"Konfiguration für die Präsentationsansicht",footer:e.jsx(c,{variant:"primary",children:"Speichern"}),children:[e.jsx(r,{label:"Slide-Dauer (Sek.)",type:"number",defaultValue:10}),e.jsx(r,{label:"Refresh (Sek.)",type:"number",defaultValue:30})]}),e.jsx(P,{title:"System-Logs",entries:[{id:1,timestamp:"2026-01-25 10:32",actor:"goksche23@gmail.com",action:"ROLE_CHANGE",scope:"User: admin01",severity:"warning"},{id:2,timestamp:"2026-01-25 10:35",actor:"system",action:"OTP_SENT",scope:"User: lara@example.com",severity:"info"}]})]})};var p,u,x;s.parameters={...s.parameters,docs:{...(p=s.parameters)==null?void 0:p.docs,source:{originalSource:`{
  render: () => <div className="space-y-6">\r
      <PageHeader title="Turnierverwaltung" subtitle="Status und Aktionen im einheitlichen Seitenkopf" />\r
      <PageHeader title="Benutzerverwaltung" breadcrumbs="Admin / Benutzer" actions={<>\r
            <Button variant="secondary">Export</Button>\r
            <Button variant="primary">Neu</Button>\r
          </>} />\r
    </div>
}`,...(x=(u=s.parameters)==null?void 0:u.docs)==null?void 0:x.source}}};var h,b,g;n.parameters={...n.parameters,docs:{...(h=n.parameters)==null?void 0:h.docs,source:{originalSource:`{
  render: () => <div className="space-y-6">\r
      <DataTablePattern title="Benutzer" filters={<div className="grid grid-cols-1 gap-3 sm:grid-cols-3">\r
            <Input label="Suche" placeholder="Name oder E-Mail" />\r
            <Input label="Rolle" placeholder="admin" />\r
            <Input label="Status" placeholder="aktiv" />\r
          </div>}>\r
        <table className="w-full text-sm">\r
          <thead>\r
            <tr className="border-b border-border">\r
              <th className="px-3 py-2 text-left font-semibold">Name</th>\r
              <th className="px-3 py-2 text-left font-semibold">Rolle</th>\r
              <th className="px-3 py-2 text-left font-semibold">Status</th>\r
            </tr>\r
          </thead>\r
          <tbody>\r
            <tr className="border-b border-border/60">\r
              <td className="px-3 py-2">Lara Meyer</td>\r
              <td className="px-3 py-2">Admin</td>\r
              <td className="px-3 py-2">Aktiv</td>\r
            </tr>\r
          </tbody>\r
        </table>\r
      </DataTablePattern>\r
\r
      <DataTablePattern title="Benutzer" loading>\r
        <div />\r
      </DataTablePattern>\r
\r
      <DataTablePattern title="Benutzer" isEmpty emptyText="Keine Benutzer vorhanden.">\r
        <div />\r
      </DataTablePattern>\r
    </div>
}`,...(g=(b=n.parameters)==null?void 0:b.docs)==null?void 0:g.source}}};var f,y,N;i.parameters={...i.parameters,docs:{...(f=i.parameters)==null?void 0:f.docs,source:{originalSource:`{
  render: () => <div className="space-y-6">\r
      <SettingsSectionPattern title="LiveTicker" description="Konfiguration für die Präsentationsansicht" footer={<Button variant="primary">Speichern</Button>}>\r
        <Input label="Slide-Dauer (Sek.)" type="number" defaultValue={10} />\r
        <Input label="Refresh (Sek.)" type="number" defaultValue={30} />\r
      </SettingsSectionPattern>\r
\r
      <AdminLogListPattern title="System-Logs" entries={[{
      id: 1,
      timestamp: '2026-01-25 10:32',
      actor: 'goksche23@gmail.com',
      action: 'ROLE_CHANGE',
      scope: 'User: admin01',
      severity: 'warning'
    }, {
      id: 2,
      timestamp: '2026-01-25 10:35',
      actor: 'system',
      action: 'OTP_SENT',
      scope: 'User: lara@example.com',
      severity: 'info'
    }]} />\r
    </div>
}`,...(N=(y=i.parameters)==null?void 0:y.docs)==null?void 0:N.source}}};const R=["PageHeaderStateMatrix","DataTableStateMatrix","SettingsAndLogsPatterns"];export{n as DataTableStateMatrix,s as PageHeaderStateMatrix,i as SettingsAndLogsPatterns,R as __namedExportsOrder,D as default};
