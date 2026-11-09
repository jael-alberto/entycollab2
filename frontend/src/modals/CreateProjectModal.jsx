import { useRef, useState } from 'react';
import { useApp } from '../context/AppContext.jsx';
import { useToast } from '../context/ToastContext.jsx';
import { useModals } from '../context/ModalManager.jsx';
import { Field, Icon, Modal, Spinner } from '../components/common.jsx';
import { escapeHTML, fileToDataURL, getCategoryLabel, starLabel, techsForCategory } from '../lib/helpers.js';
import { DESC_MIN, deadlineKey, descKey, slotsKey, techKey, titleKey } from '../lib/validation.js';

export default function CreateProjectModal() {
  const { user, lang, t, createProject, activeGroup, isActiveGroupAdmin } = useApp();
  const { showToast } = useToast();
  const { closeCreate } = useModals();
  const fileRef = useRef(null);

  const [title, setTitle] = useState('');
  const [category, setCategory] = useState('');
  const [customCategory, setCustomCategory] = useState('');
  const [slots, setSlots] = useState(1);
  const [minRating, setMinRating] = useState(0);
  const [tech, setTech] = useState('');
  const [description, setDescription] = useState('');
  const [deadline, setDeadline] = useState('');
  const [repo, setRepo] = useState('');
  const [image, setImage] = useState(null);
  const [rolesText, setRolesText] = useState('');
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [showExtra, setShowExtra] = useState(false);

  if (!user || (activeGroup && !isActiveGroupAdmin)) return null;

  const tErr = (key, replacements) => (key ? t(key, replacements) : '');

  const validate = () => {
    const next = {
      title: tErr(titleKey(title), { n: title.trim().length }),
      category: category ? '' : t('form.required'),
      customCategory: category === 'other' && !customCategory.trim() ? t('form.required') : '',
      slots: tErr(slotsKey(slots)),
      techs: tErr(techKey(tech ? [tech] : [])),
      description: tErr(descKey(description), { n: description.trim().length }),
      deadline: tErr(deadlineKey(deadline)),
      repo: repo.trim() && !isValidUrl(repo.trim()) ? t('toast.invalidLink') : '',
    };
    Object.keys(next).forEach(k => { if (!next[k]) delete next[k]; });
    return next;
  };

  const handleImage = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      showToast(t('toast.imageFile'), 'error');
      e.target.value = '';
      return;
    }
    const dataUrl = await fileToDataURL(file);
    setImage(dataUrl);
  };

  const submit = async (e) => {
    e.preventDefault();
    const found = validate();
    setErrors(found);
    const count = Object.keys(found).length;
    if (count > 0) {
      showToast(t('form.fixErrors', { n: count }), 'error');
      return;
    }
    setLoading(true);
    let finalCategory = category;
    if (category === 'other') finalCategory = customCategory.trim();
    try {
      await createProject({
        title: title.trim(),
        category: finalCategory,
        slots: parseInt(slots, 10) || 1,
        tech: tech ? [tech] : [],
        minRating,
        description: description.trim(),
        deadline: deadline || null,
        repo: repo.trim() || null,
        image,
        roles: rolesText.split(',').map(role => role.trim()).filter(Boolean)
      });
      closeCreate();
      showToast(t('toast.published'), 'success');
    } catch (error) {
      showToast(error.message || t('toast.published'), 'error');
      setLoading(false);
    }
  };

  const availableTechs = techsForCategory(category);
  const todayISO = new Date().toISOString().slice(0, 10);
  const ratingOptions = [0, 1, 2, 3, 4, 5];

  const footer = (
    <>
      <button type="button" className="btn btn-ghost" onClick={closeCreate}>
        {t('createProject.cancel')}
      </button>
      <button type="submit" form="create-project-form" className="btn btn-primary" disabled={loading} aria-busy={loading}>
        {loading && <Spinner />}
        {loading ? t('createProject.publishing') : t('createProject.publish')}
        {!loading && <Icon name="plus" size={15} />}
      </button>
    </>
  );

  return (
    <Modal
      open
      title={t('createProject.title')}
      subtitle={t('createProject.subtitle')}
      onClose={closeCreate}
      footer={footer}
    >
      <form id="create-project-form" onSubmit={submit} noValidate>
        {activeGroup && (
          <div className="group-project-notice">
            Este proyecto se publica solo dentro de <strong>{activeGroup.name}</strong>.
          </div>
        )}

        <Field label={t('createProject.name')} htmlFor="proj-title" error={errors.title} required>
          <input
            type="text"
            value={title}
            onChange={e => setTitle(e.target.value)}
            onBlur={() => setErrors(prev => ({ ...prev, title: tErr(titleKey(title), { n: title.trim().length }) || undefined }))}
            placeholder={t('createProject.namePh')}
          />
        </Field>

        <Field
          label={t('createProject.desc')}
          htmlFor="proj-description"
          hint={t('createProject.descMin')}
          error={errors.description}
          required
        >
          <textarea
            id="proj-description"
            rows="4"
            value={description}
            onChange={e => setDescription(e.target.value)}
            placeholder={t('createProject.descPh')}
          ></textarea>
        </Field>

        <div className="form-row">
          <Field label={t('createProject.category')} htmlFor="proj-category" error={errors.category} required>
            <select id="proj-category" value={category} onChange={e => { setCategory(e.target.value); setTech(''); }}>
              <option value="">{t('createProject.select')}</option>
              {Object.keys(CATEGORY_KEYS).map(key => (
                <option key={key} value={CATEGORY_KEYS[key]}>{getCategoryLabel(lang, CATEGORY_KEYS[key])}</option>
              ))}
            </select>
          </Field>

          <Field label={t('createProject.mainTech')} htmlFor="proj-tech" error={errors.techs} required>
            <select id="proj-tech" value={tech} onChange={e => setTech(e.target.value)}>
              <option value="">{t('createProject.select')}</option>
              {availableTechs.map(tch => (
                <option key={tch} value={tch}>{escapeHTML(tch)}</option>
              ))}
            </select>
          </Field>
        </div>

        {category === 'other' && (
          <Field label={t('createProject.customCat')} htmlFor="proj-custom-category" error={errors.customCategory} required>
            <input id="proj-custom-category" type="text" value={customCategory} onChange={e => setCustomCategory(e.target.value)} placeholder={t('createProject.customCatPh')} />
          </Field>
        )}

        <div className="form-row">
          <Field label={t('createProject.slots')} htmlFor="proj-slots" hint="1–20" error={errors.slots} required>
            <input id="proj-slots" type="number" min="1" max="20" value={slots} onChange={e => setSlots(e.target.value)} />
          </Field>

          <Field label={t('createProject.minRating')} htmlFor="proj-minrating" error={errors.techs && ''}>
            <select id="proj-minrating" value={minRating} onChange={e => setMinRating(Number(e.target.value))}>
              {ratingOptions.map(n => (
                <option key={n} value={n}>
                  {n === 0 ? t('createProject.minRatingNone') : starLabel(lang, n)}
                </option>
              ))}
            </select>
          </Field>
        </div>

        <Field label={t('createProject.deadline')} htmlFor="proj-deadline" error={errors.deadline}>
          <input id="proj-deadline" type="date" value={deadline} min={todayISO} onChange={e => setDeadline(e.target.value)} />
        </Field>

        <div className="form-group">
          <span className="field-label" id="proj-image-label">{t('createProject.image')}</span>
          <button
            type="button"
            className="project-cover-drop"
            onClick={() => fileRef.current?.click()}
            aria-describedby="proj-image-label"
          >
            <Icon name="palette" size={20} />
            <span>{t('createProject.imageAuto')}</span>
          </button>
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            className="b2-visually-hidden"
            onChange={handleImage}
            tabIndex={-1}
            aria-hidden="true"
          />
          {image && (
            <div className="project-image-preview">
              <img src={image} alt="Vista previa de la portada" />
              <button type="button" className="btn btn-ghost btn-sm" onClick={() => { setImage(null); showToast(t('toast.imageRemoved'), 'info'); }}>
                {t('createProject.removeImg')}
              </button>
            </div>
          )}
        </div>

        <button type="button" className="form-disclosure" onClick={() => setShowExtra(v => !v)} aria-expanded={showExtra}>
          <Icon name={showExtra ? 'chevron-up' : 'chevron-down'} size={14} />
          {t('createProject.moreOptions')}
        </button>

        {showExtra && (
          <div className="form-extra">
            <div className="form-group">
              <label htmlFor="proj-roles">{t('createProject.roles')}</label>
              <p className="form-hint">{t('createProject.rolesHint')}</p>
              <input id="proj-roles" value={rolesText} onChange={e => setRolesText(e.target.value)} placeholder={t('createProject.rolesPh')} />
            </div>
            <Field label={t('createProject.repo')} htmlFor="proj-repo" error={errors.repo}>
              <input id="proj-repo" type="url" value={repo} onChange={e => setRepo(e.target.value)} placeholder={t('createProject.repoPh')} />
            </Field>
          </div>
        )}
      </form>
    </Modal>
  );
}

function isValidUrl(value) {
  try {
    const url = new URL(value.startsWith('http') ? value : `https://${value}`);
    return !!url.hostname.includes('.');
  } catch {
    return false;
  }
}

const CATEGORY_KEYS = {
  web: 'web', mobile: 'mobile', game: 'game', other: 'other'
};
