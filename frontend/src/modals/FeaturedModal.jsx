import { useMemo, useState } from 'react';
import { useApp } from '../context/AppContext.jsx';
import { useToast } from '../context/ToastContext.jsx';
import { useModals } from '../context/ModalManager.jsx';
import { Modal, EmptyState } from '../components/common.jsx';
import { userProjectsList, escapeHTML } from '../lib/helpers.js';
import { l10nValue } from '../lib/i18n.js';

export default function FeaturedModal() {
  const { user, users, projects, applications, t, l10n, saveFeaturedProjects } = useApp();
  const { showToast } = useToast();
  const { closeFeatured } = useModals();

  const myProjects = useMemo(() => userProjectsList(user, projects, applications).map(it => it.p), [user, projects, applications]);

  const [search, setSearch] = useState('');
  const [selection, setSelection] = useState(() =>
    (Array.isArray(user.featuredProjectIds) ? user.featuredProjectIds : []).filter(id => myProjects.some(p => p.id === id))
  );

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return q ? myProjects.filter(p => l10nValue(p.title).toLowerCase().includes(q)) : myProjects;
  }, [myProjects, search]);

  const toggle = (id) => {
    if (selection.includes(id)) {
      setSelection(selection.filter(x => x !== id));
    } else {
      if (selection.length >= 5) {
        showToast(t('featured.maxReached'), 'error');
        return;
      }
      setSelection([...selection, id]);
    }
  };

  const save = () => {
    saveFeaturedProjects(selection);
    closeFeatured();
    showToast(t('featured.saved'), 'success');
  };

  return (
    <Modal open onClose={closeFeatured} title={t('featured.title')} subtitle={t('featured.subtitle')}>
      <div className="form-group">
        <input type="text" placeholder={t('featured.searchPh')} value={search} onChange={e => setSearch(e.target.value)} />
      </div>
      <div className="featured-counter">{t('featured.counterSelected', { n: selection.length })}</div>
      <div className="featured-list">
        {filtered.length === 0 ? (
          <EmptyState title={t('empty.none')} icon={null} />
        ) : (
          filtered.map(p => {
            const selected = selection.includes(p.id);
            const owner = users.find(u => u.id === p.ownerId);
            return (
              <button
                type="button"
                key={p.id}
                className={'featured-proj-card' + (selected ? ' selected' : '')}
                onClick={() => toggle(p.id)}
              >
                <span className="featured-proj-tick">{selected ? '★' : '☆'}</span>
                <span className="featured-proj-title">{escapeHTML(l10n(p.title))}</span>
                <span className="featured-proj-desc">{escapeHTML(l10n(p.description))}</span>
                <span className="featured-proj-creator">{t('featured.creator', { name: owner ? escapeHTML(owner.name) : t('card.unknown') })}</span>
              </button>
            );
          })
        )}
      </div>
      <div className="featured-actions">
        <button className="btn btn-ghost" onClick={closeFeatured}>{t('invite.cancel')}</button>
        <button className="btn btn-primary" onClick={save}>{t('invite.save')}</button>
      </div>
    </Modal>
  );
}