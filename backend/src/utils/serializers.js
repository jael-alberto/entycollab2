const has = (value, key) => value != null && Object.prototype.hasOwnProperty.call(value, key);

function toIso(value) {
  if (value === undefined) return undefined;
  if (value === null) return null;
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toISOString();
}

function toDateOnly(value) {
  if (value === undefined) return undefined;
  if (value === null) return null;
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toISOString().slice(0, 10);
}

function toNumber(value) {
  if (value === undefined) return undefined;
  if (value === null) return null;
  const number = Number(value);
  return Number.isNaN(number) ? value : number;
}

function toArray(value) {
  return Array.isArray(value) ? value.slice() : [];
}

function normalizeLocalized(value) {
  if (value === null || value === undefined) return value;
  if (typeof value === 'string') return { es: value, en: value };
  return value;
}

function normalizeOptionalUrl(value) {
  if (value === undefined) return undefined;
  if (value === null) return null;
  const clean = String(value).trim();
  return clean === '' ? null : clean;
}

function addAliases(target, aliases) {
  for (const [camel, snake] of Object.entries(aliases)) {
    if (has(target, snake)) target[camel] = target[snake];
  }
  return target;
}

function read(input, camel, snake) {
  if (!input) return undefined;
  if (has(input, camel)) return input[camel];
  if (snake && has(input, snake)) return input[snake];
  return undefined;
}

export function serializeProfile(profile, { includeEmail = false } = {}) {
  if (!profile) return null;

  const result = { id: profile.id };

  if (has(profile, 'name')) result.name = profile.name;
  if (has(profile, 'username')) result.username = profile.username;
  if (includeEmail && has(profile, 'email')) result.email = profile.email;
  if (has(profile, 'avatar')) result.avatar = profile.avatar;
  if (has(profile, 'skills')) result.skills = toArray(profile.skills);
  if (has(profile, 'categories')) result.categories = toArray(profile.categories);
  if (has(profile, 'bio')) result.bio = normalizeLocalized(profile.bio);
  if (has(profile, 'githubUrl')) result.github_url = profile.githubUrl;
  if (has(profile, 'portfolioUrl')) result.portfolio_url = profile.portfolioUrl;
  if (has(profile, 'available')) result.available = Boolean(profile.available);
  if (has(profile, 'featuredProjectIds')) result.featured_project_ids = toArray(profile.featuredProjectIds);
  if (has(profile, 'gameTypes')) result.game_types = toArray(profile.gameTypes);
  if (has(profile, 'languages')) result.languages = toArray(profile.languages);
  if (has(profile, 'favoriteGenres')) result.favorite_genres = toArray(profile.favoriteGenres);
  if (has(profile, 'disciplines')) result.disciplines = toArray(profile.disciplines);
  if (has(profile, 'createdAt')) result.created_at = toIso(profile.createdAt);

  return addAliases(result, {
    githubUrl: 'github_url',
    portfolioUrl: 'portfolio_url',
    featuredProjectIds: 'featured_project_ids',
    gameTypes: 'game_types',
    favoriteGenres: 'favorite_genres',
    createdAt: 'created_at'
  });
}

export function serializeProject(project) {
  if (!project) return null;

  const result = { id: project.id };

  if (has(project, 'ownerId')) result.owner_id = project.ownerId;
  if (has(project, 'groupId')) result.group_id = project.groupId;
  if (has(project, 'title')) result.title = project.title;
  if (has(project, 'category')) result.category = project.category;
  if (has(project, 'slots')) result.slots = project.slots;
  if (has(project, 'tech')) result.tech = toArray(project.tech);
  if (has(project, 'description')) result.description = project.description;
  if (has(project, 'minRating')) result.min_rating = toNumber(project.minRating);
  if (has(project, 'deadline')) result.deadline = toDateOnly(project.deadline);
  if (has(project, 'repo')) result.repo = project.repo;
  if (has(project, 'image')) result.image = project.image;
  if (has(project, 'roles')) result.roles = toArray(project.roles);
  if (has(project, 'status')) result.status = project.status;
  if (has(project, 'createdAt')) result.created_at = toIso(project.createdAt);

  if (has(project, 'owner')) {
    result.owner = project.owner ? serializeProfile(project.owner) : null;
  }
  if (has(project, 'group')) {
    result.group = project.group ? serializeGroup(project.group) : null;
  }
  if (has(project, 'applications')) {
    result.applications = Array.isArray(project.applications)
      ? project.applications.map(serializeApplication)
      : [];
  }
  if (has(project, 'ratings')) {
    result.ratings = Array.isArray(project.ratings)
      ? project.ratings.map(serializeRating)
      : [];
  }

  return addAliases(result, {
    ownerId: 'owner_id',
    groupId: 'group_id',
    minRating: 'min_rating',
    createdAt: 'created_at'
  });
}

