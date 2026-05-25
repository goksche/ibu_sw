import{j as e}from"./iframe-jQ-knsx3.js";import{L as n,a as s,b as l,c as o}from"./LiveTickerSlides-C3FNc5zI.js";import"./preload-helper-C1FmrZbK.js";import"./tooltip-DxcaGd-F.js";import"./IconBase.esm-CaTeI6KH.js";import"./index-C31rOMmP.js";import"./KOBracketPattern-B8OIXurM.js";import"./KOBracket-BVIQviWT.js";import"./useTranslation-BnNfRHqV.js";import"./index-oCpdEIgH.js";const S={title:"Patterns/Presentation/Library",parameters:{layout:"fullscreen"}},d=[{id:1,first_name:"Thomas",last_name:"Indergang"},{id:2,first_name:"Roger",last_name:"Baumann"},{id:3,first_name:"Erkan",last_name:"Cokicli"},{id:4,first_name:"Luca",last_name:"Gisler"}],u=[{id:1,round:1,match_no:1,player1_id:1,player2_id:4,score1:2,score2:0},{id:2,round:1,match_no:2,player1_id:2,player2_id:3,score1:1,score2:2}],i={render:()=>e.jsxs("div",{className:"min-h-screen bg-background p-8 text-foreground space-y-10",children:[e.jsx(n,{tournamentName:"Vereinsturnier Winter 2026",subtitle:"LiveTicker",refreshHint:"Automatische Aktualisierung alle 30 Sekunden"}),e.jsx(s,{title:"Gruppenübersicht",subtitle:"8 Spiele offen",children:e.jsx("div",{className:"rounded-lg border border-border bg-card p-6 text-xl",children:"Distanz-Lesbarkeit: große Typografie, klare Kontraste, luftige Abstände."})}),e.jsx(l,{title:"Qualifikation",subtitle:"Top 8 für KO qualifiziert",children:e.jsx("div",{className:"text-lg text-muted-foreground",children:"Qualifikationsmatrix mit Tie-Break-Hinweisen und Status-Badges."})}),e.jsx(o,{title:"KO-Phase",subtitle:"Halbfinale",matches:u,participants:d,tournamentId:1,drawMode:null,koDistribution:null})]})};var r,t,a;i.parameters={...i.parameters,docs:{...(r=i.parameters)==null?void 0:r.docs,source:{originalSource:`{
  render: () => <div className="min-h-screen bg-background p-8 text-foreground space-y-10">\r
      <LiveTickerSlideTitle tournamentName="Vereinsturnier Winter 2026" subtitle="LiveTicker" refreshHint="Automatische Aktualisierung alle 30 Sekunden" />\r
\r
      <LiveTickerSlideGroups title="Gruppenübersicht" subtitle="8 Spiele offen">\r
        <div className="rounded-lg border border-border bg-card p-6 text-xl">\r
          Distanz-Lesbarkeit: große Typografie, klare Kontraste, luftige Abstände.\r
        </div>\r
      </LiveTickerSlideGroups>\r
\r
      <LiveTickerSlideQualification title="Qualifikation" subtitle="Top 8 für KO qualifiziert">\r
        <div className="text-lg text-muted-foreground">\r
          Qualifikationsmatrix mit Tie-Break-Hinweisen und Status-Badges.\r
        </div>\r
      </LiveTickerSlideQualification>\r
\r
      <LiveTickerSlideKO title="KO-Phase" subtitle="Halbfinale" matches={koMatches} participants={participants} tournamentId={1} drawMode={null} koDistribution={null} />\r
    </div>
}`,...(a=(t=i.parameters)==null?void 0:t.docs)==null?void 0:a.source}}};const T=["SlideStates"];export{i as SlideStates,T as __namedExportsOrder,S as default};
