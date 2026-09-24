import { getCategoryLabel, techsForCategory } from './helpers.js';

export function availableCategoriesList(projects, lang) {
  const used = new Set(projects.map(project => project.category));
  const categoryKeys = {
    web: 'cat.web',
    mobile: 'cat.mobile',
    game: 'cat.game'
  };

  const categories = Object.keys(categoryKeys)
    .map(category => ({
      value: category,
      label: getCategoryLabel(lang, category)
    }));

  const customCategories = [...used]
    .filter(category => !categoryKeys[category] && category !== 'other')
    .map(category => ({ value: category, label: category }));

  return [...categories, ...customCategories];
}

export function availableTechList(projects, categories) {
  if (!categories || categories.length === 0) return [];
  const techs = [];
  const seen = new Set();
  categories.forEach(category => {
    techsForCategory(category).forEach(technology => {
      if (!seen.has(technology)) {
        seen.add(technology);
        techs.push(technology);
      }
    });
  });
  return techs;
}

// Categorías disponibles para filtrar personas (las 3 categorías fijas)
export function availablePeopleCategoriesList(lang) {
  return ['web', 'mobile', 'game']
    .map(category => ({
      value: category,
      label: getCategoryLabel(lang, category)
    }));
}

export function availablePeopleTechList(users, categories) {
  return availableTechList(users, categories);
}
