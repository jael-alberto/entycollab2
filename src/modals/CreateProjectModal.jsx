import { useRef, useState } from 'react';
import { useApp } from '../context/AppContext.jsx';
import { useToast } from '../context/ToastContext.jsx';
import { useModals } from '../context/ModalManager.jsx';
import { Modal, StarInput } from '../components/common.jsx';
import { escapeHTML, fileToDataURL, getCategoryLabel, starLabel, techsForCategory } from '../lib/helpers.js';

export default function CreateProjectModal() {
  const { user, lang, t, createProject } = useApp();
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

  if (!user) return null;

  const toggleTech = (tech) => {
    setTechs(prev => prev.includes(tech) ? prev.filter(x => x !== tech) : [...prev, tech]);
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
    if (techs.length === 0) {
      showToast(t('toast.applyTech'), 'error');
      return;
    }
    let finalCategory = category;
    if (category === 'other') {
      const custom = customCategory.trim();
      if (!custom) {
        showToast(t('toast.writeCategory'), 'error');
        return;
      }
      finalCategory = custom;
    }
    createProject({
      title: title.trim(),
      category: finalCategory,
      slots: parseInt(slots, 10) || 1,
      tech: techs,
      minRating,
      description: description.trim(),
      deadline: deadline || null,
      repo: repo.trim() || null,
      image
    });
    closeCreate();
    showToast(t('toast.published'), 'success');
  };

  const minRatingLabel = minRating === 1
    ? t('minRating.oneOrMore')
    : t('minRating.starsOrMore', { label: starLabel(lang, minRating) });

  const availableTechs = category ? techsForCategory(category) : [];

  return (
    <Modal open title={t('createProject.title')} onClose={closeCreate}>
      <form onSubmit={submit}>
        <div className="form-group">
          <label htmlFor="proj-title">{t('createProject.name')}</label>
          <input type="text" id="proj-title" required value={title} onChange={e => setTitle(e.target.value)} placeholder={t('createProject.namePh')} />
        </div>
        <div className="form-row">
          <div className="form-group">
            <label htmlFor="proj-category">{t('createProject.category')}</label>
            <select id="proj-category" required value={category} onChange={e => { setCategory(e.target.value); setTechs([]); }}>
              <option value="">{t('createProject.select')}</option>
              {Object.keys(CATEGORY_KEYS).map(key => (
                <option key={key} value={CATEGORY_KEYS[key]}>{getCategoryLabel(lang, CATEGORY_KEYS[key])}</option>
              ))}
            </select>
          </div>
          {category === 'other' && (
            <div className="form-group">
              <label htmlFor="proj-custom-category">{t('createProject.customCat')}</label>
              <input type="text" id="proj-custom-category" value={customCategory} onChange={e => setCustomCategory(e.target.value)} placeholder={t('createProject.customCatPh')} />
            </div>
          )}
          <div className="form-group">
            <label htmlFor="proj-slots">{t('createProject.slots')}</label>
            <input type="number" id="proj-slots" required min="1" max="50" value={slots} onChange={e => setSlots(e.target.value)} />
          </div>
        </div>
        <div className="form-group">
          <label>{t('createProject.minRating')}</label>
          <p className="form-hint">{t('createProject.minRatingHint')}</p>
          <div className="star-input">
            <StarInput value={minRating} onChange={setMinRating} title={minRatingLabel} />
            <span className="star-input-label" id="proj-min-rating-label">{minRatingLabel}</span>
          </div>
        </div>
        <div className="form-group">
          <label>{t('createProject.techs')}</label>
          <p className="form-hint">{t('createProject.techsHint')}</p>
          {!category ? (
            <p className="form-hint">{t('createProject.techsRequireCat')}</p>
          ) : (
            <div className="tech-buttons tech-buttons-form">
              {availableTechs.map(tech => (
                <button
                  key={tech}
                  type="button"
                  className={`tech-chip${techs.includes(tech) ? ' active' : ''}`}
                  onClick={() => toggleTech(tech)}
                >
                  {escapeHTML(tech)}
                </button>
              ))}
            </div>
          )}
        </div>
        <div className="form-group">
          <label>{t('createProject.desc')}</label>
          <textarea id="proj-description" rows="5" required value={description} onChange={e => setDescription(e.target.value)} placeholder={t('createProject.descPh')}></textarea>
        </div>
        <div className="form-group">
          <label>{t('createProject.image')}</label>
          <p className="form-hint">{t('createProject.imageHint')}</p>
          <input type="file" ref={fileRef} accept="image/*" onChange={handleImage} />
          {image && (
            <div className="project-image-preview" style={{ display: 'flex' }}>
              <img src={image} alt="Vista previa" />
              <button type="button" className="btn btn-ghost btn-sm" onClick={() => { setImage(null); showToast(t('toast.imageRemoved'), 'info'); }}>{t('createProject.removeImg')}</button>
            </div>
          )}
        </div>
        <div className="form-row">
          <div className="form-group">
            <label htmlFor="proj-deadline">{t('createProject.deadline')}</label>
            <input type="date" id="proj-deadline" value={deadline} onChange={e => setDeadline(e.target.value)} />
          </div>
          <div className="form-group">
            <label htmlFor="proj-repo">{t('createProject.repo')}</label>
            <input type="url" id="proj-repo" value={repo} onChange={e => setRepo(e.target.value)} placeholder={t('createProject.repoPh')} />
          </div>
        </div>
        <button type="submit" className="btn btn-primary btn-full">{t('createProject.publish')}</button>
      </form>
    </Modal>
  );
}

const CATEGORY_KEYS = {
  web: 'web', mobile: 'mobile', game: 'game', other: 'other'
};