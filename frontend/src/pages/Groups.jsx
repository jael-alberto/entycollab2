import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { useApp } from '../context/AppContext.jsx';
import { useToast } from '../context/ToastContext.jsx';
import { useModals } from '../context/ModalManager.jsx';
import { EmptyState, Avatar, GroupAvatar, Icon } from '../components/common.jsx';
import ProjectCard from '../components/ProjectCard.jsx';
import PersonCard from '../components/PersonCard.jsx';
import { l10nValue } from '../lib/i18n.js';
import { getGroups, saveGroups } from '../lib/store.js';

function memberFor(group, userId) {
  return group.members?.find(m => m.userId === userId) || null;
}

export default function Groups() {
  const { groupId } = useParams();
  return groupId ? <GroupWorkspace groupId={groupId} /> : <GroupsDirectory />;
}

function GroupsDirectory() {
  const { user, groups, requestToJoinGroup, createGroup, selectGroup } = useApp();
  const { showToast } = useToast();
  const navigate = useNavigate();
  const [creating, setCreating] = useState(false);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');

  const submit = (e) => {
    e.preventDefault();
    if (!name.trim()) return;
    const group = createGroup({ name, description });
    showToast('Grupo creado con éxito', 'success');
    navigate(`/grupos/${group.id}`);
  };

  const open = (group) => {
    if (memberFor(group, user.id)) {
      selectGroup(group.id);
      navigate(`/grupos/${group.id}`);
    }
  };

  const handleRequest = (groupId) => {
    const res = requestToJoinGroup(groupId);
    if (res === 'pending') {
      showToast('Ya tienes una solicitud pendiente para este grupo', 'info');
    } else if (res === 'member') {
      showToast('Ya eres miembro de este grupo', 'info');
    } else {
      showToast('Solicitud enviada al administrador', 'success');
    }
  };

  return (
    <div className="section-block groups-page">
      <div className="section-header-row">
        <div>
          <h2 className="section-title">Grupos</h2>
          <p className="groups-intro">Espacios privados para que equipos organicen sus proyectos y miembros.</p>
        </div>
        <button className="btn btn-primary" onClick={() => setCreating(v => !v)}>
          {creating ? 'Cancelar' : 'Crear grupo'}
        </button>
      </div>

      {creating && (
        <form className="group-create-form" onSubmit={submit}>
          <div className="form-group">
            <label htmlFor="group-name">Nombre del grupo</label>
            <input
              id="group-name"
              required
              maxLength="70"
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="Ej. Estudio Indie, Equipo de Producto..."
            />
          </div>
          <div className="form-group">
            <label htmlFor="group-description">Descripción</label>
            <textarea
              id="group-description"
              required
              maxLength="260"
              rows="3"
              value={description}
              onChange={e => setDescription(e.target.value)}
              placeholder="Qué proyectos desarrollan o cuál es el propósito de este equipo"
            />
          </div>
          <button className="btn btn-primary" type="submit">Crear y acceder</button>
        </form>
      )}

      {groups.length === 0 ? (
        <EmptyState icon="👥" title="Aún no hay grupos" sub="Crea el primero para empezar a colaborar con tu equipo." />
      ) : (
        <div className="groups-grid">
          {groups.map(group => {
            const membership = memberFor(group, user.id);
            const pending = group.requests?.some(r => r.userId === user.id && r.status === 'pending');
            return (
              <article className="group-card" key={group.id}>
                <div className="group-card-icon">👥</div>
                <div>
                  <h3>{group.name}</h3>
                  <p>{group.description}</p>
                </div>
                <div className="group-card-meta">
                  <span>{group.members?.length || 0} miembros</span>
                  <span>{membership ? (membership.role === 'owner' ? 'Creador' : membership.role === 'admin' ? 'Administrador' : 'Miembro') : 'Grupo privado'}</span>
                </div>
                {membership ? (
                  <button className="btn btn-primary btn-sm" onClick={() => open(group)}>
                    Entrar al grupo
                  </button>
                ) : (
                  <button
                    className="btn btn-ghost btn-sm"
                    disabled={pending}
                    onClick={() => handleRequest(group.id)}
                  >
                    {pending ? 'Solicitud enviada' : 'Solicitar acceso'}
                  </button>
                )}
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}

function GroupWorkspace({ groupId }) {
  const {
    user, users, groups, projects, activeGroup, selectGroup,
    decideGroupRequest, setGroupMemberRole, updateGroup, removeGroupMember,
    sendInvite, lang, t
  } = useApp();
  const { openCreate } = useModals();
  const { showToast } = useToast();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  const group = groups.find(g => g.id === groupId);
  const membership = group && memberFor(group, user.id);
  const isOwner = group?.ownerId === user?.id;
  const isAdmin = membership?.role === 'owner' || membership?.role === 'admin';

  const activeTab = searchParams.get('tab') || 'overview';
  const setTab = (tab) => setSearchParams({ tab });

  const [projectFilter, setProjectFilter] = useState('all');
  const [projectSearch, setProjectSearch] = useState('');
  const [memberSearch, setMemberSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');
  const [editName, setEditName] = useState(group?.name || '');
  const [editDesc, setEditDesc] = useState(group?.description || '');
  const [savingInfo, setSavingInfo] = useState(false);
  const [prevGroupId, setPrevGroupId] = useState(groupId);
  const [openMemberMenu, setOpenMemberMenu] = useState(null);
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [inviteUsername, setInviteUsername] = useState('');
  const [inviteProjectId, setInviteProjectId] = useState('');
  const [inviteMessage, setInviteMessage] = useState('');

  useEffect(() => {
    if (prevGroupId !== groupId) {
      setPrevGroupId(groupId);
      setEditName(group?.name || '');
      setEditDesc(group?.description || '');
    }
  }, [groupId]);

  useEffect(() => {
    if (group && (!activeGroup || activeGroup.id !== groupId) && memberFor(group, user.id)) {
      selectGroup(groupId);
    }
  }, [group, activeGroup, groupId, user.id, selectGroup]);

  useEffect(() => {
    const handleClickOutside = () => setOpenMemberMenu(null);
    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, []);

  const groupProjects = useMemo(() => projects.filter(p => p.groupId === groupId), [projects, groupId]);
  const openProjects = groupProjects.filter(p => p.status === 'open');
  const completedProjects = groupProjects.filter(p => p.status === 'completed');

  const filteredProjects = useMemo(() => {
    let list = groupProjects;
    if (projectFilter === 'open') list = list.filter(p => p.status === 'open');
    else if (projectFilter === 'completed') list = list.filter(p => p.status === 'completed');
    if (projectSearch.trim()) {
      const q = projectSearch.toLowerCase();
      list = list.filter(p =>
        l10nValue(lang, p.title).toLowerCase().includes(q) ||
        l10nValue(lang, p.description).toLowerCase().includes(q)
      );
    }
    return list;
  }, [groupProjects, projectFilter, projectSearch, lang]);

  const groupMembers = group?.members || [];
  const filteredMembers = useMemo(() => {
    let list = groupMembers;
    if (memberSearch.trim()) {
      const q = memberSearch.toLowerCase();
      list = list.filter(m => {
        const person = users.find(u => u.id === m.userId);
        return person?.name?.toLowerCase().includes(q) || person?.username?.toLowerCase().includes(q);
      });
    }
    if (roleFilter !== 'all') {
      list = list.filter(m => m.role === roleFilter);
    }
    return list;
  }, [groupMembers, memberSearch, roleFilter, users]);

  const requests = (group?.requests || []).filter(r => r.status === 'pending');

  if (!group) {
    return (
      <div className="section-block">
        <EmptyState icon="🔎" title="Grupo no encontrado" />
        <button className="btn btn-ghost" onClick={() => navigate('/grupos')}>Volver a grupos</button>
      </div>
    );
  }

  if (!membership) {
    return (
      <div className="section-block">
        <EmptyState
          icon="🔒"
          title="Este grupo es privado"
          sub="Solicita acceso desde el directorio. Un administrador debe aprobar tu solicitud para ingresar."
        />
        <button className="btn btn-ghost" onClick={() => navigate('/grupos')}>Volver a grupos</button>
      </div>
    );
  }

  const handleSaveGroupInfo = (e) => {
    e.preventDefault();
    if (!editName.trim()) return;
    setSavingInfo(true);
    const ok = updateGroup(group.id, { name: editName, description: editDesc });
    setSavingInfo(false);
    if (ok) showToast('Información del grupo actualizada', 'success');
    else showToast('No tienes permisos para editar este grupo', 'error');
  };

  const handleRequestDecision = (requestId, accepted) => {
    const ok = decideGroupRequest(group.id, requestId, accepted);
    if (ok) showToast(accepted ? 'Solicitud aceptada. Nuevo miembro agregado.' : 'Solicitud rechazada.', accepted ? 'success' : 'info');
  };

  const handleRoleChange = (memberId, newRole) => {
    const ok = setGroupMemberRole(group.id, memberId, newRole);
    if (ok) {
      showToast('Rol de miembro actualizado', 'success');
      setOpenMemberMenu(null);
    }
  };

  const handleRemoveMember = (memberId, memberName) => {
    if (!window.confirm(`¿Estás seguro de expulsar a ${memberName} del grupo?`)) return;
    const ok = removeGroupMember(group.id, memberId);
    if (ok) showToast(`${memberName} ha sido removido del grupo`, 'info');
    setOpenMemberMenu(null);
  };

  const handleLeaveGroup = () => {
    if (!window.confirm(t('group.leaveConfirm'))) return;
    const ok = removeGroupMember(group.id, user.id);
    if (ok) {
      showToast('Has salido del grupo', 'info');
      selectGroup(null);
      navigate('/grupos');
    }
  };

  const handleDeleteGroup = () => {
    if (!window.confirm(t('group.deleteConfirm'))) return;
    const current = getGroups();
    const idx = current.findIndex(g => g.id === group.id);
    if (idx >= 0) {
      current.splice(idx, 1);
      saveGroups(current);
      showToast('Grupo eliminado', 'info');
      selectGroup(null);
      navigate('/grupos');
    }
  };

  const toggleMemberMenu = (memberId, e) => {
    e.stopPropagation();
    setOpenMemberMenu(prev => prev?.memberId === memberId ? null : { memberId, x: e.clientX, y: e.clientY });
  };

  const handleInviteSubmit = (e) => {
    e.preventDefault();
    if (!inviteUsername.trim() || !inviteProjectId) return;
    const targetUser = users.find(u => u.username.toLowerCase() === inviteUsername.toLowerCase() || u.email.toLowerCase() === inviteUsername.toLowerCase());
    if (!targetUser) {
      showToast('Usuario no encontrado', 'error');
      return;
    }
    const res = sendInvite(inviteProjectId, targetUser.id, inviteMessage);
    if (res === 'ok') {
      showToast(t('group.inviteSent'), 'success');
      setShowInviteModal(false);
      setInviteUsername('');
      setInviteProjectId('');
      setInviteMessage('');
    } else if (res === 'already') {
      showToast('Ese usuario ya está invitado o es miembro', 'info');
    } else if (res === 'slotsFull') {
      showToast('No hay cupos en ese proyecto', 'error');
    } else {
      showToast(t('group.inviteError'), 'error');
    }
  };

  const roleLabel = (role) => {
    switch (role) {
      case 'owner': return t('group.roleOwner');
      case 'admin': return t('group.roleAdmin');
      default: return t('group.roleMember');
    }
  };

  const roleBadgeClass = (role) => {
    switch (role) {
      case 'owner': return 'role-owner';
      case 'admin': return 'role-admin';
      default: return 'role-member';
    }
  };

  return (
    <div className="section-block groups-page group-workspace">
      <header className="repo-header">
        <button className="repo-back" onClick={() => { selectGroup(null); navigate('/dashboard'); }}>
          <Icon name="arrow-left" size={16} />
          {t('dash.backHome')}
        </button>

        <div className="repo-title-row">
          <GroupAvatar group={group} size="xl" />
          <div className="repo-title-info">
            <div className="repo-name-line">
              <h1 className="repo-name">{group.name}</h1>
              <span className="repo-visibility"><Icon name="lock" size={13} />{t('group.private')}</span>
              <span className={`group-role-badge ${roleBadgeClass(membership.role)}`}>{roleLabel(membership.role)}</span>
            </div>
            <p className="repo-desc">{group.description}</p>
          </div>
          <div className="repo-actions">
            {isAdmin && (
              <button className="btn btn-ghost btn-sm" onClick={() => setShowInviteModal(true)}>
                <Icon name="user-plus" size={15} />
                {t('group.inviteMember')}
              </button>
            )}
            {isAdmin && (
              <button className="btn btn-primary btn-sm" onClick={openCreate}>
                <Icon name="plus" size={15} />
                {t('group.newProject')}
              </button>
            )}
          </div>
        </div>

        <div className="repo-meta">
          <span className="repo-meta-item"><Icon name="users" size={15} />{groupMembers.length} {t('group.statMembers')}</span>
          <span className="repo-meta-item"><Icon name="box" size={15} />{groupProjects.length} {t('group.statProjects')}</span>
          <span className="repo-meta-item"><Icon name="star" size={15} />{openProjects.length} {t('group.statOpen')}</span>
          {requests.length > 0 && (
            <span className="repo-meta-item urgent"><Icon name="mail" size={15} />{requests.length} {t('group.statRequests')}</span>
          )}
        </div>
      </header>

      <nav className="repo-tabs" role="tablist" aria-label="Navegación del grupo">
        <button
          type="button"
          className={`repo-tab ${activeTab === 'overview' ? 'active' : ''}`}
          onClick={() => setTab('overview')}
          role="tab"
          aria-selected={activeTab === 'overview'}
        >
          <Icon name="home" size={16} />
          {t('group.overview')}
        </button>
        <button
          type="button"
          className={`repo-tab ${activeTab === 'projects' ? 'active' : ''}`}
          onClick={() => setTab('projects')}
          role="tab"
          aria-selected={activeTab === 'projects'}
        >
          <Icon name="box" size={16} />
          {t('group.projects')}
          <span className="repo-tab-count">{groupProjects.length}</span>
        </button>
        <button
          type="button"
          className={`repo-tab ${activeTab === 'people' ? 'active' : ''}`}
          onClick={() => setTab('people')}
          role="tab"
          aria-selected={activeTab === 'people'}
        >
          <Icon name="users" size={16} />
          {t('group.people')}
          <span className="repo-tab-count">{groupMembers.length}</span>
          {requests.length > 0 && <span className="tab-badge">{requests.length}</span>}
        </button>
        {(isOwner || isAdmin) && (
          <button
            type="button"
            className={`repo-tab ${activeTab === 'settings' ? 'active' : ''}`}
            onClick={() => setTab('settings')}
            role="tab"
            aria-selected={activeTab === 'settings'}
          >
            <Icon name="settings" size={16} />
            {t('group.settings')}
          </button>
        )}
      </nav>

      {activeTab === 'overview' && (
        <div className="group-tab-content">
          <div className="group-admin-hero">
            <div className="group-admin-hero-top">
              <div>
                <h3 style={{ margin: 0, fontSize: '1.25rem' }}>
                  {isAdmin ? 'Panel de Control' : 'Espacio de Trabajo del Grupo'}
                </h3>
                <p style={{ margin: '0.35rem 0 0', color: 'var(--color-text-dim)', fontSize: '0.9rem' }}>
                  {isAdmin
                    ? `Gestiona cómodamente los proyectos, colaboradores y solicitudes del grupo ${group.name}.`
                    : `Bienvenido al espacio de ${group.name}. Colabora en proyectos con tu equipo.`}
                </p>
              </div>
            </div>

            <div className="group-kpi-grid">
              <div className="group-kpi-card" onClick={() => setTab('projects')} style={{ cursor: 'pointer' }}>
                <span className="group-kpi-value">{groupProjects.length}</span>
                <span className="group-kpi-label">Proyectos del grupo</span>
                <small style={{ color: 'var(--color-success)', fontWeight: 600 }}>{openProjects.length} abiertos</small>
              </div>
              <div className="group-kpi-card" onClick={() => setTab('people')} style={{ cursor: 'pointer' }}>
                <span className="group-kpi-value">{groupMembers.length}</span>
                <span className="group-kpi-label">Miembros activos</span>
                <small style={{ color: 'var(--color-text-dim)' }}>Equipo del grupo</small>
              </div>
              <div className={`group-kpi-card ${requests.length > 0 ? 'urgent' : ''}`} onClick={() => setTab('people')} style={{ cursor: 'pointer' }}>
                <span className="group-kpi-value" style={{ color: requests.length > 0 ? '#ea580c' : undefined }}>
                  {requests.length}
                </span>
                <span className="group-kpi-label">Solicitudes de acceso</span>
                <small style={{ color: requests.length > 0 ? '#ea580c' : 'var(--color-text-dim)', fontWeight: requests.length > 0 ? 700 : 400 }}>
                  {requests.length > 0 ? 'Requiere revisión' : 'Al día'}
                </small>
              </div>
              <div className="group-kpi-card">
                <span className="group-kpi-value">
                  {groupMembers.filter(m => m.role === 'admin' || m.role === 'owner').length}
                </span>
                <span className="group-kpi-label">Administradores</span>
                <small style={{ color: 'var(--color-text-dim)' }}>Gestores del espacio</small>
              </div>
            </div>

            {isAdmin && (
              <div className="group-quick-actions">
                <button className="btn btn-primary btn-sm" onClick={openCreate}>
                  Crear proyecto nuevo
                </button>
                <button className="btn btn-ghost btn-sm" onClick={() => setTab('people')}>
                  Gestionar miembros
                </button>
                {requests.length > 0 && (
                  <button className="btn btn-outline btn-sm" onClick={() => setTab('people')}>
                    Revisar {requests.length} solicitudes pendientes
                  </button>
                )}
                <button className="btn btn-ghost btn-sm" onClick={() => setTab('settings')}>
                  Configuración del grupo
                </button>
              </div>
            )}

            {isAdmin && requests.length > 0 && (
              <div className="group-urgent-card">
                <div className="group-urgent-header">
                  <div>
                    <h4 style={{ margin: 0, color: '#c2410c' }}>Solicitudes de acceso pendientes ({requests.length})</h4>
                    <small style={{ color: 'var(--color-text-dim)' }}>Nuevos desarrolladores que quieren unirse a tu equipo:</small>
                  </div>
                  <button className="btn btn-ghost btn-sm" onClick={() => setTab('people')}>Ver todas</button>
                </div>
                {requests.slice(0, 3).map(request => {
                  const applicant = users.find(u => u.id === request.userId);
                  return (
                    <div className="group-member-card" key={request.id}>
                      <div className="group-member-info">
                        <Avatar user={applicant} />
                        <div>
                          <strong>{applicant?.name || 'Usuario'}</strong>
                          <small style={{ display: 'block', color: 'var(--color-text-dim)' }}>@{applicant?.username || ''}</small>
                        </div>
                      </div>
                      <div className="group-member-actions">
                        <button className="btn btn-primary btn-sm" onClick={() => handleRequestDecision(request.id, true)}>Aceptar</button>
                        <button className="btn btn-ghost btn-sm" onClick={() => handleRequestDecision(request.id, false)}>Rechazar</button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            <div className="group-panel">
              <div className="group-panel-heading">
                <div>
                  <h3>Proyectos del grupo</h3>
                  <p>{groupProjects.length} proyectos en este espacio.</p>
                </div>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <button className="btn btn-ghost btn-sm" onClick={() => setTab('projects')}>Ver todos ({groupProjects.length})</button>
                  {isAdmin && <button className="btn btn-primary btn-sm" onClick={openCreate}>Crear proyecto</button>}
                </div>
              </div>

              {groupProjects.length === 0 ? (
                <p className="form-hint" style={{ marginTop: '0.75rem' }}>
                  Aún no hay proyectos creados en este grupo. {isAdmin ? 'Crea el primero para que tu equipo empiece a colaborar.' : 'Los administradores pronto crearán proyectos aquí.'}
                </p>
              ) : (
                <div className="groups-grid" style={{ marginTop: '1rem' }}>
                  {groupProjects.slice(0, 3).map(p => <ProjectCard project={p} currentUser={user} key={p.id} />)}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {activeTab === 'projects' && (
        <div className="group-tab-content">
          <div className="group-panel">
            <div className="group-projects-toolbar">
              <div>
                <h3 style={{ margin: 0 }}>Proyectos del Grupo</h3>
                <p style={{ margin: '0.2rem 0 0', color: 'var(--color-text-dim)', fontSize: '0.88rem' }}>
                  {filteredProjects.length} proyecto{filteredProjects.length === 1 ? '' : 's'} disponible{filteredProjects.length === 1 ? '' : 's'}.
                </p>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
                <div className="group-filter-pills">
                  <button type="button" className={`group-filter-pill ${projectFilter === 'all' ? 'active' : ''}`} onClick={() => setProjectFilter('all')}>
                    Todos ({groupProjects.length})
                  </button>
                  <button type="button" className={`group-filter-pill ${projectFilter === 'open' ? 'active' : ''}`} onClick={() => setProjectFilter('open')}>
                    Abiertos ({openProjects.length})
                  </button>
                  <button type="button" className={`group-filter-pill ${projectFilter === 'completed' ? 'active' : ''}`} onClick={() => setProjectFilter('completed')}>
                    Completados ({completedProjects.length})
                  </button>
                </div>
                {isAdmin && <button className="btn btn-primary btn-sm" onClick={openCreate}>Crear proyecto</button>}
              </div>
            </div>

            <div style={{ marginBottom: '1rem' }}>
              <input type="text" className="group-search-input" placeholder="Buscar proyecto por título o tecnologías..." value={projectSearch} onChange={e => setProjectSearch(e.target.value)} />
            </div>

            {filteredProjects.length === 0 ? (
              <EmptyState icon="📁" title="No se encontraron proyectos" sub={groupProjects.length === 0 ? 'Este grupo aún no tiene proyectos publicados.' : 'Prueba cambiando los filtros de búsqueda.'} />
            ) : (
              <div className="groups-grid">
                {filteredProjects.map(p => <ProjectCard project={p} currentUser={user} key={p.id} />)}
              </div>
            )}
          </div>
        </div>
      )}

      {activeTab === 'people' && (
        <div className="group-tab-content">
          {isAdmin && (
            <div className="group-panel" style={{ marginBottom: '1.25rem' }}>
              <div className="group-panel-heading">
                <div>
                  <h3 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    Solicitudes de acceso
                    {requests.length > 0 && <span className="tab-badge">{requests.length}</span>}
                  </h3>
                  <p>Aspirantes que desean unirse a este espacio de trabajo privado.</p>
                </div>
              </div>

              {requests.length === 0 ? (
                <p className="form-hint" style={{ marginTop: '0.5rem' }}>No hay solicitudes pendientes. Tu equipo está al día.</p>
              ) : (
                <div style={{ marginTop: '1rem' }}>
                  {requests.map(request => {
                    const applicant = users.find(u => u.id === request.userId);
                    return (
                      <div className="group-member-card" key={request.id}>
                        <div className="group-member-info">
                          <Avatar user={applicant} />
                          <div>
                            <strong>{applicant?.name || 'Usuario'}</strong>
                            <span style={{ color: 'var(--color-text-dim)', marginLeft: '0.35rem', fontSize: '0.85rem' }}>@{applicant?.username || ''}</span>
                            <small style={{ display: 'block', color: 'var(--color-text-dim)', fontSize: '0.78rem' }}>
                              Solicitado el {request.requestedAt ? new Date(request.requestedAt).toLocaleDateString() : 'Reciente'}
                            </small>
                          </div>
                        </div>
                        <div className="group-member-actions">
                          <button className="btn btn-primary btn-sm" onClick={() => handleRequestDecision(request.id, true)}>Aceptar</button>
                          <button className="btn btn-ghost btn-sm" onClick={() => handleRequestDecision(request.id, false)}>Rechazar</button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          <div className="group-panel">
            <div className="group-panel-heading">
              <div>
                <h3>Miembros del Grupo ({groupMembers.length})</h3>
                <p>Colaboradores que forman parte de este equipo.</p>
              </div>
              <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', flexWrap: 'wrap' }}>
                <input type="text" className="group-search-input" placeholder="Filtrar miembros..." value={memberSearch} onChange={e => setMemberSearch(e.target.value)} style={{ maxWidth: '200px' }} />
                <select value={roleFilter} onChange={e => setRoleFilter(e.target.value)} className="group-filter-select" style={{ padding: '0.35rem 0.65rem', borderRadius: '7px', border: '1px solid var(--color-border)', background: 'var(--color-surface)', fontWeight: 600 }}>
                  <option value="all">{t('group.allRoles')}</option>
                  <option value="owner">{t('group.roleOwner')}</option>
                  <option value="admin">{t('group.roleAdmin')}</option>
                  <option value="member">{t('group.roleMember')}</option>
                </select>
              </div>
            </div>

            <div style={{ marginTop: '1rem', position: 'relative' }}>
              {filteredMembers.length === 0 ? (
                <EmptyState icon="👥" title={t('group.noMembers')} sub="Intenta cambiando los filtros." />
              ) : (
                filteredMembers.map(member => {
                  const person = users.find(u => u.id === member.userId);
                  const canManageRoles = isOwner && member.role !== 'owner';
                  const canKick = isAdmin && member.role !== 'owner' && member.userId !== user.id;
                  const isMenuOpen = openMemberMenu?.memberId === member.userId;

                  return (
                    <div className="group-member-card" key={member.userId} onClick={e => (canManageRoles || canKick) ? toggleMemberMenu(member.userId, e) : null} style={{ cursor: (canManageRoles || canKick) ? 'pointer' : 'default' }}>
                      <div className="group-member-info">
                        <Avatar user={person} />
                        <div>
                          <strong>{person?.name || 'Usuario'}</strong>
                          <span style={{ color: 'var(--color-text-dim)', marginLeft: '0.35rem', fontSize: '0.85rem' }}>@{person?.username || ''}</span>
                          <span style={{ display: 'block', fontSize: '0.78rem', color: 'var(--color-text-dim)' }}>
                            Miembro desde {member.joinedAt ? new Date(member.joinedAt).toLocaleDateString() : 'Reciente'}
                          </span>
                        </div>
                      </div>

                      <div className="group-member-actions">
                        <span className={`member-role ${roleBadgeClass(member.role)}`}>{roleLabel(member.role)}</span>
                      </div>

                      {isMenuOpen && (
                        <div className="member-context-menu" style={{ position: 'fixed', left: openMemberMenu.x, top: openMemberMenu.y, zIndex: 1000, background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: '8px', boxShadow: '0 4px 12px rgba(0,0,0,0.15)', minWidth: '180px', padding: '0.25rem 0' }}>
                          {canManageRoles && (
                            <button className="menu-item" onClick={() => { handleRoleChange(member.userId, member.role === 'admin' ? 'member' : 'admin'); setOpenMemberMenu(null); }} style={{ width: '100%', padding: '0.5rem 1rem', textAlign: 'left', background: 'none', border: 'none', color: 'var(--color-text-main)', fontSize: '0.88rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.5rem' }} onMouseOver={e => e.currentTarget.style.background = 'var(--color-bg-hover)'} onMouseOut={e => e.currentTarget.style.background = 'transparent'}>
                              <span>{member.role === 'admin' ? 'Quitar administrador' : 'Hacer administrador'}</span>
                            </button>
                          )}
                          {canKick && (
                            <button className="menu-item danger" onClick={() => handleRemoveMember(member.userId, person?.name || 'este miembro')} style={{ width: '100%', padding: '0.5rem 1rem', textAlign: 'left', background: 'none', border: 'none', color: 'var(--color-danger)', fontSize: '0.88rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.5rem' }} onMouseOver={e => e.currentTarget.style.background = 'var(--color-bg-hover)'} onMouseOut={e => e.currentTarget.style.background = 'transparent'}>
                              <span>Eliminar del grupo</span>
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      )}

      {activeTab === 'settings' && (
        <div className="group-tab-content">
          <div className="group-panel" style={{ marginBottom: '1.25rem' }}>
            <h3>{t('group.info')}</h3>
            <p style={{ color: 'var(--color-text-dim)', margin: '0 0 1rem' }}>Edita los datos visibles de tu espacio de trabajo.</p>
            <form onSubmit={handleSaveGroupInfo}>
              <div className="form-group">
                <label htmlFor="edit-group-name">Nombre del grupo</label>
                <input id="edit-group-name" required maxLength="70" value={editName} onChange={e => setEditName(e.target.value)} />
              </div>
              <div className="form-group">
                <label htmlFor="edit-group-description">Descripción</label>
                <textarea id="edit-group-description" required maxLength="260" rows="3" value={editDesc} onChange={e => setEditDesc(e.target.value)} />
              </div>
              <button className="btn btn-primary" type="submit" disabled={savingInfo}>{savingInfo ? 'Guardando...' : 'Guardar cambios'}</button>
            </form>
          </div>

          <div className="group-panel" style={{ marginBottom: '1.25rem' }}>
            <h3>{t('group.requests')}</h3>
            {requests.length === 0 ? (
              <p className="form-hint">No hay solicitudes pendientes.</p>
            ) : (
              <div style={{ marginTop: '1rem' }}>
                {requests.map(request => {
                  const applicant = users.find(u => u.id === request.userId);
                  return (
                    <div className="group-member-card" key={request.id}>
                      <div className="group-member-info">
                        <Avatar user={applicant} />
                        <div>
                          <strong>{applicant?.name || 'Usuario'}</strong>
                          <span style={{ color: 'var(--color-text-dim)', marginLeft: '0.35rem', fontSize: '0.85rem' }}>@{applicant?.username || ''}</span>
                        </div>
                      </div>
                      <div className="group-member-actions">
                        <button className="btn btn-primary btn-sm" onClick={() => handleRequestDecision(request.id, true)}>Aceptar</button>
                        <button className="btn btn-ghost btn-sm" onClick={() => handleRequestDecision(request.id, false)}>Rechazar</button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <div className="group-panel" style={{ marginBottom: '1.25rem' }}>
            <h3>{t('group.invite')}</h3>
            <p style={{ color: 'var(--color-text-dim)', margin: '0 0 1rem' }}>Invita a alguien a un proyecto del grupo por nombre de usuario o email.</p>
            <button className="btn btn-primary btn-sm" onClick={() => setShowInviteModal(true)}>Invitar miembro</button>
          </div>

          <div className="group-panel" style={{ marginBottom: '1.25rem' }}>
            <h3>{t('group.members')}</h3>
            <p style={{ color: 'var(--color-text-dim)', margin: '0 0 1rem' }}>Gestiona roles y miembros del grupo.</p>
            <div style={{ marginTop: '1rem' }}>
              {groupMembers.map(member => {
                const person = users.find(u => u.id === member.userId);
                const canManageRoles = isOwner && member.role !== 'owner';
                const canKick = isAdmin && member.role !== 'owner' && member.userId !== user.id;

                return (
                  <div className="group-member-card" key={member.userId} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.75rem', borderBottom: '1px solid var(--color-border)' }}>
                    <div className="group-member-info">
                      <Avatar user={person} />
                      <div>
                        <strong>{person?.name || 'Usuario'}</strong>
                        <span style={{ color: 'var(--color-text-dim)', marginLeft: '0.35rem', fontSize: '0.85rem' }}>@{person?.username || ''}</span>
                      </div>
                    </div>
                    <div className="group-member-actions" style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                      {canManageRoles && (
                        <select value={member.role} onChange={e => handleRoleChange(member.userId, e.target.value)} style={{ padding: '0.35rem 0.65rem', borderRadius: '7px', border: '1px solid var(--color-border)', background: 'var(--color-surface)', fontWeight: 600 }}>
                          <option value="member">{t('group.roleMember')}</option>
                          <option value="admin">{t('group.roleAdmin')}</option>
                        </select>
                      )}
                      {(canManageRoles || canKick) ? (
                        <span className={`member-role ${roleBadgeClass(member.role)}`}>{roleLabel(member.role)}</span>
                      ) : (
                        <span className={`member-role ${roleBadgeClass(member.role)}`}>{roleLabel(member.role)}</span>
                      )}
                      {canKick && (
                        <button type="button" className="btn btn-ghost btn-sm" style={{ color: 'var(--color-danger)' }} onClick={() => handleRemoveMember(member.userId, person?.name || 'este miembro')}>Eliminar</button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {isOwner && (
            <div className="group-panel danger-zone">
              <h3 style={{ color: 'var(--color-danger)' }}>{t('group.danger')}</h3>
              <div style={{ display: 'flex', gap: '1rem', alignItems: 'center', flexWrap: 'wrap' }}>
                <div>
                  <p style={{ margin: '0 0 0.5rem', color: 'var(--color-text-dim)' }}>Salir del grupo (como creador, esto eliminará el grupo)</p>
                  <button className="btn btn-danger btn-sm" onClick={handleLeaveGroup}>{t('group.leave')}</button>
                </div>
                <div>
                  <p style={{ margin: '0 0 0.5rem', color: 'var(--color-text-dim)' }}>Eliminar grupo permanentemente</p>
                  <button className="btn btn-danger btn-sm" onClick={handleDeleteGroup}>{t('group.delete')}</button>
                </div>
              </div>
            </div>
          )}

          {!isOwner && (
            <div className="group-panel">
              <h3>{t('group.danger')}</h3>
              <p style={{ color: 'var(--color-text-dim)', margin: '0 0 1rem' }}>Si sales del grupo, ya no tendrás acceso a sus proyectos ni miembros.</p>
              <button className="btn btn-danger btn-sm" onClick={handleLeaveGroup}>{t('group.leave')}</button>
            </div>
          )}

          <div className="group-panel">
            <h3>Navegación</h3>
            <p style={{ color: 'var(--color-text-dim)', margin: '0 0 1rem' }}>Puedes salir de este espacio de trabajo para explorar otros grupos o crear un nuevo equipo.</p>
            <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
              <button className="btn btn-outline" onClick={() => { selectGroup(null); navigate('/grupos'); }}>Ver todos los grupos</button>
              <button className="btn btn-ghost" onClick={() => { selectGroup(null); navigate('/dashboard'); }}>Ir al Inicio general</button>
            </div>
          </div>
        </div>
      )}

      {showInviteModal && (
        <div className="modal-overlay" onClick={() => setShowInviteModal(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <h3>Invitar a miembro</h3>
            <form onSubmit={handleInviteSubmit}>
              <div className="form-group">
                <label>Usuario o email</label>
                <input type="text" value={inviteUsername} onChange={e => setInviteUsername(e.target.value)} placeholder="@usuario o email" required />
              </div>
              <div className="form-group">
                <label>Proyecto (opcional)</label>
                <select value={inviteProjectId} onChange={e => setInviteProjectId(e.target.value)}>
                  <option value="">Sin proyecto específico</option>
                  {groupProjects.filter(p => p.status === 'open').map(p => (
                    <option key={p.id} value={p.id}>{l10nValue(lang, p.title)}</option>
                  ))}
                </select>
              </div>
              <div className="form-group">
                <label>Mensaje (opcional)</label>
                <textarea value={inviteMessage} onChange={e => setInviteMessage(e.target.value)} rows="3" placeholder="Por qué te gustaría que se uniera..." />
              </div>
              <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end', marginTop: '1rem' }}>
                <button type="button" className="btn btn-ghost" onClick={() => setShowInviteModal(false)}>Cancelar</button>
                <button type="submit" className="btn btn-primary">Enviar invitación</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}