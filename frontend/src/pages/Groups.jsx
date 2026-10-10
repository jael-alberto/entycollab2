import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { useApp } from '../context/AppContext.jsx';
import { useToast } from '../context/ToastContext.jsx';
import { EmptyState, Avatar } from '../components/common.jsx';
import ProjectCard from '../components/ProjectCard.jsx';
import { useModals } from '../context/ModalManager.jsx';
import { l10nValue } from '../lib/i18n.js';

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
    navigate(`/grupos/${group.id}?tab=inicio`);
  };

  const open = (group) => {
    if (memberFor(group, user.id)) {
      selectGroup(group.id);
      navigate(`/grupos/${group.id}?tab=inicio`);
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
          <p className="groups-intro">Espacios privados para que empresas y equipos organicen sus proyectos y miembros.</p>
        </div>
        <button className="btn btn-primary" onClick={() => setCreating(v => !v)}>
          {creating ? 'Cancelar' : '➕ Crear grupo'}
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
    lang
  } = useApp();
  const { openCreate } = useModals();
  const { showToast } = useToast();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  const group = groups.find(g => g.id === groupId);
  const membership = group && memberFor(group, user.id);
  const isOwner = group?.ownerId === user?.id;
  const isAdmin = membership?.role === 'owner' || membership?.role === 'admin';

  // Tabs: 'inicio' | 'proyectos' | 'personas' | 'grupos'
  const activeTab = searchParams.get('tab') || 'inicio';
  const setTab = (tab) => setSearchParams({ tab });

  // Estados locales para filtros y formularios
  const [projectFilter, setProjectFilter] = useState('all');
  const [projectSearch, setProjectSearch] = useState('');
  const [memberSearch, setMemberSearch] = useState('');
  const [editName, setEditName] = useState(group?.name || '');
  const [editDesc, setEditDesc] = useState(group?.description || '');
  const [savingInfo, setSavingInfo] = useState(false);
  const [prevGroupId, setPrevGroupId] = useState(groupId);

  if (prevGroupId !== groupId) {
    setPrevGroupId(groupId);
    setEditName(group?.name || '');
    setEditDesc(group?.description || '');
  }

  useEffect(() => {
    if (group && (!activeGroup || activeGroup.id !== groupId) && memberFor(group, user.id)) {
      selectGroup(groupId);
    }
  }, [group, activeGroup, groupId, user.id, selectGroup]);

  const groupProjects = useMemo(() => {
    return projects.filter(p => p.groupId === groupId);
  }, [projects, groupId]);

  const filteredProjects = useMemo(() => {
    let list = groupProjects;
    if (projectFilter === 'open') {
      list = list.filter(p => p.status === 'open');
    } else if (projectFilter === 'completed') {
      list = list.filter(p => p.status === 'completed');
    }
    if (projectSearch.trim()) {
      const q = projectSearch.toLowerCase();
      list = list.filter(p =>
        l10nValue(lang, p.title).toLowerCase().includes(q) ||
        l10nValue(lang, p.description).toLowerCase().includes(q)
      );
    }
    return list;
  }, [groupProjects, projectFilter, projectSearch, lang]);

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

  const requests = (group.requests || []).filter(r => r.status === 'pending');
  const openProjects = groupProjects.filter(p => p.status === 'open');
  const completedProjects = groupProjects.filter(p => p.status === 'completed');

  const handleSaveGroupInfo = (e) => {
    e.preventDefault();
    if (!editName.trim()) return;
    setSavingInfo(true);
    const ok = updateGroup(group.id, { name: editName, description: editDesc });
    setSavingInfo(false);
    if (ok) {
      showToast('Información del grupo actualizada', 'success');
    } else {
      showToast('No tienes permisos para editar este grupo', 'error');
    }
  };

  const handleRequestDecision = (requestId, accepted) => {
    const ok = decideGroupRequest(group.id, requestId, accepted);
    if (ok) {
      showToast(accepted ? 'Solicitud aceptada. Nuevo miembro agregado.' : 'Solicitud rechazada.', accepted ? 'success' : 'info');
    }
  };

  const handleRoleChange = (memberId, newRole) => {
    const ok = setGroupMemberRole(group.id, memberId, newRole);
    if (ok) {
      showToast('Rol de miembro actualizado', 'success');
    }
  };

  const handleRemoveMember = (memberId, memberName) => {
    if (!window.confirm(`¿Estás seguro de expulsar a ${memberName} del grupo?`)) return;
    const ok = removeGroupMember(group.id, memberId);
    if (ok) {
      showToast(`${memberName} ha sido removido del grupo`, 'info');
    }
  };

  const filteredMembers = (group.members || []).filter(member => {
    if (!memberSearch.trim()) return true;
    const person = users.find(u => u.id === member.userId);
    const q = memberSearch.toLowerCase();
    return (
      person?.name?.toLowerCase().includes(q) ||
      person?.username?.toLowerCase().includes(q)
    );
  });

  return (
    <div className="section-block groups-page">
      {/* Cabecera del espacio de trabajo */}
      <div className="group-workspace-head">
        <div>
          <button
            className="back-link"
            onClick={() => {
              selectGroup(null);
              navigate('/grupos');
            }}
          >
            ← Todos los grupos
          </button>
          <h2 className="section-title">{group.name}</h2>
          <p className="groups-intro">{group.description}</p>
        </div>
        <span className="group-role-badge">
          {membership.role === 'owner' ? '👑 Creador' : membership.role === 'admin' ? '🛡️ Administrador' : '👤 Miembro'}
        </span>
      </div>

      {/* Píldoras de navegación dentro del grupo (según imagen 2) */}
      <div className="group-nav-pills-bar" role="tablist" aria-label="Navegación del grupo">
        <button
          type="button"
          className={`group-pill-btn ${activeTab === 'inicio' ? 'active' : ''}`}
          onClick={() => setTab('inicio')}
          role="tab"
          aria-selected={activeTab === 'inicio'}
        >
          Inicio
        </button>
        <button
          type="button"
          className={`group-pill-btn ${activeTab === 'proyectos' ? 'active' : ''}`}
          onClick={() => setTab('proyectos')}
          role="tab"
          aria-selected={activeTab === 'proyectos'}
        >
          Proyectos ({groupProjects.length})
        </button>
        <button
          type="button"
          className={`group-pill-btn ${activeTab === 'personas' ? 'active' : ''}`}
          onClick={() => setTab('personas')}
          role="tab"
          aria-selected={activeTab === 'personas'}
        >
          Personas ({group.members?.length || 0})
          {requests.length > 0 && <span className="pill-badge">{requests.length}</span>}
        </button>
        <button
          type="button"
          className={`group-pill-btn ${activeTab === 'grupos' ? 'active' : ''}`}
          onClick={() => setTab('grupos')}
          role="tab"
          aria-selected={activeTab === 'grupos'}
        >
          Grupos
        </button>
      </div>

      {/* ====================================================================
          SECCIÓN 1: INICIO (Dashboard del Administrador)
          ==================================================================== */}
      {activeTab === 'inicio' && (
        <div className="group-section-content">
          <div className="group-admin-hero">
            <div className="group-admin-hero-top">
              <div>
                <h3 style={{ margin: 0, fontSize: '1.25rem' }}>
                  {isAdmin ? '🛡️ Panel de Control del Administrador' : '👋 Espacio de Trabajo del Grupo'}
                </h3>
                <p style={{ margin: '0.35rem 0 0', color: 'var(--color-text-dim)', fontSize: '0.9rem' }}>
                  {isAdmin
                    ? `Gestiona cómodamente los proyectos, colaboradores y solicitudes del grupo ${group.name}.`
                    : `Bienvenido al espacio de ${group.name}. Colabora en proyectos con tu equipo.`}
                </p>
              </div>
            </div>

            {/* Métricas KPI para el administrador */}
            <div className="group-kpi-grid">
              <div className="group-kpi-card" onClick={() => setTab('proyectos')} style={{ cursor: 'pointer' }}>
                <span className="group-kpi-value">{groupProjects.length}</span>
                <span className="group-kpi-label">Proyectos del grupo</span>
                <small style={{ color: 'var(--color-success)', fontWeight: 600 }}>{openProjects.length} abiertos</small>
              </div>
              <div className="group-kpi-card" onClick={() => setTab('personas')} style={{ cursor: 'pointer' }}>
                <span className="group-kpi-value">{group.members?.length || 0}</span>
                <span className="group-kpi-label">Miembros activos</span>
                <small style={{ color: 'var(--color-text-dim)' }}>Equipo del grupo</small>
              </div>
              <div
                className={`group-kpi-card ${requests.length > 0 ? 'urgent' : ''}`}
                onClick={() => setTab('personas')}
                style={{ cursor: 'pointer' }}
              >
                <span className="group-kpi-value" style={{ color: requests.length > 0 ? '#ea580c' : undefined }}>
                  {requests.length}
                </span>
                <span className="group-kpi-label">Solicitudes de acceso</span>
                <small style={{ color: requests.length > 0 ? '#ea580c' : 'var(--color-text-dim)', fontWeight: requests.length > 0 ? 700 : 400 }}>
                  {requests.length > 0 ? '⚠️ Requiere revisión' : 'Al día'}
                </small>
              </div>
              <div className="group-kpi-card">
                <span className="group-kpi-value">
                  {group.members?.filter(m => m.role === 'admin' || m.role === 'owner').length || 1}
                </span>
                <span className="group-kpi-label">Administradores</span>
                <small style={{ color: 'var(--color-text-dim)' }}>Gestores del espacio</small>
              </div>
            </div>

            {/* Accesos rápidos para el admin */}
            {isAdmin && (
              <div className="group-quick-actions">
                <button className="btn btn-primary btn-sm" onClick={openCreate}>
                  ➕ Crear proyecto nuevo
                </button>
                <button className="btn btn-ghost btn-sm" onClick={() => setTab('personas')}>
                  👥 Gestionar miembros
                </button>
                {requests.length > 0 && (
                  <button className="btn btn-outline btn-sm" onClick={() => setTab('personas')}>
                    📩 Revisar {requests.length} solicitudes pendientes
                  </button>
                )}
                <button className="btn btn-ghost btn-sm" onClick={() => setTab('grupos')}>
                  ⚙️ Ajustes del grupo
                </button>
              </div>
            )}
          </div>

          {/* Solicitudes pendientes prioritarias */}
          {isAdmin && requests.length > 0 && (
            <div className="group-urgent-card">
              <div className="group-urgent-header">
                <div>
                  <h4 style={{ margin: 0, color: '#c2410c' }}>📩 Solicitudes de acceso pendientes ({requests.length})</h4>
                  <small style={{ color: 'var(--color-text-dim)' }}>Nuevos desarrolladores que quieren unirse a tu equipo:</small>
                </div>
                <button className="btn btn-ghost btn-sm" onClick={() => setTab('personas')}>
                  Ver todas
                </button>
              </div>
              {requests.slice(0, 3).map(request => {
                const applicant = users.find(u => u.id === request.userId);
                return (
                  <div className="group-member-card" key={request.id}>
                    <div className="group-member-info">
                      <Avatar user={applicant} />
                      <div>
                        <strong>{applicant?.name || 'Usuario'}</strong>
                        <small style={{ display: 'block', color: 'var(--color-text-dim)' }}>
                          @{applicant?.username || ''}
                        </small>
                      </div>
                    </div>
                    <div className="group-member-actions">
                      <button
                        className="btn btn-primary btn-sm"
                        onClick={() => handleRequestDecision(request.id, true)}
                      >
                        ✓ Aceptar
                      </button>
                      <button
                        className="btn btn-ghost btn-sm"
                        onClick={() => handleRequestDecision(request.id, false)}
                      >
                        ✕ Rechazar
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Resumen de proyectos del grupo */}
          <div className="group-panel">
            <div className="group-panel-heading">
              <div>
                <h3>Proyectos del grupo</h3>
                <p>{groupProjects.length} proyectos en este espacio.</p>
              </div>
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <button className="btn btn-ghost btn-sm" onClick={() => setTab('proyectos')}>
                  Ver todos ({groupProjects.length})
                </button>
                {isAdmin && (
                  <button className="btn btn-primary btn-sm" onClick={openCreate}>
                    Crear proyecto
                  </button>
                )}
              </div>
            </div>

            {groupProjects.length === 0 ? (
              <p className="form-hint" style={{ marginTop: '0.75rem' }}>
                Aún no hay proyectos creados en este grupo. {isAdmin ? 'Crea el primero para que tu equipo empiece a colaborar.' : 'Los administradores pronto crearán proyectos aquí.'}
              </p>
            ) : (
              <div className="groups-grid" style={{ marginTop: '1rem' }}>
                {groupProjects.slice(0, 3).map(p => (
                  <ProjectCard project={p} currentUser={user} key={p.id} />
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ====================================================================
          SECCIÓN 2: PROYECTOS DEL GRUPO
          ==================================================================== */}
      {activeTab === 'proyectos' && (
        <div className="group-section-content">
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
                  <button
                    type="button"
                    className={`group-filter-pill ${projectFilter === 'all' ? 'active' : ''}`}
                    onClick={() => setProjectFilter('all')}
                  >
                    Todos ({groupProjects.length})
                  </button>
                  <button
                    type="button"
                    className={`group-filter-pill ${projectFilter === 'open' ? 'active' : ''}`}
                    onClick={() => setProjectFilter('open')}
                  >
                    Abiertos ({openProjects.length})
                  </button>
                  <button
                    type="button"
                    className={`group-filter-pill ${projectFilter === 'completed' ? 'active' : ''}`}
                    onClick={() => setProjectFilter('completed')}
                  >
                    Completados ({completedProjects.length})
                  </button>
                </div>

                {isAdmin && (
                  <button className="btn btn-primary btn-sm" onClick={openCreate}>
                    ➕ Crear proyecto
                  </button>
                )}
              </div>
            </div>

            <div style={{ marginBottom: '1rem' }}>
              <input
                type="text"
                className="group-search-input"
                placeholder="🔍 Buscar proyecto por título o tecnologías..."
                value={projectSearch}
                onChange={e => setProjectSearch(e.target.value)}
              />
            </div>

            {filteredProjects.length === 0 ? (
              <EmptyState
                icon="📁"
                title="No se encontraron proyectos"
                sub={groupProjects.length === 0 ? 'Este grupo aún no tiene proyectos publicados.' : 'Prueba cambiando los filtros de búsqueda.'}
              />
            ) : (
              <div className="groups-grid">
                {filteredProjects.map(p => (
                  <ProjectCard project={p} currentUser={user} key={p.id} />
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ====================================================================
          SECCIÓN 3: PERSONAS (Miembros & Solicitudes)
          ==================================================================== */}
      {activeTab === 'personas' && (
        <div className="group-section-content">
          {/* Solicitudes de acceso (para administradores) */}
          {isAdmin && (
            <div className="group-panel" style={{ marginBottom: '1.25rem' }}>
              <div className="group-panel-heading">
                <div>
                  <h3 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    Solicitudes de acceso
                    {requests.length > 0 && <span className="pill-badge">{requests.length}</span>}
                  </h3>
                  <p>Aspirantes que desean unirse a este espacio de trabajo privado.</p>
                </div>
              </div>

              {requests.length === 0 ? (
                <p className="form-hint" style={{ marginTop: '0.5rem' }}>
                  ✓ No hay solicitudes pendientes. Tu equipo está al día.
                </p>
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
                            <span style={{ color: 'var(--color-text-dim)', marginLeft: '0.35rem', fontSize: '0.85rem' }}>
                              @{applicant?.username || ''}
                            </span>
                            <small style={{ display: 'block', color: 'var(--color-text-dim)', fontSize: '0.78rem' }}>
                              Solicitado el {request.requestedAt ? new Date(request.requestedAt).toLocaleDateString() : 'Reciente'}
                            </small>
                          </div>
                        </div>
                        <div className="group-member-actions">
                          <button
                            className="btn btn-primary btn-sm"
                            onClick={() => handleRequestDecision(request.id, true)}
                          >
                            ✓ Aceptar
                          </button>
                          <button
                            className="btn btn-ghost btn-sm"
                            onClick={() => handleRequestDecision(request.id, false)}
                          >
                            ✕ Rechazar
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* Listado de Miembros del Grupo */}
          <div className="group-panel">
            <div className="group-panel-heading">
              <div>
                <h3>Miembros del Grupo ({group.members?.length || 0})</h3>
                <p>Colaboradores que forman parte de este equipo.</p>
              </div>
              <input
                type="text"
                className="group-search-input"
                placeholder="🔍 Filtrar miembros..."
                value={memberSearch}
                onChange={e => setMemberSearch(e.target.value)}
              />
            </div>

            <div style={{ marginTop: '1rem' }}>
              {filteredMembers.map(member => {
                const person = users.find(u => u.id === member.userId);
                const canManageRoles = isOwner && member.role !== 'owner';
                const canKick = isAdmin && member.role !== 'owner' && member.userId !== user.id;

                return (
                  <div className="group-member-card" key={member.userId}>
                    <div className="group-member-info">
                      <Avatar user={person} />
                      <div>
                        <strong>{person?.name || 'Usuario'}</strong>
                        <span style={{ color: 'var(--color-text-dim)', marginLeft: '0.35rem', fontSize: '0.85rem' }}>
                          @{person?.username || ''}
                        </span>
                        <span style={{ display: 'block', fontSize: '0.78rem', color: 'var(--color-text-dim)' }}>
                          Miembro desde {member.joinedAt ? new Date(member.joinedAt).toLocaleDateString() : 'Reciente'}
                        </span>
                      </div>
                    </div>

                    <div className="group-member-actions">
                      {canManageRoles ? (
                        <select
                          value={member.role}
                          onChange={e => handleRoleChange(member.userId, e.target.value)}
                          aria-label={`Cambiar rol de ${person?.name || 'usuario'}`}
                          style={{
                            padding: '0.35rem 0.65rem',
                            borderRadius: '7px',
                            border: '1px solid var(--color-border)',
                            background: 'var(--color-surface)',
                            fontWeight: 600,
                            color: 'var(--color-text-main)'
                          }}
                        >
                          <option value="member">Miembro</option>
                          <option value="admin">Administrador</option>
                        </select>
                      ) : (
                        <span className="member-role">
                          {member.role === 'owner' ? '👑 Creador' : member.role === 'admin' ? '🛡️ Administrador' : '👤 Miembro'}
                        </span>
                      )}

                      {canKick && (
                        <button
                          type="button"
                          className="btn btn-ghost btn-sm"
                          style={{ color: 'var(--color-danger)' }}
                          onClick={() => handleRemoveMember(member.userId, person?.name || 'este miembro')}
                          title="Expulsar del grupo"
                        >
                          ✕ Quitar
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* ====================================================================
          SECCIÓN 4: GRUPOS (Ajustes y Navegación)
          ==================================================================== */}
      {activeTab === 'grupos' && (
        <div className="group-section-content">
          {/* Ajustes de configuración para Administradores */}
          {isAdmin ? (
            <div className="group-panel" style={{ marginBottom: '1.25rem' }}>
              <h3>⚙️ Configuración del Grupo</h3>
              <p style={{ color: 'var(--color-text-dim)', margin: '0 0 1rem' }}>
                Edita los datos visibles de tu espacio de trabajo.
              </p>
              <form onSubmit={handleSaveGroupInfo}>
                <div className="form-group">
                  <label htmlFor="edit-group-name">Nombre del grupo</label>
                  <input
                    id="edit-group-name"
                    required
                    maxLength="70"
                    value={editName}
                    onChange={e => setEditName(e.target.value)}
                  />
                </div>
                <div className="form-group">
                  <label htmlFor="edit-group-description">Descripción</label>
                  <textarea
                    id="edit-group-description"
                    required
                    maxLength="260"
                    rows="3"
                    value={editDesc}
                    onChange={e => setEditDesc(e.target.value)}
                  />
                </div>
                <button className="btn btn-primary" type="submit" disabled={savingInfo}>
                  {savingInfo ? 'Guardando...' : '💾 Guardar cambios'}
                </button>
              </form>
            </div>
          ) : (
            <div className="group-panel" style={{ marginBottom: '1.25rem' }}>
              <h3>ℹ️ Información del Grupo</h3>
              <p><strong>Nombre:</strong> {group.name}</p>
              <p><strong>Descripción:</strong> {group.description}</p>
            </div>
          )}

          {/* Navegación y directorio de grupos */}
          <div className="group-panel">
            <h3>👥 Directorio General de Grupos</h3>
            <p style={{ color: 'var(--color-text-dim)', margin: '0 0 1rem' }}>
              Puedes salir de este espacio de trabajo para explorar otros grupos o crear un nuevo equipo.
            </p>
            <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
              <button
                className="btn btn-outline"
                onClick={() => {
                  selectGroup(null);
                  navigate('/grupos');
                }}
              >
                ← Ver todos los grupos
              </button>
              <button
                className="btn btn-ghost"
                onClick={() => {
                  selectGroup(null);
                  navigate('/dashboard');
                }}
              >
                🏠 Ir al Inicio general
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
