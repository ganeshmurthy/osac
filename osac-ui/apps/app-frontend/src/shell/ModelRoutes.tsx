import { Navigate, Route, Routes } from 'react-router-dom';

import { ModelCreatePage } from '@osac/ui-components/pages/admin/ModelCreatePage';
import { ModelDetailsPage } from '@osac/ui-components/pages/admin/ModelDetailsPage';
import { ModelsListPage } from '@osac/ui-components/pages/admin/ModelsListPage';

export const ModelRoutes = () => (
  <Routes>
    <Route index element={<ModelsListPage />} />
    <Route path="create" element={<ModelCreatePage />} />
    <Route path=":id" element={<ModelDetailsPage />} />
    <Route path="*" element={<Navigate to="/admin/maas/models" replace />} />
  </Routes>
);
