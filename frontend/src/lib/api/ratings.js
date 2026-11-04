// frontend/src/lib/api/ratings.js
// API de calificaciones - usa backend propio

import { api, handleApiError } from './client.js';

export async function saveRatings(projectId, ratingMap, _ratedBy) {
  try {
    const { ratings } = await api.ratings.save(projectId, ratingMap);
    return ratings || [];
  } catch (_error) {
    if (_error.message.includes('SELF_RATING')) {
      throw new Error('No puedes calificarte a ti mismo');
    }
    if (_error.message.includes('INVALID_RATED_USER')) {
      throw new Error('Usuario no válido para calificar');
    }
    if (_error.message.includes('PROJECT_NOT_COMPLETED')) {
      throw new Error('Solo se pueden calificar proyectos completados');
    }
    if (_error.message.includes('FORBIDDEN') || _error.message.includes('Solo el owner')) {
      throw new Error('Solo el owner puede calificar');
    }
    throw new Error(handleApiError(_error, 'Error guardando calificaciones'));
  }
}

export async function getProjectRatings(projectId) {
  try {
    const { ratings } = await api.ratings.projectRatings(projectId);
    return ratings || [];
  } catch (_error) {
    throw new Error(handleApiError(_error, 'Error cargando calificaciones'));
  }
}

export async function getUserReceivedRatings(userId) {
  try {
    const { ratings } = await api.ratings.userReceived(userId);
    return ratings || [];
  } catch (_error) {
    throw new Error(handleApiError(_error, 'Error cargando calificaciones recibidas'));
  }
}

export async function getUserGivenRatings(userId) {
  try {
    const { ratings } = await api.ratings.userGiven(userId);
    return ratings || [];
  } catch (_error) {
    throw new Error(handleApiError(_error, 'Error cargando calificaciones dadas'));
  }
}

export async function getUserAvgRating(userId) {
  try {
    const { averageRating } = await api.ratings.userAverage(userId);
    return averageRating || 0;
  } catch (_error) {
    return 0;
  }
}

export async function getUserRatingCount(userId) {
  try {
    const { ratingCount } = await api.ratings.userCount(userId);
    return ratingCount || 0;
  } catch (_error) {
    return 0;
  }
}

export async function getUserRatingDistribution(userId) {
  try {
    const { distribution } = await api.ratings.userDistribution(userId);
    return distribution || { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
  } catch (_error) {
    return { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
  }
}

export async function getUserProjectRating(projectId, userId) {
  try {
    const { rating } = await api.ratings.userProjectRating(projectId, userId);
    return rating;
  } catch (_error) {
    return null;
  }
}

export async function canRateUser(projectId, raterId, ratedId) {
  try {
    const { canRate } = await api.ratings.canRate(projectId, ratedId);
    return canRate;
  } catch (_error) {
    return false;
  }
}