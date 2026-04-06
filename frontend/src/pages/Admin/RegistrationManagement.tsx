import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../contexts/AuthContext';
import { Card, Button, Badge } from '../../components/ui';
import { registrationService, RegistrationRequest } from '../../services/registrationService';
import { ArrowLeft, CheckCircle, XCircle, Trash, ClipboardText } from 'phosphor-react';

export default function RegistrationManagement() {
  const { isPowerAdmin } = useAuth();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [requests, setRequests] = useState<RegistrationRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [actionLoading, setActionLoading] = useState<number | null>(null);
  const [rejectId, setRejectId] = useState<number | null>(null);
  const [rejectReason, setRejectReason] = useState('');

  useEffect(() => {
    if (isPowerAdmin) loadRequests();
  }, [isPowerAdmin]);

  const loadRequests = async () => {
    try {
      setLoading(true);
      const data = await registrationService.getAll();
      setRequests(data);
    } catch (err: any) {
      setError(err.response?.data?.detail || t('admin.registrations.loadError'));
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (id: number, forceUnverified?: boolean) => {
    const msgKey = forceUnverified
      ? 'admin.registrations.approveForceConfirm'
      : 'admin.registrations.approveConfirm';
    if (!confirm(t(msgKey))) return;
    setActionLoading(id);
    try {
      await registrationService.approve(id, forceUnverified ? { forceUnverified: true } : undefined);
      await loadRequests();
    } catch (err: any) {
      setError(err.response?.data?.detail || t('admin.registrations.approveError'));
    } finally {
      setActionLoading(null);
    }
  };

  const handleReject = async (id: number) => {
    setActionLoading(id);
    try {
      await registrationService.reject(id, rejectReason || undefined);
      setRejectId(null);
      setRejectReason('');
      await loadRequests();
    } catch (err: any) {
      setError(err.response?.data?.detail || t('admin.registrations.rejectError'));
    } finally {
      setActionLoading(null);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm(t('admin.registrations.deleteConfirm'))) return;
    setActionLoading(id);
    try {
      await registrationService.remove(id);
      await loadRequests();
    } catch (err: any) {
      setError(err.response?.data?.detail || t('admin.registrations.deleteError'));
    } finally {
      setActionLoading(null);
    }
  };

  const getStatusBadge = (status: string, otpVerified: boolean) => {
    if (status === 'approved') return <Badge variant="success">{t('admin.registrations.status.approved')}</Badge>;
    if (status === 'rejected') return <Badge variant="destructive">{t('admin.registrations.status.rejected')}</Badge>;
    if (!otpVerified) return <Badge variant="secondary">{t('admin.registrations.status.emailNotVerified')}</Badge>;
    return <Badge variant="info">{t('admin.registrations.status.pendingApproval')}</Badge>;
  };

  if (!isPowerAdmin) {
    return (
      <div className="p-8 text-center">
        <h2 className="text-foreground">{t('admin.registrations.accessDenied')}</h2>
        <p className="text-muted-foreground">{t('admin.registrations.noPermission')}</p>
      </div>
    );
  }

  const pendingCount = requests.filter((r) => r.status === 'pending').length;

  return (
    <div className="p-8 max-w-[1000px] mx-auto">
      <div className="flex justify-between items-center mb-8">
        <div className="flex items-center gap-3">
          <ClipboardText size={26} className="text-foreground" />
          <h1 className="m-0 text-foreground">
            {t('admin.registrations.title')}
            {pendingCount > 0 && (
              <span className="ml-2 text-sm font-normal text-primary">{t('admin.registrations.openCount', { count: pendingCount })}</span>
            )}
          </h1>
        </div>
        <Button variant="secondary" onClick={() => navigate('/dashboard')}>
          <ArrowLeft size={18} className="mr-2" />
          {t('common.back')}
        </Button>
      </div>

      {error && (
        <div className="mb-4 p-3 rounded-lg border border-destructive bg-destructive/10 text-destructive text-sm">
          {error}
          <button onClick={() => setError('')} className="ml-2 underline bg-transparent border-none cursor-pointer text-destructive">
            {t('admin.registrations.close')}
          </button>
        </div>
      )}

      <Card>
        {loading ? (
          <div className="p-8 text-center text-muted-foreground">{t('common.loadingShort')}</div>
        ) : requests.length === 0 ? (
          <div className="p-8 text-center text-muted-foreground">{t('admin.registrations.noRequests')}</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left p-3 text-muted-foreground font-medium">{t('admin.registrations.table.name')}</th>
                  <th className="text-left p-3 text-muted-foreground font-medium">{t('admin.registrations.table.email')}</th>
                  <th className="text-left p-3 text-muted-foreground font-medium">{t('admin.registrations.table.status')}</th>
                  <th className="text-left p-3 text-muted-foreground font-medium">{t('admin.registrations.table.date')}</th>
                  <th className="text-right p-3 text-muted-foreground font-medium">{t('admin.registrations.table.actions')}</th>
                </tr>
              </thead>
              <tbody>
                {requests.map((req) => (
                  <tr key={req.id} className="border-b border-border last:border-0 hover:bg-muted/50">
                    <td className="p-3 text-foreground font-medium">
                      {req.first_name} {req.last_name}
                    </td>
                    <td className="p-3 text-muted-foreground">{req.email}</td>
                    <td className="p-3">{getStatusBadge(req.status, req.otp_verified)}</td>
                    <td className="p-3 text-muted-foreground text-xs">
                      {new Date(req.created_at).toLocaleDateString('de-CH', {
                        day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit'
                      })}
                    </td>
                    <td className="p-3">
                      <div className="flex justify-end gap-2">
                        {req.status === 'pending' && (
                          <>
                            {req.otp_verified ? (
                              <Button
                                variant="primary"
                                onClick={() => handleApprove(req.id)}
                                disabled={actionLoading === req.id}
                                className="p-1.5 text-xs gap-1"
                              >
                                <CheckCircle size={14} /> {t('admin.registrations.approve')}
                              </Button>
                            ) : (
                              <>
                                <Button
                                  variant="primary"
                                  onClick={() => handleApprove(req.id, true)}
                                  disabled={actionLoading === req.id}
                                  className="p-1.5 text-xs gap-1"
                                >
                                  <CheckCircle size={14} /> {t('admin.registrations.approveWithoutEmailVerify')}
                                </Button>
                                <Button
                                  variant="secondary"
                                  onClick={() => handleDelete(req.id)}
                                  disabled={actionLoading === req.id}
                                  className="p-1.5 text-xs gap-1"
                                >
                                  <Trash size={14} /> {t('common.delete')}
                                </Button>
                              </>
                            )}
                            {rejectId === req.id ? (
                              <div className="flex items-center gap-1">
                                <input
                                  type="text"
                                  placeholder={t('admin.registrations.rejectReasonPlaceholder')}
                                  value={rejectReason}
                                  onChange={(e) => setRejectReason(e.target.value)}
                                  className="px-2 py-1 text-xs border border-border rounded bg-background text-foreground w-36"
                                />
                                <Button
                                  variant="danger"
                                  onClick={() => handleReject(req.id)}
                                  disabled={actionLoading === req.id}
                                  className="p-1.5 text-xs"
                                >
                                  {t('admin.registrations.reject')}
                                </Button>
                                <Button
                                  variant="secondary"
                                  onClick={() => { setRejectId(null); setRejectReason(''); }}
                                  className="p-1.5 text-xs"
                                >
                                  {t('admin.registrations.rejectCancel')}
                                </Button>
                              </div>
                            ) : (
                              <Button
                                variant="danger"
                                onClick={() => setRejectId(req.id)}
                                disabled={actionLoading === req.id}
                                className="p-1.5 text-xs gap-1"
                              >
                                <XCircle size={14} /> {t('admin.registrations.reject')}
                              </Button>
                            )}
                          </>
                        )}
                        {(req.status === 'approved' || req.status === 'rejected') && (
                          <Button
                            variant="secondary"
                            onClick={() => handleDelete(req.id)}
                            disabled={actionLoading === req.id}
                            className="p-1.5 text-xs gap-1"
                          >
                            <Trash size={14} /> {t('common.delete')}
                          </Button>
                        )}
                        {req.reject_reason && (
                          <span className="text-xs text-muted-foreground italic ml-2" title={req.reject_reason}>
                            {t('admin.registrations.reason', {
                              reason: req.reject_reason.length > 30
                                ? req.reject_reason.substring(0, 30) + '...'
                                : req.reject_reason
                            })}
                          </span>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}
