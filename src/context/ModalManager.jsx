import { createContext, useCallback, useContext, useState } from 'react';
import CreateProjectModal from '../modals/CreateProjectModal.jsx';
import ProjectDetailModal from '../modals/ProjectDetailModal.jsx';
import RateModal from '../modals/RateModal.jsx';
import SelectFilterModal from '../modals/SelectFilterModal.jsx';
import UserDetailModal from '../modals/UserDetailModal.jsx';
import InviteModal from '../modals/InviteModal.jsx';
import FeaturedModal from '../modals/FeaturedModal.jsx';

const ModalContext = createContext(null);

export function ModalProvider({ children }) {
  const [createOpen, setCreateOpen] = useState(false);
  const [detailProjectId, setDetailProjectId] = useState(null);
  const [rateProjectId, setRateProjectId] = useState(null);
  const [invitePersonId, setInvitePersonId] = useState(null);
  const [userDetailId, setUserDetailId] = useState(null);
  const [featuredOpen, setFeaturedOpen] = useState(false);
  const [catOpen, setCatOpen] = useState(false);
  const [techOpen, setTechOpen] = useState(false);
  const [peopleCatOpen, setPeopleCatOpen] = useState(false);
  const [peopleTechOpen, setPeopleTechOpen] = useState(false);

  const openCreate = useCallback(() => setCreateOpen(true), []);
  const closeCreate = useCallback(() => setCreateOpen(false), []);
  const openDetail = useCallback((id) => setDetailProjectId(id), []);
  const closeDetail = useCallback(() => setDetailProjectId(null), []);
  const openRate = useCallback((id) => setRateProjectId(id), []);
  const closeRate = useCallback(() => setRateProjectId(null), []);
  const openInvite = useCallback((personId) => setInvitePersonId(personId), []);
  const closeInvite = useCallback(() => setInvitePersonId(null), []);
  const openUserDetail = useCallback((id) => setUserDetailId(id), []);
  const closeUserDetail = useCallback(() => setUserDetailId(null), []);
  const openFeatured = useCallback(() => setFeaturedOpen(true), []);
  const closeFeatured = useCallback(() => setFeaturedOpen(false), []);
  const openCategoryFilter = useCallback(() => setCatOpen(true), []);
  const closeCategoryFilter = useCallback(() => setCatOpen(false), []);
  const openTechFilter = useCallback(() => setTechOpen(true), []);
  const closeTechFilter = useCallback(() => setTechOpen(false), []);
  const openPeopleCategoryFilter = useCallback(() => setPeopleCatOpen(true), []);
  const closePeopleCategoryFilter = useCallback(() => setPeopleCatOpen(false), []);
  const openPeopleTechFilter = useCallback(() => setPeopleTechOpen(true), []);
  const closePeopleTechFilter = useCallback(() => setPeopleTechOpen(false), []);

  const value = {
    openCreate, closeCreate, createOpen,
    openDetail, closeDetail, detailProjectId,
    openRate, closeRate, rateProjectId,
    openInvite, closeInvite, invitePersonId,
    openUserDetail, closeUserDetail, userDetailId,
    openFeatured, closeFeatured, featuredOpen,
    openCategoryFilter, closeCategoryFilter, catOpen,
    openTechFilter, closeTechFilter, techOpen,
    openPeopleCategoryFilter, closePeopleCategoryFilter, peopleCatOpen,
    openPeopleTechFilter, closePeopleTechFilter, peopleTechOpen
  };

  return (
    <ModalContext.Provider value={value}>
      {children}

      {/* ====== MODALES GLOBALES ====== */}
      {detailProjectId && <ProjectDetailModal />}
      {rateProjectId && <RateModal />}
      {invitePersonId && <InviteModal />}
      {userDetailId && <UserDetailModal />}
      {featuredOpen && <FeaturedModal />}
      {catOpen && <SelectFilterModal kind="category" />}
      {techOpen && <SelectFilterModal kind="tech" />}
      {peopleCatOpen && <SelectFilterModal kind="peopleCategory" />}
      {peopleTechOpen && <SelectFilterModal kind="peopleTech" />}
      {createOpen && <CreateProjectModal />}
    </ModalContext.Provider>
  );
}

export function useModals() {
  return useContext(ModalContext);
}