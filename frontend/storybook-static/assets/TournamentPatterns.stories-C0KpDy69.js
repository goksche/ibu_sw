import{j as e}from"./iframe-jQ-knsx3.js";import{B as u,b as n}from"./tooltip-DxcaGd-F.js";import{T as f,M as x,S as b}from"./MatchListPattern-Eko5Fec8.js";import{K as s}from"./KOBracketPattern-B8OIXurM.js";import{T as g}from"./Trophy.esm-D7DkCeOa.js";import"./preload-helper-C1FmrZbK.js";import"./IconBase.esm-CaTeI6KH.js";import"./index-C31rOMmP.js";import"./KOBracket-BVIQviWT.js";import"./useTranslation-BnNfRHqV.js";import"./index-oCpdEIgH.js";const M={title:"Patterns/Tournament/Library",parameters:{layout:"padded"}},i=[{id:1,first_name:"Thomas",last_name:"Indergang"},{id:2,first_name:"Roger",last_name:"Baumann"},{id:3,first_name:"Erkan",last_name:"Cokicli"},{id:4,first_name:"Luca",last_name:"Gisler"}],o=[{id:1,round:1,match_no:1,player1_id:1,player2_id:4,score1:2,score2:0},{id:2,round:1,match_no:2,player1_id:2,player2_id:3,score1:1,score2:2}],r={render:()=>e.jsxs("div",{className:"space-y-6",children:[e.jsx(f,{title:"Gruppenphase",subtitle:"Runde 1 von 3",icon:e.jsx(g,{size:20,weight:"bold"}),actions:e.jsx(u,{variant:"info",children:"Laufend"})}),e.jsx(x,{title:"Spielplan Gruppe A",subtitle:"4 Spiele offen",toolbar:e.jsxs(e.Fragment,{children:[e.jsx(n,{variant:"secondary",size:"sm",children:"Nach Gruppe"}),e.jsx(n,{variant:"info",size:"sm",children:"Gesamt"})]}),children:e.jsxs("table",{className:"w-full text-sm",children:[e.jsx("thead",{children:e.jsxs("tr",{className:"border-b border-border",children:[e.jsx("th",{className:"px-3 py-2 text-left font-semibold",children:"Spiel"}),e.jsx("th",{className:"px-3 py-2 text-left font-semibold",children:"P1"}),e.jsx("th",{className:"px-3 py-2 text-left font-semibold",children:"P2"}),e.jsx("th",{className:"px-3 py-2 text-center font-semibold",children:"Resultat"})]})}),e.jsx("tbody",{children:e.jsxs("tr",{className:"border-b border-border/60",children:[e.jsx("td",{className:"px-3 py-2",children:"1"}),e.jsx("td",{className:"px-3 py-2",children:"Thomas Indergang"}),e.jsx("td",{className:"px-3 py-2",children:"Roger Baumann"}),e.jsx("td",{className:"px-3 py-2 text-center",children:"2 : 1"})]})})]})})]})},a={render:()=>e.jsxs("div",{className:"space-y-6",children:[e.jsx(b,{title:"Gruppentabelle A",tieBreakNote:"Bei Punktgleichheit entscheidet Torverhältnis, danach direkte Begegnung.",rows:[{rank:1,name:"Thomas Indergang",points:9,diff:7},{rank:2,name:"Roger Baumann",points:6,diff:2},{rank:3,name:"Erkan Cokicli",points:3,diff:-3}],columns:[{key:"rank",label:"#",render:t=>t.rank},{key:"name",label:"Teilnehmer",render:t=>t.name},{key:"points",label:"Punkte",align:"right",render:t=>t.points},{key:"diff",label:"Diff",align:"right",render:t=>t.diff}]}),e.jsx(s,{matches:o,participants:i,tournamentId:1,drawMode:null,koDistribution:null,mode:"management"}),e.jsx(s,{matches:o,participants:i,tournamentId:1,drawMode:null,koDistribution:null,mode:"presentation"})]})};var d,l,m;r.parameters={...r.parameters,docs:{...(d=r.parameters)==null?void 0:d.docs,source:{originalSource:`{
  render: () => <div className="space-y-6">\r
      <TournamentSectionHeader title="Gruppenphase" subtitle="Runde 1 von 3" icon={<Trophy size={20} weight="bold" />} actions={<Badge variant="info">Laufend</Badge>} />\r
\r
      <MatchListPattern title="Spielplan Gruppe A" subtitle="4 Spiele offen" toolbar={<>\r
            <Button variant="secondary" size="sm">Nach Gruppe</Button>\r
            <Button variant="info" size="sm">Gesamt</Button>\r
          </>}>\r
        <table className="w-full text-sm">\r
          <thead>\r
            <tr className="border-b border-border">\r
              <th className="px-3 py-2 text-left font-semibold">Spiel</th>\r
              <th className="px-3 py-2 text-left font-semibold">P1</th>\r
              <th className="px-3 py-2 text-left font-semibold">P2</th>\r
              <th className="px-3 py-2 text-center font-semibold">Resultat</th>\r
            </tr>\r
          </thead>\r
          <tbody>\r
            <tr className="border-b border-border/60">\r
              <td className="px-3 py-2">1</td>\r
              <td className="px-3 py-2">Thomas Indergang</td>\r
              <td className="px-3 py-2">Roger Baumann</td>\r
              <td className="px-3 py-2 text-center">2 : 1</td>\r
            </tr>\r
          </tbody>\r
        </table>\r
      </MatchListPattern>\r
    </div>
}`,...(m=(l=r.parameters)==null?void 0:l.docs)==null?void 0:m.source}}};var c,p,h;a.parameters={...a.parameters,docs:{...(c=a.parameters)==null?void 0:c.docs,source:{originalSource:`{
  render: () => <div className="space-y-6">\r
      <StandingTablePattern title="Gruppentabelle A" tieBreakNote="Bei Punktgleichheit entscheidet Torverhältnis, danach direkte Begegnung." rows={[{
      rank: 1,
      name: 'Thomas Indergang',
      points: 9,
      diff: 7
    }, {
      rank: 2,
      name: 'Roger Baumann',
      points: 6,
      diff: 2
    }, {
      rank: 3,
      name: 'Erkan Cokicli',
      points: 3,
      diff: -3
    }]} columns={[{
      key: 'rank',
      label: '#',
      render: row => row.rank
    }, {
      key: 'name',
      label: 'Teilnehmer',
      render: row => row.name
    }, {
      key: 'points',
      label: 'Punkte',
      align: 'right',
      render: row => row.points
    }, {
      key: 'diff',
      label: 'Diff',
      align: 'right',
      render: row => row.diff
    }]} />\r
\r
      <KOBracketPattern matches={koMatches} participants={participants} tournamentId={1} drawMode={null} koDistribution={null} mode="management" />\r
\r
      <KOBracketPattern matches={koMatches} participants={participants} tournamentId={1} drawMode={null} koDistribution={null} mode="presentation" />\r
    </div>
}`,...(h=(p=a.parameters)==null?void 0:p.docs)==null?void 0:h.source}}};const G=["SectionHeaderAndMatchList","StandingAndKOWrappers"];export{r as SectionHeaderAndMatchList,a as StandingAndKOWrappers,G as __namedExportsOrder,M as default};
