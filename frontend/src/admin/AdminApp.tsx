import { Admin, Resource, CustomRoutes } from 'react-admin';
import { Route } from 'react-router-dom';
import { authProvider } from './authProvider';
import { dataProvider } from './dataProvider';
import { AdminDashboard } from './AdminDashboard';

export function AdminApp() {
  return (
    <Admin
      basename="/admin"
      authProvider={authProvider}
      dataProvider={dataProvider}
      dashboard={AdminDashboard}
      requireAuth
    >
      {/* Team and Survey resources will be added in M3 */}
      <Resource name="teams" />
      <CustomRoutes>
        <Route path="/placeholder" element={<div />} />
      </CustomRoutes>
    </Admin>
  );
}
