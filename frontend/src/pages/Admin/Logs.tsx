import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../contexts/AuthContext';
import { Button, Card, Input, Tabs, TabsList, TabsTrigger, TabsContent } from '../../components/ui';
import { logsService, LogQueryParams } from '../../services/logsService';
import {
  PageViewLog,
  LoginEventLog,
  ApiRequestLog,
  AdminActionLog,
  NginxLogResponse
} from '../../types';
import { ArrowLeft, ListBullets } from 'phosphor-react';

type TabKey = 'page_views' | 'login_events' | 'api_requests' | 'admin_actions' | 'nginx';

const TAB_LABEL_KEYS: Record<TabKey, string> = {
  page_views: 'admin.logs.tabs.pageViews',
  login_events: 'admin.logs.tabs.loginEvents',
  api_requests: 'admin.logs.tabs.apiRequests',
  admin_actions: 'admin.logs.tabs.adminActions',
  nginx: 'admin.logs.tabs.nginx'
};

const formatTimestamp = (value: string) => {
  try {
    const hasTimezone = /[zZ]$|[+-]\d{2}:\d{2}$/.test(value);
    const iso = hasTimezone ? value : `${value}Z`;
    return new Intl.DateTimeFormat('de-CH', {
      timeZone: 'Europe/Zurich',
      dateStyle: 'short',
      timeStyle: 'medium'
    }).format(new Date(iso));
  } catch {
    return value;
  }
};