export function serializeApplication(application) {
  if (!application) return null;

  const result = { id: application.id };

  if (has(application, 'projectId')) result.project_id = application.projectId;
  if (has(application, 'userId')) result.user_id = application.userId;
  if (has(application, 'status')) result.status = application.status;
  if (has(application, 'projectRole')) result.project_role = application.projectRole;
  if (has(application, 'invitedBy')) result.invited_by = application.invitedBy;
  if (has(application, 'message')) {
    result.message = application.message ?? '';
    result.pitch = result.message;
  }
  if (has(application, 'appliedAt')) result.applied_at = toIso(application.appliedAt);
  if (has(application, 'respondedAt')) result.responded_at = toIso(application.respondedAt);

  if (has(application, 'project')) {
    result.project = application.project ? serializeProject(application.project) : null;
  }
  if (has(application, 'user')) {
    result.user = application.user ? serializeProfile(application.user) : null;
  }
  if (has(application, 'inviter')) {
    result.inviter = application.inviter ? serializeProfile(application.inviter) : null;
    result.invited_by_profile = result.inviter;
  }

  return addAliases(result, {
    projectId: 'project_id',
    userId: 'user_id',
    projectRole: 'project_role',
    invitedBy: 'invited_by',
    appliedAt: 'applied_at',
    respondedAt: 'responded_at'
  });
}

export function serializeRating(rating) {
  if (!rating) return null;

  const result = { id: rating.id };

  if (has(rating, 'projectId')) result.project_id = rating.projectId;
  if (has(rating, 'ratedUserId')) result.rated_user_id = rating.ratedUserId;
  if (has(rating, 'ratedById')) result.rated_by = rating.ratedById;
  if (has(rating, 'stars')) result.stars = toNumber(rating.stars);
  if (has(rating, 'createdAt')) result.created_at = toIso(rating.createdAt);
  if (has(rating, 'updatedAt')) result.updated_at = toIso(rating.updatedAt);

  if (has(rating, 'project')) {
    result.project = rating.project ? serializeProject(rating.project) : null;
  }
  if (has(rating, 'ratedUser')) {
    result.rated_user = rating.ratedUser ? serializeProfile(rating.ratedUser) : null;
    result.ratedUser = result.rated_user;
  }
  if (has(rating, 'rater')) {
    result.rated_by_profile = rating.rater ? serializeProfile(rating.rater) : null;
    result.rater = result.rated_by_profile;
  }

  return addAliases(result, {
    projectId: 'project_id',
    ratedUserId: 'rated_user_id',
    ratedBy: 'rated_by',
    createdAt: 'created_at',
    updatedAt: 'updated_at'
  });
}

export function serializeGroup(group, { memberCount } = {}) {
  if (!group) return null;

  const result = { id: group.id };

  if (has(group, 'name')) result.name = group.name;
  if (has(group, 'description')) result.description = group.description ?? '';
  if (has(group, 'ownerId')) result.owner_id = group.ownerId;
  if (has(group, 'isPrivate')) result.is_private = Boolean(group.isPrivate);
  if (has(group, 'createdAt')) result.created_at = toIso(group.createdAt);

  if (has(group, 'owner')) {
    result.owner = group.owner ? serializeProfile(group.owner) : null;
  }

  const count = memberCount ?? group._count?.members;
  if (count !== undefined) {
    result.member_count = count;
  }

  if (has(group, 'members')) {
    result.members = Array.isArray(group.members)
      ? group.members.map(serializeGroupMember)
      : [];
    if (count === undefined) result.member_count = result.members.length;
  } else if (count !== undefined) {
    result.members = [{ count }];
  }

  if (has(group, 'requests')) {
    result.requests = Array.isArray(group.requests)
      ? group.requests.map(serializeGroupRequest)
      : [];
  }
  if (has(group, 'projects')) {
    result.projects = Array.isArray(group.projects)
      ? group.projects.map(serializeProject)
      : [];
  }

  return addAliases(result, {
    ownerId: 'owner_id',
    isPrivate: 'is_private',
    createdAt: 'created_at',
    memberCount: 'member_count'
  });
}

