import { useRef, useState } from 'react';
import { useApp } from '../context/AppContext.jsx';
import { useToast } from '../context/ToastContext.jsx';
import { useModals } from '../context/ModalManager.jsx';
import { Field, Modal, Spinner, StarInput } from '../components/common.jsx';
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
  const [minRating, setMinRating] = useState(1);
  const [techs, setTechs] = useState([]);
  const [description, setDescription] = useState('');
  const [deadline, setDeadline] = useState('');
  const [repo, setRepo] = useState('');
  const [image, setImage] = useState(null);
  const [rolesText, setRolesText] = useState('');
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);

  if (!user || (activeGroup && !isActiveGroupAdmin)) return null;

  const toggleTech = (tech) => {
    setTechs(prev => prev.includes(tech) ? prev.filter(x => x !== tech) : [...prev, tech]);
    if (errors.techs) setErrors(prev => ({ ...prev, techs: '' }));
  };

  const tErr = (key, replacements) => (key ? t(key, replacements) : '');

  const validate = () => {
    const next = {
      title: tErr(titleKey(title), { n: title.trim().length }),
      category: category ? '' : t('form.required'),
      customCategory: category === 'other' && !customCategory.trim() ? t('form.required') : '',
      slots: tErr(slotsKey(slots)),
      techs: tErr(techKey(techs)),
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

  const submit = (e) => {
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
    createProject({
      title: title.trim(),
      category: finalCategory,
      slots: parseInt(slots, 10) || 1,
      tech: techs,
      minRating,
      description: description.trim(),
      deadline: deadline || null,
      repo: repo.trim() || null,
      image,
      roles: rolesText.split(',').map(role => role.trim()).filter(Boolean)
    });
    closeCreate();
    showToast(t('toast.published'), 'success');
  };

  const minRatingLabel = minRating === 1
    ? t('minRating.oneOrMore')
    : t('minRating.starsOrMore', { label: starLabel(lang, minRating) });

  const availableTechs = category ? techsForCategory(category) : [];
  const todayISO = new Date().toISOString().slice(0, 10);

  return (
    <Modal open title={t('createProject.title')} onClose={closeCreate}>
      <form onSubmit={submit} noValidate>
        {activeGroup && <div className="group-project-notice">Este proyecto se publica solo dentro de <strong>{activeGroup.name}</strong>.</div>}
        <Field label={t('createProject.name')} htmlFor="proj-title" error={errors.title} required>
          <input
            type="text"
            value={title}
            onChange={e => setTitle(e.target.value)}
            onBlur={() => setErrors(prev => ({ ...prev, title: tErr(titleKey(title), { n: title.trim().length }) || undefined }))}
            placeholder={t('createProject.namePh')}
          />
        </Field>
        <div className="form-row">
          <Field label={t('createProject.category')} htmlFor="proj-category" error={errors.category} required>
            <select value={category} onChange={e => { setCategory(e.target.value); setTechs([]); }}>
              <option value="">{t('createProject.select')}</option>
              {Object.keys(CATEGORY_KEYS).map(key => (
                <option key={key} value={CATEGORY_KEYS[key]}>{getCategoryLabel(lang, CATEGORY_KEYS[key])}</option>
              ))}
            </select>
          </Field>
          {category === 'other' && (
            <Field label={t('createProject.customCat')} htmlFor="proj-custom-category" error={errors.customCategory} required>
              <input type="text" value={customCategory} onChange={e => setCustomCategory(e.target.value)} placeholder={t('createProject.customCatPh')} />
            </Field>
          )}
          <Field label={t('createProject.slots')} htmlFor="proj-slots" hint="1–20" error={errors.slots} required>
            <input type="number" min="1" max="20" value={slots} onChange={e => setSlots(e.target.value)} />
          </Field>
        </div>
        <div className="form-group">
          <span className="field-label" id="proj-minrating-label">{t('createProject.minRating')}</span>
          <p className="form-hint">{t('createProject.minRatingHint')}</p>
          <div className="star-input">
            <StarInput value={minRating} onChange={setMinRating} title={minRatingLabel} label={t('createProject.minRating')} />
            <span className="star-input-label">{minRatingLabel}</span>
          </div>
        </div>
        <div className="form-group">
          <span className="field-label" id="proj-techs-label">{t('createProject.techs')}</span>
          <p className="form-hint">{t('createProject.techsHint')}</p>
          {!category ? (
            <p className="form-hint">{t('createProject.techsRequireCat')}</p>
          ) : (
            <div className="tech-buttons tech-buttons-form" role="group" aria-labelledby="proj-techs-label">
              {availableTechs.map(tech => (
                <button
                  key={tech}
                  type="button"
                  className={`tech-chip${techs.includes(tech) ? ' active' : ''}`}
                  aria-pressed={techs.includes(tech)}
                  onClick={() => toggleTech(tech)}
                >
                  {escapeHTML(tech)}
                </button>
              ))}
            </div>
          )}
          {errors.techs && <p className="field-error" role="alert">{errors.techs}</p>}
        </div>
        <Field
          label={t('createProject.desc')}
          htmlFor="proj-description"
          hint={`${description.trim().length} / ${DESC_MIN}+`}
          error={errors.description}
          required
        >
          <textarea rows="5" value={description} onChange={e => setDescription(e.target.value)} placeholder={t('createProject.descPh')}></textarea>
        </Field>
        <div className="form-group">
          <label htmlFor="proj-roles">Roles del proyecto</label>
          <p className="form-hint">Separa los roles con comas. Al aceptar a cada persona, el administrador le asignará uno de estos roles.</p>
          <input id="proj-roles" value={rolesText} onChange={e => setRolesText(e.target.value)} placeholder="Ej. Diseñador UI, Frontend, Backend" />
        </div>
        <div className="form-group">
          <label htmlFor="proj-image">{t('createProject.image')}</label>
          <p className="form-hint">{t('createProject.imageHint')}</p>
          <input id="proj-image" type="file" ref={fileRef} accept="image/*" onChange={handleImage} />
          {image && (
            <div className="project-image-preview" style={{ display: 'flex' }}>
              <img src={image} alt="Vista previa" />
              <button type="button" className="btn btn-ghost btn-sm" onClick={() => { setImage(null); showToast(t('toast.imageRemoved'), 'info'); }}>{t('createProject.removeImg')}</button>
            </div>
          )}
        </div>
        <div className="form-row">
          <Field label={t('createProject.deadline')} htmlFor="proj-deadline" error={errors.deadline}>
            <input type="date" value={deadline} min={todayISO} onChange={e => setDeadline(e.target.value)} />
          </Field>
          <Field label={t('createProject.repo')} htmlFor="proj-repo" error={errors.repo}>
            <input type="url" value={repo} onChange={e => setRepo(e.target.value)} placeholder={t('createProject.repoPh')} />
          </Field>
        </div>
        <button type="submit" className="btn btn-primary btn-full" disabled={loading} aria-busy={loading}>
          {loading && <Spinner />}
          {loading ? t('createProject.publishing') : t('createProject.publish')}
        </button>
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