export default function Logs() {
  const navigate = useNavigate();
  const { isAdmin } = useAuth();
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState<TabKey>('page_views');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [query, setQuery] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [limit, setLimit] = useState(100);

  const [tail, setTail] = useState(200);
  const [nginxLogs, setNginxLogs] = useState<NginxLogResponse | null>(null);

  const [pageViews, setPageViews] = useState<PageViewLog[]>([]);
  const [loginEvents, setLoginEvents] = useState<LoginEventLog[]>([]);
  const [apiRequests, setApiRequests] = useState<ApiRequestLog[]>([]);
  const [adminActions, setAdminActions] = useState<AdminActionLog[]>([]);

  const logParams = useMemo<LogQueryParams>(() => {
    const params: LogQueryParams = { limit };
    if (query.trim()) params.q = query.trim();
    if (startDate) params.start = new Date(`${startDate}T00:00:00`).toISOString();
    if (endDate) params.end = new Date(`${endDate}T23:59:59`).toISOString();
    return params;
  }, [query, startDate, endDate, limit]);

  const loadActiveTab = async () => {
    setLoading(true);
    setError(null);
    try {
      if (activeTab === 'page_views') {
        const data = await logsService.getPageViews(logParams);
        setPageViews(data);
      } else if (activeTab === 'login_events') {
        const data = await logsService.getLoginEvents(logParams);
        setLoginEvents(data);
      } else if (activeTab === 'api_requests') {
        const data = await logsService.getApiRequests(logParams);
        setApiRequests(data);
      } else if (activeTab === 'admin_actions') {
        const data = await logsService.getAdminActions(logParams);
        setAdminActions(data);
      } else if (activeTab === 'nginx') {
        const data = await logsService.getNginxLogs(tail);
        setNginxLogs(data);
      }
    } catch (err: any) {
      setError(err?.response?.data?.detail || t('admin.logs.loadError'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!isAdmin) return;
    loadActiveTab();
  }, [activeTab, logParams, tail, isAdmin]);

  if (!isAdmin) {
    return (
      <div className="p-8 text-center">
        <h2 className="text-foreground">{t('admin.logs.accessDenied')}</h2>
        <p className="text-muted-foreground">{t('admin.logs.noPermission')}</p>
      </div>
    );
  }

  return (
    <div className="p-8 max-w-[1200px] mx-auto">
      <div className="flex justify-between items-center mb-6">
        <div className="flex items-center gap-3">
          <ListBullets size={26} className="text-foreground" />
          <h1 className="m-0 text-foreground">{t('admin.logs.title')}</h1>
        </div>
        <Button variant="secondary" onClick={() => navigate('/settings')}>
          <ArrowLeft size={18} className="mr-2 align-middle" />
          {t('common.back')}
        </Button>
      </div>

      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as TabKey)}>
        <TabsList className="flex gap-3 mb-4 flex-wrap">
          {Object.entries(TAB_LABEL_KEYS).map(([key, translationKey]) => (
            <TabsTrigger key={key} value={key}>
              {t(translationKey)}
            </TabsTrigger>
          ))}
        </TabsList>

        {activeTab !== 'nginx' && (
          <Card className="p-4 mb-4">
            <div className="grid grid-cols-[2fr_1fr_1fr_1fr] gap-4">
              <Input
                label={t('admin.logs.searchLabel')}
                value={query}
                onChange={(e) => setQuery(e.target.value)}
              />
              <Input
                label={t('admin.logs.fromLabel')}
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
              />
              <Input
                label={t('admin.logs.toLabel')}
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
              />
              <Input
                label={t('admin.logs.limitLabel')}
                type="number"
                min={1}
                max={500}
                value={limit}
                onChange={(e) => setLimit(Number(e.target.value) || 100)}
              />
            </div>
            <div className="mt-4 flex justify-end">
              <Button variant="secondary" onClick={loadActiveTab} disabled={loading}>
                {t('common.refresh')}
              </Button>
            </div>
          </Card>
        )}

        {activeTab === 'nginx' && (
          <Card className="p-4 mb-4">
            <div className="flex gap-4 items-end">
              <Input
                label={t('admin.logs.tailLabel')}
                type="number"
                min={1}
                max={2000}
                value={tail}
                onChange={(e) => setTail(Number(e.target.value) || 200)}
              />
              <Button variant="secondary" onClick={loadActiveTab} disabled={loading}>
                {t('common.refresh')}
              </Button>
            </div>
          </Card>
        )}

        {error && (
          <div className="mb-4 text-destructive">
            {error}
          </div>
        )}

        <TabsContent value="page_views" className="mt-0">
          {loading && activeTab === 'page_views' ? (
            <div className="p-4 text-muted-foreground">{t('common.loadingShort')}</div>
          ) : (
          <Card className="p-0 overflow-hidden">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="border-b-2 border-border">
                    <th className="p-3 text-left text-foreground">{t('admin.logs.table.time')}</th>
                    <th className="p-3 text-left text-foreground">{t('admin.logs.table.path')}</th>
                    <th className="p-3 text-left text-foreground">{t('admin.logs.table.user')}</th>
                    <th className="p-3 text-left text-foreground">{t('admin.logs.table.ip')}</th>
                  </tr>
                </thead>
                <tbody>
                  {pageViews.map((row) => (
                    <tr key={row.id} className="border-b border-border">
                      <td className="p-3 text-foreground">{formatTimestamp(row.created_at)}</td>
                      <td className="p-3 text-foreground">
                        {row.path}{row.query ? row.query : ''}
                      </td>
                      <td className="p-3 text-foreground">{row.user_id ?? '-'}</td>
                      <td className="p-3 text-foreground">{row.ip ?? '-'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="login_events" className="mt-0">
          {loading && activeTab === 'login_events' ? (
            <div className="p-4 text-muted-foreground">{t('common.loadingShort')}</div>
          ) : (
          <Card className="p-0 overflow-hidden">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="border-b-2 border-border">
                    <th className="p-3 text-left text-foreground">{t('admin.logs.table.time')}</th>
                    <th className="p-3 text-left text-foreground">{t('admin.logs.table.type')}</th>
                    <th className="p-3 text-left text-foreground">{t('admin.logs.table.userEmail')}</th>
                    <th className="p-3 text-left text-foreground">{t('admin.logs.table.result')}</th>
                    <th className="p-3 text-left text-foreground">{t('admin.logs.table.reason')}</th>
                  </tr>
                </thead>
                <tbody>
                  {loginEvents.map((row) => (
                    <tr key={row.id} className="border-b border-border">
                      <td className="p-3 text-foreground">{formatTimestamp(row.created_at)}</td>
                      <td className="p-3 text-foreground">{row.event_type}</td>
                      <td className="p-3 text-foreground">{row.username || row.email || '-'}</td>
                      <td className="p-3 text-foreground">{row.success ? t('admin.logs.resultOk') : t('admin.logs.resultError')}</td>
                      <td className="p-3 text-foreground">{row.reason || '-'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="api_requests" className="mt-0">
          {loading && activeTab === 'api_requests' ? (
            <div className="p-4 text-muted-foreground">{t('common.loadingShort')}</div>
          ) : (
          <Card className="p-0 overflow-hidden">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="border-b-2 border-border">
                    <th className="p-3 text-left text-foreground">{t('admin.logs.table.time')}</th>
                    <th className="p-3 text-left text-foreground">{t('admin.logs.table.method')}</th>
                    <th className="p-3 text-left text-foreground">{t('admin.logs.table.path')}</th>
                    <th className="p-3 text-left text-foreground">{t('admin.logs.table.status')}</th>
                    <th className="p-3 text-left text-foreground">{t('admin.logs.table.duration')}</th>
                  </tr>
                </thead>
                <tbody>
                  {apiRequests.map((row) => (
                    <tr key={row.id} className="border-b border-border">
                      <td className="p-3 text-foreground">{formatTimestamp(row.created_at)}</td>
                      <td className="p-3 text-foreground">{row.method}</td>
                      <td className="p-3 text-foreground">{row.path}</td>
                      <td className="p-3 text-foreground">{row.status_code}</td>
                      <td className="p-3 text-foreground">{row.duration_ms} ms</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="admin_actions" className="mt-0">
          {loading && activeTab === 'admin_actions' ? (
            <div className="p-4 text-muted-foreground">{t('common.loadingShort')}</div>
          ) : (
          <Card className="p-0 overflow-hidden">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="border-b-2 border-border">
                    <th className="p-3 text-left text-foreground">{t('admin.logs.table.time')}</th>
                    <th className="p-3 text-left text-foreground">{t('admin.logs.table.action')}</th>
                    <th className="p-3 text-left text-foreground">{t('admin.logs.table.status')}</th>
                    <th className="p-3 text-left text-foreground">{t('admin.logs.table.user')}</th>
                  </tr>
                </thead>
                <tbody>
                  {adminActions.map((row) => (
                    <tr key={row.id} className="border-b border-border">
                      <td className="p-3 text-foreground">{formatTimestamp(row.created_at)}</td>
                      <td className="p-3 text-foreground">{row.action}</td>
                      <td className="p-3 text-foreground">{row.status_code}</td>
                      <td className="p-3 text-foreground">{row.user_id ?? '-'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="nginx" className="mt-0">
          {loading && activeTab === 'nginx' ? (
            <div className="p-4 text-muted-foreground">{t('common.loadingShort')}</div>
          ) : (
          <Card className="p-4">
              <div className="font-mono whitespace-pre-wrap text-sm">
                {(nginxLogs?.lines || []).join('\n') || t('admin.logs.noLogs')}
              </div>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