export function serializeGroupMember(member) {
  if (!member) return null;

  const result = {};

  if (has(member, 'groupId')) result.group_id = member.groupId;
  if (has(member, 'userId')) result.user_id = member.userId;
  if (has(member, 'role')) result.role = member.role;
  if (has(member, 'joinedAt')) result.joined_at = toIso(member.joinedAt);

  if (has(member, 'user')) {
    result.user = member.user ? serializeProfile(member.user) : null;
  }
  if (has(member, 'group')) {
    result.group = member.group ? serializeGroup(member.group) : null;
  }

  return addAliases(result, {
    groupId: 'group_id',
    userId: 'user_id',
    joinedAt: 'joined_at'
  });
}

export function serializeGroupRequest(request) {
  if (!request) return null;

  const result = { id: request.id };

  if (has(request, 'groupId')) result.group_id = request.groupId;
  if (has(request, 'userId')) result.user_id = request.userId;
  if (has(request, 'status')) result.status = request.status;
  if (has(request, 'requestedAt')) result.requested_at = toIso(request.requestedAt);
  if (has(request, 'decidedAt')) result.decided_at = toIso(request.decidedAt);
  if (has(request, 'decidedBy')) result.decided_by = request.decidedBy;

  if (has(request, 'group')) {
    result.group = request.group ? serializeGroup(request.group) : null;
  }
  if (has(request, 'user')) {
    result.user = request.user ? serializeProfile(request.user) : null;
  }
  if (has(request, 'decider')) {
    result.decider = request.decider ? serializeProfile(request.decider) : null;
  }

  return addAliases(result, {
    groupId: 'group_id',
    userId: 'user_id',
    requestedAt: 'requested_at',
    decidedAt: 'decided_at',
    decidedBy: 'decided_by'
  });
}

export function projectInputToPrisma(input = {}) {
  const data = {};

  const title = read(input, 'title');
  if (title !== undefined) data.title = normalizeLocalized(title);

  const category = read(input, 'category');
  if (category !== undefined) data.category = category;

  const slots = read(input, 'slots');
  if (slots !== undefined) data.slots = slots;

  const tech = read(input, 'tech');
  if (tech !== undefined) data.tech = toArray(tech);

  const description = read(input, 'description');
  if (description !== undefined) data.description = normalizeLocalized(description);

  const minRating = read(input, 'minRating', 'min_rating');
  if (minRating !== undefined) data.minRating = toNumber(minRating);

  const deadline = read(input, 'deadline');
  if (deadline !== undefined) data.deadline = deadline === null ? null : new Date(deadline);

  const repo = read(input, 'repo');
  if (repo !== undefined) data.repo = normalizeOptionalUrl(repo);

  const image = read(input, 'image');
  if (image !== undefined) data.image = normalizeOptionalUrl(image);

  const roles = read(input, 'roles');
  if (roles !== undefined) data.roles = toArray(roles);

  const ownerId = read(input, 'ownerId', 'owner_id');
  if (ownerId !== undefined) data.ownerId = ownerId;

  const groupId = read(input, 'groupId', 'group_id');
  if (groupId !== undefined) data.groupId = groupId;

  const status = read(input, 'status');
  if (status !== undefined) data.status = status;

  return data;
}

export function profileInputToPrisma(input = {}) {
  const data = {};

  const simpleFields = ['name', 'username', 'email', 'avatar', 'available'];
  for (const field of simpleFields) {
    const value = read(input, field);
    if (value !== undefined) data[field] = value;
  }

  const bio = read(input, 'bio');
  if (bio !== undefined) data.bio = normalizeLocalized(bio);

  const githubUrl = read(input, 'githubUrl', 'github_url');
  if (githubUrl !== undefined) data.githubUrl = normalizeOptionalUrl(githubUrl);

  const portfolioUrl = read(input, 'portfolioUrl', 'portfolio_url');
  if (portfolioUrl !== undefined) data.portfolioUrl = normalizeOptionalUrl(portfolioUrl);

  const arrayFields = [
    ['skills', 'skills'],
    ['categories', 'categories'],
    ['featuredProjectIds', 'featured_project_ids'],
    ['gameTypes', 'game_types'],
    ['languages', 'languages'],
    ['favoriteGenres', 'favorite_genres'],
    ['disciplines', 'disciplines']
  ];

  for (const [field, snake] of arrayFields) {
    const value = read(input, field, snake);
    if (value !== undefined) data[field] = toArray(value);
  }

  return data;
}
